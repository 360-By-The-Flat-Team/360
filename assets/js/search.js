/* ============================================================
   360 SEARCH V3.7 — CLOUD-ONLY ENGINE
   Clean rewrite with no Chromebook/local BM25 calls
============================================================ */

console.log("360 Search V3.7 — search.js loaded");

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

/* ============================================================
   HELPERS
============================================================ */
function showLoader() { loader.classList.add("visible"); }
function hideLoader() { loader.classList.remove("visible"); }
function showNoResults() { noQuery.classList.add("visible"); }
function hideNoResults() { noQuery.classList.remove("visible"); }

/* ============================================================
   RENDER: WEB RESULTS
============================================================ */
function renderWebResults(results) {
  resultsContainer.innerHTML = "";

  (results || []).forEach(r => {
    const url = r.url || r.link || "";
    const snippet = r.snippet || r.description || "";

    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
      <div class="result-header">
        ${r.favicon ? `<img class="result-favicon" src="${r.favicon}">` : ""}
        <div class="result-title">${r.title || ""}</div>
      </div>
      <div class="result-desc">${snippet}</div>
      <a class="result-url" href="${url}" target="_blank">${url}</a>
    `;

    resultsContainer.appendChild(card);
  });
}

/* ============================================================
   RENDER: IMAGE RESULTS
============================================================ */
function renderImageResults(images) {
  imageResults.innerHTML = "";

  (images || []).forEach(img => {
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
      <div class="image-card-caption">${img.title || ""}</div>
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
    return;
  }

  knowledgePanel.classList.remove("hidden");

  knowledgePanel.innerHTML = `
    <div class="kp-title">${kp.title || ""}</div>
    ${kp.subtitle ? `<div class="kp-subtitle">${kp.subtitle}</div>` : ""}
    ${kp.image ? `<img class="kp-thumb" src="${kp.image}">` : ""}
    <div class="kp-extract">${kp.extract || ""}</div>
    ${kp.url ? `<a class="kp-link" href="${kp.url}" target="_blank">More info</a>` : ""}
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

  paa.forEach(item => {
    const div = document.createElement("div");
    div.className = "paa-item";

    div.innerHTML = `
      <div class="paa-question">
        <span>${item.question}</span>
        <span class="chevron">›</span>
      </div>
      <div class="paa-answer">${item.answer}</div>
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
          safe: safeSelect.value
        })
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
   EVENTS
============================================================ */
stripForm.addEventListener("submit", e => {
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
