// ===============================
// 360 SEARCH V3 — FINAL JS
// ===============================

// DOM
const form = document.getElementById("strip-search-form");
const input = document.getElementById("strip-search-input");
const resultsContainer = document.getElementById("resultsContainer");
const imageResults = document.getElementById("imageResults");
const knowledgePanel = document.getElementById("knowledgePanel");
const paaSection = document.getElementById("paaSection");
const paaList = document.getElementById("paaList");
const listBtn = document.getElementById("listViewBtn");
const gridBtn = document.getElementById("gridViewBtn");
const tabButtons = document.querySelectorAll(".tab-btn");
const safeSelect = document.getElementById("safeSelect");
const acList = document.getElementById("autocompleteList");
const loader = document.getElementById("frame-loader");
const noResults = document.getElementById("no-query");

// Recommended popup
const recommendedBox = document.getElementById("recommendedBox");
const recommendedList = document.getElementById("recommendedList");

// Autocomplete state
let acIndex = -1;
let acItems = [];
let acTimer;
let searchTimer;

// Supabase function URLs
const SEARCH_URL = "https://wiswfpfsjiowtrdyqpxy.supabase.co/functions/v1/search";
const AC_URL = "https://wiswfpfsjiowtrdyqpxy.supabase.co/functions/v1/autocomplete";
const TREND_URL = "https://wiswfpfsjiowtrdyqpxy.supabase.co/functions/v1/trending";

// ===============================
// VIEW TOGGLE
// ===============================
listBtn.addEventListener("click", () => {
  listBtn.classList.add("active");
  gridBtn.classList.remove("active");
  resultsContainer.classList.add("list-view");
  resultsContainer.classList.remove("grid-view");
});

gridBtn.addEventListener("click", () => {
  gridBtn.classList.add("active");
  listBtn.classList.remove("active");
  resultsContainer.classList.add("grid-view");
  resultsContainer.classList.remove("list-view");
});

// ===============================
// TABS
// ===============================
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;

    if (tab === "all") {
      resultsContainer.classList.remove("hidden");
      imageResults.classList.add("hidden");
    } else {
      resultsContainer.classList.add("hidden");
      imageResults.classList.remove("hidden");
    }
  });
});

// ===============================
// FORM SUBMIT
// ===============================
form.addEventListener("submit", e => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  hideAutocomplete();
  recommendedBox.classList.add("hidden");
  runSearch(q);

  const url = new URL(window.location.href);
  url.searchParams.set("q", q);
  url.searchParams.set("safe", safeSelect.value);
  window.history.replaceState(null, "", url.toString());
});

// ===============================
// INPUT LISTENER (INSTANT SEARCH + AC + RECOMMENDED)
// ===============================
input.addEventListener("focus", () => {
  if (!input.value.trim()) loadRecommended();
});

input.addEventListener("input", () => {
  const q = input.value.trim();

  if (!q) {
    hideAutocomplete();
    loadRecommended();
    return;
  }

  recommendedBox.classList.add("hidden");

  clearTimeout(searchTimer);
  clearTimeout(acTimer);

  searchTimer = setTimeout(() => runSearch(q), 300);
  acTimer = setTimeout(() => fetchAutocomplete(q), 150);
});

// ===============================
// CLICK OUTSIDE → HIDE POPUPS
// ===============================
document.addEventListener("click", (e) => {
  if (!form.contains(e.target)) {
    recommendedBox.classList.add("hidden");
    hideAutocomplete();
  }
});

// ===============================
// LOAD RECOMMENDED (TRENDING)
// ===============================
async function loadRecommended() {
  recommendedList.innerHTML = "";
  recommendedBox.classList.remove("hidden");

  try {
    const res = await fetch(TREND_URL);
    const data = await res.json();

    data.trending.forEach((row) => {
      const div = document.createElement("div");
      div.className = "recommended-item";

      const fire = document.createElement("img");
      fire.src = "/assets/icons/fire.svg";
      fire.className = "fire-icon";

      const text = document.createElement("span");
      text.textContent = row.term;

      div.appendChild(fire);
      div.appendChild(text);

      div.addEventListener("mousedown", () => {
        input.value = row.term;
        recommendedBox.classList.add("hidden");
        runSearch(row.term);
      });

      recommendedList.appendChild(div);
    });

  } catch (err) {
    console.error("Trending error:", err);
  }
}

// ===============================
// AUTOCOMPLETE
// ===============================
async function fetchAutocomplete(q) {
  try {
    const res = await fetch(`${AC_URL}?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    renderAutocomplete(data.suggestions || []);
  } catch (err) {
    console.error("Autocomplete error:", err);
  }
}

function renderAutocomplete(items) {
  acList.innerHTML = "";
  acItems = [];
  acIndex = -1;

  if (!items.length) {
    acList.classList.remove("visible");
    return;
  }

  items.forEach(s => {
    const div = document.createElement("div");
    div.className = "ac-item";
    div.dataset.value = s.text;

    const text = document.createElement("span");
    text.textContent = s.text;

    const src = document.createElement("span");
    src.className = "ac-source";
    src.textContent =
      s.source === "ddg" ? "Web" :
      s.source === "wiki" ? "Wiki" :
      s.source === "trending" ? "Trending" : "";

    div.appendChild(text);
    div.appendChild(src);

    div.addEventListener("mousedown", e => {
      e.preventDefault();
      input.value = s.text;
      hideAutocomplete();
      runSearch(s.text);
    });

    acList.appendChild(div);
    acItems.push(div);
  });

  acList.classList.add("visible");
}

function hideAutocomplete() {
  acList.classList.remove("visible");
  acList.innerHTML = "";
  acItems = [];
  acIndex = -1;
}

// ===============================
// MAIN SEARCH
// ===============================
async function runSearch(q) {
  resultsContainer.innerHTML = "";
  imageResults.innerHTML = "";
  knowledgePanel.innerHTML = "";
  knowledgePanel.classList.add("hidden");
  paaList.innerHTML = "";
  paaSection.classList.add("hidden");

  showLoading(true);
  showNoResults(false);

  let results = [];
  let images = [];
  let entity = null;
  let paa = [];

  try {
    const res = await fetch(
      `${SEARCH_URL}?q=${encodeURIComponent(q)}&safe=${encodeURIComponent(safeSelect.value)}`
    );

    const data = await res.json();
    results = data.results || [];
    images = data.images || [];
    entity = data.entity || null;
    paa = data.paa || [];

  } catch (err) {
    console.error("Search error:", err);
  }

  showLoading(false);

  if (!results.length) {
    showNoResults(true);
    return;
  }

  // WEB RESULTS
  results.forEach(r => {
    const card = document.createElement("div");
    card.className = "result-card";

    if (r.img) {
      const img = document.createElement("img");
      img.className = "result-img";
      img.src = r.img;
      img.loading = "lazy";
      card.appendChild(img);
    }

    const header = document.createElement("div");
    header.className = "result-header";

    const domain = safeDomain(r.url);
    if (domain) {
      const icon = document.createElement("img");
      icon.className = "result-favicon";
      icon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      icon.loading = "lazy";
      header.appendChild(icon);
    }

    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = r.title || r.url;
    header.appendChild(title);

    card.appendChild(header);

    if (r.desc) {
      const desc = document.createElement("div");
      desc.className = "result-desc";
      desc.textContent = r.desc;
      card.appendChild(desc);
    }

    const link = document.createElement("a");
    link.className = "result-url";
    link.href = r.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = r.url;
    card.appendChild(link);

    resultsContainer.appendChild(card);
  });

  // IMAGE RESULTS
  images.forEach(r => {
    const card = document.createElement("a");
    card.className = "image-card";
    card.href = r.url || "#";
    card.target = "_blank";

    const img = document.createElement("img");
    img.src = r.img;
    img.loading = "lazy";
    card.appendChild(img);

    const cap = document.createElement("div");
    cap.className = "image-card-caption";
    cap.textContent = r.title || safeDomain(r.url);
    card.appendChild(cap);

    imageResults.appendChild(card);
  });

  // KNOWLEDGE PANEL
  if (entity) buildKnowledgePanel(entity);

  // PAA
  if (paa.length) {
    paaSection.classList.remove("hidden");
    paaList.innerHTML = "";

    paa.forEach(item => {
      const wrap = document.createElement("div");
      wrap.className = "paa-item";

      const qEl = document.createElement("div");
      qEl.className = "paa-question";
      qEl.innerHTML = `<span>${item.q}</span><span class="chevron">›</span>`;
      wrap.appendChild(qEl);

      const aEl = document.createElement("div");
      aEl.className = "paa-answer";
      aEl.textContent = item.a;
      wrap.appendChild(aEl);

      qEl.addEventListener("click", () => wrap.classList.toggle("open"));

      paaList.appendChild(wrap);
    });
  }
}

// ===============================
// KNOWLEDGE PANEL
// ===============================
async function buildKnowledgePanel(title) {
  try {
    const summary = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    ).then(r => r.json());

    if (!summary.title || !summary.extract) return;

    knowledgePanel.innerHTML = "";

    if (summary.thumbnail?.source) {
      const img = document.createElement("img");
      img.className = "kp-thumb";
      img.src = summary.thumbnail.source;
      img.loading = "lazy";
      knowledgePanel.appendChild(img);
    }

    const h = document.createElement("div");
    h.className = "kp-title";
    h.textContent = summary.title;
    knowledgePanel.appendChild(h);

    if (summary.description) {
      const sub = document.createElement("div");
      sub.className = "kp-subtitle";
      sub.textContent = summary.description;
      knowledgePanel.appendChild(sub);
    }

    const ex = document.createElement("div");
    ex.className = "kp-extract";
    ex.textContent = summary.extract;
    knowledgePanel.appendChild(ex);

    const link = document.createElement("a");
    link.className = "kp-link";
    link.href = summary.content_urls?.desktop?.page || "";
    link.target = "_blank";
    link.textContent = "View on Wikipedia";
    knowledgePanel.appendChild(link);

    knowledgePanel.classList.remove("hidden");
  } catch (err) {
    console.error("KP error:", err);
  }
}

// ===============================
// HELPERS
// ===============================
function showLoading(on) {
  loader.classList.toggle("visible", on);
}

function showNoResults(on) {
  noResults.classList.toggle("visible", on);
}

function safeDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
