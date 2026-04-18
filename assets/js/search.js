// 360 Search V3 — Frontend Engine
// Autocomplete + SafeSearch + PAA + KP + Images

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

let typingTimer;
let acTimer;
let acIndex = -1;
let acItems = [];

// ===============================
// VIEW TOGGLE
// ===============================
listBtn?.addEventListener("click", () => {
  listBtn.classList.add("active");
  gridBtn.classList.remove("active");
  resultsContainer.classList.add("list-view");
  resultsContainer.classList.remove("grid-view");
});

gridBtn?.addEventListener("click", () => {
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
    } else if (tab === "images") {
      resultsContainer.classList.add("hidden");
      imageResults.classList.remove("hidden");
    }
  });
});

// ===============================
// FORM SUBMIT
// ===============================
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  hideAutocomplete();
  runSearch(q);
  const url = new URL(window.location.href);
  url.searchParams.set("q", q);
  url.searchParams.set("safe", getSafeLevel());
  window.history.replaceState(null, "", url.toString());
});

// ===============================
// INSTANT SEARCH + AUTOCOMPLETE
// ===============================
input?.addEventListener("input", () => {
  const q = input.value.trim();
  clearTimeout(typingTimer);
  clearTimeout(acTimer);
  if (!q) {
    hideAutocomplete();
    return;
  }
  typingTimer = setTimeout(() => runSearch(q), 300);
  acTimer = setTimeout(() => fetchAutocomplete(q), 150);
});

// ===============================
// AUTOCOMPLETE KEYBOARD NAV
// ===============================
input?.addEventListener("keydown", (e) => {
  if (!acList || !acList.classList.contains("visible")) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    moveAc(1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    moveAc(-1);
  } else if (e.key === "Enter") {
    if (acIndex >= 0 && acIndex < acItems.length) {
      e.preventDefault();
      const text = acItems[acIndex].dataset.value;
      input.value = text;
      hideAutocomplete();
      runSearch(text);
    }
  } else if (e.key === "Escape") {
    hideAutocomplete();
  }
});

// ===============================
// ON LOAD
// ===============================
window.addEventListener("load", () => {
  const url = new URL(window.location.href);
  const q = url.searchParams.get("q") || "";
  const safe = url.searchParams.get("safe") || "moderate";
  if (safeSelect) safeSelect.value = safe;
  if (q) {
    input.value = q;
    runSearch(q);
  } else {
    showLoading(false);
    showNoResults(false);
  }
});

// ===============================
// SAFESEARCH
// ===============================
function getSafeLevel() {
  if (!safeSelect) return "moderate";
  const val = safeSelect.value || "moderate";
  if (val === "off") return "off";
  if (val === "strict") return "strict";
  return "moderate";
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
  paaSection?.classList.add("hidden");

  showLoading(true);
  showNoResults(false);

  let deduped = [];
  let imageSet = [];
  let wikiEntity = null;
  let paa = [];

  try {
    const safe = getSafeLevel();
    const res = await fetch(
      `https://wiswfpfsjiowtrdyqpxy.supabase.co/functions/v1/search?q=${encodeURIComponent(
        q
      )}&safe=${encodeURIComponent(safe)}`
    );
    if (!res.ok) throw new Error("Backend error: " + res.status);
    const data = await res.json();
    deduped = data.results || [];
    imageSet = data.images || [];
    wikiEntity = data.entity || null;
    paa = data.paa || [];
  } catch (e) {
    console.warn("Search backend error", e);
  }

  showLoading(false);

  if (!deduped.length) {
    showNoResults(true);
    return;
  }

  // Results
  deduped.forEach(r => {
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

    const domain = r.url ? safeDomain(r.url) : "";
    if (domain) {
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      const icon = document.createElement("img");
      icon.className = "result-favicon";
      icon.src = favicon;
      icon.loading = "lazy";
      header.appendChild(icon);
    }

    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = r.title || r.url || "(no title)";
    header.appendChild(title);

    card.appendChild(header);

    if (r.desc) {
      const desc = document.createElement("div");
      desc.className = "result-desc";
      desc.textContent = r.desc;
      card.appendChild(desc);
    }

    if (r.url) {
      const link = document.createElement("a");
      link.className = "result-url";
      link.href = r.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = r.url;
      card.appendChild(link);
    }

    resultsContainer.appendChild(card);
  });

  // Images
  const seenImg = new Set();
  imageSet.forEach(r => {
    if (!r.img || seenImg.has(r.img)) return;
    seenImg.add(r.img);

    const card = document.createElement("a");
    card.className = "image-card";
    card.href = r.url || "#";
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    const img = document.createElement("img");
    img.src = r.img;
    img.loading = "lazy";
    card.appendChild(img);

    const cap = document.createElement("div");
    cap.className = "image-card-caption";
    cap.textContent = r.title || safeDomain(r.url) || "";
    card.appendChild(cap);

    imageResults.appendChild(card);
  });

  // Knowledge panel
  if (wikiEntity) {
    buildKnowledgePanel(wikiEntity);
  }

  // People Also Ask
  if (paa && paa.length) {
    paaSection?.classList.remove("hidden");
    paaList.innerHTML = "";
    paa.forEach(item => {
      const wrapper = document.createElement("div");
      wrapper.className = "paa-item";

      const qEl = document.createElement("div");
      qEl.className = "paa-question";
      qEl.innerHTML = `<span>${item.q}</span><span class="chevron">›</span>`;
      wrapper.appendChild(qEl);

      const aEl = document.createElement("div");
      aEl.className = "paa-answer";
      aEl.textContent = item.a;
      wrapper.appendChild(aEl);

      qEl.addEventListener("click", () => {
        wrapper.classList.toggle("open");
      });

      paaList.appendChild(wrapper);
    });
  }
}

// ===============================
// AUTOCOMPLETE
// ===============================
async function fetchAutocomplete(q) {
  if (!acList) return;
  try {
    const res = await fetch(
      `https://wiswfpfsjiowtrdyqpxy.supabase.co/functions/v1/autocomplete?q=${encodeURIComponent(
        q
      )}`
    );
    if (!res.ok) throw new Error("AC error: " + res.status);
    const data = await res.json();
    renderAutocomplete(data.suggestions || []);
  } catch (e) {
    console.warn("Autocomplete error", e);
  }
}

function renderAutocomplete(items) {
  if (!acList) return;
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

    div.addEventListener("mousedown", (e) => {
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

function moveAc(delta) {
  if (!acItems.length) return;
  acIndex += delta;
  if (acIndex < 0) acIndex = acItems.length - 1;
  if (acIndex >= acItems.length) acIndex = 0;
  acItems.forEach((el, i) => {
    el.classList.toggle("active", i === acIndex);
  });
}

function hideAutocomplete() {
  if (!acList) return;
  acList.classList.remove("visible");
  acList.innerHTML = "";
  acItems = [];
  acIndex = -1;
}

// ===============================
// KNOWLEDGE PANEL
// ===============================
async function buildKnowledgePanel(title) {
  try {
    const summary = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title
      )}`
    ).then(r => r.json());

    if (!summary.title || !summary.extract) return;

    knowledgePanel.innerHTML = "";
    knowledgePanel.classList.add("knowledge-panel");

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
    link.rel = "noopener noreferrer";
    link.textContent = "View on Wikipedia";
    knowledgePanel.appendChild(link);

    knowledgePanel.classList.remove("hidden");
  } catch (e) {
    console.warn("Knowledge panel error", e);
  }
}

// ===============================
// HELPERS
// ===============================
function showLoading(on) {
  if (!loader) return;
  loader.classList.toggle("visible", on);
}

function showNoResults(on) {
  if (!noResults) return;
  noResults.classList.toggle("visible", on);
}

function safeDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
