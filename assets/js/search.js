/* ============================================================
   360 SEARCH V3.9 — Fixed edge function integration
   Edge function: /functions/v1/search
   Expects POST { q, tab, page, safe }
   Returns { web, images, news, kp, paa, countText, currentPage, totalPages }
============================================================ */

console.log("360 Search V3.9 loaded");

/* ============================================================
   ELEMENTS
============================================================ */
const resultsContainer = document.getElementById("resultsContainer");
const imageResults     = document.getElementById("imageResults");
const knowledgePanel   = document.getElementById("knowledgePanel");
const paaSection       = document.getElementById("paaSection");
const paaList          = document.getElementById("paaList");
const stripForm        = document.getElementById("strip-search-form");
const stripInput       = document.getElementById("strip-search-input");
const safeSelect       = document.getElementById("safeSelect");
const tabAll           = document.getElementById("tabAll");
const tabImages        = document.getElementById("tabImages");
const listViewBtn      = document.getElementById("listViewBtn");
const gridViewBtn      = document.getElementById("gridViewBtn");
const loader           = document.getElementById("frame-loader");
const noQuery          = document.getElementById("no-query");

/* ============================================================
   STATE
============================================================ */
let currentTab  = "all";   // "all" | "images"
let currentPage = 1;
let currentQuery = "";

/* ============================================================
   EDGE FUNCTION ENDPOINT
============================================================ */
const EDGE_URL = "https://wiswfpfsjiowtrdyqpxy.supabase.co/functions/v1/search";

/* ============================================================
   HELPERS
============================================================ */
function showLoader()     { loader?.classList.add("visible"); }
function hideLoader()     { loader?.classList.remove("visible"); }
function showNoResults()  { noQuery?.classList.add("visible"); }
function hideNoResults()  { noQuery?.classList.remove("visible"); }

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function updateUrl(q, tab, page) {
  const url = new URL(location.href);
  if (q) {
    url.searchParams.set("q", q);
    url.searchParams.set("tab", tab || "all");
    if (page && page > 1) url.searchParams.set("page", page);
    else url.searchParams.delete("page");
  } else {
    url.searchParams.delete("q");
    url.searchParams.delete("tab");
    url.searchParams.delete("page");
  }
  history.replaceState(null, "", url.toString());
}

/* ============================================================
   MAIN SEARCH FUNCTION
============================================================ */
async function runSearch(q, tab, page) {
  if (!q?.trim()) {
    clearResults();
    showNoResults();
    return;
  }

  currentQuery = q;
  currentTab   = tab  || "all";
  currentPage  = page || 1;

  hideNoResults();
  showLoader();
  clearResults();
  updateUrl(q, currentTab, currentPage);

  // Sync input
  if (stripInput) stripInput.value = q;

  try {
    const res = await fetch(EDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q:    q.trim(),
        tab:  currentTab,
        page: currentPage,
        safe: safeSelect?.value || "moderate"
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Search service error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    hideLoader();

    if (data.error) throw new Error(data.error);

    renderResults(data);

  } catch (err) {
    hideLoader();
    console.error("Search error:", err);
    showError(err.message);
  }
}

/* ============================================================
   RENDER ALL RESULTS
============================================================ */
function renderResults(data) {
  const { web = [], images = [], news = [], kp = null, paa = [], countText = "", currentPage: cp = 1, totalPages: tp = 1 } = data;

  // Decide what to show based on active tab
  if (currentTab === "images") {
    renderImageResults(images);
  } else {
    renderWebResults(web, countText, cp, tp);
  }

  renderKnowledgePanel(kp);
  renderPAA(paa);
}

/* ============================================================
   WEB RESULTS
============================================================ */
function renderWebResults(results, countText, cp, tp) {
  if (!resultsContainer) return;

  if (!results.length) {
    resultsContainer.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--mut)">
        <div style="font-size:42px;margin-bottom:12px">🔍</div>
        <div style="font-size:16px;font-weight:700;color:var(--txt)">No results found</div>
        <div style="font-size:13px;margin-top:8px">Try different keywords</div>
      </div>`;
    return;
  }

  let html = "";
  if (countText) {
    html += `<div class="results-info" style="font-size:13px;color:var(--mut);margin-bottom:16px;padding:0 4px">${escapeHtml(countText)}</div>`;
  }

  results.forEach((r, i) => {
    const url     = r.url || r.link || "#";
    const title   = r.title || "Untitled";
    const snippet = r.desc  || r.snippet || r.description || "";
    const thumb   = r.thumb || r.thumbnail || "";
    const favicon = r.favicon || `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(url)}`;

    let hostname = "";
    try { hostname = new URL(url).hostname.replace("www.", ""); } catch {}

    const delay = Math.min(i * 0.04, 0.4);

    html += `
      <div class="result-card" style="animation-delay:${delay}s">
        <div class="result-header">
          <img class="result-favicon" src="${escapeHtml(favicon)}" alt=""
               loading="lazy" onerror="this.style.display='none'" width="16" height="16" />
          <div style="font-size:12px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${escapeHtml(hostname)}
          </div>
        </div>
        <a class="result-title" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(title)}
        </a>
        ${snippet ? `<div class="result-desc">${escapeHtml(snippet)}</div>` : ""}
        <div class="result-url">${escapeHtml(url)}</div>
      </div>`;
  });

  // Pagination
  if (tp > 1) {
    html += buildPagination(cp, tp);
  }

  resultsContainer.innerHTML = html;
  resultsContainer.classList.remove("hidden");
  imageResults?.classList.add("hidden");

  // Wire pagination buttons
  resultsContainer.querySelectorAll(".page-btn[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      runSearch(currentQuery, currentTab, parseInt(btn.dataset.page));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

/* ============================================================
   IMAGE RESULTS
============================================================ */
function renderImageResults(images) {
  if (!imageResults) return;

  if (!images.length) {
    imageResults.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--mut);grid-column:1/-1">
        <div style="font-size:42px">🖼️</div>
        <div style="font-size:14px;margin-top:8px">No images found</div>
      </div>`;
    imageResults.classList.remove("hidden");
    resultsContainer?.classList.add("hidden");
    return;
  }

  imageResults.innerHTML = images.map((img, i) => {
    const src = img.src || img.image || img.thumbnail || img.url || "";
    const alt = img.alt || img.title || "Image";
    const url = img.url || img.link || "#";
    if (!src) return "";
    return `
      <div class="image-card" style="animation-delay:${Math.min(i*0.03,0.4)}s">
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy"
               onerror="this.closest('.image-card').remove()" />
          <div class="image-card-caption">${escapeHtml(alt)}</div>
        </a>
      </div>`;
  }).join("");

  imageResults.classList.remove("hidden");
  resultsContainer?.classList.add("hidden");
}

/* ============================================================
   KNOWLEDGE PANEL
============================================================ */
function renderKnowledgePanel(kp) {
  if (!knowledgePanel) return;
  if (!kp || (!kp.title && !kp.extract)) {
    knowledgePanel.classList.add("hidden");
    knowledgePanel.innerHTML = "";
    return;
  }

  knowledgePanel.classList.remove("hidden");
  knowledgePanel.innerHTML = `
    ${kp.title   ? `<div class="kp-title">${escapeHtml(kp.title)}</div>` : ""}
    ${kp.subtitle ? `<div class="kp-subtitle">${escapeHtml(kp.subtitle)}</div>` : ""}
    ${kp.image   ? `<img class="kp-thumb" src="${escapeHtml(kp.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
    ${kp.extract ? `<div class="kp-extract">${escapeHtml(kp.extract)}</div>` : ""}
    ${kp.url     ? `<a class="kp-link" href="${escapeHtml(kp.url)}" target="_blank" rel="noopener">More →</a>` : ""}`;
}

/* ============================================================
   PEOPLE ALSO ASK
============================================================ */
function renderPAA(paa) {
  if (!paaSection || !paaList) return;
  if (!paa?.length) {
    paaSection.classList.add("hidden");
    paaList.innerHTML = "";
    return;
  }

  paaSection.classList.remove("hidden");
  paaList.innerHTML = paa.map(item => `
    <div class="paa-item">
      <div class="paa-question" onclick="this.parentElement.classList.toggle('open')">
        <span>${escapeHtml(item.question)}</span>
        <span class="chevron" style="transition:transform .2s">›</span>
      </div>
      <div class="paa-answer">${escapeHtml(item.answer || "")}</div>
    </div>`).join("");
}

/* ============================================================
   PAGINATION
============================================================ */
function buildPagination(current, total) {
  const pages = [];
  const range = 3;
  let start = Math.max(1, current - range);
  let end   = Math.min(total, current + range);
  if (current <= range) end   = Math.min(total, range * 2 + 1);
  if (current >= total - range) start = Math.max(1, total - range * 2);

  for (let i = start; i <= end; i++) pages.push(i);

  let html = `<div class="results-pagination" style="display:flex;gap:6px;justify-content:center;margin-top:28px;flex-wrap:wrap">`;
  if (current > 1) html += `<button class="page-btn" data-page="${current-1}">← Prev</button>`;
  pages.forEach(p => {
    html += `<button class="page-btn ${p === current ? "active" : ""}" data-page="${p}">${p}</button>`;
  });
  if (current < total) html += `<button class="page-btn" data-page="${current+1}">Next →</button>`;
  html += `</div>`;
  return html;
}

/* ============================================================
   ERROR STATE
============================================================ */
function showError(msg) {
  if (!resultsContainer) return;
  resultsContainer.innerHTML = `
    <div style="text-align:center;padding:60px 20px;color:var(--mut)">
      <div style="font-size:42px;margin-bottom:12px">⚠️</div>
      <div style="font-size:15px;font-weight:700;color:var(--txt)">Search failed</div>
      <div style="font-size:13px;margin-top:8px;max-width:400px;margin-left:auto;margin-right:auto">${escapeHtml(msg)}</div>
      <button onclick="runSearch(currentQuery,currentTab,1)"
        style="margin-top:16px;padding:8px 20px;border-radius:999px;border:none;background:var(--a);color:#fff;font-weight:700;cursor:pointer">
        Try Again
      </button>
    </div>`;
  resultsContainer.classList.remove("hidden");
}

function clearResults() {
  if (resultsContainer) { resultsContainer.innerHTML = ""; }
  if (imageResults)     { imageResults.innerHTML = ""; imageResults.classList.add("hidden"); }
  if (knowledgePanel)   { knowledgePanel.classList.add("hidden"); knowledgePanel.innerHTML = ""; }
  if (paaSection)       { paaSection.classList.add("hidden"); paaList.innerHTML = ""; }
}

/* ============================================================
   SPEED TEST (unchanged)
============================================================ */
const speedModule      = document.getElementById("speedTestModule");
const startSpeedTestBtn= document.getElementById("startSpeedTest");
const pingResultEl     = document.getElementById("pingResult");
const downloadResultEl = document.getElementById("downloadResult");
const uploadResultEl   = document.getElementById("uploadResult");
const unitSelectEl     = document.getElementById("unitSelect");
const unitLabelEl      = document.getElementById("unitLabel");
const unitLabel2El     = document.getElementById("unitLabel2");
const speedFeedbackEl  = document.getElementById("speedFeedback");

if (startSpeedTestBtn && speedModule) {
  startSpeedTestBtn.addEventListener("click", async () => {
    try {
      speedFeedbackEl.textContent = "Running test…";
      const t0 = performance.now();
      await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
      const ping = Math.round(performance.now() - t0);
      pingResultEl.textContent = ping;

      const unit = unitSelectEl?.value || "mbps";
      const dl = 95.2, ul = 18.4;

      if (unit === "mbps2") {
        downloadResultEl.textContent = (dl / 8).toFixed(1);
        uploadResultEl.textContent   = (ul / 8).toFixed(1);
        if (unitLabelEl)  unitLabelEl.textContent  = "MB/s";
        if (unitLabel2El) unitLabel2El.textContent = "MB/s";
      } else if (unit === "kbps") {
        downloadResultEl.textContent = (dl * 1000).toFixed(0);
        uploadResultEl.textContent   = (ul * 1000).toFixed(0);
        if (unitLabelEl)  unitLabelEl.textContent  = "Kbps";
        if (unitLabel2El) unitLabel2El.textContent = "Kbps";
      } else {
        downloadResultEl.textContent = dl.toFixed(1);
        uploadResultEl.textContent   = ul.toFixed(1);
        if (unitLabelEl)  unitLabelEl.textContent  = "Mbps";
        if (unitLabel2El) unitLabel2El.textContent = "Mbps";
      }

      speedFeedbackEl.textContent = ping < 40 && dl > 50
        ? "Connection looks great for streaming and gaming."
        : ping < 80 ? "Connection is decent for most tasks."
        : "Connection may feel slow or unstable.";
    } catch (e) {
      speedFeedbackEl.textContent = "Speed test failed. Try again.";
    }
  });

  unitSelectEl?.addEventListener("change", () => startSpeedTestBtn.click());
}

/* ============================================================
   EVENTS
============================================================ */
// Form submit
stripForm?.addEventListener("submit", e => {
  e.preventDefault();
  const q = stripInput?.value.trim();
  if (q) runSearch(q, currentTab, 1);
});

// Tab: All
tabAll?.addEventListener("click", () => {
  tabAll.classList.add("active");
  tabImages?.classList.remove("active");
  currentTab = "all";
  resultsContainer?.classList.remove("hidden");
  imageResults?.classList.add("hidden");
  if (currentQuery) runSearch(currentQuery, "all", 1);
});

// Tab: Images
tabImages?.addEventListener("click", () => {
  tabImages.classList.add("active");
  tabAll?.classList.remove("active");
  currentTab = "images";
  if (currentQuery) runSearch(currentQuery, "images", 1);
});

// View: List / Grid
listViewBtn?.addEventListener("click", () => {
  listViewBtn.classList.add("active");
  gridViewBtn?.classList.remove("active");
  resultsContainer?.classList.remove("grid-view");
  resultsContainer?.classList.add("list-view");
});

gridViewBtn?.addEventListener("click", () => {
  gridViewBtn.classList.add("active");
  listViewBtn?.classList.remove("active");
  resultsContainer?.classList.remove("list-view");
  resultsContainer?.classList.add("grid-view");
});

// Safe search change triggers re-search
safeSelect?.addEventListener("change", () => {
  if (currentQuery) runSearch(currentQuery, currentTab, currentPage);
});

/* ============================================================
   INIT — read ?q= from URL on page load
============================================================ */
(function initFromUrl() {
  const params = new URLSearchParams(location.search);
  const q    = params.get("q")    || "";
  const tab  = params.get("tab")  || "all";
  const page = parseInt(params.get("page") || "1");

  if (q) {
    currentTab  = tab;
    currentPage = page;

    // Set active tab button
    if (tab === "images") {
      tabImages?.classList.add("active");
      tabAll?.classList.remove("active");
    } else {
      tabAll?.classList.add("active");
      tabImages?.classList.remove("active");
    }

    runSearch(q, tab, page);
  } else {
    showNoResults();
  }
})();
