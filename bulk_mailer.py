#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Local Static Server + Semi-Automated Bulk Email Dispatcher (Gmail SMTP).

Serves the Semi-Auto Job Hub UI cleanly and exposes:
  - GET  /api/health     : Verifies local server status & available PDF CVs.
  - POST /api/bulk-send  : Sends selected personalized application emails via Gmail SMTP
                           (or runs a safe test-to-self / dry-run batch) with automatic
                           CV PDF attachment (VI or EN).

Usage:
  python bulk_mailer.py --port 8787
"""

import argparse
import json
import mimetypes
import os
import smtplib
import time
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List

ROOT_DIR = Path(__file__).resolve().parent
ASSETS_DIR = ROOT_DIR / "assets"
CV_FILES = {
    "vi": ASSETS_DIR / "CV_Phuc_Nguyen_VI.pdf",
    "en": ASSETS_DIR / "CV_Phuc_Nguyen_EN.pdf",
}

DEFAULT_SMTP_HOST = "smtp.gmail.com"
DEFAULT_SMTP_PORT = 587
DEFAULT_SENDER = "tonyphucnguyen.work@gmail.com"


def check_cv_assets() -> Dict[str, Any]:
    """Check presence and byte size of candidate PDF CVs in assets/."""
    info: Dict[str, Any] = {}
    for lang, path in CV_FILES.items():
        if path.is_file():
            info[lang] = {
                "filename": path.name,
                "exists": True,
                "bytes": path.stat().st_size,
            }
        else:
            info[lang] = {"filename": path.name, "exists": False, "bytes": 0}
    return info


def build_email_message(
    sender_email: str,
    sender_name: str,
    to_email: str,
    subject: str,
    body: str,
    attach_cv: str = "auto",
    job_lang: str = "vi",
) -> EmailMessage:
    """Construct a MIME EmailMessage with optional PDF CV attachment."""
    msg = EmailMessage()
    msg["From"] = f"{sender_name} <{sender_email}>" if sender_name else sender_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Reply-To"] = sender_email
    msg.set_content(body, subtype="plain", charset="utf-8")

    selected_lang = attach_cv
    if attach_cv == "auto":
        selected_lang = "en" if str(job_lang).lower().startswith("en") else "vi"

    if selected_lang in ("vi", "en"):
        cv_path = CV_FILES.get(selected_lang)
        if cv_path and cv_path.is_file():
            mime_type, _ = mimetypes.guess_type(str(cv_path))
            maintype, subtype = (mime_type or "application/pdf").split("/", 1)
            with cv_path.open("rb") as fh:
                msg.add_attachment(
                    fh.read(),
                    maintype=maintype,
                    subtype=subtype,
                    filename=cv_path.name,
                )
    return msg


def dispatch_bulk_emails(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and dispatch (or dry-run / test-to-self) a batch of application emails.

    Expected payload:
      {
        "sender_email": "tonyphucnguyen.work@gmail.com",
        "sender_name": "Nguyen Tran Tien Phuc",
        "app_password": "xxxx xxxx xxxx xxxx",
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "mode": "dry_run" | "test_self" | "live",
        "attach_cv": "auto" | "vi" | "en" | "none",
        "delay_sec": 1.2,
        "items": [
          {"id": "...", "company": "...", "to": "...", "subject": "...", "body": "...", "lang": "vi"}
        ]
      }
    """
    mode = str(payload.get("mode", "dry_run")).strip().lower()
    sender_email = str(payload.get("sender_email") or DEFAULT_SENDER).strip()
    sender_name = str(payload.get("sender_name") or "Nguyen Tran Tien Phuc").strip()
    app_password = str(payload.get("app_password") or "").replace(" ", "").strip()
    smtp_host = str(payload.get("smtp_host") or DEFAULT_SMTP_HOST).strip()
    smtp_port = int(payload.get("smtp_port") or DEFAULT_SMTP_PORT)
    attach_cv = str(payload.get("attach_cv") or "auto").strip().lower()
    delay_sec = max(0.2, min(10.0, float(payload.get("delay_sec", 1.0))))
    items: List[Dict[str, Any]] = payload.get("items") or []

    if not items:
        return {"ok": False, "error": "Danh sách email trống.", "results": []}

    results: List[Dict[str, Any]] = []

    if mode == "dry_run":
        for item in items:
            to_addr = str(item.get("to") or "").strip()
            subj = str(item.get("subject") or "").strip()
            body = str(item.get("body") or "").strip()
            valid = bool(to_addr and "@" in to_addr and subj and body)
            results.append(
                {
                    "id": item.get("id"),
                    "company": item.get("company", ""),
                    "to": to_addr,
                    "subject": subj,
                    "status": "validated_dry_run" if valid else "skipped_invalid",
                    "detail": "Kiểm tra hợp lệ (chưa gửi thật)" if valid else "Thiếu email/tiêu đề/nội dung",
                }
            )
        return {
            "ok": True,
            "mode": mode,
            "sent_count": sum(1 for r in results if r["status"] == "validated_dry_run"),
            "failed_count": sum(1 for r in results if r["status"] != "validated_dry_run"),
            "results": results,
        }

    if not sender_email or "@" not in sender_email:
        return {"ok": False, "error": "Email người gửi không hợp lệ.", "results": []}
    if not app_password:
        return {
            "ok": False,
            "error": "Thiếu Gmail App Password (16 ký tự). Tạo tại Google Account > Security > App Passwords.",
            "results": [],
        }

    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=20)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(sender_email, app_password)
    except Exception as exc:
        return {
            "ok": False,
            "error": f"Kết nối/Đăng nhập SMTP thất bại: {exc}",
            "results": [],
        }

    try:
        for idx, item in enumerate(items):
            raw_to = str(item.get("to") or "").strip()
            target_to = sender_email if mode == "test_self" else raw_to
            subj = str(item.get("subject") or "").strip()
            if mode == "test_self":
                subj = f"[TEST-SELF -> {raw_to}] {subj}"
            body = str(item.get("body") or "").strip()
            job_lang = str(item.get("lang") or "vi")

            if not target_to or "@" not in target_to or not subj or not body:
                results.append(
                    {
                        "id": item.get("id"),
                        "company": item.get("company", ""),
                        "to": target_to,
                        "subject": subj,
                        "status": "skipped_invalid",
                        "detail": "Thiếu email nhận hoặc nội dung",
                    }
                )
                continue

            try:
                msg = build_email_message(
                    sender_email=sender_email,
                    sender_name=sender_name,
                    to_email=target_to,
                    subject=subj,
                    body=body,
                    attach_cv=attach_cv,
                    job_lang=job_lang,
                )
                server.send_message(msg)
                results.append(
                    {
                        "id": item.get("id"),
                        "company": item.get("company", ""),
                        "to": target_to,
                        "subject": subj,
                        "status": "sent",
                        "detail": "Đã gửi qua Gmail SMTP kèm CV",
                    }
                )
            except Exception as send_exc:
                results.append(
                    {
                        "id": item.get("id"),
                        "company": item.get("company", ""),
                        "to": target_to,
                        "subject": subj,
                        "status": "failed",
                        "detail": str(send_exc),
                    }
                )

            if idx < len(items) - 1:
                time.sleep(delay_sec)
    finally:
        try:
            server.quit()
        except Exception:
            pass

    return {
        "ok": True,
        "mode": mode,
        "sent_count": sum(1 for r in results if r["status"] == "sent"),
        "failed_count": sum(1 for r in results if r["status"] in ("failed", "skipped_invalid")),
        "results": results,
    }


class JobHubRequestHandler(SimpleHTTPRequestHandler):
    """Serves static UI files from ROOT_DIR + JSON APIs for health & bulk SMTP."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, status_code: int, data: Dict[str, Any]) -> None:
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        if self.path.split("?")[0] == "/api/health":
            self._send_json(
                200,
                {
                    "ok": True,
                    "service": "Phuc Nguyen Semi-Auto Bulk Mailer",
                    "root": str(ROOT_DIR),
                    "cv_assets": check_cv_assets(),
                    "default_sender": DEFAULT_SENDER,
                },
            )
            return
        super().do_GET()

    def do_POST(self) -> None:
        clean_path = self.path.split("?")[0]
        if clean_path == "/api/download-eml":
            try:
                content_len = int(self.headers.get("Content-Length", "0"))
                if content_len <= 0 or content_len > 2 * 1024 * 1024:
                    self._send_json(400, {"ok": False, "error": "Payload size invalid."})
                    return
                payload = json.loads(self.rfile.read(content_len).decode("utf-8"))
                sender_email = str(payload.get("sender_email") or DEFAULT_SENDER).strip()
                sender_name = str(payload.get("sender_name") or "Nguyen Tran Tien Phuc").strip()
                to_email = str(payload.get("to") or "").strip()
                subject = str(payload.get("subject") or "Job Application").strip()
                body = str(payload.get("body") or "").strip()
                attach_cv = str(payload.get("attach_cv") or "auto").strip().lower()
                job_lang = str(payload.get("lang") or "vi").strip()
                msg = build_email_message(
                    sender_email=sender_email,
                    sender_name=sender_name,
                    to_email=to_email,
                    subject=subject,
                    body=body,
                    attach_cv=attach_cv,
                    job_lang=job_lang,
                )
                msg["X-Unsent"] = "1"
                raw_eml = msg.as_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "message/rfc822")
                self.send_header("Content-Disposition", 'attachment; filename="application_draft.eml"')
                self.send_header("Content-Length", str(len(raw_eml)))
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(raw_eml)
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": f"Server error: {exc}"})
            return

        if clean_path == "/api/bulk-send":
            try:
                content_len = int(self.headers.get("Content-Length", "0"))
                if content_len <= 0 or content_len > 5 * 1024 * 1024:
                    self._send_json(400, {"ok": False, "error": "Payload size invalid."})
                    return
                raw_body = self.rfile.read(content_len).decode("utf-8")
                payload = json.loads(raw_body)
                result = dispatch_bulk_emails(payload)
                self._send_json(200 if result.get("ok") else 400, result)
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": f"Server error: {exc}"})
            return
        self._send_json(404, {"ok": False, "error": "Endpoint not found."})

    def log_message(self, format: str, *args) -> None:
        # Keep console output clean and readable
        print(f"[BulkMailer] {self.address_string()} - {format % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Semi-Auto Job Hub Local Server & Bulk Mailer")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8787, help="Bind port (default 8787)")
    args = parser.parse_args()

    os.chdir(ROOT_DIR)
    server = ThreadingHTTPServer((args.host, args.port), JobHubRequestHandler)
    print(f"=== Phuc Nguyen Semi-Auto Job Hub + Bulk Mailer ===")
    print(f"UI & API running at: http://{args.host}:{args.port}/")
    print(f"CV assets: {json.dumps(check_cv_assets(), ensure_ascii=False)}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Bulk Mailer...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
