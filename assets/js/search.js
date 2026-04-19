/* ============================================================
   360 SEARCH V3.6 — HYBRID ENGINE (LOCAL BM25 + EDGE FUNCTION)
   Full rewrite with dual-source backend integration
============================================================ */

console.log("360 Search V3.6 — search.js loaded");

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
const recommendedBox = document.getElementById("recommendedBox");
const recommendedList = document.getElementById("recommendedList");

/* Speed test */
const speedModule = document.getElementById("speedTestModule");
const speedCanvas = document.getElementById("speedometer");
const pingResult = document.getElementById("pingResult");
const downloadResult = document.getElementById("downloadResult");
const uploadResult = document.getElementById("uploadResult");
const unitSelect = document.getElementById("unitSelect");
const startSpeedTest = document.getElementById("startSpeedTest");
const speedFeedback = document.getElementById("speedFeedback");

/* ============================================================
   STATE
============================================================ */
let currentTab = "all";
let currentView = "list";
let currentQuery = "";

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
      img.link ||
      img.url ||
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
   MAIN SEARCH FUNCTION — HYBRID ENGINE
============================================================ */
async function runSearch(query) {
  currentQuery = query;

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
    /* ============================================================
       1. TRIGGER LOCAL BM25 ENGINE
    ============================================================= */
    await fetch(
      `http://127.0.0.1:7000/run-local-search?q=${encodeURIComponent(query)}`
    );

    /* ============================================================
       2. FETCH LOCAL RESULTS FROM SUPABASE
    ============================================================= */
    const supabaseClient = supabase.createClient(
      "https://wiswfpfsjiowtrdyqpxy.supabase.co",
      "YOUR_ANON_KEY_HERE"
    );

    const { data: localRows } = await supabaseClient
      .from("results")
      .select("*")
      .eq("query", query)
      .order("score", { ascending: false });

    /* Delete after reading */
    await supabaseClient.from("results").delete().eq("query", query);

    /* ============================================================
       3. CALL EDGE FUNCTION FOR IMAGES + KP + PAA
    ============================================================= */
    let edgeData = {};
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

      if (edgeRes.ok) {
        edgeData = await edgeRes.json();
      }
    } catch (e) {
      console.warn("Edge function unavailable:", e);
    }

    hideLoader();

    /* ============================================================
       4. RENDER EVERYTHING
    ============================================================= */

    // Local BM25 results
    renderWebResults(localRows || []);

    // Edge function images
    renderImageResults(edgeData.images || []);

    // Knowledge panel
    renderKP(edgeData.kp || null);

    // People Also Ask
    renderPAA(edgeData.paa || []);

    /* Tab logic */
    if (currentTab === "all") {
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
   EVENTS: SEARCH SUBMIT
============================================================ */
stripForm.addEventListener("submit", e => {
  e.preventDefault();
  runSearch(stripInput.value);
});

/* ============================================================
   EVENTS: TABS
============================================================ */
tabAll.addEventListener("click", () => {
  currentTab = "all";
  tabAll.classList.add("active");
  tabImages.classList.remove("active");
  resultsContainer.classList.remove("hidden");
  imageResults.classList.add("hidden");
});

tabImages.addEventListener("click", () => {
  currentTab = "images";
  tabImages.classList.add("active");
  tabAll.classList.remove("active");
  resultsContainer.classList.add("hidden");
  imageResults.classList.remove("hidden");
});

/* ============================================================
   EVENTS: VIEW TOGGLE
============================================================ */
listViewBtn.addEventListener("click", () => {
  currentView = "list";
  listViewBtn.classList.add("active");
  gridViewBtn.classList.remove("active");
  resultsContainer.classList.add("list-view");
  resultsContainer.classList.remove("grid-view");
});

gridViewBtn.addEventListener("click", () => {
  currentView = "grid";
  gridViewBtn.classList.add("active");
  listViewBtn.classList.remove("active");
  resultsContainer.classList.remove("list-view");
  resultsContainer.classList.add("grid-view");
});

/* ============================================================
   AUTOCOMPLETE (placeholder)
============================================================ */
stripInput.addEventListener("input", () => {
  autocompleteList.classList.remove("visible");
});

/* ============================================================
   SPEED TEST (unchanged)
============================================================ */
if (startSpeedTest) {
  startSpeedTest.addEventListener("click", () => {
    speedFeedback.textContent = "Testing…";
    pingResult.textContent = "12";
    downloadResult.textContent = "94.2";
    uploadResult.textContent = "18.4";
    speedFeedback.textContent = "Your connection is fast.";
  });
}

/* ============================================================
   INITIAL
============================================================ */
console.log("360 Search JS initialized");
