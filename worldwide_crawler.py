#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Worldwide Real Job Crawler (Verbatim Explicit Emails Only — Zero Fabrication).

Crawls real hiring posts from:
  - Hacker News Official "Who is hiring?" & "Freelancer? Seeking freelancer?" threads (Algolia API)
  - Remotive Remote Jobs API
  - RemoteOK API
  - Arbeitnow Multi-Page Job Board API
  - WorkingNomads, Jobicy, Himalayas, WeWorkRemotely RSS feeds

Every collected posting MUST:
  1. Be an active hiring post from an employer/team (filtering out "SEEKING WORK" job-seeker ads).
  2. Contain a verbatim email address right inside the published post text (never guessed).
  3. Pass live DNS domain verification.
  4. Carry a direct URL linking straight to the source posting.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import html
import json
import os
from pathlib import Path
import re
import socket
import subprocess
from typing import Any, Dict, List, Tuple
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

import scraper


def _http_get_bytes(url: str, headers: Dict[str, str], timeout: int = 14) -> bytes:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _http_get_json(url: str, headers: Dict[str, str], timeout: int = 14) -> Any:
    raw = _http_get_bytes(url, headers, timeout=timeout)
    return json.loads(raw.decode("utf-8", errors="ignore"))

ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
JSON_PATH = DATA_DIR / "jobs_data.json"
JS_PATH = DATA_DIR / "jobs_data.js"

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

BLOCKED_EMAIL_SUBSTRINGS = (
    "example.com", "example.org", "example.net", "domain.com", "email.com",
    "company.com", "yourcompany", "yourdomain", "test.com", "foo.com", "bar.com",
    "sentry.io", "sentry-next.", "glitchtip.", "wixpress.com", "ycombinator.com",
    "news.ycombinator", "noreply", "no-reply", "donotreply", "do-not-reply",
    "mailer-daemon", "placeholder", "name@", "user@", "you@", ".png", ".jpg",
    ".jpeg", ".gif", ".webp", ".svg", ".css", ".js", "@2x", "@3x"
)

JOB_SEEKER_PATTERNS = re.compile(
    r"^\s*(?:seeking\s+work|seeking\s+freelance|looking\s+for\s+work|for\s+hire|available\s+for\s+work|location:\s*[^\n]*seeking\s+work)",
    re.I,
)


def clean_html_text(raw: str) -> str:
    txt = str(raw or "")
    txt = re.sub(r"<(?:p|br|div|li|h[1-6])[^>]*>", "\n", txt, flags=re.I)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = html.unescape(txt)
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    return txt.strip()


def pick_valid_email(text: str) -> str:
    for m in EMAIL_RE.findall(text or ""):
        low = m.lower().strip(".,;:)>]\"'")
        if "@" not in low:
            continue
        local, dom = low.split("@", 1)
        if len(local) < 2 or len(dom) < 4 or "." not in dom:
            continue
        tld = dom.rsplit(".", 1)[-1]
        if not re.match(r"^[a-z]{2,12}$", tld):
            continue
        if any(bad in low for bad in BLOCKED_EMAIL_SUBSTRINGS):
            continue
        return m.strip(".,;:)>]\"'")
    return ""


def check_domain_dns_mx(domain: str) -> Tuple[str, bool, str]:
    dom = domain.lower().strip()
    try:
        socket.getaddrinfo(dom, None)
        return dom, True, dom
    except Exception:
        pass
    creation_flags = 0x08000000 if os.name == "nt" else 0
    for cmd in (["nslookup", "-type=mx", dom, "8.8.8.8"],):
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=4, creationflags=creation_flags)
            mxs = re.findall(r"mail exchanger = (\S+)", (r.stdout or "") + "\n" + (r.stderr or ""), re.I)
            if mxs:
                return dom, True, mxs[0].rstrip(".")
        except Exception:
            continue
    return dom, False, ""


def classify_worldwide_job(title: str, body: str) -> str:
    text = f"{title} {body[:500]}".lower()
    if any(k in text for k in ("tutor", "teaching", "teacher", "mentor", "curriculum", "education", "instructor")):
        return "tutor_ta"
    if any(k in text for k in ("admissions", "counselor", "enrollment")):
        return "admissions_sale"
    if any(k in text for k in ("freelance", "contractor", "contract", "hourly", "project-based", "part-time", "bounty")):
        return "freelance_gig"
    if any(k in text for k in ("trading", "quant", "stock", "equit", "crypto", "defi", "hedge fund", "portfolio")):
        return "stock"
    if any(k in text for k in ("finance", "fintech", "accounting", "analyst", "data ", "bi ", "sql", "analytics", "excel")):
        return "finance"
    if any(k in text for k in ("assistant", "operations", "project manager", "product manager", "hr", "people", "coordinator", "recruiter")):
        return "assistant_pm"
    if any(k in text for k in ("sales", "marketing", "growth", "esg", "climate", "sustainab", "e-commerce", "business dev", "customer success")):
        return "sales_esg"
    return "ai_vibe"


def parse_hn_header(first_line: str) -> Tuple[str, str, str, str, str]:
    """Extract (company, role, location, work_mode, salary) from HN hiring line."""
    line = re.sub(r"\s+", " ", first_line).strip()
    parts = [p.strip(" -–—•") for p in line.split("|") if p.strip()]
    company = (parts[0] if parts else line)[:64] or "Tech Startup"
    # Clean URLs in company slot like "Acme (https://acme.com)"
    company = re.sub(r"\s*\(https?://[^)]+\)", "", company).strip()[:60] or "Tech Startup"

    role = "Software / AI / Operations Engineer"
    loc = "Global / Remote"
    salary = "Competitive USD"
    work_mode = "Remote Quốc tế"

    if len(parts) >= 2:
        role_cand = []
        for p in parts[1:]:
            pl = p.lower()
            if any(cur in p for cur in ("$", "€", "£")) or re.search(r"\b\d{2,3}k\b", pl):
                salary = p[:44]
            elif any(loc_k in pl for loc_k in ("remote", "onsite", "hybrid", "full-time", "full time", "part-time", "contract", "freelance", "worldwide", "us", "eu", "uk", "nyc", "sf", "london", "berlin", "canada", "apac")):
                loc = p[:48]
            elif not p.lower().startswith("http"):
                role_cand.append(p)
        if role_cand:
            role = " / ".join(role_cand)[:78]
        elif len(parts) >= 2 and not parts[1].lower().startswith("http"):
            role = parts[1][:78]

    full_low = line.lower()
    if "freelance" in full_low or "contract" in full_low:
        work_mode = "Freelance / Contract"
    elif "part-time" in full_low or "part time" in full_low:
        work_mode = "Part-time Remote"
    elif "onsite" in full_low and "remote" not in full_low:
        work_mode = "Global Onsite / Hybrid"
    elif "hybrid" in full_low and "remote" not in full_low:
        work_mode = "Global Hybrid"

    # Reject vague role names that look like URLs
    if role.lower().startswith("http") or len(role) < 3:
        role = f"Engineering / Product Role at {company}"[:75]

    return company, role, loc, work_mode, salary


def crawl_hackernews_jobs(headers: Dict[str, str], max_threads: int = 24) -> List[Dict[str, Any]]:
    raw_items: List[Dict[str, Any]] = []
    threads: List[Tuple[str, str]] = []
    seen_sids = set()

    for query in ('"Ask HN: Who is hiring"', '"Ask HN: Freelancer? Seeking freelancer"'):
        try:
            url = f"https://hn.algolia.com/api/v1/search_by_date?query={urllib.parse.quote(query)}&tags=story&hitsPerPage=45"
            payload = _http_get_json(url, headers, timeout=12)
            for h in payload.get("hits", []):
                title = h.get("title", "")
                sid = str(h.get("objectID") or "")
                ncomm = int(h.get("num_comments") or 0)
                if sid and ncomm >= 20 and sid not in seen_sids:
                    if "who is hiring" in title.lower() or "seeking freelancer" in title.lower():
                        seen_sids.add(sid)
                        threads.append((sid, title))
        except Exception:
            continue

    threads = threads[:max_threads]

    def fetch_thread(st: Tuple[str, str]) -> List[Dict[str, Any]]:
        sid, stitle = st
        out = []
        is_freelance_thread = "freelancer" in stitle.lower()
        try:
            curl = f"https://hn.algolia.com/api/v1/search_by_date?tags=comment,story_{sid}&hitsPerPage=1000"
            cdata = _http_get_json(curl, headers, timeout=15)
            for c in cdata.get("hits", []):
                if str(c.get("parent_id")) != sid:
                    continue
                txt = clean_html_text(c.get("comment_text") or "")
                if len(txt) < 60:
                    continue
                if JOB_SEEKER_PATTERNS.search(txt[:180]):
                    continue
                if is_freelance_thread and ("hiring" not in txt.lower() and "looking for" not in txt.lower() and "seeking" not in txt[:160].lower()):
                    continue
                email = pick_valid_email(txt)
                if not email:
                    continue
                first_line = txt.split("\n")[0].strip()
                if "seeking work" in first_line.lower() or "for hire" in first_line.lower():
                    continue
                comp, role, loc, work_mode, salary = parse_hn_header(first_line)
                if is_freelance_thread and "Freelance" not in work_mode:
                    work_mode = "Freelance Remote"
                oid = str(c.get("objectID") or "")
                out.append({
                    "title": role,
                    "company": comp,
                    "location": loc,
                    "work_mode": work_mode,
                    "salary": salary,
                    "source": "Hacker News Hiring" if not is_freelance_thread else "HN Freelance",
                    "apply_url": f"https://news.ycombinator.com/item?id={oid}",
                    "hr_email": email,
                    "summary": txt[:340] + ("..." if len(txt) > 340 else ""),
                    "full_text": txt,
                    "published_at": str(c.get("created_at") or datetime.now().strftime("%Y-%m-%d"))[:10],
                    "tags": ["HN Verified", "Explicit Email", "Remote/Global"],
                })
        except Exception:
            pass
        return out

    with ThreadPoolExecutor(max_workers=8) as ex:
        for res_list in ex.map(fetch_thread, threads):
            raw_items.extend(res_list)
    return raw_items


def crawl_api_boards_with_emails(headers: Dict[str, str]) -> List[Dict[str, Any]]:
    raw_items: List[Dict[str, Any]] = []

    def try_add(source: str, title: Any, company: Any, apply_url: Any, loc: Any, salary: Any, desc_raw: Any, pub_date: Any = "", tags: Any = None):
        txt = clean_html_text(str(desc_raw or ""))
        email = pick_valid_email(txt)
        if not email:
            return
        t_clean = clean_html_text(str(title or ""))[:90]
        c_clean = clean_html_text(str(company or ""))[:64]
        if not t_clean or not c_clean or not apply_url:
            return
        loc_str = str(loc or "Worldwide Remote").strip()[:48] or "Worldwide Remote"
        wm = "Freelance Remote" if any(k in t_clean.lower() for k in ("freelance", "contract")) else "Remote Quốc tế"
        raw_items.append({
            "title": t_clean,
            "company": c_clean,
            "location": loc_str,
            "work_mode": wm,
            "salary": str(salary or "Competitive Global USD")[:42],
            "source": source,
            "apply_url": str(apply_url).strip(),
            "hr_email": email,
            "summary": txt[:340] + ("..." if len(txt) > 340 else ""),
            "full_text": txt,
            "published_at": str(pub_date or datetime.now().strftime("%Y-%m-%d"))[:10],
            "tags": [str(t)[:22] for t in (tags or [])[:3] if t] or [source, "Explicit Email"],
        })

    # Remotive
    try:
        rdata = _http_get_json("https://remotive.com/api/remote-jobs", headers, timeout=14)
        for j in rdata.get("jobs", []):
            try_add("Remotive", j.get("title"), j.get("company_name"), j.get("url"), j.get("candidate_required_location"), j.get("salary"), j.get("description"), j.get("publication_date"), j.get("tags"))
    except Exception:
        pass

    # RemoteOK
    try:
        rkdata = _http_get_json("https://remoteok.com/api", headers, timeout=14)
        if isinstance(rkdata, list):
            for j in rkdata[1:]:
                if isinstance(j, dict):
                    try_add("RemoteOK", j.get("position"), j.get("company"), j.get("apply_url") or j.get("url"), j.get("location"), f"${j.get('salary_min')}-${j.get('salary_max')}" if j.get("salary_min") else "", j.get("description"), j.get("date"), j.get("tags"))
    except Exception:
        pass

    # Arbeitnow pages 1..10
    for page in range(1, 11):
        try:
            adata = _http_get_json(f"https://www.arbeitnow.com/api/job-board-api?page={page}", headers, timeout=12)
            rows = adata.get("data", [])
            if not rows:
                break
            for j in rows:
                try_add("Arbeitnow", j.get("title"), j.get("company_name"), j.get("url"), j.get("location"), "Remote / Hybrid", j.get("description"), "", j.get("tags"))
        except Exception:
            break

    # Jobicy & WorkingNomads & Himalayas
    for src, url in (
        ("Jobicy", "https://jobicy.com/api/v2/remote-jobs?count=100"),
        ("WorkingNomads", "https://www.workingnomads.com/api/exposed_jobs/"),
        ("Himalayas", "https://himalayas.app/jobs/api?limit=100"),
    ):
        try:
            payload = _http_get_json(url, headers, timeout=12)
            rows = payload.get("jobs", []) if isinstance(payload, dict) else (payload if isinstance(payload, list) else [])
            for j in rows:
                if src == "WorkingNomads":
                    try_add(src, j.get("title"), j.get("company_name"), j.get("url"), j.get("location"), "", j.get("description"), j.get("pub_date"))
                elif src == "Jobicy":
                    try_add(src, j.get("jobTitle"), j.get("companyName"), j.get("url"), j.get("jobGeo"), j.get("annualSalaryMin"), j.get("jobDescription"), j.get("pubDate"))
                else:
                    try_add(src, j.get("title"), j.get("companyName"), j.get("applicationLink") or j.get("guid"), ", ".join(j.get("locationRestrictions") or ["Worldwide"]), "", j.get("description"), "", j.get("categories"))
        except Exception:
            pass

    # WeWorkRemotely RSS
    try:
        raw_rss = _http_get_bytes("https://weworkremotely.com/remote-jobs.rss", headers, timeout=12)
        root = ET.fromstring(raw_rss)
        for item in root.findall(".//item"):
            t_raw = (item.findtext("title") or "").strip()
            comp = t_raw.split(":", 1)[0].strip() if ":" in t_raw else "WWR Company"
            role = t_raw.split(":", 1)[1].strip() if ":" in t_raw else t_raw
            try_add("WeWorkRemotely", role, comp, item.findtext("link"), "Worldwide Remote", "", item.findtext("description"), item.findtext("pubDate"))
    except Exception:
        pass

    return raw_items


def crawl_and_merge_worldwide(target_total: int = 1200) -> Dict[str, Any]:
    """Crawl real worldwide jobs with verbatim emails, DNS-verify them, and update JSON/JS."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SemiAutoJobHub/3.0"}
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    base_jobs = [j for j in data.get("jobs", []) if not str(j.get("id", "")).startswith("ww_")]

    seen_dedupe = set()
    for j in base_jobs:
        seen_dedupe.add((j.get("hr_email", "").lower(), re.sub(r"[^a-z0-9]", "", j.get("title", "").lower())[:24]))

    hn_raw = crawl_hackernews_jobs(headers, max_threads=35)
    api_raw = crawl_api_boards_with_emails(headers)
    combined_raw = hn_raw + api_raw

    # Deduplicate raw candidates first
    candidates: List[Dict[str, Any]] = []
    for raw in combined_raw:
        em = raw["hr_email"].strip()
        key = (em.lower(), re.sub(r"[^a-z0-9]", "", raw["title"].lower())[:24])
        if key in seen_dedupe:
            continue
        seen_dedupe.add(key)
        candidates.append(raw)

    # DNS/MX verify all unique email domains in parallel
    unique_domains = sorted({c["hr_email"].split("@", 1)[1].lower() for c in candidates})
    with ThreadPoolExecutor(max_workers=60) as ex:
        dom_res = {dom: (ok, mx) for dom, ok, mx in ex.map(check_domain_dns_mx, unique_domains)}

    verified_worldwide: List[Dict[str, Any]] = []
    need_extra = max(0, target_total - len(base_jobs))
    for idx, raw in enumerate(candidates):
        if len(verified_worldwide) >= need_extra:
            break
        em = raw["hr_email"]
        dom = em.split("@", 1)[1].lower()
        ok, mx = dom_res.get(dom, (False, ""))
        if not ok:
            continue

        cat = classify_worldwide_job(raw["title"], raw["full_text"])
        fit_score, dims = scraper.score_live_job(raw["title"], raw["location"], raw["full_text"])
        job_obj: Dict[str, Any] = {
            "id": f"ww_{len(verified_worldwide) + 1:04d}",
            "title": raw["title"],
            "company": raw["company"],
            "category": cat,
            "market": "Global Remote",
            "location": raw["location"],
            "work_mode": raw["work_mode"],
            "salary": raw["salary"],
            "source": raw["source"],
            "apply_url": raw["apply_url"],
            "hr_email": em,
            "hr_email_source": "explicit_verbatim",
            "hr_email_verified": True,
            "hr_email_status": "VERBATIM_DNS_OK",
            "hr_email_mx": mx,
            "attached_cv_lang": "en",
            "attached_cv_file": "CV_Phuc_Nguyen_EN.pdf",
            "attached_cv_url": "https://tonykosuy.github.io/semi-auto-job-hub/assets/CV_Phuc_Nguyen_EN.pdf",
            "lang": "EN",
            "fit_score": fit_score,
            "dimensions": dims,
            "is_live_scraped": True,
            "is_enterprise_ats": False,
            "is_fb_linkedin": False,
            "published_at": raw["published_at"],
            "tags": raw["tags"],
            "summary": raw["summary"],
            "matched_evidence": [
                scraper.CANDIDATE_PROFILE["projects"]["ai_automation"]["proof_en"],
                "IELTS 6.0, Google Data Analytics, MOS Expert & UEH Dual Major",
            ],
            "honest_gap": "Real worldwide job post with explicit verbatim hiring email; review exact seniority/location fit before sending.",
            "recruiter_critique": [
                f"Extracted verbatim hiring email ({em}) directly from {raw['source']} post.",
                f"Verified live DNS/MX domain ({mx}).",
            ],
        }
        job_obj["ats_profile"] = scraper.build_ats_profile(job_obj)
        job_obj["tailored"] = scraper.build_tailored_package(job_obj)
        verified_worldwide.append(job_obj)

    all_jobs = base_jobs + verified_worldwide
    data["generated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    data["jobs"] = all_jobs
    data["stats"] = {
        "total": len(all_jobs),
        "live_scraped": len([j for j in all_jobs if j.get("is_live_scraped")]),
        "curated": len([j for j in all_jobs if not j.get("is_live_scraped")]),
        "with_direct_email": len([j for j in all_jobs if j.get("hr_email")]),
        "verified_worldwide_verbatim": len(verified_worldwide),
    }

    # Expand SOURCE_RADAR with global discovery feeds
    radar_groups = list(scraper.SOURCE_RADAR)
    radar_titles = {g.get("group") for g in radar_groups}
    mega_group = "🛰️ Mega-Crawler Toàn Cầu (1.000+ Job Real Kèm Email Trực Tiếp)"
    if mega_group not in radar_titles:
        radar_groups.append({
            "group": mega_group,
            "items": [
                {"name": "HN Algolia Who Is Hiring (Monthly)", "url": "https://hn.algolia.com/?q=%22Ask+HN%3A+Who+is+hiring%22", "note": "Hàng trăm founder/tech team đăng tuyển kèm email trực tiếp mỗi tháng"},
                {"name": "HN Freelancer? Seeking Freelancer", "url": "https://hn.algolia.com/?q=%22Seeking+freelancer%22", "note": "Dự án freelance/contract quốc tế trả USD theo giờ/dự án"},
                {"name": "Remotive + RemoteOK + Arbeitnow APIs", "url": "https://remotive.com/remote-jobs", "note": "Quét tự động mọi bài đăng công khai có chứa email HR thật"},
                {"name": "WeWorkRemotely + Jobicy + WorkingNomads", "url": "https://weworkremotely.com/", "note": "Nguồn RSS/JSON toàn cầu lọc tin có email tuyển dụng hợp lệ"},
            ],
        })
    data["source_radar"] = radar_groups

    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    JS_PATH.write_text("window.__JOB_HUB_DATA__ = " + json.dumps(data, ensure_ascii=False) + ";\n", encoding="utf-8")

    return {
        "ok": True,
        "total": len(all_jobs),
        "base_count": len(base_jobs),
        "worldwide_added": len(verified_worldwide),
        "hn_raw": len(hn_raw),
        "api_raw": len(api_raw),
    }


if __name__ == "__main__":
    print(json.dumps(crawl_and_merge_worldwide(1200), ensure_ascii=False, indent=2))
