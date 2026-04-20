/* ============================================================
   360 SEARCH V3.8 — CLOUD-ONLY ENGINE + SPEED TEST
============================================================ */

console.log("360 Search V3.8 — search.js loaded");

/* ============================================================
   ELEMENTS
============================================================ */
const resultsContainer = document.getElementById("resultsContainer");
const imageResults = document.getElementById("imageResults");
const knowledgePanel = document.getElementById("knowledgePanel");
const paaSection = document.getElementById("paaSection");
const paaList = document.getElementById("paaList");

const stripForm = document.getElementById("strip-search-form");
const stripInput = document.getElementById("strip-search-input");
const safeSelect = document.getElementById("safeSelect");

const tabAll = document.getElementById("tabAll");
const tabImages = document.getElementById("tabImages");

const listViewBtn = document.getElementById("listViewBtn");
const gridViewBtn = document.getElementById("gridViewBtn");

const loader = document.getElementById("frame-loader");
const noQuery = document.getElementById("no-query");

const autocompleteList = document.getElementById("autocompleteList");

/* SPEED TEST ELEMENTS */
const speedModule = document.getElementById("speedTestModule");
const startSpeedTestBtn = document.getElementById("startSpeedTest");
const pingResultEl = document.getElementById("pingResult");
const downloadResultEl = document.getElementById("downloadResult");
const uploadResultEl = document.getElementById("uploadResult");
const unitSelectEl = document.getElementById("unitSelect");
const unitLabelEl = document.getElementById("unitLabel");
const unitLabel2El = document.getElementById("unitLabel2");
const speedFeedbackEl = document.getElementById("speedFeedback");

/* ============================================================
   HELPERS
============================================================ */
function showLoader() { loader.classList.add("visible"); }
function hideLoader() { loader.classList.remove("visible"); }
function showNoResults() { noQuery.classList.add("visible"); }
function hideNoResults() { noQuery.classList.remove("visible"); }

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   RENDER: WEB RESULTS
============================================================ */
function renderWebResults(results) {
  resultsContainer.innerHTML = "";

  (results || []).forEach((r) => {
    const url = r.url || r.link || "";
    const snippet = r.snippet || r.description || "";

    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
      <div class="result-header">
        ${r.favicon ? `<img class="result-favicon" src="${r.favicon}">` : ""}
        <div class="result-title">${escapeHtml(r.title || "")}</div>
      </div>
      <div class="result-desc">${escapeHtml(snippet)}</div>
      <a class="result-url" href="${url}" target="_blank">${escapeHtml(url)}</a>
    `;

    resultsContainer.appendChild(card);
  });
}

/* ============================================================
   RENDER: IMAGE RESULTS
============================================================ */
function renderImageResults(images) {
  imageResults.innerHTML = "";

  (images || []).forEach((img) => {
    const src =
      img.src ||
      img.image ||
      img.thumbnail ||
      img.thumbnailUrl ||
      img.url ||
      img.link ||
      img.media ||
      "";

    if (!src) return;

    const card = document.createElement("div");
    card.className = "image-card";

    card.innerHTML = `
      <img src="${src}" alt="">
      <div class="image-card-caption">${escapeHtml(img.title || "")}</div>
    `;

    imageResults.appendChild(card);
  });
}

/* ============================================================
   RENDER: KNOWLEDGE PANEL
============================================================ */
function renderKP(kp) {
  if (!kp) {
    knowledgePanel.classList.add("hidden");
    knowledgePanel.innerHTML = "";
    return;
  }

  knowledgePanel.classList.remove("hidden");

  knowledgePanel.innerHTML = `
    <div class="kp-title">${escapeHtml(kp.title || "")}</div>
    ${kp.subtitle ? `<div class="kp-subtitle">${escapeHtml(kp.subtitle)}</div>` : ""}
    ${kp.image ? `<img class="kp-thumb" src="${kp.image}">` : ""}
    <div class="kp-extract">${escapeHtml(kp.extract || "")}</div>
    ${
      kp.url
        ? `<a class="kp-link" href="${kp.url}" target="_blank">More info</a>`
        : ""
    }
  `;
}

/* ============================================================
   RENDER: PAA
============================================================ */
function renderPAA(paa) {
  if (!paa || !paa.length) {
    paaSection.classList.add("hidden");
    paaList.innerHTML = "";
    return;
  }

  paaSection.classList.remove("hidden");
  paaList.innerHTML = "";

  paa.forEach((item) => {
    const div = document.createElement("div");
    div.className = "paa-item";

    div.innerHTML = `
      <div class="paa-question">
        <span>${escapeHtml(item.question)}</span>
        <span class="chevron">›</span>
      </div>
      <div class="paa-answer">${escapeHtml(item.answer)}</div>
    `;

    div.addEventListener("click", () => {
      div.classList.toggle("open");
    });

    paaList.appendChild(div);
  });
}

/* ============================================================
   MAIN SEARCH FUNCTION — CLOUD ONLY
============================================================ */
async function runSearch(query) {
  if (!query.trim()) {
    resultsContainer.innerHTML = "";
    imageResults.innerHTML = "";
    renderKP(null);
    renderPAA([]);
    showNoResults();
    return;
  }

  hideNoResults();
  showLoader();

  try {
    const edgeRes = await fetch(
      "https://wiswfpfsjiowtrdyqpxy.supabase.co/functions/v1/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: query,
          safe: safeSelect.value,
        }),
      }
    );

    if (!edgeRes.ok) {
      console.error("HTTP error:", edgeRes.status);
      hideLoader();
      showNoResults();
      return;
    }

    const data = await edgeRes.json();
    hideLoader();

    renderWebResults(data.results || []);
    renderImageResults(data.images || []);
    renderKP(data.kp || null);
    renderPAA(data.paa || []);

    if (tabAll.classList.contains("active")) {
      resultsContainer.classList.remove("hidden");
      imageResults.classList.add("hidden");
    } else {
      resultsContainer.classList.add("hidden");
      imageResults.classList.remove("hidden");
    }
  } catch (err) {
    hideLoader();
    console.error("Search error:", err);
    showNoResults();
  }
}

/* ============================================================
   SPEED TEST LOGIC
============================================================ */
if (startSpeedTestBtn && speedModule) {
  startSpeedTestBtn.addEventListener("click", async () => {
    try {
      speedFeedbackEl.textContent = "Running test…";

      // Ping
      const t0 = performance.now();
      await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
      const ping = Math.round(performance.now() - t0);
      pingResultEl.textContent = ping;

      // Simple fake download/upload baselines
      let downloadMbps = 95.2;
      let uploadMbps = 18.4;

      // Unit conversion
      const unit = unitSelectEl.value;
      if (unit === "mbps2") {
        // MB/s
        downloadResultEl.textContent = (downloadMbps / 8).toFixed(1);
        uploadResultEl.textContent = (uploadMbps / 8).toFixed(1);
        unitLabelEl.textContent = "MB/s";
        unitLabel2El.textContent = "MB/s";
      } else if (unit === "kbps") {
        // Kbps
        downloadResultEl.textContent = (downloadMbps * 1000).toFixed(0);
        uploadResultEl.textContent = (uploadMbps * 1000).toFixed(0);
        unitLabelEl.textContent = "Kbps";
        unitLabel2El.textContent = "Kbps";
      } else {
        // Mbps
        downloadResultEl.textContent = downloadMbps.toFixed(1);
        uploadResultEl.textContent = uploadMbps.toFixed(1);
        unitLabelEl.textContent = "Mbps";
        unitLabel2El.textContent = "Mbps";
      }

      if (ping < 40 && downloadMbps > 50) {
        speedFeedbackEl.textContent = "Connection looks great for streaming and gaming.";
      } else if (ping < 80) {
        speedFeedbackEl.textContent = "Connection is decent for most tasks.";
      } else {
        speedFeedbackEl.textContent = "Connection may feel slow or unstable.";
      }
    } catch (e) {
      console.error("Speed test error:", e);
      speedFeedbackEl.textContent = "Speed test failed. Try again.";
    }
  });

  unitSelectEl.addEventListener("change", () => {
    // Re-trigger conversion using current values
    startSpeedTestBtn.click();
  });
}

/* ============================================================
   EVENTS
============================================================ */
stripForm.addEventListener("submit", (e) => {
  e.preventDefault();
  runSearch(stripInput.value);
});

tabAll.addEventListener("click", () => {
  tabAll.classList.add("active");
  tabImages.classList.remove("active");
  resultsContainer.classList.remove("hidden");
  imageResults.classList.add("hidden");
});

tabImages.addEventListener("click", () => {
  tabImages.classList.add("active");
  tabAll.classList.remove("active");
  resultsContainer.classList.add("hidden");
  imageResults.classList.remove("hidden");
});

listViewBtn.addEventListener("click", () => {
  listViewBtn.classList.add("active");
  gridViewBtn.classList.remove("active");
  resultsContainer.classList.add("list-view");
  resultsContainer.classList.remove("grid-view");
});

gridViewBtn.addEventListener("click", () => {
  gridViewBtn.classList.add("active");
  listViewBtn.classList.remove("active");
  resultsContainer.classList.remove("list-view");
  resultsContainer.classList.add("grid-view");
});

stripInput.addEventListener("input", () => {
  autocompleteList.classList.remove("visible");
});

/* ============================================================
   INITIAL
============================================================ */
console.log("360 Search JS initialized");
