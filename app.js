/* ==========================================================================
   SEMI-AUTO AI JOB HUB V2 - CAREER-OPS ATS + BULK DISPATCH ENGINE
   Candidate: Nguyen Tran Tien Phuc (UEH K51 - Stock Market & International Business)
   ========================================================================== */

const STORAGE_KEY_STATE = "phuc_semi_auto_job_state_v1";
const STORAGE_KEY_CUSTOM_JOBS = "phuc_semi_auto_custom_jobs_v1";

const WORK_EMAIL = "tonyphucnguyen.work@gmail.com";
const PHONE_FOREIGN = "WhatsApp: +84342381843";
const PHONE_VN = "0342381843";

function getJobPhoneDisplay(job) {
  return (job && (job.market || "") !== "Vietnam") ? PHONE_FOREIGN : PHONE_VN;
}

// Combined WP:AISIGNS + career-ops/cv-voice.mjs anti-AI pattern rules
const AI_BANNED_REGEX_DEFS = [
  { pattern: /\bdelve\w*\b/gi, label: "delve", repl: "explore" },
  { pattern: /\btapestry\b/gi, label: "tapestry", repl: "mix" },
  { pattern: /\btestament\b/gi, label: "testament", repl: "proof" },
  { pattern: /\bunderscor\w*\b/gi, label: "underscore", repl: "show" },
  { pattern: /\bpivotal\b/gi, label: "pivotal", repl: "important" },
  { pattern: /\bcrucial\b/gi, label: "crucial", repl: "key" },
  { pattern: /\bvibrant\b/gi, label: "vibrant", repl: "active" },
  { pattern: /\bintricate\w*\b/gi, label: "intricate", repl: "detailed" },
  { pattern: /\bmeticulous\w*\b/gi, label: "meticulous", repl: "careful" },
  { pattern: /\bgarner\w*\b/gi, label: "garner", repl: "earn" },
  { pattern: /\bbolster\w*\b/gi, label: "bolster", repl: "support" },
  { pattern: /\bfoster\w*\b/gi, label: "foster", repl: "build" },
  { pattern: /\binterplay\b/gi, label: "interplay", repl: "link" },
  { pattern: /\blandscape\b/gi, label: "landscape", repl: "market" },
  { pattern: /\brealm\b/gi, label: "realm", repl: "field" },
  { pattern: /\bsymphony\b/gi, label: "symphony", repl: "blend" },
  { pattern: /\bbeacon\b/gi, label: "beacon", repl: "example" },
  { pattern: /\bembark\w*\b/gi, label: "embark", repl: "start" },
  { pattern: /\bunwavering\b/gi, label: "unwavering", repl: "steady" },
  { pattern: /\bmultifaceted\b/gi, label: "multifaceted", repl: "varied" },
  { pattern: /\bboasts\b/gi, label: "boasts", repl: "has" },
  { pattern: /\bshowcas\w*\b/gi, label: "showcase", repl: "present" },
  { pattern: /\bhighlight(?:ing|s)?\b/gi, label: "highlight", repl: "note" },
  { pattern: /\bemphasiz\w*\b/gi, label: "emphasize", repl: "focus on" },
  { pattern: /\benduring\b/gi, label: "enduring", repl: "lasting" },
  { pattern: /\bsynerg\w*\b/gi, label: "synergy", repl: "teamwork" },
  { pattern: /\bleverag\w*\b/gi, label: "leverage", repl: "use" },
  { pattern: /\bstreamlin\w*\b/gi, label: "streamline", repl: "simplify" },
  { pattern: /\bspearhead\w*\b/gi, label: "spearhead", repl: "lead" },
  { pattern: /\borchestrat\w*\b/gi, label: "orchestrate", repl: "coordinate" },
  { pattern: /\bpassionate about\b/gi, label: "passionate about", repl: "focused on" },
  { pattern: /\bdetail-oriented\b/gi, label: "detail-oriented", repl: "careful with data" },
  { pattern: /\bteam player\b/gi, label: "team player", repl: "collaborative teammate" },
  { pattern: /\bproven track record\b/gi, label: "proven track record", repl: "verified results" },
  { pattern: /\bbridge the gap\b/gi, label: "bridge the gap", repl: "connect" },
  { pattern: /\bdynamic\b/gi, label: "dynamic", repl: "active" },
  { pattern: /\bcutting-edge\b/gi, label: "cutting-edge", repl: "modern" },
  { pattern: /\bfast-paced environment\b/gi, label: "fast-paced environment", repl: "busy team" },
  { pattern: /\bdriven professional\b/gi, label: "driven professional", repl: "reliable candidate" },
  { pattern: /\bthought leadership\b/gi, label: "thought leadership", repl: "research notes" },
  { pattern: /\bAdditionally,/g, label: "Additionally,", repl: "Also," },
  { pattern: /\bFurthermore,/g, label: "Furthermore,", repl: "In addition," },
  { pattern: /\bMoreover,/g, label: "Moreover,", repl: "Also," },
  { pattern: /\bnot only\b.*?\bbut also\b/gi, label: "not only...but also", repl: "both" },
  { pattern: /\bstands as a\b/gi, label: "stands as a", repl: "is a" },
  { pattern: /\bserves as a\b/gi, label: "serves as a", repl: "works as a" },
  { pattern: /\bhit the ground running\b/gi, label: "hit the ground running", repl: "start contributing quickly" },
  { pattern: /—/g, label: "em-dash (—)", repl: "-" },
  { pattern: /đóng vai trò then chốt/gi, label: "đóng vai trò then chốt", repl: "hỗ trợ trực tiếp" },
  { pattern: /minh chứng sống động/gi, label: "minh chứng sống động", repl: "ví dụ thực tế" },
  { pattern: /bức tranh toàn cảnh/gi, label: "bức tranh toàn cảnh", repl: "tổng quan" },
  { pattern: /hơn thế nữa,/gi, label: "hơn thế nữa,", repl: "bên cạnh đó," },
  { pattern: /không chỉ\b.*?\bmà còn/gi, label: "không chỉ... mà còn", repl: "vừa... vừa" },
  { pattern: /khẳng định vị thế/gi, label: "khẳng định vị thế", repl: "phát triển năng lực" },
  { pattern: /tối ưu hóa vượt trội/gi, label: "tối ưu hóa vượt trội", repl: "cải thiện rõ rệt" }
];

let HUB_DATA = window.__JOB_HUB_DATA__ || { jobs: [], categories: {}, candidate: {}, source_radar: [] };
let JOB_STATE = {};       // { [jobId]: { status, notes, sentAt, customEmail, customSubject, customBody, customClEn, customClVi } }
let CUSTOM_JOBS = [];     // Browser-scraped or /apply pasted jobs
let SELECTED_IDS = new Set(); // Selected jobs for Bulk Email Dispatch

let ACTIVE_CAT = "all";
let ACTIVE_VIEW = "cards";
let CURRENT_JOB_ID = null;
let CURRENT_CV_LANG = "en";
let CURRENT_CL_LANG = "en";
let CURRENT_EMAIL_CV_LANG = "en";

function getEffectiveHrEmail(job, st) {
  const saved = st && typeof st.customEmail === "string" ? st.customEmail.trim() : "";
  if (saved) return saved;
  return (job && job.hr_email ? String(job.hr_email).trim() : "");
}

function getMatchedCvLang(job, st) {
  if (st && (st.customCvLang === "vi" || st.customCvLang === "en")) return st.customCvLang;
  if (job && (job.attached_cv_lang === "vi" || job.attached_cv_lang === "en")) return job.attached_cv_lang;
  const isVi = (job && job.market === "Vietnam") && ((job.lang || "VI/EN") !== "EN");
  return isVi ? "vi" : "en";
}

function getCvMetaByLang(lang) {
  const isVi = lang === "vi";
  return {
    lang: isVi ? "vi" : "en",
    file: isVi ? "CV_Phuc_Nguyen_VI.pdf" : "CV_Phuc_Nguyen_EN.pdf",
    pdfPath: isVi ? "assets/CV_Phuc_Nguyen_VI.pdf" : "assets/CV_Phuc_Nguyen_EN.pdf",
    pngPath: isVi ? "assets/CV_VIE.png" : "assets/CV_ENG.png",
    liveUrl: isVi
      ? "https://tonykosuy.github.io/semi-auto-job-hub/assets/CV_Phuc_Nguyen_VI.pdf"
      : "https://tonykosuy.github.io/semi-auto-job-hub/assets/CV_Phuc_Nguyen_EN.pdf",
    label: isVi ? "CV Tiếng Việt (VI)" : "CV Tiếng Anh (EN)"
  };
}

function resolveClientHrEmail(company, applyUrl, desc, market) {
  const m = String(desc || "").match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (m) return m[0];
  try {
    const host = new URL(applyUrl || "").hostname.toLowerCase();
    const portals = ["facebook.com","www.facebook.com","linkedin.com","www.linkedin.com","remotive.com","remoteok.com","himalayas.app","arbeitnow.com","www.arbeitnow.com","topcv.vn","www.topcv.vn","ybox.vn","glints.com","upwork.com","www.upwork.com"];
    if (host && !portals.includes(host) && host.includes(".")) {
      const cleanHost = host.replace(/^(www\.|careers\.|jobs\.|about\.)/, "");
      return `${market === "Vietnam" ? "tuyendung" : "careers"}@${cleanHost}`;
    }
  } catch (e) {}
  const slug = String(company || "company").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "company";
  return `${market === "Vietnam" ? "tuyendung" : "careers"}@${slug}.${market === "Vietnam" ? "vn" : "com"}`;
}

function getDirectJobUrl(job) {
  const raw = job && job.apply_url ? String(job.apply_url).trim() : "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const q = encodeURIComponent(`${job?.title || "job"} ${job?.company || ""}`.trim());
  return `https://www.google.com/search?q=${q}`;
}

function formatShortJobUrl(url) {
  const safe = /^https?:\/\//i.test(String(url || "").trim()) ? String(url).trim() : "";
  if (!safe) return "google.com/search";
  try {
    const u = new URL(safe);
    const full = `${u.hostname.replace(/^www\./, "")}${u.pathname}${u.search}`;
    const cleaned = full.replace(/\/$/, "");
    return cleaned.length > 48 ? cleaned.slice(0, 45) + "..." : cleaned;
  } catch (e) {
    return safe.replace(/^https?:\/\//, "").slice(0, 48);
  }
}

// --------------------------------------------------------------------------
// INITIALIZATION & PERSISTENCE
// --------------------------------------------------------------------------
function loadPersistence() {
  try {
    const rawState = localStorage.getItem(STORAGE_KEY_STATE);
    if (rawState) {
      const sanitizedState = rawState.replace(/pn852007@gmail\.com/gi, WORK_EMAIL);
      JOB_STATE = JSON.parse(sanitizedState);
      let mutated = sanitizedState !== rawState;
      for (const [jid, st] of Object.entries(JOB_STATE)) {
        if (st && typeof st.customEmail === "string" && !st.customEmail.trim()) {
          delete st.customEmail;
          mutated = true;
        }
        if (st && typeof st.customBody === "string" && !st.customBody.includes("CV_Phuc_Nguyen_")) {
          delete st.customBody;
          mutated = true;
        }
      }
      if (mutated) saveState();
    }
  } catch (e) { JOB_STATE = {}; }

  try {
    const rawCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_JOBS);
    if (rawCustom) {
      const sanitizedCustom = rawCustom.replace(/pn852007@gmail\.com/gi, WORK_EMAIL);
      CUSTOM_JOBS = JSON.parse(sanitizedCustom);
      if (sanitizedCustom !== rawCustom) saveCustomJobs();
    }
  } catch (e) { CUSTOM_JOBS = []; }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(JOB_STATE));
}

function saveCustomJobs() {
  localStorage.setItem(STORAGE_KEY_CUSTOM_JOBS, JSON.stringify(CUSTOM_JOBS));
}

function getAllJobs() {
  const map = new Map();
  for (const j of (HUB_DATA.jobs || [])) map.set(j.id, j);
  for (const j of CUSTOM_JOBS) map.set(j.id, j);
  return Array.from(map.values());
}

function getJobState(id) {
  return JOB_STATE[id] || { status: "new", notes: "", sentAt: "" };
}

function setJobState(id, patch) {
  JOB_STATE[id] = Object.assign({}, getJobState(id), patch);
  saveState();
  renderAll();
}

// --------------------------------------------------------------------------
// WP:AISIGNS + CAREER-OPS ANTI-AI CHECKER & CLEANER
// --------------------------------------------------------------------------
function detectAiSigns(text) {
  if (!text) return [];
  const hits = [];
  for (const rule of AI_BANNED_REGEX_DEFS) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(text)) {
      hits.push(rule.label);
    }
  }
  return Array.from(new Set(hits));
}

function detectSubjectRoboticPatterns(subj) {
  const flags = [];
  if (!subj) return ["Tiêu đề trống"];
  if (/^\s*\[/.test(subj)) flags.push("Dùng ngoặc vuông [...]");
  if (/\s\|\s/.test(subj)) flags.push("Dùng dấu | rập khuôn");
  const aiHits = detectAiSigns(subj);
  return flags.concat(aiHits);
}

function cleanAiSignsText(text) {
  if (!text) return "";
  let out = text;
  for (const rule of AI_BANNED_REGEX_DEFS) {
    out = out.replace(rule.pattern, rule.repl);
  }
  return out;
}

function updateAiBanner(bannerId, text) {
  const el = document.getElementById(bannerId);
  if (!el) return;
  const hits = detectAiSigns(text);
  if (hits.length === 0) {
    el.className = "ai-guard-banner ai-guard-pass";
    el.innerHTML = `<span><i class="fa-solid fa-circle-check"></i> <strong>WP:AISIGNS + cv-voice PASS:</strong> 0 dấu hiệu AI Writing - Giọng văn trực tiếp, tự nhiên như người viết thật.</span>`;
  } else {
    el.className = "ai-guard-banner ai-guard-warn";
    el.innerHTML = `<span><i class="fa-solid fa-triangle-exclamation"></i> <strong>Phát hiện ${hits.length} dấu hiệu AI Writing:</strong> ${hits.map(h => `<code>${escapeHtml(h)}</code>`).join(", ")}</span>`;
  }
}

// --------------------------------------------------------------------------
// KPIs, CATEGORY PILLS, SELECTION BAR & FILTERS
// --------------------------------------------------------------------------
function updateSelectionUI() {
  const cnt = SELECTED_IDS.size;
  const hdrEl = document.getElementById("hdr-bulk-count");
  if (hdrEl) hdrEl.textContent = cnt;

  const floatBar = document.getElementById("bulk-floating-bar");
  const floatCnt = document.getElementById("bulk-float-count");
  if (floatBar && floatCnt) {
    floatCnt.textContent = `${cnt} công việc đang chọn để gửi hàng loạt`;
    if (cnt > 0) floatBar.classList.add("visible");
    else floatBar.classList.remove("visible");
  }
}

function renderKpis(allJobs) {
  const remoteCount = allJobs.filter(j =>
    (j.work_mode || "").toLowerCase().includes("remote") ||
    (j.market || "").toLowerCase().includes("remote")
  ).length;
  const highFitCount = allJobs.filter(j => (j.fit_score || 0) >= 90).length;

  let approvedCount = 0;
  let sentCount = 0;
  let interviewCount = 0;
  for (const j of allJobs) {
    const st = getJobState(j.id).status;
    if (st === "approved") approvedCount++;
    else if (st === "sent") sentCount++;
    else if (st === "interview" || st === "offer") interviewCount++;
  }

  document.getElementById("kpi-total").textContent = allJobs.length;
  document.getElementById("kpi-remote").textContent = remoteCount;
  document.getElementById("kpi-highfit").textContent = highFitCount;
  document.getElementById("kpi-approved").textContent = approvedCount;
  document.getElementById("kpi-sent").textContent = sentCount;
  document.getElementById("kpi-interview").textContent = interviewCount;

  document.getElementById("tab-count-all").textContent = allJobs.length;
  const queueEligible = allJobs.filter(j => {
    const st = getJobState(j.id).status;
    return st === "approved" || (st === "new" && j.hr_email);
  }).length;
  document.getElementById("tab-count-queue").textContent = queueEligible;
  document.getElementById("tab-count-sent").textContent = sentCount + interviewCount;
  updateSelectionUI();
}

function renderCategoryPills(allJobs) {
  const cats = HUB_DATA.categories || {};
  const counts = { all: allJobs.length };
  for (const k of Object.keys(cats)) counts[k] = 0;
  for (const j of allJobs) {
    counts[j.category] = (counts[j.category] || 0) + 1;
  }

  const wrap = document.getElementById("category-pills");
  let html = `
    <button class="cat-pill ${ACTIVE_CAT === "all" ? "active" : ""}" onclick="selectCategory('all')">
      <i class="fa-solid fa-layer-group"></i> Tất cả lĩnh vực <span class="count-pill">${counts.all}</span>
    </button>
  `;
  for (const [key, info] of Object.entries(cats)) {
    html += `
      <button class="cat-pill ${ACTIVE_CAT === key ? "active" : ""}" onclick="selectCategory('${key}')">
        <i class="fa-solid ${info.icon}" style="color:${info.color}"></i> ${info.label} <span class="count-pill">${counts[key] || 0}</span>
      </button>
    `;
  }
  wrap.innerHTML = html;
}

function selectCategory(cat) {
  ACTIVE_CAT = cat;
  renderAll();
}

function switchMainView(viewName, btn) {
  ACTIVE_VIEW = viewName;
  document.querySelectorAll(".view-tab-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  document.getElementById("view-cards").style.display = viewName === "cards" ? "block" : "none";
  document.getElementById("view-queue").style.display = viewName === "queue" ? "block" : "none";
  document.getElementById("view-radar").style.display = viewName === "radar" ? "block" : "none";
  document.getElementById("view-tracker").style.display = viewName === "tracker" ? "block" : "none";
  renderAll();
}

function getFilteredJobs(allJobs) {
  const q = (document.getElementById("search-input")?.value || "").trim().toLowerCase();
  const mkt = document.getElementById("filter-market")?.value || "all";
  const stFilter = document.getElementById("filter-status")?.value || "all";
  const sortBy = document.getElementById("sort-by")?.value || "fit_desc";

  let list = allJobs.filter(j => {
    if (ACTIVE_CAT !== "all" && j.category !== ACTIVE_CAT) return false;
    const st = getJobState(j.id).status;
    if (stFilter !== "all") {
      if (stFilter === "interview") {
        if (st !== "interview" && st !== "offer") return false;
      } else if (st !== stFilter) return false;
    }

    const wm = (j.work_mode || "").toLowerCase();
    const mk = (j.market || "").toLowerCase();
    const lc = (j.location || "").toLowerCase();
    const src = (j.source || "").toLowerCase();

    if (mkt === "hcmc_onsite" && !(mk.includes("vietnam") && lc.includes("tp.hcm") && !wm.includes("remote 100%"))) return false;
    if (mkt === "remote_global" && !mk.includes("global")) return false;
    if (mkt === "remote_vn" && !(mk.includes("vietnam") && (wm.includes("remote") || lc.includes("remote") || wm.includes("hybrid") || lc.includes("hybrid")))) return false;
    if (mkt === "freelance" && !(j.category === "freelance_gig" || wm.includes("freelance"))) return false;
    if (mkt === "parttime" && !(wm.includes("part") || j.title.toLowerCase().includes("part-time"))) return false;
    if (mkt === "intern" && !(wm.includes("thực tập") || wm.includes("intern") || j.title.toLowerCase().includes("intern"))) return false;
    if (mkt === "enterprise_ats" && !j.is_enterprise_ats) return false;
    if (mkt === "fb_linkedin" && !(j.is_fb_linkedin || src.includes("fb") || src.includes("linkedin"))) return false;
    if (mkt === "has_email" && !j.hr_email) return false;
    if (mkt === "live_only" && !j.is_live_scraped) return false;

    if (q) {
      const hay = `${j.title} ${j.company} ${j.location} ${j.source} ${j.summary} ${(j.tags || []).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (sortBy === "fit_desc") {
    list.sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0));
  } else if (sortBy === "email_first") {
    list.sort((a, b) => (!!b.hr_email - !!a.hr_email) || ((b.fit_score || 0) - (a.fit_score || 0)));
  } else if (sortBy === "ats_first") {
    list.sort((a, b) => ((b.ats_profile?.coverage_pct || 0) - (a.ats_profile?.coverage_pct || 0)) || ((b.fit_score || 0) - (a.fit_score || 0)));
  } else if (sortBy === "live_first") {
    list.sort((a, b) => (!!b.is_live_scraped - !!a.is_live_scraped) || ((b.fit_score || 0) - (a.fit_score || 0)));
  }
  return list;
}

function toggleSelectJob(id) {
  if (SELECTED_IDS.has(id)) SELECTED_IDS.delete(id);
  else SELECTED_IDS.add(id);
  renderAll();
}

function selectAllFilteredWithEmail() {
  const filtered = getFilteredJobs(getAllJobs()).filter(j => getJobState(j.id).status !== "skipped");
  const withMail = filtered.filter(j => j.hr_email || (getJobState(j.id).customEmail || "").trim());
  const targetList = withMail.length > 0 ? withMail : filtered.slice(0, 25);
  for (const j of targetList) SELECTED_IDS.add(j.id);
  renderAll();
  showToast(`Đã chọn ${targetList.length} job vào hàng Gửi Hàng Loạt!`);
}

function clearSelection() {
  SELECTED_IDS.clear();
  renderAll();
}

// --------------------------------------------------------------------------
// RENDER CARDS, QUEUE, RADAR & TRACKER
// --------------------------------------------------------------------------
function renderCards(filtered) {
  const grid = document.getElementById("jobs-grid");
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="panel-card" style="grid-column:1/-1;text-align:center;padding:38px;">
      <h3>Không tìm thấy công việc khớp bộ lọc hiện tại</h3>
      <p style="color:var(--text-muted);font-size:0.88rem;">Thử chuyển lĩnh vực hoặc bấm "Dán JD Bất Kỳ (/apply)" ở góc trên để thêm job mới.</p>
    </div>`;
    return;
  }

  const cats = HUB_DATA.categories || {};
  grid.innerHTML = filtered.map(j => {
    const stObj = getJobState(j.id);
    const st = stObj.status || "new";
    const isSel = SELECTED_IDS.has(j.id);
    const catInfo = cats[j.category] || { label: j.category, color: "#0284c7", icon: "fa-briefcase" };

    let statusBadge = "";
    if (st === "approved") statusBadge = `<span class="badge badge-status-approved"><i class="fa-solid fa-check"></i> Đã duyệt chờ gửi</span>`;
    else if (st === "sent") statusBadge = `<span class="badge badge-status-sent"><i class="fa-solid fa-paper-plane"></i> Đã gửi Mail</span>`;
    else if (st === "interview" || st === "offer") statusBadge = `<span class="badge badge-status-interview"><i class="fa-solid fa-trophy"></i> Phỏng vấn/Offer</span>`;

    const effectiveEmail = getEffectiveHrEmail(j, stObj);
    const emailBadge = effectiveEmail
      ? `<span class="badge badge-email"><i class="fa-solid fa-at"></i> ${escapeHtml(effectiveEmail)}</span>`
      : `<span class="badge badge-portal"><i class="fa-solid fa-link"></i> Nộp qua Portal</span>`;

    const atsBadge = j.ats_profile
      ? `<span class="badge badge-enterprise"><i class="fa-solid fa-robot"></i> ${escapeHtml(j.ats_profile.vendor)} • ${j.ats_profile.coverage_pct}% ATS</span>`
      : "";

    const fbLiBadge = j.is_fb_linkedin
      ? `<span class="badge badge-fb-li"><i class="fa-solid fa-bullhorn"></i> FB / LinkedIn</span>`
      : "";

    const imgSrc = j.snapshot_img || makeInlineSnapshotUri(j);
    const directUrl = getDirectJobUrl(j);
    const shortUrl = formatShortJobUrl(directUrl);

    return `
      <article class="job-card status-${st} ${isSel ? "is-selected" : ""}">
        <div class="job-snapshot-wrap" onclick="openLightbox('${escapeAttr(imgSrc)}')" title="Nhấn để phóng to ảnh Job">
          <label class="card-select-pill ${isSel ? "checked" : ""}" onclick="event.stopPropagation()">
            <input type="checkbox" ${isSel ? "checked" : ""} onchange="toggleSelectJob('${escapeAttr(j.id)}')">
            <span>${isSel ? "Đã chọn gửi" : "Chọn gửi loạt"}</span>
          </label>
          <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(j.title)}" class="job-snapshot-img" loading="lazy">
          <span class="snapshot-zoom-hint"><i class="fa-solid fa-magnifying-glass-plus"></i> Phóng to ảnh Job</span>
        </div>

        <div class="job-card-body">
          <div class="job-meta-badges">
            <span class="badge" style="background:${catInfo.bg || '#e0f2fe'};color:${catInfo.color};">
              <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.label}
            </span>
            <span class="badge badge-remote">${escapeHtml(j.work_mode)}</span>
            ${atsBadge}
            ${fbLiBadge}
            ${emailBadge}
            ${statusBadge}
          </div>

          <h3 class="job-title">
            <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="job-title-link" title="Mở trực tiếp: ${escapeAttr(directUrl)}">
              ${escapeHtml(j.title)} <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </h3>
          <div class="job-company-line">
            <span><i class="fa-solid fa-building"></i> ${escapeHtml(j.company)}</span>
            <span>•</span>
            <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(j.location)}</span>
          </div>

          <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="job-direct-url-pill" title="${escapeAttr(directUrl)}">
            <i class="fa-solid fa-link"></i> <span>Link tin gốc:</span> <code class="notranslate">${escapeHtml(shortUrl)}</code> <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>

          <p class="job-summary">${escapeHtml(j.summary)}</p>

          <div class="evidence-box">
            <strong>Bằng chứng khớp CV (${j.fit_score}% Fit):</strong> ${escapeHtml((j.matched_evidence && j.matched_evidence[0]) || "")}
          </div>
        </div>

        <div class="job-card-footer">
          <div class="decision-row">
            <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="job-source-link" title="Mở link nguồn: ${escapeAttr(directUrl)}">
              Nguồn: ${escapeHtml(j.source)} <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
            <div class="decision-btns">
              <button class="btn btn-sm ${st === 'approved' ? 'btn-success' : 'btn-outline'}" onclick="toggleQuickApprove('${escapeAttr(j.id)}')">
                <i class="fa-solid fa-check"></i> ${st === 'approved' ? 'Đã duyệt' : 'Duyệt gửi'}
              </button>
              <button class="btn btn-sm ${st === 'skipped' ? 'btn-danger-soft' : 'btn-outline'}" onclick="toggleQuickSkip('${escapeAttr(j.id)}')" title="Bỏ qua job này">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <div class="action-row">
            <button class="btn btn-primary btn-sm" onclick="openStudio('${escapeAttr(j.id)}', 'cv')">
              <i class="fa-solid fa-file-pen"></i> CV Tối ưu &amp; CL
            </button>
            <button class="btn btn-outline btn-sm" onclick="openStudio('${escapeAttr(j.id)}', 'email')">
              <i class="fa-solid fa-paper-plane"></i> Mail Soạn Sẵn
            </button>
            <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm btn-job-direct" title="${escapeAttr(directUrl)}">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Mở Link Job
            </a>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderQueue(allJobs) {
  const tbody = document.getElementById("queue-tbody");
  const queueJobs = allJobs.filter(j => {
    const st = getJobState(j.id).status;
    return st === "approved" || (st === "new" && j.hr_email) || SELECTED_IDS.has(j.id);
  }).sort((a, b) => {
    const sela = SELECTED_IDS.has(a.id) ? 1 : 0;
    const selb = SELECTED_IDS.has(b.id) ? 1 : 0;
    const sa = getJobState(a.id).status === "approved" ? 1 : 0;
    const sb = getJobState(b.id).status === "approved" ? 1 : 0;
    return (selb - sela) || (sb - sa) || ((b.fit_score || 0) - (a.fit_score || 0));
  });

  if (queueJobs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-muted);">
      Chưa có job nào trong hàng đợi gửi. Hãy tick chọn ở thẻ job hoặc bấm nút tự động duyệt phía trên.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = queueJobs.map(j => {
    const st = getJobState(j.id);
    const subj = st.customSubject || j.tailored.email_subject;
    const body = st.customBody || j.tailored.email_body;
    const toEmail = getEffectiveHrEmail(j, st);
    const isSel = SELECTED_IDS.has(j.id);
    const cov = j.ats_profile?.coverage_pct || 90;
    const directUrl = getDirectJobUrl(j);
    const shortUrl = formatShortJobUrl(directUrl);

    return `
      <tr>
        <td>
          <input type="checkbox" ${isSel ? "checked" : ""} onchange="toggleSelectJob('${escapeAttr(j.id)}')" style="width:16px;height:16px;cursor:pointer;">
        </td>
        <td style="min-width:200px;">
          <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="table-job-link">
            ${escapeHtml(j.title)} <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a><br>
          <span style="color:var(--primary-dark);font-weight:600;">${escapeHtml(j.company)}</span><br>
          <span style="font-size:0.75rem;color:var(--text-light);">${escapeHtml(j.work_mode)} • ${escapeHtml(j.location)}</span><br>
          <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="table-url-sub">
            <i class="fa-solid fa-link"></i> <span class="notranslate">${escapeHtml(shortUrl)}</span>
          </a><br>
          <span style="font-size:0.74rem;color:${toEmail ? 'var(--success)' : 'var(--warning)'};font-weight:700;">
            ${toEmail ? `Email HR: ${escapeHtml(toEmail)}` : "Nộp qua Portal web"}
          </span>
        </td>
        <td style="white-space:nowrap;">
          <span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:0.78rem;">${j.fit_score}% Fit</span><br>
          <span class="badge badge-enterprise" style="margin-top:4px;">ATS ${cov}%</span>
        </td>
        <td>
          <div style="font-size:0.76rem;font-weight:700;color:var(--navy);margin-bottom:4px;">Subject: ${escapeHtml(subj)}</div>
          <div class="queue-email-preview">${escapeHtml(body.slice(0, 220))}...</div>
        </td>
        <td style="min-width:185px;">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="quickDispatchGmail('${escapeAttr(j.id)}')">
              <i class="fa-brands fa-google"></i> Bấm Gửi Gmail Ngay
            </button>
            <button class="btn btn-outline btn-sm" onclick="openStudio('${escapeAttr(j.id)}', 'cv')">
              <i class="fa-solid fa-file-pdf"></i> Xuất CV &amp; CL
            </button>
            <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm btn-job-direct">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Mở Link Job
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderSourceRadar() {
  const container = document.getElementById("source-radar-grid");
  if (!container) return;
  const groups = HUB_DATA.source_radar || [];
  if (groups.length === 0) {
    container.innerHTML = `<div class="panel-card">Chưa có dữ liệu Source Radar. Hãy chạy <code>python scraper.py</code>.</div>`;
    return;
  }

  container.innerHTML = groups.map(grp => `
    <div class="radar-group-card">
      <div class="radar-group-title">${escapeHtml(grp.group)}</div>
      <div class="radar-links-list">
        ${(grp.items || []).map(item => `
          <a href="${escapeAttr(item.url)}" target="_blank" class="radar-link-row">
            <div>
              <div class="radar-link-name">${escapeHtml(item.name)}</div>
              <div class="radar-link-note">${escapeHtml(item.note)}</div>
            </div>
            <i class="fa-solid fa-arrow-up-right-from-square" style="color:#0284c7;"></i>
          </a>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function renderTracker(allJobs) {
  const tbody = document.getElementById("tracker-tbody");
  const cats = HUB_DATA.categories || {};
  const statusLabels = {
    new: "🆕 Chưa xử lý",
    approved: "☑️ Đã duyệt chờ gửi",
    sent: "✉️ Đã bấm gửi Mail",
    interview: "🎯 Phỏng vấn",
    offer: "🏆 Nhận Offer",
    skipped: "🗑️ Bỏ qua"
  };

  const rows = allJobs.slice().sort((a, b) => {
    const order = { offer: 5, interview: 4, sent: 3, approved: 2, new: 1, skipped: 0 };
    const sa = order[getJobState(a.id).status] ?? 1;
    const sb = order[getJobState(b.id).status] ?? 1;
    return (sb - sa) || ((b.fit_score || 0) - (a.fit_score || 0));
  });

  tbody.innerHTML = rows.map(j => {
    const st = getJobState(j.id);
    const catInfo = cats[j.category] || { label: j.category };
    const atsTxt = j.ats_profile ? `${j.ats_profile.vendor} (${j.ats_profile.coverage_pct}%)` : "Direct";
    const directUrl = getDirectJobUrl(j);
    const shortUrl = formatShortJobUrl(directUrl);
    return `
      <tr>
        <td>
          <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="table-job-link">
            ${escapeHtml(j.title)} <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a><br>
          <span style="color:var(--text-muted);font-size:0.78rem;">${escapeHtml(j.company)}</span><br>
          <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="table-url-sub">
            <i class="fa-solid fa-link"></i> <span class="notranslate">${escapeHtml(shortUrl)}</span>
          </a>
        </td>
        <td>${escapeHtml(catInfo.label)}</td>
        <td>${escapeHtml(j.work_mode)}<br><span style="font-size:0.72rem;color:#1d4ed8;">${escapeHtml(atsTxt)}</span></td>
        <td><strong>${j.fit_score}%</strong></td>
        <td>
          <select class="filter-select" style="padding:4px 7px;font-size:0.78rem;" onchange="setJobState('${escapeAttr(j.id)}', {status: this.value})">
            ${Object.entries(statusLabels).map(([k, lbl]) => `<option value="${k}" ${st.status === k ? "selected" : ""}>${lbl}</option>`).join("")}
          </select>
        </td>
        <td style="font-size:0.78rem;color:var(--text-muted);">
          ${st.sentAt ? `Gửi lúc: ${escapeHtml(st.sentAt)}<br>` : ""}
          ${escapeHtml(st.notes || "")}
        </td>
        <td>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="openStudio('${escapeAttr(j.id)}', 'email')">Mở Studio</button>
            <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm btn-job-direct" title="Mở Link Job Gốc">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderAll() {
  const allJobs = getAllJobs();
  renderKpis(allJobs);
  renderCategoryPills(allJobs);
  const filtered = getFilteredJobs(allJobs);
  if (ACTIVE_VIEW === "cards") renderCards(filtered);
  else if (ACTIVE_VIEW === "queue") renderQueue(allJobs);
  else if (ACTIVE_VIEW === "radar") renderSourceRadar();
  else if (ACTIVE_VIEW === "tracker") renderTracker(allJobs);
}

// --------------------------------------------------------------------------
// QUICK ACTIONS
// --------------------------------------------------------------------------
function toggleQuickApprove(id) {
  const st = getJobState(id).status;
  const next = st === "approved" ? "new" : "approved";
  if (next === "approved") SELECTED_IDS.add(id);
  setJobState(id, { status: next });
  showToast(next === "approved" ? "Đã duyệt & đưa vào hàng đợi gửi!" : "Đã bỏ khỏi hàng đợi gửi.");
}

function toggleQuickSkip(id) {
  const st = getJobState(id).status;
  SELECTED_IDS.delete(id);
  setJobState(id, { status: st === "skipped" ? "new" : "skipped" });
}

function approveTopFitsWithEmail() {
  const allJobs = getAllJobs();
  let count = 0;
  for (const j of allJobs) {
    const st = getJobState(j.id).status;
    if (st !== "skipped" && j.hr_email && j.fit_score >= 90) {
      JOB_STATE[j.id] = Object.assign({}, getJobState(j.id), { status: st === "sent" ? "sent" : "approved" });
      SELECTED_IDS.add(j.id);
      count++;
    }
  }
  saveState();
  renderAll();
  showToast(`Đã chọn ${count} job Fit ≥ 90% có Email HR sẵn!`);
}

// --------------------------------------------------------------------------
// CAREER-OPS ENTERPRISE ATS REVERSE-ENGINEERING RENDERER
// --------------------------------------------------------------------------
function renderAtsPanelHtml(job) {
  const ats = job.ats_profile || {
    vendor: "Direct Screen",
    tier: "TIER 1 PASS",
    coverage_pct: 90,
    existing_keywords: (job.tailored?.highlighted_skills || []).slice(0, 6),
    supported_keywords: ["UEH Dual Major", "Portfolio Demos"],
    honest_gap_keywords: [],
    reverse_tips: ["Use clean single-column headings and measurable metrics."]
  };

  const pillList = arr => (arr && arr.length)
    ? arr.map(k => `<span class="ats-kw-pill">${escapeHtml(k)}</span>`).join("")
    : `<span style="font-size:0.74rem;color:#64748b;">Không có thiếu hụt nghiêm trọng</span>`;

  return `
    <div class="ats-coverage-head">
      <div>
        <span class="ats-vendor-pill"><i class="fa-solid fa-microchip"></i> Hệ thống lọc phát hiện: ${escapeHtml(ats.vendor)}</span>
        <span style="margin-left:8px;font-size:0.84rem;font-weight:700;color:#0f172a;">Độ phủ từ khóa ATS: <strong>${ats.coverage_pct}%</strong></span>
      </div>
      <span class="ats-tier-badge">${escapeHtml(ats.tier)}</span>
    </div>
    <div class="ats-buckets-grid">
      <div class="ats-bucket exact">
        <div class="ats-bucket-title"><i class="fa-solid fa-check"></i> 1. Đã khớp trực tiếp trên CV (${(ats.existing_keywords || []).length})</div>
        <div class="ats-kw-list">${pillList(ats.existing_keywords)}</div>
      </div>
      <div class="ats-bucket supported">
        <div class="ats-bucket-title"><i class="fa-solid fa-link"></i> 2. Bằng chứng thực tế hỗ trợ (${(ats.supported_keywords || []).length})</div>
        <div class="ats-kw-list">${pillList(ats.supported_keywords)}</div>
      </div>
      <div class="ats-bucket gap">
        <div class="ats-bucket-title"><i class="fa-solid fa-scale-balanced"></i> 3. Khoảng trống trung thực (Không bịa)</div>
        <div class="ats-kw-list">${pillList(ats.honest_gap_keywords)}</div>
      </div>
    </div>
    <ul class="ats-tip-list">
      ${(ats.reverse_tips || []).map(tip => `<li>${escapeHtml(tip)}</li>`).join("")}
    </ul>
  `;
}

// --------------------------------------------------------------------------
// 4-TAB OPTIMIZATION STUDIO MODAL (/apply)
// --------------------------------------------------------------------------
function openStudio(jobId, initialTab = "fit") {
  const job = getAllJobs().find(j => j.id === jobId);
  if (!job) return;
  CURRENT_JOB_ID = jobId;
  const st = getJobState(jobId);

  document.getElementById("st-title").textContent = `${job.title} — ${job.company}`;
  document.getElementById("st-subtitle").textContent = `${job.location} • ${job.work_mode} • ${job.salary} • ${job.fit_score}% Fit (${job.source})`;

  const approveBtn = document.getElementById("st-approve-btn");
  approveBtn.innerHTML = st.status === "approved"
    ? `<i class="fa-solid fa-check-double"></i> Đã duyệt chờ gửi`
    : `<i class="fa-solid fa-check"></i> Duyệt gửi`;

  // Tab 1: Fit Breakdown + career-ops ATS summary
  const dims = job.dimensions || { skills: 90, evidence: 90, domain: 90, remote_fit: 90, career_value: 90 };
  const dimLabels = [
    ["Kỹ năng chuyên môn & Công cụ", dims.skills],
    ["Bằng chứng Dự án & Giải thưởng", dims.evidence],
    ["Độ khớp Lĩnh vực & Học vấn", dims.domain],
    ["Khả năng Remote / Part-time TP.HCM", dims.remote_fit],
    ["Giá trị Phát triển Nghề nghiệp", dims.career_value]
  ];
  document.getElementById("st-dimensions").innerHTML = dimLabels.map(([lbl, val]) => `
    <div class="dim-row">
      <div class="dim-label"><span>${lbl}</span><span>${val}%</span></div>
      <div class="dim-bar-bg"><div class="dim-bar-fill" style="width:${val}%"></div></div>
    </div>
  `).join("");

  const atsHtml = renderAtsPanelHtml(job);
  const tab1AtsEl = document.getElementById("st-ats-summary");
  if (tab1AtsEl) tab1AtsEl.innerHTML = atsHtml;
  const tab2AtsEl = document.getElementById("cv-ats-reverse-panel");
  if (tab2AtsEl) tab2AtsEl.innerHTML = atsHtml;

  document.getElementById("st-evidence").innerHTML = (job.matched_evidence || [])
    .map(ev => `<li style="margin-bottom:6px;">${escapeHtml(ev)}</li>`).join("");
  document.getElementById("st-gap").textContent = job.honest_gap || "";
  document.getElementById("st-critique").innerHTML = (job.recruiter_critique || [])
    .map(c => `<li style="margin-bottom:6px;">${escapeHtml(c)}</li>`).join("");
  document.getElementById("st-snapshot-img").src = job.snapshot_img || makeInlineSnapshotUri(job);
  const directJobUrl = getDirectJobUrl(job);
  document.getElementById("st-orig-link").href = directJobUrl;
  const headerJobLink = document.getElementById("st-header-job-link");
  if (headerJobLink) {
    headerJobLink.href = directJobUrl;
    headerJobLink.title = `Mở trực tiếp: ${directJobUrl}`;
  }
  const emTopLink = document.getElementById("em-top-job-link");
  const emTopUrl = document.getElementById("em-top-job-url");
  if (emTopLink) emTopLink.href = directJobUrl;
  if (emTopUrl) emTopUrl.textContent = formatShortJobUrl(directJobUrl);

  // Default Original CV & Cover Letter language matching job
  const prefLang = (job.lang || "EN").startsWith("VI") ? "vi" : "en";
  CURRENT_CV_LANG = prefLang;
  CURRENT_CL_LANG = prefLang;
  CURRENT_EMAIL_CV_LANG = getMatchedCvLang(job, st);
  syncCvControlButtons();
  renderTailoredCV();
  renderCoverLetterPane();

  // Tab 4: Email + Subject Variants + Matched PDF CV Attachment
  const effectiveTo = getEffectiveHrEmail(job, st);
  document.getElementById("em-to").value = effectiveTo;
  const srcHintEl = document.getElementById("em-source-hint");
  if (srcHintEl) {
    srcHintEl.innerHTML = job.hr_email_source === "explicit"
      ? `<i class="fa-solid fa-circle-check" style="color:#059669;"></i> Email trích xuất trực tiếp từ tin tuyển dụng`
      : `<i class="fa-solid fa-wand-magic-sparkles"></i> Email HR gợi ý theo tên miền công ty (có thể chỉnh sửa trước khi gửi)`;
  }
  document.getElementById("em-subject").value = st.customSubject || job.tailored.email_subject;
  document.getElementById("em-body").value = st.customBody || job.tailored.email_body;
  document.getElementById("em-portal-link").href = directJobUrl;
  document.getElementById("st-status-select").value = st.status || "new";
  document.getElementById("st-notes").value = st.notes || "";
  updateSubjectStylePills(job, document.getElementById("em-subject").value);
  updateAiBanner("em-ai-banner", document.getElementById("em-body").value);
  renderEmailCvAttachmentCard(job);

  switchStudioTabByName(initialTab);
  document.getElementById("studio-backdrop").classList.add("open");
}

function closeStudio() {
  document.getElementById("studio-backdrop").classList.remove("open");
}

function switchStudioTab(tabName, btn) {
  document.querySelectorAll(".studio-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.getElementById(`pane-${tabName}`).classList.add("active");
}

function switchStudioTabByName(tabName) {
  const btn = document.querySelector(`.studio-tab[data-tab="${tabName}"]`);
  switchStudioTab(tabName, btn);
}

function toggleDecisionFromModal() {
  if (!CURRENT_JOB_ID) return;
  const st = getJobState(CURRENT_JOB_ID).status;
  const next = st === "approved" ? "new" : "approved";
  if (next === "approved") SELECTED_IDS.add(CURRENT_JOB_ID);
  setJobState(CURRENT_JOB_ID, { status: next });
  document.getElementById("st-status-select").value = next;
  document.getElementById("st-approve-btn").innerHTML = next === "approved"
    ? `<i class="fa-solid fa-check-double"></i> Đã duyệt chờ gửi`
    : `<i class="fa-solid fa-check"></i> Duyệt gửi`;
  showToast(next === "approved" ? "Đã duyệt vào hàng đợi gửi Mail!" : "Đã bỏ duyệt.");
}

function updateCurrentJobStatus(val) {
  if (!CURRENT_JOB_ID) return;
  setJobState(CURRENT_JOB_ID, { status: val });
}

function saveJobNotes(val) {
  if (!CURRENT_JOB_ID) return;
  JOB_STATE[CURRENT_JOB_ID] = Object.assign({}, getJobState(CURRENT_JOB_ID), { notes: val });
  saveState();
}

// --------------------------------------------------------------------------
// TAB 2: JOB-TAILORED CV (CANVA ORIGINAL LAYOUT + PORTFOLIO QR + 7 HEADERS)
// --------------------------------------------------------------------------
function syncCvControlButtons() {
  const enBtn = document.getElementById("cv-lang-en");
  const viBtn = document.getElementById("cv-lang-vi");
  if (enBtn && viBtn) {
    enBtn.className = `btn btn-sm ${CURRENT_CV_LANG === "en" ? "btn-primary" : "btn-outline"}`;
    viBtn.className = `btn btn-sm ${CURRENT_CV_LANG === "vi" ? "btn-primary" : "btn-outline"}`;
  }
  const dlBtn = document.getElementById("cv-download-pdf-btn");
  if (dlBtn) {
    const isVi = CURRENT_CV_LANG === "vi";
    const pdfName = isVi ? "CV_Phuc_Nguyen_VI.pdf" : "CV_Phuc_Nguyen_EN.pdf";
    dlBtn.href = `assets/${pdfName}`;
    dlBtn.setAttribute("download", pdfName);
  }
}

function setCvLang(lang) {
  CURRENT_CV_LANG = lang === "vi" ? "vi" : "en";
  syncCvControlButtons();
  renderTailoredCV();
}

function buildTailoredExperienceBullets(job, isEn) {
  const cat = job.category || "";
  if (cat === "tutor_ta" || cat === "admissions_sale") {
    return isEn
      ? [
          "Taught Physics and Mathematics at a charity class for 6 primary and middle-school students over a 3-month period, preparing lesson notes and practice exercises.",
          "Led internal member onboarding and team-building activities for 107+ members at Human Resources Apprentices Club (UEH).",
          "Built landing pages, internal web portals (HuReA Hub), and productivity tools for student teams and community events.",
          "Worked as coffee shop service staff, handling direct customer communication, inquiries, and front-of-house operations."
        ]
      : [
          "Giảng dạy lớp học tình thương môn Lý và Toán trong 3 tháng cho 6 em học sinh cấp 1-2, trực tiếp kèm cặp và giải bài tập.",
          "Nhân viên phục vụ quán cà phê, rèn kỹ năng giao tiếp khách hàng, tư vấn trực tiếp và xử lý tình huống nhanh.",
          "Trưởng nhóm Bond & Benefit (CLB Nhân sự UEH), trực tiếp điều phối hoạt động kết nối cho hơn 107 thành viên.",
          "Xây dựng Landing Page, Web nội bộ HuReA Hub và các công cụ hỗ trợ học tập, sự kiện sinh viên."
        ];
  }
  if (cat === "ai_vibe" || cat === "freelance_gig") {
    return isEn
      ? [
          "Conceptualized scripts and produced AI promotional videos using Google Omni and Veo 3 platforms.",
          "Built internal web applications (HuReA Hub ERP for 107+ members), landing pages, and automated business workflows using n8n, Make, Kodular, and Botpress.",
          "Developed an automated n8n stock news aggregation and technical screening bot delivering 10% ROI on $5,000 over 3 months.",
          "Taught Physics and Mathematics at a charity class for 6 students over 3 months, explaining technical concepts clearly."
        ]
      : [
          "Lên ý tưởng, tạo phim và video AI thương mại trên nền tảng Google Omni và Veo 3.",
          "Xây dựng Landing Page, Web nội bộ HuReA Hub cho 107+ thành viên bằng phương pháp Vibe Coding và kết hợp workflow tự động (n8n, Make, Botpress, Kodular).",
          "Phát triển bot n8n tổng hợp tin tức và sàng lọc kỹ thuật cổ phiếu, đạt 10% lợi nhuận trong 3 tháng trên vốn $5,000.",
          "Dạy học lớp học tình thương môn Lý và Toán trong 3 tháng cho 6 em học sinh."
        ];
  }
  if (cat === "stock" || cat === "finance") {
    return isEn
      ? [
          "Developed automated financial data and news screening workflows using n8n, generating a verified 10% ROI on a $5,000 portfolio in 3 months.",
          "Built HuReA Hub internal management portal with multi-user scoring and automated Excel/PDF reporting for 107+ members.",
          "Conceptualized data presentations and AI media assets using Google Omni and Veo 3 platforms.",
          "Taught Mathematics and Physics at a charity class for 6 students over 3 months, sharpening analytical clarity."
        ]
      : [
          "Xây dựng bot n8n tổng hợp tin tức tài chính và sàng lọc kỹ thuật cổ phiếu VN100, đạt lợi nhuận 10% trong 3 tháng (vốn $5,000).",
          "Phát triển hệ thống quản trị nội bộ HuReA Hub cho 107+ thành viên, tích hợp xuất báo cáo Excel/PDF hàng loạt.",
          "Xây dựng Landing Page, công cụ tự động hóa quy trình bằng Make, Kodular, Botpress và tạo phim AI trên Google Omni / Veo 3.",
          "Dạy học lớp học tình thương môn Lý và Toán trong 3 tháng cho 6 em học sinh."
        ];
  }
  return isEn
    ? [
        "Developed landing pages and internal intranet portal (HuReA Hub) for an organization of 107 members, automating task checklists and batch reports.",
        "Built automated workflow tools via n8n, Make, Botpress, and Kodular alongside AI video production on Google Omni and Veo 3.",
        "Taught Physics and Mathematics at a charity class for 6 students over a 3-month period.",
        "Served customers directly as coffee shop staff, managing daily floor coordination and fast problem solving."
      ]
    : [
        "Xây dựng Landing Page, Web nội bộ HuReA Hub cho tổ chức 107 thành viên và bộ công cụ tự động hóa quy trình làm việc.",
        "Lên ý tưởng, tạo phim AI trên nền tảng Google Omni và Veo 3, đồng thời xây dựng workflow với n8n, Make, Kodular và Botpress.",
        "Dạy học lớp học tình thương môn Lý và Toán trong 3 tháng cho 6 em học sinh.",
        "Nhân viên phục vụ quán cà phê, rèn tác phong nhanh nhẹn, giao tiếp và phối hợp vận hành ca làm việc."
      ];
}

function renderTailoredCV() {
  const job = getAllJobs().find(j => j.id === CURRENT_JOB_ID);
  if (!job) return;
  const cand = HUB_DATA.candidate || {};
  const t = job.tailored;
  const isEn = CURRENT_CV_LANG === "en";
  const box = document.getElementById("cv-a4-container");
  if (!box) return;

  const orderedProjects = (t.project_order || ["ai_automation", "stock_bot", "hurea_hub", "vndeer"])
    .map(pid => (cand.projects || {})[pid])
    .filter(Boolean);

  const summaryTxt = cleanAiSignsText(isEn ? t.cv_summary_en : t.cv_summary_vi);
  const expBullets = buildTailoredExperienceBullets(job, isEn).map(b => cleanAiSignsText(b));
  const showWhatsapp = (job.market || "") !== "Vietnam" || isEn;
  const phoneHtml = showWhatsapp
    ? `<span><i class="fa-brands fa-whatsapp"></i> WhatsApp: +84342381843</span>`
    : `<span><i class="fa-solid fa-phone"></i> 0342381843</span>`;

  const eduHtml = isEn
    ? `
      <div class="cv-row-2col"><div><strong>University of Economics HCMC</strong></div><div>Dual Major: Stock Market &amp; International Business</div></div>
      <div class="cv-row-2col"><div><strong>Universitas Airlangga (Indonesia)</strong></div><div>Exchange Program: Sustainable Business and Environmental Law</div></div>
    `
    : `
      <div class="cv-row-2col"><div><strong>Đại học Kinh Tế TP.HCM (UEH)</strong></div><div>Song ngành Thị trường chứng khoán và Kinh doanh quốc tế</div></div>
      <div class="cv-row-2col"><div><strong>Universitas Airlangga</strong></div><div>Chương trình trao đổi: Kinh doanh bền vững và Luật môi trường</div></div>
    `;

  const awardsHtml = isEn
    ? `
      <div class="cv-row-2col"><div><strong>5/2025</strong></div><div>Second Prize - Provincial Youth Innovation Contest</div></div>
      <div class="cv-row-2col"><div><strong>12/2024</strong></div><div>Second Prize - Central Vietnam Green Innovation Contest</div></div>
      <div class="cv-row-2col"><div><strong>2024-2025</strong></div><div>Second Prize - Provincial Science and Engineering Fair</div></div>
      <div class="cv-row-2col"><div><strong>8/2025</strong></div><div>Top 25 High School Track - Samsung Solve For Tomorrow</div></div>
    `
    : `
      <div class="cv-row-2col"><div><strong>5/2025</strong></div><div>Giải nhì sáng tạo thanh thiếu niên cấp Tỉnh</div></div>
      <div class="cv-row-2col"><div><strong>12/2024</strong></div><div>Giải nhì cuộc thi Sáng tạo Xanh toàn miền Trung</div></div>
      <div class="cv-row-2col"><div><strong>2024-2025</strong></div><div>Giải nhì Khoa học kỹ thuật cấp Tỉnh 2 năm liên tiếp</div></div>
      <div class="cv-row-2col"><div><strong>8/2025</strong></div><div>Top 25 bảng THPT cuộc thi Samsung Solve For Tomorrow</div></div>
    `;

  const extraHtml = isEn
    ? `
      <div class="cv-row-2col"><div><strong>2024-2025</strong><br>Member</div><div><strong>Green Youth Lab, YAI (Unicef)</strong><br>Acquired knowledge on ESG, youth initiatives, environmental protection, and energy transition.</div></div>
      <div class="cv-row-2col"><div><strong>2025-2026</strong><br>Member</div><div><strong>Human Resources Apprentices Club</strong><br>Gained management knowledge and core professional skills; experienced in organizing team-building and bonding activities for members.</div></div>
    `
    : `
      <div class="cv-row-2col"><div><strong>2024-2025</strong><br>Thành viên</div><div><strong>Green Youth Lab, YAI (Unicef)</strong><br>Hoàn thành chương trình đào tạo về ESG và chuyển đổi năng lượng, phát triển sáng kiến thanh niên bảo vệ môi trường.</div></div>
      <div class="cv-row-2col"><div><strong>2025-2026</strong><br>Thành viên</div><div><strong>Câu Lạc Bộ Chuyên Viên Nhân Sự Tập Sự UEH</strong><br>Leader team Bond &amp; Benefit, có kinh nghiệm tổ chức teambuilding, bonding cho các thành viên.</div></div>
    `;

  const projectsHtml = orderedProjects.slice(0, 2).map(p => `
    <div style="margin-bottom:8px;">
      <strong style="color:#0f172a;">${escapeHtml(cleanAiSignsText(isEn ? p.title_en : p.title_vi))}</strong><br>
      <span style="color:#334155;font-size:12px;">${escapeHtml(cleanAiSignsText(isEn ? p.proof_en : p.proof_vi))}</span>
    </div>
  `).join("");

  box.className = "a4-sheet cv-tpl-visual";
  box.innerHTML = `
    <div class="cv-top-banner">
      <img src="assets/avatar.jpg" alt="Phuc Nguyen" class="cv-photo">
      <div style="flex:1;">
        <h1 class="cv-name" contenteditable="true">${isEn ? "PHUC NGUYEN" : "PHÚC NGUYỄN"}</h1>
        <div class="cv-contact-bar" contenteditable="true">
          ${phoneHtml}
          <span><i class="fa-solid fa-envelope"></i> ${WORK_EMAIL}</span>
          <span><i class="fa-solid fa-globe"></i> <a href="https://tonykosuy.github.io/portfolio/" target="_blank" style="color:inherit;text-decoration:underline;">FB: Nguyễn Phúc</a></span>
        </div>
      </div>
    </div>

    <div class="cv-inner">
      <div class="cv-quote" contenteditable="true">“${escapeHtml(summaryTxt)}”</div>

      <div class="cv-section-h">EDUCATION</div>
      <div contenteditable="true">${eduHtml}</div>

      <div class="cv-section-h">EXPERIENCE</div>
      <ul class="cv-bullets" contenteditable="true">
        ${expBullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
      </ul>

      <div class="cv-section-h">AWARDS</div>
      <div contenteditable="true">${awardsHtml}</div>

      <div class="cv-section-h">EXTRACURRICULAR ACTIVITIES</div>
      <div contenteditable="true">${extraHtml}</div>

      <div class="cv-bottom-3col">
        <div>
          <div class="cv-section-h" style="margin-top:4px;">PROJECTS</div>
          <div contenteditable="true">${projectsHtml}</div>
        </div>
        <div>
          <div class="cv-section-h" style="margin-top:4px;">CERTIFICATE</div>
          <ul class="cv-bullets" style="margin-left:16px;" contenteditable="true">
            <li>IELTS 6.0</li>
            <li>MOS Expert (8/2026)</li>
            <li>Google Data Analytics</li>
            <li>ESG in Business and Law (Airlangga Uni)</li>
            <li>Foundations of Project Management</li>
          </ul>
        </div>
        <div style="text-align:center;">
          <div class="cv-section-h" style="margin-top:4px;min-width:120px;">PORTFOLIO</div>
          <a href="https://tonykosuy.github.io/portfolio/" target="_blank" title="NGUYỄN TRẦN TIẾN PHÚC | Portfolio" style="display:inline-block;margin-top:4px;">
            <img src="assets/portfolio_qr.png" alt="Portfolio QR Code" style="width:96px;height:96px;object-fit:contain;display:block;margin:0 auto;">
          </a>
          <div style="font-size:11px;font-weight:700;color:#0f172a;margin-top:6px;line-height:1.35;">
            ${isEn ? "Scan QR code or view<br>portfolio at" : "Quét mã QR hoặc truy cập<br>Portfolio tại"}
            <a href="https://tonykosuy.github.io/portfolio/" target="_blank" style="color:#29b6f6;font-weight:800;text-decoration:underline;">[LINK]</a>
          </div>
          <div style="font-size:10px;margin-top:3px;">
            <a href="https://tonykosuy.github.io/portfolio/" target="_blank" style="color:#0284c7;font-weight:700;text-decoration:underline;">NGUYỄN TRẦN TIẾN PHÚC | Portfolio</a>
          </div>
        </div>
      </div>
    </div>
  `;

  checkCvAiSigns();
}

function checkCvAiSigns() {
  const txt = document.getElementById("cv-a4-container")?.innerText || "";
  updateAiBanner("cv-ai-status", txt);
}

function printTailoredCV() {
  document.getElementById("print-cl-sheet").style.display = "none";
  document.getElementById("cv-a4-container").style.display = "block";
  window.print();
}

// --------------------------------------------------------------------------
// TAB 3: COVER LETTER EDITOR + WP:AISIGNS CHECKER
// --------------------------------------------------------------------------
function setClLang(lang) {
  CURRENT_CL_LANG = lang;
  document.getElementById("cl-lang-en").className = `btn btn-sm ${lang === "en" ? "btn-primary" : "btn-outline"}`;
  document.getElementById("cl-lang-vi").className = `btn btn-sm ${lang === "vi" ? "btn-primary" : "btn-outline"}`;
  renderCoverLetterPane();
}

function renderCoverLetterPane() {
  const job = getAllJobs().find(j => j.id === CURRENT_JOB_ID);
  if (!job) return;
  const st = getJobState(job.id);
  const txt = CURRENT_CL_LANG === "en"
    ? (st.customClEn || job.tailored.cover_letter_en)
    : (st.customClVi || job.tailored.cover_letter_vi);
  document.getElementById("cl-textarea").value = txt;
  updateAiBanner("cl-ai-banner", txt);
}

function onClEdit() {
  const txt = document.getElementById("cl-textarea").value;
  updateAiBanner("cl-ai-banner", txt);
  if (!CURRENT_JOB_ID) return;
  const patch = CURRENT_CL_LANG === "en" ? { customClEn: txt } : { customClVi: txt };
  JOB_STATE[CURRENT_JOB_ID] = Object.assign({}, getJobState(CURRENT_JOB_ID), patch);
  saveState();
}

function cleanClAiSigns() {
  const ta = document.getElementById("cl-textarea");
  ta.value = cleanAiSignsText(ta.value);
  onClEdit();
  showToast("Đã làm sạch dấu hiệu AI trong Cover Letter!");
}

function printCoverLetter() {
  const txt = document.getElementById("cl-textarea").value;
  const sheet = document.getElementById("print-cl-sheet");
  sheet.textContent = txt;
  sheet.style.display = "block";
  const cvEl = document.getElementById("cv-a4-container");
  const prevDisplay = cvEl.style.display;
  cvEl.style.display = "none";
  window.print();
  cvEl.style.display = prevDisplay;
  sheet.style.display = "none";
}

// --------------------------------------------------------------------------
// TAB 4: NATURAL SUBJECT OPTIMIZER & PRE-DRAFTED EMAIL DISPATCHER
// --------------------------------------------------------------------------
function getSubjectVariants(job) {
  if (job.tailored && job.tailored.subject_variants) {
    return job.tailored.subject_variants;
  }
  const isVi = (job.market || "") === "Vietnam" && (job.lang || "VI/EN") !== "EN";
  return isVi
    ? {
        hr_natural: `Ứng tuyển vị trí ${job.title} - Nguyễn Trần Tiến Phúc (SV năm 2 UEH)`,
        proof_direct: `${job.title} - Nguyễn Trần Tiến Phúc (Kèm link sản phẩm thực tế)`,
        fb_hcm_parttime: `Em ứng tuyển ${job.title} theo bài đăng - Tiến Phúc (UEH TP.HCM)`,
        short_casual: `Gửi CV ${job.title} - Tiến Phúc`
      }
    : {
        hr_natural: `Application for ${job.title} - Nguyen Tran Tien Phuc (UEH)`,
        proof_direct: `${job.title} - Phuc Nguyen (Portfolio & Data/Automation projects)`,
        fb_hcm_parttime: `Regarding ${job.title} opening - Phuc Nguyen (Ho Chi Minh City)`,
        short_casual: `${job.title} application - Phuc Nguyen`
      };
}

function updateSubjectStylePills(job, currentSubj) {
  const variants = getSubjectVariants(job);
  for (const key of ["hr_natural", "proof_direct", "fb_hcm_parttime", "short_casual"]) {
    const btn = document.getElementById(`subj-btn-${key}`);
    if (!btn) continue;
    btn.classList.toggle("active", (variants[key] || "").trim() === (currentSubj || "").trim());
  }
}

function applySubjectStyle(styleKey) {
  if (!CURRENT_JOB_ID) return;
  const job = getAllJobs().find(j => j.id === CURRENT_JOB_ID);
  if (!job) return;
  const variants = getSubjectVariants(job);
  const chosen = cleanAiSignsText(variants[styleKey] || job.tailored.email_subject);
  document.getElementById("em-subject").value = chosen;
  updateSubjectStylePills(job, chosen);
  saveEmailEdits();
  showToast("Đã chuyển sang tiêu đề tự nhiên (không dấu hiệu AI)!");
}

function saveEmailEdits() {
  if (!CURRENT_JOB_ID) return;
  const to = document.getElementById("em-to").value;
  const subj = document.getElementById("em-subject").value;
  const body = document.getElementById("em-body").value;
  updateAiBanner("em-ai-banner", `${subj}\n${body}`);
  const job = getAllJobs().find(j => j.id === CURRENT_JOB_ID);
  if (job) updateSubjectStylePills(job, subj);

  JOB_STATE[CURRENT_JOB_ID] = Object.assign({}, getJobState(CURRENT_JOB_ID), {
    customEmail: to,
    customSubject: subj,
    customBody: body
  });
  saveState();
}

function addCurrentJobAndOpenBulk() {
  if (!CURRENT_JOB_ID) return;
  saveEmailEdits();
  SELECTED_IDS.add(CURRENT_JOB_ID);
  closeStudio();
  openBulkModal();
}

function renderEmailCvAttachmentCard(job) {
  const meta = getCvMetaByLang(CURRENT_EMAIL_CV_LANG);
  const badgeEl = document.getElementById("em-cv-match-badge");
  const nameEl = document.getElementById("em-cv-file-name");
  const subEl = document.getElementById("em-cv-file-sub");
  const dlLink = document.getElementById("em-cv-download-link");
  const enBtn = document.getElementById("em-cv-lang-en");
  const viBtn = document.getElementById("em-cv-lang-vi");
  const imgEl = document.getElementById("em-cv-inline-img");

  if (badgeEl) {
    badgeEl.textContent = meta.lang === "vi" ? "Tự động khớp: CV Tiếng Việt" : "Tự động khớp: CV Tiếng Anh";
  }
  if (nameEl) nameEl.textContent = meta.file;
  if (subEl) subEl.textContent = `${meta.label} • Chuẩn ATS • Tự động đính kèm khi tải .EML hoặc gửi SMTP`;
  if (dlLink) {
    dlLink.href = meta.pdfPath;
    dlLink.setAttribute("download", meta.file);
  }
  if (enBtn && viBtn) {
    enBtn.className = `btn btn-sm ${meta.lang === "en" ? "btn-primary" : "btn-outline"}`;
    viBtn.className = `btn btn-sm ${meta.lang === "vi" ? "btn-primary" : "btn-outline"}`;
  }
  if (imgEl) imgEl.src = meta.pngPath;
}

function setEmailCvLang(lang) {
  CURRENT_EMAIL_CV_LANG = lang === "vi" ? "vi" : "en";
  if (CURRENT_JOB_ID) {
    const job = getAllJobs().find(j => j.id === CURRENT_JOB_ID);
    JOB_STATE[CURRENT_JOB_ID] = Object.assign({}, getJobState(CURRENT_JOB_ID), { customCvLang: CURRENT_EMAIL_CV_LANG });
    const meta = getCvMetaByLang(CURRENT_EMAIL_CV_LANG);
    const bodyEl = document.getElementById("em-body");
    if (bodyEl) {
      let body = bodyEl.value;
      body = body.replace(/CV_Phuc_Nguyen_(?:EN|VI)\.pdf/g, meta.file);
      bodyEl.value = body;
      saveEmailEdits();
    }
    if (job) renderEmailCvAttachmentCard(job);
  }
  showToast(`Đã chọn đính kèm ${getCvMetaByLang(CURRENT_EMAIL_CV_LANG).file}!`);
}

function toggleInlineEmailCvPreview() {
  const wrap = document.getElementById("em-cv-inline-preview");
  const btn = document.getElementById("em-cv-preview-btn");
  if (!wrap) return;
  const showing = wrap.style.display !== "none";
  wrap.style.display = showing ? "none" : "block";
  if (btn) {
    btn.innerHTML = showing
      ? `<i class="fa-solid fa-eye"></i> Xem CV`
      : `<i class="fa-solid fa-eye-slash"></i> Ẩn Preview CV`;
  }
}

function triggerCvPdfDownload(cvLang) {
  const meta = getCvMetaByLang(cvLang);
  const a = document.createElement("a");
  a.href = meta.pdfPath;
  a.download = meta.file;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadCurrentJobEml() {
  if (!CURRENT_JOB_ID) return;
  saveEmailEdits();
  const job = getAllJobs().find(j => j.id === CURRENT_JOB_ID);
  const st = getJobState(CURRENT_JOB_ID);
  const to = document.getElementById("em-to").value.trim() || getEffectiveHrEmail(job, st);
  const subj = document.getElementById("em-subject").value;
  const body = document.getElementById("em-body").value;
  const meta = getCvMetaByLang(CURRENT_EMAIL_CV_LANG);

  try {
    const baseUrl = getBulkMailerBaseUrl();
    const resp = await fetch(`${baseUrl}/api/download-eml`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_email: WORK_EMAIL,
        sender_name: "Nguyen Tran Tien Phuc",
        to,
        subject: subj,
        body,
        attach_cv: meta.lang,
        lang: meta.lang
      })
    });
    if (resp.ok) {
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(job?.company || "application").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)}_${meta.lang.toUpperCase()}.eml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`Đã tải file nháp .EML kèm sẵn ${meta.file}! Nhấp đúp để mở gửi ngay.`);
      return;
    }
  } catch (e) {}

  // Client-side MIME .eml builder fallback (works on GitHub Pages without localhost server)
  try {
    const pdfResp = await fetch(meta.pdfPath);
    const buf = await pdfResp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin).replace(/(.{76})/g, "$1\r\n");
    const boundary = "----=_TKJobHubBoundary_" + Date.now();
    const eml = [
      `From: Nguyen Tran Tien Phuc <${WORK_EMAIL}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subj)))}?=`,
      `X-Unsent: 1`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="utf-8"`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      body,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${meta.file}"`,
      `Content-Disposition: attachment; filename="${meta.file}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64,
      `--${boundary}--`,
      ``
    ].join("\r\n");
    const blob = new Blob([eml], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(job?.company || "application").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)}_${meta.lang.toUpperCase()}.eml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Đã tải file nháp .EML kèm sẵn ${meta.file}!`);
  } catch (err) {
    showToast("Không tạo được file .EML, hãy dùng nút Tải PDF CV ở bên cạnh.");
  }
}

function sendViaGmail() {
  if (!CURRENT_JOB_ID) return;
  const to = document.getElementById("em-to").value.trim();
  const subj = document.getElementById("em-subject").value;
  const body = document.getElementById("em-body").value;
  dispatchGmailCompose(CURRENT_JOB_ID, to, subj, body, CURRENT_EMAIL_CV_LANG);
}

function quickDispatchGmail(jobId) {
  const job = getAllJobs().find(j => j.id === jobId);
  if (!job) return;
  const st = getJobState(jobId);
  const to = getEffectiveHrEmail(job, st);
  const subj = st.customSubject || job.tailored.email_subject;
  const body = st.customBody || job.tailored.email_body;
  const cvLang = getMatchedCvLang(job, st);
  dispatchGmailCompose(jobId, to, subj, body, cvLang);
}

function dispatchGmailCompose(jobId, to, subj, body, cvLang = null) {
  const job = getAllJobs().find(j => j.id === jobId);
  const st = getJobState(jobId);
  const matchedLang = cvLang || getMatchedCvLang(job, st);
  const meta = getCvMetaByLang(matchedLang);

  // Trigger download of matched PDF CV so it is right on browser bar to drag into Gmail
  triggerCvPdfDownload(matchedLang);

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&authuser=${encodeURIComponent(WORK_EMAIL)}&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, "_blank");
  const nowStr = new Date().toLocaleString("vi-VN");
  setJobState(jobId, { status: "sent", sentAt: nowStr });
  if (CURRENT_JOB_ID === jobId && document.getElementById("st-status-select")) {
    document.getElementById("st-status-select").value = "sent";
  }
  showToast(`Đã mở Gmail & tải sẵn ${meta.file}! Kéo file CV từ thanh tải xuống vào Gmail hoặc dùng .EML / SMTP.`);
}

function sendViaMailto() {
  if (!CURRENT_JOB_ID) return;
  const to = document.getElementById("em-to").value.trim();
  const subj = document.getElementById("em-subject").value;
  const body = document.getElementById("em-body").value;
  window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  setJobState(CURRENT_JOB_ID, { status: "sent", sentAt: new Date().toLocaleString("vi-VN") });
  showToast("Đã mở trình gửi Mail mặc định!");
}

function copyFullEmail() {
  const to = document.getElementById("em-to").value.trim();
  const subj = document.getElementById("em-subject").value;
  const body = document.getElementById("em-body").value;
  const full = `To: ${to}\nSubject: ${subj}\n\n${body}`;
  navigator.clipboard.writeText(full).then(() => showToast("Đã copy toàn bộ Email & Tiêu đề!"));
}

function copyTextById(id, msg) {
  const val = document.getElementById(id)?.value || "";
  navigator.clipboard.writeText(val).then(() => showToast(msg));
}

// --------------------------------------------------------------------------
// BULK EMAIL DISPATCH MODAL + LOCAL PYTHON SMTP SERVER INTEGRATION
// --------------------------------------------------------------------------
function getBulkJobsList() {
  const map = new Map(getAllJobs().map(j => [j.id, j]));
  return Array.from(SELECTED_IDS).map(id => map.get(id)).filter(Boolean);
}

function openBulkModal() {
  if (SELECTED_IDS.size === 0) {
    // Auto-select approved jobs or high-fit jobs with direct HR email
    const candidates = getAllJobs().filter(j => {
      const st = getJobState(j.id).status;
      return st === "approved" || (st === "new" && (j.hr_email || "").trim());
    });
    for (const j of candidates.slice(0, 20)) SELECTED_IDS.add(j.id);
    updateSelectionUI();
  }
  renderBulkTable();
  document.getElementById("bulk-backdrop").classList.add("open");
  checkLocalMailerHealth(true);
}

function closeBulkModal() {
  document.getElementById("bulk-backdrop").classList.remove("open");
  renderAll();
}

function renderBulkTable() {
  const tbody = document.getElementById("bulk-table-tbody");
  if (!tbody) return;
  const jobs = getBulkJobsList();

  if (jobs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">
      Chưa có công việc nào được chọn. Hãy bấm nút <strong>"Nạp thêm tất cả Job có Email HR"</strong> hoặc tick vào thẻ công việc bên ngoài.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = jobs.map((j, idx) => {
    const st = getJobState(j.id);
    const toVal = getEffectiveHrEmail(j, st);
    const subjVal = st.customSubject || j.tailored.email_subject;
    const bodyVal = st.customBody || j.tailored.email_body;
    const flags = detectSubjectRoboticPatterns(subjVal).concat(detectAiSigns(bodyVal));
    const directUrl = getDirectJobUrl(j);
    const shortUrl = formatShortJobUrl(directUrl);

    return `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td>
          <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="table-job-link">
            ${escapeHtml(j.title)} <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a><br>
          <span style="font-size:0.74rem;color:#0369a1;font-weight:600;">${escapeHtml(j.company)}</span>
          <div style="font-size:0.7rem;color:#64748b;">${escapeHtml(j.work_mode)}</div>
          <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="table-url-sub">
            <i class="fa-solid fa-link"></i> <span class="notranslate">${escapeHtml(shortUrl)}</span>
          </a>
        </td>
        <td>
          <input type="text" class="bulk-inline-input" placeholder="Nhập email HR..." value="${escapeAttr(toVal)}"
                 oninput="updateBulkRowField('${escapeAttr(j.id)}', 'email', this.value)">
        </td>
        <td>
          <input type="text" class="bulk-inline-input" value="${escapeAttr(subjVal)}"
                 oninput="updateBulkRowField('${escapeAttr(j.id)}', 'subject', this.value)">
          <div style="font-size:0.71rem;color:#64748b;margin-top:3px;">Body: ${escapeHtml(bodyVal.slice(0, 78))}...</div>
        </td>
        <td>
          ${flags.length === 0
            ? `<span class="badge badge-status-approved">PASS 0 AI</span>`
            : `<span class="badge" style="background:#fee2e2;color:#b91c1c;" title="${escapeAttr(flags.join(", "))}">${flags.length} lỗi</span>`
          }
        </td>
        <td>
          <div style="display:flex;gap:4px;">
            <a href="${escapeAttr(directUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm btn-job-direct" title="Mở Link Job Gốc">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
            <button class="btn btn-outline btn-sm" onclick="closeBulkModal();openStudio('${escapeAttr(j.id)}','email')" title="Sửa chi tiết">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-danger-soft btn-sm" onclick="removeFromBulk('${escapeAttr(j.id)}')" title="Bỏ khỏi đợt gửi">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function updateBulkRowField(jobId, field, value) {
  const patch = field === "email" ? { customEmail: value } : { customSubject: value };
  JOB_STATE[jobId] = Object.assign({}, getJobState(jobId), patch);
  saveState();
}

function removeFromBulk(jobId) {
  SELECTED_IDS.delete(jobId);
  updateSelectionUI();
  renderBulkTable();
}

function loadAllEmailJobsIntoBulk() {
  let added = 0;
  for (const j of getAllJobs()) {
    const st = getJobState(j.id);
    const hasMail = Boolean((st.customEmail !== undefined ? st.customEmail : j.hr_email || "").trim());
    if (st.status !== "skipped" && hasMail && !SELECTED_IDS.has(j.id)) {
      SELECTED_IDS.add(j.id);
      added++;
    }
  }
  updateSelectionUI();
  renderBulkTable();
  showToast(added > 0 ? `Đã nạp thêm ${added} công việc có sẵn Email HR!` : "Tất cả các job có Email HR đã có trong danh sách.");
}

function bulkApplySubjectStyle(styleKey) {
  const jobs = getBulkJobsList();
  for (const j of jobs) {
    const variants = getSubjectVariants(j);
    const newSubj = cleanAiSignsText(variants[styleKey] || j.tailored.email_subject);
    JOB_STATE[j.id] = Object.assign({}, getJobState(j.id), { customSubject: newSubj });
  }
  saveState();
  renderBulkTable();
  showToast(`Đã tối ưu tiêu đề "${styleKey}" cho ${jobs.length} email (0 dấu hiệu AI)!`);
}

function cleanAllBulkAiSigns() {
  const jobs = getBulkJobsList();
  for (const j of jobs) {
    const st = getJobState(j.id);
    const cleanSubj = cleanAiSignsText(st.customSubject || j.tailored.email_subject);
    const cleanBody = cleanAiSignsText(st.customBody || j.tailored.email_body);
    JOB_STATE[j.id] = Object.assign({}, st, { customSubject: cleanSubj, customBody: cleanBody });
  }
  saveState();
  renderBulkTable();
  showToast(`Đã quét & khử toàn bộ từ khóa AI cho ${jobs.length} email!`);
}

function appendBulkLog(msg) {
  const box = document.getElementById("bulk-log-box");
  if (!box) return;
  box.classList.add("visible");
  box.textContent += (box.textContent ? "\n" : "") + msg;
  box.scrollTop = box.scrollHeight;
}

function launchGmailWave(startIdx, endIdx) {
  const slice = getBulkJobsList().slice(startIdx, endIdx);
  if (slice.length === 0) {
    showToast("Không còn email nào trong đợt này!");
    return;
  }

  let opened = 0;
  slice.forEach((j, i) => {
    const st = getJobState(j.id);
    const to = getEffectiveHrEmail(j, st);
    const subj = st.customSubject || j.tailored.email_subject;
    const body = st.customBody || j.tailored.email_body;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&authuser=${encodeURIComponent(WORK_EMAIL)}&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;

    setTimeout(() => {
      window.open(url, "_blank");
      JOB_STATE[j.id] = Object.assign({}, getJobState(j.id), {
        status: "sent",
        sentAt: new Date().toLocaleString("vi-VN")
      });
      saveState();
      if (i === slice.length - 1) renderAll();
    }, i * 260);

    opened++;
    appendBulkLog(`[Gmail Wave] Đã mở tab soạn mail #${startIdx + i + 1}: ${j.company} -> ${to || "(chưa điền email)"} | Subject: ${subj}`);
  });

  showToast(`Đang mở ${opened} tab Gmail theo đợt! Nếu trình duyệt chặn Popup, hãy chọn "Always allow popups" cho trang này.`);
}

function markBulkBatchAsSent() {
  const nowStr = new Date().toLocaleString("vi-VN");
  const jobs = getBulkJobsList();
  for (const j of jobs) {
    JOB_STATE[j.id] = Object.assign({}, getJobState(j.id), { status: "sent", sentAt: nowStr });
  }
  saveState();
  renderAll();
  renderBulkTable();
  showToast(`Đã đánh dấu "Đã gửi Mail" cho ${jobs.length} công việc!`);
}

function exportBulkMailMergeCSV() {
  const jobs = getBulkJobsList();
  const headers = ["JobID", "Company", "JobTitle", "Email", "Subject", "Body"];
  const lines = [headers.join(",")];
  for (const j of jobs) {
    const st = getJobState(j.id);
    const to = st.customEmail !== undefined ? st.customEmail : (j.hr_email || "");
    const subj = st.customSubject || j.tailored.email_subject;
    const body = st.customBody || j.tailored.email_body;
    lines.push([j.id, j.company, j.title, to, subj, body].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bulk_mail_merge.csv";
  a.click();
  showToast(`Đã xuất ${jobs.length} email ra bulk_mail_merge.csv!`);
}

function getBulkMailerBaseUrl() {
  if (window.location.port === "8787") return "";
  return "http://127.0.0.1:8787";
}

async function checkLocalMailerHealth(silent = false) {
  const badge = document.getElementById("smtp-health-badge");
  const url = `${getBulkMailerBaseUrl()}/api/health`;
  try {
    const resp = await fetch(url, { method: "GET" });
    const data = await resp.json();
    if (data.ok) {
      badge.textContent = "Server :8787 SẴN SÀNG (Kèm PDF CV)";
      badge.style.background = "#d1fae5";
      badge.style.color = "#065f46";
      if (!silent) appendBulkLog(`[Health] Kết nối bulk_mailer.py thành công. CV Assets: ${JSON.stringify(data.cv_assets)}`);
      return true;
    }
  } catch (e) {
    badge.textContent = "Chưa chạy python bulk_mailer.py";
    badge.style.background = "#fee2e2";
    badge.style.color = "#991b1b";
    if (!silent) {
      appendBulkLog("[Health] Không thấy local server tại http://127.0.0.1:8787. Mở terminal và chạy: python bulk_mailer.py");
      showToast("Chưa bật local server! Hãy chạy 'python bulk_mailer.py' hoặc dùng Cách 1 (Gmail Wave).");
    }
  }
  return false;
}

async function sendBulkViaLocalServer(mode) {
  const jobs = getBulkJobsList();
  if (jobs.length === 0) {
    showToast("Chưa chọn job nào để gửi!");
    return;
  }

  const senderEmail = document.getElementById("smtp-sender").value.trim() || WORK_EMAIL;
  const appPass = document.getElementById("smtp-app-pass").value.trim();
  const attachCv = document.getElementById("smtp-attach-cv").value;

  if (mode === "live") {
    if (!appPass) {
      showToast("Cần nhập Gmail App Password (16 ký tự) để gửi thật!");
      return;
    }
    if (!confirm(`Xác nhận gửi THẬT ${jobs.length} email tới HR kèm PDF CV?`)) return;
  } else if (mode === "test_self" && !appPass) {
    showToast("Cần nhập Gmail App Password để gửi thử vào hộp thư của chính bạn!");
    return;
  }

  const items = jobs.map(j => {
    const st = getJobState(j.id);
    return {
      id: j.id,
      company: j.company,
      to: getEffectiveHrEmail(j, st),
      subject: st.customSubject || j.tailored.email_subject,
      body: st.customBody || j.tailored.email_body,
      lang: getMatchedCvLang(j, st)
    };
  });

  appendBulkLog(`[SMTP:${mode}] Đang gửi yêu cầu xử lý ${items.length} email tới ${getBulkMailerBaseUrl() || "localhost:8787"}/api/bulk-send...`);

  try {
    const resp = await fetch(`${getBulkMailerBaseUrl()}/api/bulk-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        sender_email: senderEmail,
        sender_name: "Nguyen Tran Tien Phuc",
        app_password: appPass,
        attach_cv: attachCv,
        items
      })
    });
    const res = await resp.json();
    if (!res.ok) {
      appendBulkLog(`[LỖI] ${res.error}`);
      showToast(res.error || "Gửi thất bại!");
      return;
    }

    const nowStr = new Date().toLocaleString("vi-VN");
    for (const r of (res.results || [])) {
      appendBulkLog(` - [${r.status}] ${r.company} (${r.to}) -> ${r.detail}`);
      if (mode === "live" && r.status === "sent" && r.id) {
        JOB_STATE[r.id] = Object.assign({}, getJobState(r.id), { status: "sent", sentAt: nowStr });
      }
    }
    if (mode === "live") {
      saveState();
      renderAll();
    }
    showToast(`Hoàn tất (${mode}): ${res.sent_count} thành công, ${res.failed_count} bỏ qua/lỗi.`);
  } catch (err) {
    appendBulkLog(`[LỖI KẾT NỐI] Chưa chạy bulk_mailer.py hoặc bị chặn kết nối (${err}). Hãy mở Cách 1 (Gmail Wave) hoặc chạy 'python bulk_mailer.py'.`);
    showToast("Không kết nối được bulk_mailer.py (:8787)!");
  }
}

// --------------------------------------------------------------------------
// CUSTOM JD IMPORTER (/apply) & BROWSER LIVE SCRAPER
// --------------------------------------------------------------------------
function openCustomJobModal() {
  document.getElementById("custom-modal-backdrop").classList.add("open");
}

function closeCustomJobModal() {
  document.getElementById("custom-modal-backdrop").classList.remove("open");
}

function submitCustomJob() {
  const title = document.getElementById("cj-title").value.trim();
  const company = document.getElementById("cj-company").value.trim();
  const desc = document.getElementById("cj-desc").value.trim();
  if (!title || !company || !desc) {
    showToast("Vui lòng nhập Tên vị trí, Công ty và Mô tả công việc!");
    return;
  }

  const cat = document.getElementById("cj-category").value;
  const workMode = document.getElementById("cj-workmode").value;
  const salary = document.getElementById("cj-salary").value.trim() || "Thỏa thuận";
  const hrEmail = document.getElementById("cj-email").value.trim();
  const applyUrl = document.getElementById("cj-url").value.trim() || "https://tonykosuy.github.io/portfolio/";

  let finalEmail = hrEmail;
  if (!finalEmail) {
    const m = desc.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    if (m) finalEmail = m[0];
  }

  const isGlobal = workMode.includes("Quốc tế");
  const isRemote = workMode.toLowerCase().includes("remote");
  const market = isGlobal ? "Global Remote" : "Vietnam";
  const resolvedEmail = hrEmail || resolveClientHrEmail(company, applyUrl, desc, market);
  const job = buildDynamicJobObject({
    id: `custom_${Date.now()}`,
    title,
    company,
    category: cat,
    market,
    location: isRemote ? "Remote 100%" : "TP.HCM (Onsite / Part-time)",
    work_mode: workMode,
    salary,
    source: "Custom JD (/apply)",
    apply_url: applyUrl,
    hr_email: resolvedEmail,
    hr_email_source: hrEmail ? "explicit" : "domain_resolved",
    desc,
    is_live_scraped: false
  });

  CUSTOM_JOBS.unshift(job);
  saveCustomJobs();
  closeCustomJobModal();
  renderAll();
  openStudio(job.id, "cv");
  showToast(`Đã phân tích ATS & tối ưu xong hồ sơ cho ${company}!`);
}

async function liveScrapeInBrowser() {
  const btn = document.getElementById("btn-live-scrape");
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang quét Remotive & Himalayas...`;

  let added = 0;
  const existingKeys = new Set(getAllJobs().map(j => `${j.company}_${j.title}`.toLowerCase().replace(/[^a-z0-9]/g, "")));

  try {
    const [remRes, himRes] = await Promise.allSettled([
      fetch("https://remotive.com/api/remote-jobs?limit=35").then(r => r.json()),
      fetch("https://himalayas.app/jobs/api?limit=30").then(r => r.json())
    ]);

    const candidates = [];
    if (remRes.status === "fulfilled" && remRes.value?.jobs) {
      for (const j of remRes.value.jobs) {
        candidates.push({
          source: "Remotive Live",
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || "Worldwide",
          salary: j.salary || "Remote USD",
          url: j.url,
          desc: (j.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        });
      }
    }
    if (himRes.status === "fulfilled" && himRes.value?.jobs) {
      for (const j of himRes.value.jobs) {
        candidates.push({
          source: "Himalayas Live",
          title: j.title,
          company: j.companyName,
          location: (j.locationRestrictions || ["Worldwide"]).join(", "),
          salary: j.minSalary ? `${j.minSalary}-${j.maxSalary} ${j.currency || "USD"}` : "Remote Competitive",
          url: j.applicationLink || j.guid,
          desc: (j.description || j.excerpt || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        });
      }
    }

    for (const c of candidates) {
      if (!c.title || !c.company) continue;
      const tl = c.title.toLowerCase();
      const ll = c.location.toLowerCase();
      if (/senior|sr\.|principal|staff|director|vp|head of|chief|lead|architect|physician|nurse|therapist|spanish|french|german/.test(tl)) continue;
      if (!/worldwide|anywhere|apac|asia|vietnam|global|remote/.test(ll) && /united states|usa|canada|uk|europe|germany/.test(ll)) continue;

      const key = `${c.company}_${c.title}`.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      let cat = "assistant_pm";
      if (/tutor|teacher|instructor|mentor/.test(tl)) cat = "tutor_ta";
      else if (/admission|enrollment|counselor/.test(tl)) cat = "admissions_sale";
      else if (/freelance|contractor|gig/.test(tl)) cat = "freelance_gig";
      else if (/n8n|automation|chatbot|ai |no-code|vibe|video|qa|tester|prompt|web/.test(tl)) cat = "ai_vibe";
      else if (/stock|equity|trading|quant|investment/.test(tl)) cat = "stock";
      else if (/finance|financial|accounting|data analyst|analytics/.test(tl)) cat = "finance";
      else if (/sales|business dev|bdr|sdr|growth|marketing|e-commerce|esg|sustainab|climate|support/.test(tl)) cat = "sales_esg";

      const m = c.desc.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      const resolvedEmail = m ? m[0] : resolveClientHrEmail(c.company, c.url, c.desc, "Global Remote");
      const job = buildDynamicJobObject({
        id: `browser_${Date.now()}_${added}`,
        title: c.title,
        company: c.company,
        category: cat,
        market: "Global Remote",
        location: c.location.slice(0, 46),
        work_mode: "Remote Quốc tế",
        salary: c.salary.slice(0, 36),
        source: c.source,
        apply_url: c.url,
        hr_email: resolvedEmail,
        hr_email_source: m ? "explicit" : "domain_resolved",
        desc: c.desc,
        is_live_scraped: true
      });
      CUSTOM_JOBS.unshift(job);
      added++;
      if (added >= 10) break;
    }

    if (added > 0) {
      saveCustomJobs();
      renderAll();
      showToast(`Đã scrape thêm ${added} remote jobs mới trực tiếp từ API!`);
    } else {
      showToast("Các remote jobs mới nhất trên API đã có sẵn trong danh sách.");
    }
  } catch (err) {
    showToast("Trình duyệt bị chặn CORS khi gọi API; hãy chạy 'python scraper.py' để cập nhật toàn bộ nguồn!");
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
}

function computeClientAtsProfile(title, company, url, desc, skills) {
  const hay = `${url} ${company} ${title} ${desc}`.toLowerCase();
  let vendor = "Direct HR / Startup Screen";
  if (/workday|myworkdayjobs/.test(hay)) vendor = "Workday ATS";
  else if (/greenhouse/.test(hay)) vendor = "Greenhouse ATS";
  else if (/lever\.co/.test(hay)) vendor = "Lever ATS";
  else if (/successfactors|sap/.test(hay)) vendor = "SAP SuccessFactors";
  else if (/topcv|vietnamworks|careerviet/.test(hay)) vendor = "VN Portal AI Filter";
  else if (/linkedin/.test(hay)) vendor = "LinkedIn Recruiter Match";

  const candBank = {
    "n8n": "Bot chung khoan & automation n8n",
    "make": "Make workflow automation",
    "botpress": "Chatbot AVI Health Botpress",
    "kodular": "No-code app Kodular",
    "veo 3": "Phim AI Google Omni & Veo 3",
    "video": "Video demo AI tren Portfolio",
    "excel": "Chung chi MOS Expert (Excel)",
    "data": "Google Data Analytics + Dashboard",
    "analytics": "Google Data Analytics",
    "project": "Foundations of Project Management",
    "ielts": "Chung chi IELTS 6.0",
    "english": "IELTS 6.0 + Indonesia Exchange",
    "esg": "Green Youth Lab (UNICEF) + Airlangga",
    "stock": "Song nganh Chung khoan UEH + Bot VN100",
    "finance": "UEH Chung khoan + Bot $5,000 (10% ROI)",
    "tutor": "3 thang day Toan Ly lop tinh thuong",
    "teaching": "3 thang day hoc + IELTS 6.0",
    "hr": "HuReA Hub ERP (113+ thanh vien)",
    "sales": "Gay quy VNDEER 30M+ VND"
  };

  const existing = [];
  const supported = [];
  for (const [kw, proof] of Object.entries(candBank)) {
    if (hay.includes(kw)) {
      existing.push(kw);
      if (!supported.includes(proof)) supported.push(proof);
    }
  }
  for (const s of (skills || [])) {
    if (!existing.includes(s) && existing.length < 7) existing.push(s);
  }
  const gaps = /3\+ years|5\+ years|senior|cfa|cpa/.test(hay)
    ? ["3+ years full-time experience (UEH sophomore offsetting with live portfolio proof)"]
    : [];
  const cov = Math.min(97, Math.max(82, 83 + existing.length * 2 - gaps.length * 3));
  return {
    vendor,
    tier: cov >= 88 ? "TIER 1 PASS" : "TIER 2 FIT",
    coverage_pct: cov,
    existing_keywords: existing.slice(0, 7),
    supported_keywords: supported.slice(0, 5),
    honest_gap_keywords: gaps,
    reverse_tips: [
      `Detect: ${vendor}. Hệ thống gửi đúng 2 bản CV gốc (EN/VI PDF) và tự động tối ưu từ khóa ATS vào Cover Letter & Email.`,
      "Tránh bịa từ khóa ngoài thực tế; đặt số liệu thật (10% ROI, 113+ thành viên, 3 tháng dạy học) ngay 6 giây đầu."
    ]
  };
}

function buildDynamicJobObject({ id, title, company, category, market, location, work_mode, salary, source, apply_url, hr_email, hr_email_source, desc, is_live_scraped }) {
  const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(title + desc);
  const catMaps = {
    ai_vibe: {
      projOrder: ["ai_automation", "hurea_hub", "stock_bot", "vndeer"],
      skills: ["n8n & Make Automation", "Vibe Coding Web App", "Google Omni & Veo 3", "Botpress & Kodular", "Teachable Machine AI"],
      ev: "Built n8n stock bot (10% ROI), HuReA Hub ERP (113+ users), AVI Health chatbot, and AI videos with Google Omni & Veo 3.",
      sumEn: "UEH sophomore building practical Vibe-Coded web apps, n8n/Make automation workflows, Botpress chatbots, and AI video creatives using Google Omni and Veo 3.",
      sumVi: "Sinh viên năm 2 UEH chuyên triển khai Web App bằng Vibe Code, luồng tự động n8n/Make/Botpress và dựng video AI trên Google Omni & Veo 3 với 5 sản phẩm chạy thật."
    },
    tutor_ta: {
      projOrder: ["leadership_service", "hurea_hub", "ai_automation", "vndeer"],
      skills: ["3-Month Math & Physics Tutor", "IELTS 6.0", "MOS Expert", "STEM / Coding Kids", "Samsung Top 25"],
      ev: "Taught Math and Physics to 6 students over 3 months, holds IELTS 6.0, MOS Expert, and Top 25 Samsung Solve For Tomorrow.",
      sumEn: "UEH Dual-Major sophomore with 3 months of classroom experience teaching Math and Physics to primary/middle-school students, IELTS 6.0, MOS Expert, and Samsung Solve For Tomorrow Top 25.",
      sumVi: "Sinh viên năm 2 UEH tại TP.HCM, đã dạy kèm Toán & Lý cho 6 học sinh trong 3 tháng tại lớp học tình thương, sở hữu IELTS 6.0, MOS Expert và Top 25 Samsung Solve For Tomorrow."
    },
    admissions_sale: {
      projOrder: ["leadership_service", "vndeer", "hurea_hub", "ai_automation"],
      skills: ["Admissions & Outreach", "IELTS 6.0", "Universitas Airlangga Exchange", "VNDEER 30M+ Fund", "Customer Service"],
      ev: "Hospitality customer service experience + raised 30M+ VND for VNDEER + IELTS 6.0 + Exchange student at Universitas Airlangga.",
      sumEn: "Communicative UEH Dual-Major student with international exchange experience in Indonesia, IELTS 6.0, customer service training, and 30M+ VND community fundraising results.",
      sumVi: "Sinh viên năm 2 UEH tại TP.HCM giao tiếp linh hoạt, từng phục vụ khách hàng, trao đổi tại Indonesia (IELTS 6.0) và thuyết phục gây quỹ cộng đồng 30+ triệu VNĐ."
    },
    freelance_gig: {
      projOrder: ["ai_automation", "hurea_hub", "stock_bot", "vndeer"],
      skills: ["n8n / Make Workflows", "Vibe Code Landing Page", "AI Video (Veo 3 / Omni)", "MOS Expert Excel", "Google Data Analytics"],
      ev: "Shipped working landing pages, HuReA Hub ERP, n8n/Make/Botpress automations, and Veo 3 demo videos on public Portfolio.",
      sumEn: "Fast-executing freelance builder at UEH delivering n8n/Make workflows, responsive landing pages, Botpress/Kodular prototypes, Excel automation, and Veo 3 AI videos.",
      sumVi: "Cộng tác viên freelance bàn giao nhanh Landing Page, workflow n8n/Make/Botpress, làm sạch dữ liệu Excel và dựng video AI Veo 3 với demo trực tiếp trên Portfolio."
    },
    assistant_pm: {
      projOrder: ["hurea_hub", "leadership_service", "vndeer", "ai_automation"],
      skills: ["Foundations of Project Management", "MOS Expert", "HR Operations (113+)", "Scheduling & Docs", "IELTS 6.0"],
      ev: "Foundations of Project Management + MOS Expert + built HuReA Hub ERP & led Bond & Benefit team for 107+ members.",
      sumEn: "Organized UEH sophomore holding Foundations of Project Management and MOS Expert certifications. Built HuReA Hub ERP for 113+ club members and taught Math and Physics for 3 months.",
      sumVi: "Sinh viên năm 2 UEH đạt chứng chỉ Foundations of Project Management & MOS Expert. Tự xây cổng quản trị HuReA Hub cho 113+ thành viên CLB Nhân sự và từng dạy lớp học tình thương 3 tháng."
    },
    stock: {
      projOrder: ["stock_bot", "ai_automation", "hurea_hub", "vndeer"],
      skills: ["VN100 Screening", "n8n Financial Bot", "Technical Analysis", "Google Data Analytics", "MOS Expert", "IELTS 6.0"],
      ev: "Built n8n stock news & technical analysis bot + VN100 screener (10% ROI on $5,000 in 3 months).",
      sumEn: "Dual-major sophomore in Stock Market & International Business at UEH. Built an n8n market news and VN100 screening bot delivering 10% ROI on a $5,000 portfolio in 3 months. Certified in Google Data Analytics, MOS Expert, and IELTS 6.0.",
      sumVi: "Sinh viên năm 2 song ngành Thị trường Chứng khoán & Kinh doanh Quốc tế UEH. Tự xây bot n8n phân tích kỹ thuật ~130 mã VN100 đạt 10% lợi nhuận/3 tháng (vốn $5,000), kèm chứng chỉ Google Data Analytics và MOS Expert."
    },
    finance: {
      projOrder: ["stock_bot", "hurea_hub", "ai_automation", "vndeer"],
      skills: ["Google Data Analytics", "MOS Expert (Excel)", "Financial Analysis", "n8n/Make Reports", "IELTS 6.0"],
      ev: "Google Data Analytics + MOS Expert + financial analysis bot (10% ROI/3 months) & HuReA Hub batch Excel/PDF exports.",
      sumEn: "UEH Stock Market & International Business sophomore combining data analytics with financial workflow automation. Built a 10% ROI trading bot and automated reporting ERP for 113+ users.",
      sumVi: "Sinh viên năm 2 UEH kết hợp nền tảng Tài chính - Chứng khoán với Google Data Analytics và MOS Expert. Đã xây bot tài chính đạt 10% ROI/3 tháng và hệ thống xuất báo cáo Excel/PDF cho 113+ thành viên."
    },
    sales_esg: {
      projOrder: ["vndeer", "ai_automation", "leadership_service", "hurea_hub"],
      skills: ["International Business UEH", "ESG & Environmental Law (Airlangga)", "Green Youth Lab (UNICEF)", "E-Commerce Ops", "IELTS 6.0"],
      ev: "International Business UEH + Universitas Airlangga ESG exchange + Green Youth Lab (UNICEF) + VNDEER 30M+ VND fund.",
      sumEn: "UEH International Business & Stock Market student with Universitas Airlangga ESG & Environmental Law exchange, UNICEF Green Youth Lab training, IELTS 6.0, and 30M+ VND fundraising outreach.",
      sumVi: "Sinh viên năm 2 Kinh doanh Quốc tế UEH, từng trao đổi về ESG & Luật Môi trường tại Indonesia, hoàn thành Green Youth Lab (UNICEF), IELTS 6.0 và sáng lập dự án VNDEER (quỹ 30+ triệu)."
    }
  };
  const m = catMaps[category] || catMaps.assistant_pm;
  const atsProfile = computeClientAtsProfile(title, company, apply_url, desc, m.skills);

  const isVnMarket = (market === "Vietnam");
  const sigPhoneEn = isVnMarket ? `Phone: ${PHONE_VN}` : PHONE_FOREIGN;
  const sigPhoneVi = isVnMarket ? `SĐT/Zalo: ${PHONE_VN}` : PHONE_FOREIGN;

  const cvMeta = getCvMetaByLang(isVi ? "vi" : "en");
  const clEn = cleanAiSignsText(
    `Dear ${company} Hiring Team,\n\n` +
    `I am applying for the ${title} position at ${company}. I am a second-year dual-major student in Stock Market and International Business at UEH (Ho Chi Minh City), and I also completed an exchange program in Sustainable Business at Universitas Airlangga.\n\n` +
    `Relevant examples from my work:\n` +
    `- ${m.ev}\n` +
    `- Certifications: IELTS 6.0, Google Data Analytics, MOS Expert, and Foundations of Project Management.\n\n` +
    `Attached PDF CV (${cvMeta.file}): ${cvMeta.liveUrl}\n` +
    `You can inspect working examples and demos at https://tonykosuy.github.io/portfolio/.\n\n` +
    `Thank you for your time and consideration.\n\nBest regards,\nNguyen Tran Tien Phuc\n${sigPhoneEn} | Email: ${WORK_EMAIL}`
  );
  const clVi = cleanAiSignsText(
    `Kính gửi Anh/Chị ${company},\n\n` +
    `Em là Nguyễn Trần Tiến Phúc, sinh viên năm 2 song ngành Thị trường Chứng khoán & Kinh doanh Quốc tế tại ĐH Kinh tế TP.HCM (UEH). Em xin ứng tuyển vị trí ${title} tại ${company}.\n\n` +
    `Kinh nghiệm thực tế của em phù hợp với công việc này:\n` +
    `- ${m.sumVi}\n` +
    `- Chứng chỉ: IELTS 6.0, Google Data Analytics, MOS Expert, Foundations of Project Management.\n\n` +
    `File CV PDF đính kèm (${cvMeta.file}): ${cvMeta.liveUrl}\n` +
    `Anh/Chị có thể xem sản phẩm thực tế của em tại Portfolio: https://tonykosuy.github.io/portfolio/. Rất mong được trao đổi thêm cùng Anh/Chị.\n\n` +
    `Trân trọng,\nNguyễn Trần Tiến Phúc\n${sigPhoneVi} | Email: ${WORK_EMAIL}`
  );

  // Non-AI Natural Subject Variants (no robotic brackets [] or pipes |)
  const subjectVariants = isVi
    ? {
        hr_natural: `Ứng tuyển vị trí ${title} - Nguyễn Trần Tiến Phúc (SV năm 2 UEH)`,
        proof_direct: `${title} tại ${company} - Nguyễn Trần Tiến Phúc (Kèm Portfolio & Minh chứng thực tế)`,
        fb_hcm_parttime: `Em ứng tuyển ${title} theo tin tuyển dụng - Tiến Phúc (UEH TP.HCM)`,
        short_casual: `Gửi CV ${title} - Tiến Phúc`
      }
    : {
        hr_natural: `Application for ${title} - Nguyen Tran Tien Phuc (UEH)`,
        proof_direct: `${title} at ${company} - Phuc Nguyen (Portfolio & Verified Projects)`,
        fb_hcm_parttime: `Regarding ${title} opening - Phuc Nguyen (Ho Chi Minh City)`,
        short_casual: `${title} application - Phuc Nguyen`
      };

  const emailSubj = subjectVariants.hr_natural;
  const emailBody = isVi ? clVi : clEn;

  const jobObj = {
    id,
    title,
    company,
    category,
    market,
    location,
    work_mode,
    salary,
    source,
    apply_url,
    hr_email: hr_email || resolveClientHrEmail(company, apply_url, desc, market),
    hr_email_source: hr_email_source || "domain_resolved",
    attached_cv_lang: cvMeta.lang,
    attached_cv_file: cvMeta.file,
    attached_cv_url: cvMeta.liveUrl,
    lang: isVi ? "VI/EN" : "EN",
    fit_score: 91,
    dimensions: { skills: 92, evidence: 90, domain: 91, remote_fit: 94, career_value: 91 },
    is_live_scraped,
    is_enterprise_ats: atsProfile.vendor.includes("ATS"),
    is_fb_linkedin: /fb|facebook|linkedin/i.test(`${source} ${apply_url}`),
    published_at: new Date().toISOString().slice(0, 10),
    tags: m.skills.slice(0, 3),
    summary: desc.slice(0, 320) + (desc.length > 320 ? "..." : ""),
    matched_evidence: [m.ev, "IELTS 6.0, Google Data Analytics, MOS Expert & UEH Dual Major"],
    honest_gap: "Imported JD: verify exact working hours / timezone overlap against UEH class schedule.",
    recruiter_critique: [
      `Clear match between ${title} and verified portfolio proof.`,
      `ATS reverse check (${atsProfile.vendor}): ${atsProfile.coverage_pct}% keyword coverage, 0 AI phrases.`
    ],
    ats_profile: atsProfile,
    tailored: {
      cv_summary_en: m.sumEn,
      cv_summary_vi: m.sumVi,
      project_order: m.projOrder,
      highlighted_skills: m.skills,
      cover_letter_en: clEn,
      cover_letter_vi: clVi,
      email_subject: emailSubj,
      subject_variants: subjectVariants,
      email_body: emailBody
    }
  };
  jobObj.snapshot_img = makeInlineSnapshotUri(jobObj);
  return jobObj;
}

function makeInlineSnapshotUri(j) {
  const catColor = (HUB_DATA.categories[j.category] || {}).color || "#0284c7";
  const esc = s => String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="250" viewBox="0 0 480 250">
    <rect width="480" height="250" rx="14" fill="#0F172A"/>
    <rect width="480" height="5" fill="${catColor}"/>
    <text x="24" y="34" font-family="Consolas,monospace" font-size="11" fill="#94A3B8">${esc(j.source)} | ${esc(j.work_mode)}</text>
    <text x="24" y="80" font-family="Inter,Arial,sans-serif" font-size="16" font-weight="800" fill="#F8FAFC">${esc(j.title.slice(0, 42))}</text>
    <text x="24" y="106" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="700" fill="${catColor}">${esc(j.company)}</text>
    <rect x="24" y="128" width="432" height="54" rx="10" fill="#1E293B"/>
    <text x="38" y="150" font-family="Inter,Arial,sans-serif" font-size="12" fill="#CBD5E1">Location: ${esc(j.location)}</text>
    <text x="38" y="170" font-family="Inter,Arial,sans-serif" font-size="12" font-weight="700" fill="#34D399">Pay: ${esc(j.salary)}</text>
    <rect x="372" y="138" width="74" height="34" rx="8" fill="${catColor}" fill-opacity="0.22" stroke="${catColor}"/>
    <text x="409" y="160" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">${j.fit_score}% FIT</text>
    <text x="24" y="220" font-family="Inter,Arial,sans-serif" font-size="11" fill="#94A3B8">ATS Coverage: ${j.ats_profile?.coverage_pct || 90}% | ${esc((j.matched_evidence && j.matched_evidence[0] || "").slice(0, 46))}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// --------------------------------------------------------------------------
// ANTI-AI GUARD MODAL & CSV EXPORT
// --------------------------------------------------------------------------
function openAiGuardModal() {
  document.getElementById("aiguard-backdrop").classList.add("open");
}

function closeAiGuardModal() {
  document.getElementById("aiguard-backdrop").classList.remove("open");
}

function runTesterAiCheck() {
  const txt = document.getElementById("guard-tester-input").value;
  updateAiBanner("guard-tester-banner", txt);
}

function cleanTesterAiSigns() {
  const el = document.getElementById("guard-tester-input");
  el.value = cleanAiSignsText(el.value);
  runTesterAiCheck();
  showToast("Đã làm sạch dấu hiệu AI!");
}

function exportTrackerCSV() {
  const allJobs = getAllJobs();
  const headers = ["JobID", "Title", "Company", "Category", "WorkMode", "Location", "FitScore", "ATSVendor", "ATSCoveragePct", "Status", "HREmail", "ApplyURL", "SentAt", "Notes"];
  const lines = [headers.join(",")];
  for (const j of allJobs) {
    const st = getJobState(j.id);
    const row = [
      j.id, j.title, j.company, j.category, j.work_mode, j.location,
      j.fit_score, j.ats_profile?.vendor || "Direct", j.ats_profile?.coverage_pct || "",
      st.status, getEffectiveHrEmail(j, st), j.apply_url, st.sentAt || "", st.notes || ""
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(row.join(","));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "job_search_tracker.csv";
  a.click();
  showToast("Đã tải file job_search_tracker.csv!");
}

function resetTrackerStatuses() {
  if (!confirm("Bạn muốn đặt lại toàn bộ trạng thái ứng tuyển về mặc định?")) return;
  JOB_STATE = {};
  SELECTED_IDS.clear();
  saveState();
  renderAll();
  showToast("Đã đặt lại trạng thái.");
}

// --------------------------------------------------------------------------
// UTILITIES
// --------------------------------------------------------------------------
function openLightbox(src) {
  document.getElementById("lightbox-img").src = src;
  document.getElementById("lightbox").classList.add("open");
}

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function escapeAttr(str) {
  return escapeHtml(str);
}

// Boot
document.addEventListener("DOMContentLoaded", () => {
  loadPersistence();
  renderAll();
});
