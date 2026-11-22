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
from concurrent.futures import ThreadPoolExecutor
import json
import mimetypes
import os
import re
import smtplib
import socket
import subprocess
import threading
import time
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List

ROOT_DIR = Path(__file__).resolve().parent
SECRET_FILE = ROOT_DIR / ".env.local"
SENT_HISTORY_FILE = ROOT_DIR / "data" / "sent_history.json"
ASSETS_DIR = ROOT_DIR / "assets"
CV_FILES = {
    "vi": ASSETS_DIR / "CV_Phuc_Nguyen_VI.pdf",
    "en": ASSETS_DIR / "CV_Phuc_Nguyen_EN.pdf",
}

DEFAULT_SMTP_HOST = "smtp.gmail.com"
DEFAULT_SMTP_PORT = 587
DEFAULT_SENDER = "tonyphucnguyen.work@gmail.com"

MX_CACHE: Dict[str, List[str]] = {}
DNS_CACHE: Dict[str, bool] = {}
VERIFY_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_LOCK = threading.Lock()
CONTROL_LOCK = threading.Lock()
SMTP_LOCK = threading.Lock()
HISTORY_LOCK = threading.Lock()

BULK_CONTROL: Dict[str, bool] = {"paused": False, "stopped": False}
SMTP_POOL: Dict[str, Any] = {"server": None, "sender": "", "password": "", "host": "", "port": 0}


def load_sent_history() -> Dict[str, Dict[str, Any]]:
    """Load persisted sent job IDs and recipient email addresses from data/sent_history.json."""
    with HISTORY_LOCK:
        if not SENT_HISTORY_FILE.is_file():
            return {"sent_ids": {}, "sent_emails": {}}
        try:
            raw = json.loads(SENT_HISTORY_FILE.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                return {
                    "sent_ids": dict(raw.get("sent_ids") or {}),
                    "sent_emails": dict(raw.get("sent_emails") or {}),
                }
        except Exception:
            pass
        return {"sent_ids": {}, "sent_emails": {}}


def _write_sent_history(history: Dict[str, Dict[str, Any]]) -> None:
    SENT_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    SENT_HISTORY_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")


def record_sent_email(job_id: str, to_email: str, company: str = "", subject: str = "") -> None:
    """Persist a single sent email immediately so Stop/reload never re-sends it."""
    jid = str(job_id or "").strip()
    em = str(to_email or "").strip().lower()
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    with HISTORY_LOCK:
        if SENT_HISTORY_FILE.is_file():
            try:
                raw = json.loads(SENT_HISTORY_FILE.read_text(encoding="utf-8"))
                hist = {
                    "sent_ids": dict(raw.get("sent_ids") or {}),
                    "sent_emails": dict(raw.get("sent_emails") or {}),
                }
            except Exception:
                hist = {"sent_ids": {}, "sent_emails": {}}
        else:
            hist = {"sent_ids": {}, "sent_emails": {}}

        entry = {"company": company, "subject": subject, "sent_at": now_str, "email": em, "id": jid}
        if jid:
            hist["sent_ids"][jid] = entry
        if em:
            hist["sent_emails"][em] = entry
        _write_sent_history(hist)


def clear_sent_history() -> None:
    """Reset persisted sent history when user explicitly asks to start fresh."""
    with HISTORY_LOCK:
        _write_sent_history({"sent_ids": {}, "sent_emails": {}})


def load_local_smtp_secret() -> Dict[str, str]:
    """Load git-ignored local Gmail App Password credentials from .env.local if present."""
    if not SECRET_FILE.is_file():
        return {}
    try:
        raw = json.loads(SECRET_FILE.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            return {
                "sender_email": str(raw.get("sender_email") or "").strip(),
                "app_password": str(raw.get("app_password") or "").replace(" ", "").strip(),
            }
    except Exception:
        pass
    return {}


def dns_domain_exists(domain: str) -> bool:
    """Fast DNS check to block totally nonexistent domains without port-25 latency."""
    dom = (domain or "").strip().lower()
    if not dom or "." not in dom:
        return False
    with CACHE_LOCK:
        if dom in DNS_CACHE:
            return DNS_CACHE[dom]
        if dom in MX_CACHE and MX_CACHE[dom]:
            DNS_CACHE[dom] = True
            return True
    ok = bool(get_mx_hosts(dom))
    if not ok:
        try:
            socket.getaddrinfo(dom, None)
            ok = True
        except Exception:
            ok = False
    with CACHE_LOCK:
        DNS_CACHE[dom] = ok
    return ok


def get_mx_hosts(domain: str) -> List[str]:
    """Query DNS MX records via 8.8.8.8, sorted by lowest preference."""
    dom = (domain or "").strip().lower()
    if not dom:
        return []
    with CACHE_LOCK:
        if dom in MX_CACHE:
            return MX_CACHE[dom]
    creation_flags = 0x08000000 if os.name == "nt" else 0
    mxs: List[str] = []
    for cmd in (["nslookup", "-type=mx", dom, "8.8.8.8"], ["nslookup", "-type=mx", dom]):
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=6, creationflags=creation_flags)
            out = (r.stdout or "") + "\n" + (r.stderr or "")
            pairs = re.findall(r"MX preference = (\d+),\s*mail exchanger = (\S+)", out, re.I)
            if pairs:
                mxs = [m.rstrip(".") for _, m in sorted((int(p), m) for p, m in pairs)]
                break
            plain = re.findall(r"mail exchanger = (\S+)", out, re.I)
            if plain:
                mxs = [x.rstrip(".") for x in plain]
                break
        except Exception:
            continue
    if mxs:
        with CACHE_LOCK:
            MX_CACHE[dom] = mxs
    return mxs


def verify_recipient_mailbox(email: str, force_refresh: bool = False) -> Dict[str, Any]:
    """Verify via DNS MX + SMTP RCPT TO (with bogus-address check) that mailbox is real."""
    addr = (email or "").strip()
    if not re.match(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$", addr):
        return {"email": addr, "ok": False, "verified": False, "status": "INVALID_SYNTAX", "code": 0, "mx": "", "detail": "Định dạng email không hợp lệ"}

    key = addr.lower()
    if not force_refresh:
        with CACHE_LOCK:
            cached = VERIFY_CACHE.get(key)
            if cached:
                return dict(cached)

    dom = key.split("@", 1)[1]
    mxs = get_mx_hosts(dom)
    if not mxs:
        res = {"email": addr, "ok": False, "verified": False, "status": "NO_MX", "code": 0, "mx": "", "detail": f"Tên miền {dom} không có máy chủ nhận thư (No MX)"}
        with CACHE_LOCK:
            VERIFY_CACHE[key] = res
        return res

    for mx in mxs[:2]:
        try:
            s = smtplib.SMTP(mx, 25, timeout=6)
            s.ehlo("gmail.com")
            s.mail(DEFAULT_SENDER)
            code, raw_msg = s.rcpt(addr)
            bogus_code, _ = s.rcpt(f"nonexistent_zz998877@{dom}")
            try:
                s.quit()
            except Exception:
                pass
            msg_str = raw_msg.decode("utf-8", errors="ignore") if isinstance(raw_msg, bytes) else str(raw_msg)
            if code == 250 and bogus_code != 250:
                res = {"email": addr, "ok": True, "verified": True, "status": "VERIFIED_250", "code": code, "mx": mx, "detail": f"Hộp thư tồn tại thật ({mx})"}
            elif code == 250:
                res = {"email": addr, "ok": True, "verified": False, "status": "CATCHALL_250", "code": code, "mx": mx, "detail": f"Server bật Catch-All ({mx})"}
            elif code >= 500:
                res = {"email": addr, "ok": False, "verified": False, "status": "INVALID_550", "code": code, "mx": mx, "detail": f"Từ chối {code}: {msg_str[:80]}"}
            else:
                res = {"email": addr, "ok": False, "verified": False, "status": f"TEMP_{code}", "code": code, "mx": mx, "detail": msg_str[:80]}
            if res["status"] in ("VERIFIED_250", "CATCHALL_250", "INVALID_550"):
                with CACHE_LOCK:
                    VERIFY_CACHE[key] = res
            return res
        except Exception:
            continue

    return {"email": addr, "ok": False, "verified": False, "status": "SMTP_TIMEOUT", "code": 0, "mx": mxs[0], "detail": f"Không phản hồi port 25 ({mxs[0]})"}


def close_pooled_smtp() -> None:
    """Safely close cached authenticated SMTP session."""
    with SMTP_LOCK:
        srv = SMTP_POOL.get("server")
        SMTP_POOL.update({"server": None, "sender": "", "password": "", "host": "", "port": 0})
        if srv is not None:
            try:
                srv.quit()
            except Exception:
                pass


def _get_or_open_smtp(host: str, port: int, sender_email: str, app_password: str, force_new: bool = False) -> smtplib.SMTP:
    """Reuse or open an authenticated TLS SMTP connection."""
    with SMTP_LOCK:
        srv = SMTP_POOL.get("server")
        same_creds = (
            srv is not None
            and not force_new
            and SMTP_POOL.get("sender") == sender_email
            and SMTP_POOL.get("password") == app_password
            and SMTP_POOL.get("host") == host
            and SMTP_POOL.get("port") == port
        )
        if same_creds:
            try:
                code, _ = srv.noop()
                if code == 250:
                    return srv
            except Exception:
                pass
        if srv is not None:
            try:
                srv.quit()
            except Exception:
                pass
            SMTP_POOL["server"] = None

        new_srv = smtplib.SMTP(host, port, timeout=20)
        new_srv.ehlo()
        new_srv.starttls()
        new_srv.ehlo()
        new_srv.login(sender_email, app_password)
        SMTP_POOL.update({"server": new_srv, "sender": sender_email, "password": app_password, "host": host, "port": port})
        return new_srv


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
    saved_secret = load_local_smtp_secret()
    sender_email = str(payload.get("sender_email") or saved_secret.get("sender_email") or DEFAULT_SENDER).strip()
    sender_name = str(payload.get("sender_name") or "Nguyen Tran Tien Phuc").strip()
    raw_pass = str(payload.get("app_password") or "").replace(" ", "").strip()
    if not raw_pass or raw_pass == "__SAVED__":
        raw_pass = saved_secret.get("app_password", "")
    app_password = raw_pass
    smtp_host = str(payload.get("smtp_host") or DEFAULT_SMTP_HOST).strip()
    smtp_port = int(payload.get("smtp_port") or DEFAULT_SMTP_PORT)
    attach_cv = str(payload.get("attach_cv") or "auto").strip().lower()
    delay_sec = max(0.0, min(10.0, float(payload.get("delay_sec", 0.6))))
    items: List[Dict[str, Any]] = payload.get("items") or []
    reuse_session = bool(payload.get("reuse_session", len(items) == 1))
    close_after = bool(payload.get("close_after", not reuse_session))
    verify_before_send = bool(payload.get("verify_before_send", True))
    fast_send = bool(payload.get("fast_send", False))
    allow_resend = bool(payload.get("allow_resend", False))
    reset_control = bool(payload.get("reset_control", False))

    if reset_control:
        with CONTROL_LOCK:
            BULK_CONTROL["paused"] = False
            BULK_CONTROL["stopped"] = False

    if not items:
        return {"ok": False, "error": "Danh sách email trống.", "results": []}

    sent_history = load_sent_history() if (mode == "live" and not allow_resend) else {"sent_ids": {}, "sent_emails": {}}
    results: List[Dict[str, Any]] = []

    if mode == "dry_run":
        for item in items:
            to_addr = str(item.get("to") or "").strip()
            subj = str(item.get("subject") or "").strip()
            body = str(item.get("body") or "").strip()
            valid = bool(to_addr and "@" in to_addr and subj and body)
            if valid and verify_before_send:
                v = verify_recipient_mailbox(to_addr)
                if v["status"] in ("INVALID_550", "NO_MX", "INVALID_SYNTAX"):
                    results.append(
                        {
                            "id": item.get("id"),
                            "company": item.get("company", ""),
                            "to": to_addr,
                            "subject": subj,
                            "status": "blocked_invalid_email",
                            "detail": f"Chặn gửi vì không tồn tại ({v['status']}): {v['detail']}",
                        }
                    )
                    continue
                detail_msg = f"Hợp lệ & {v['status']} ({v['mx']})"
            else:
                detail_msg = "Kiểm tra hợp lệ (chưa gửi thật)" if valid else "Thiếu email/tiêu đề/nội dung"
            results.append(
                {
                    "id": item.get("id"),
                    "company": item.get("company", ""),
                    "to": to_addr,
                    "subject": subj,
                    "status": "validated_dry_run" if valid else "skipped_invalid",
                    "detail": detail_msg,
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

    if mode == "live" and not allow_resend:
        pending_check = []
        for it in items:
            iid = str(it.get("id") or "").strip()
            iem = str(it.get("to") or "").strip().lower()
            if (iid and iid in sent_history["sent_ids"]) or (iem and iem in sent_history["sent_emails"]):
                results.append(
                    {
                        "id": it.get("id"),
                        "company": it.get("company", ""),
                        "to": iem,
                        "subject": str(it.get("subject") or ""),
                        "status": "skipped_already_sent",
                        "detail": "Đã gửi trước đó — tự động bỏ qua để tiếp tục từ email kế tiếp",
                    }
                )
            else:
                pending_check.append(it)
        if not pending_check:
            return {
                "ok": True,
                "mode": mode,
                "sent_count": 0,
                "skipped_count": len(results),
                "failed_count": 0,
                "results": results,
            }
        items = pending_check

    try:
        server = _get_or_open_smtp(smtp_host, smtp_port, sender_email, app_password)
    except Exception as exc:
        return {
            "ok": False,
            "error": f"Kết nối/Đăng nhập SMTP thất bại: {exc}",
            "results": [],
        }

    try:
        for idx, item in enumerate(items):
            while True:
                with CONTROL_LOCK:
                    stopped = BULK_CONTROL["stopped"]
                    paused = BULK_CONTROL["paused"]
                if stopped:
                    close_pooled_smtp()
                    return {
                        "ok": True,
                        "mode": mode,
                        "stopped": True,
                        "sent_count": sum(1 for r in results if r["status"] == "sent"),
                        "failed_count": sum(1 for r in results if r["status"] not in ("sent",)),
                        "results": results,
                    }
                if not paused:
                    break
                time.sleep(0.15)

            raw_to = str(item.get("to") or "").strip()
            item_id = str(item.get("id") or "").strip()
            target_to = sender_email if mode == "test_self" else raw_to
            subj = str(item.get("subject") or "").strip()
            if mode == "test_self":
                subj = f"[TEST-SELF -> {raw_to}] {subj}"
            body = str(item.get("body") or "").strip()
            job_lang = str(item.get("lang") or "vi")

            if mode == "live" and not allow_resend:
                already_by_id = bool(item_id and item_id in sent_history["sent_ids"])
                already_by_email = bool(target_to and target_to.lower() in sent_history["sent_emails"])
                if already_by_id or already_by_email:
                    results.append(
                        {
                            "id": item.get("id"),
                            "company": item.get("company", ""),
                            "to": target_to,
                            "subject": subj,
                            "status": "skipped_already_sent",
                            "detail": "Đã gửi trước đó — tự động bỏ qua để tiếp tục từ email kế tiếp",
                        }
                    )
                    continue

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

            if mode == "live" and verify_before_send:
                if fast_send:
                    dom = target_to.split("@", 1)[1].lower()
                    if not re.match(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$", target_to) or not dns_domain_exists(dom):
                        results.append(
                            {
                                "id": item.get("id"),
                                "company": item.get("company", ""),
                                "to": target_to,
                                "subject": subj,
                                "status": "blocked_invalid_email",
                                "detail": f"Đã chặn gửi: Tên miền {dom} không tồn tại trên DNS",
                            }
                        )
                        continue
                else:
                    v = verify_recipient_mailbox(target_to)
                    if v["status"] in ("INVALID_550", "NO_MX", "INVALID_SYNTAX"):
                        results.append(
                            {
                                "id": item.get("id"),
                                "company": item.get("company", ""),
                                "to": target_to,
                                "subject": subj,
                                "status": "blocked_invalid_email",
                                "detail": f"Đã chặn gửi để tránh bounce ({v['status']}): {v['detail']}",
                            }
                        )
                        continue

            quota_hit = False
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
                try:
                    server.send_message(msg)
                except smtplib.SMTPServerDisconnected:
                    server = _get_or_open_smtp(smtp_host, smtp_port, sender_email, app_password, force_new=True)
                    server.send_message(msg)
                if mode == "live":
                    record_sent_email(item_id, target_to, str(item.get("company") or ""), subj)
                    if item_id:
                        sent_history["sent_ids"][item_id] = {"email": target_to.lower()}
                    if target_to:
                        sent_history["sent_emails"][target_to.lower()] = {"id": item_id}
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
                err_str = str(send_exc)
                err_low = err_str.lower()
                is_quota = any(k in err_low for k in ("5.4.5", "daily user sending quota", "sending limit", "exceeded", "421 ", "454 ", "try again later"))
                results.append(
                    {
                        "id": item.get("id"),
                        "company": item.get("company", ""),
                        "to": target_to,
                        "subject": subj,
                        "status": "quota_exceeded" if is_quota else "failed",
                        "quota_exceeded": is_quota,
                        "detail": f"Chạm giới hạn gửi Gmail ({err_str[:120]}) — hãy Tạm dừng và gửi tiếp ngày hôm sau." if is_quota else err_str,
                    }
                )
                if is_quota:
                    quota_hit = True
                    close_pooled_smtp()
                    return {
                        "ok": True,
                        "mode": mode,
                        "quota_exceeded": True,
                        "sent_count": sum(1 for r in results if r["status"] == "sent"),
                        "failed_count": sum(1 for r in results if r["status"] != "sent"),
                        "results": results,
                    }

            if idx < len(items) - 1 and delay_sec > 0:
                time.sleep(delay_sec)
    finally:
        if close_after or not reuse_session:
            close_pooled_smtp()

    return {
        "ok": True,
        "mode": mode,
        "sent_count": sum(1 for r in results if r["status"] == "sent"),
        "skipped_count": sum(1 for r in results if r["status"] == "skipped_already_sent"),
        "failed_count": sum(1 for r in results if r["status"] not in ("sent", "skipped_already_sent")),
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
            saved = load_local_smtp_secret()
            hist = load_sent_history()
            self._send_json(
                200,
                {
                    "ok": True,
                    "service": "Phuc Nguyen Semi-Auto Bulk Mailer",
                    "root": str(ROOT_DIR),
                    "cv_assets": check_cv_assets(),
                    "default_sender": saved.get("sender_email") or DEFAULT_SENDER,
                    "has_saved_app_password": bool(saved.get("app_password")),
                    "sent_history_count": len(hist["sent_emails"]),
                    "sent_ids": list(hist["sent_ids"].keys()),
                    "sent_emails": list(hist["sent_emails"].keys()),
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

        if clean_path == "/api/crawl-worldwide":
            try:
                content_len = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(content_len).decode("utf-8")) if content_len > 0 else {}
                target_total = int(payload.get("target_total") or 1250)
                import worldwide_crawler
                result = worldwide_crawler.crawl_and_merge_worldwide(target_total=target_total)
                self._send_json(200, result)
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": f"Crawl error: {exc}"})
            return

        if clean_path == "/api/verify-emails":
            try:
                content_len = int(self.headers.get("Content-Length", "0"))
                if content_len <= 0 or content_len > 2 * 1024 * 1024:
                    self._send_json(400, {"ok": False, "error": "Payload size invalid."})
                    return
                payload = json.loads(self.rfile.read(content_len).decode("utf-8"))
                raw_emails = payload.get("emails") or []
                force = bool(payload.get("force", False))
                unique_list: List[str] = []
                seen = set()
                for e in raw_emails:
                    s = str(e or "").strip()
                    if s and s.lower() not in seen:
                        seen.add(s.lower())
                        unique_list.append(s)
                with ThreadPoolExecutor(max_workers=12) as ex:
                    results = list(ex.map(lambda em: verify_recipient_mailbox(em, force_refresh=force), unique_list))
                self._send_json(200, {
                    "ok": True,
                    "total": len(results),
                    "verified_count": sum(1 for r in results if r["status"] == "VERIFIED_250"),
                    "ok_count": sum(1 for r in results if r["ok"]),
                    "results": results,
                })
            except Exception as exc:
                self._send_json(500, {"ok": False, "error": f"Server error: {exc}"})
            return

        if clean_path == "/api/bulk-control":
            try:
                content_len = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(content_len).decode("utf-8")) if content_len > 0 else {}
                action = str(payload.get("action") or "").strip().lower()
                with CONTROL_LOCK:
                    if action == "pause":
                        BULK_CONTROL["paused"] = True
                    elif action == "resume":
                        BULK_CONTROL["paused"] = False
                    elif action == "stop":
                        BULK_CONTROL["paused"] = False
                        BULK_CONTROL["stopped"] = True
                    elif action == "reset":
                        BULK_CONTROL["paused"] = False
                        BULK_CONTROL["stopped"] = False
                    elif action == "clear_sent_history":
                        clear_sent_history()
                    state = dict(BULK_CONTROL)
                if action in ("stop", "reset", "close_smtp"):
                    close_pooled_smtp()
                self._send_json(200, {"ok": True, "action": action, "state": state})
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
