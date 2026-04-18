// 360 Search — Supabase backend + SafeSearch + autocomplete + FAQ!!!!!

const resultsContainer = document.getElementById("resultsContainer");
const imageResults = document.getElementById("imageResults");
const loadingEl = document.getElementById("frame-loader");
const noQueryEl = document.getElementById("no-query");
const knowledgePanel = document.getElementById("knowledgePanel");

const listBtn = document.getElementById("listViewBtn");
const gridBtn = document.getElementById("gridViewBtn");
const form = document.getElementById("strip-search-form");
const input = document.getElementById("strip-search-input");
const tabButtons = document.querySelectorAll(".tab-btn");
const safeSelect = document.getElementById("safeSelect");
const acList = document.getElementById("autocompleteList");

let typingTimer;
let acTimer;
let acIndex = -1;
let acItems = [];

// View toggle
listBtn?.addEventListener("click", () => {
  listBtn.classList.add("active");
  gridBtn.classList.remove("active");
  resultsContainer.classList.remove("grid-view");
  resultsContainer.classList.add("list-view");
});

gridBtn?.addEventListener("click", () => {
  gridBtn.classList.add("active");
  listBtn.classList.remove("active");
  resultsContainer.classList.remove("list-view");
  resultsContainer.classList.add("grid-view");
});

// Tabs
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

// Form submit
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

// Instant search + autocomplete
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

// Keyboard navigation for autocomplete
input?.addEventListener("keydown", (e) => {
  if (!acList || acList.classList.contains("hidden")) return;
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

// On load
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

function getSafeLevel() {
  if (!safeSelect) return "moderate";
  const val = safeSelect.value || "moderate";
  if (val === "off") return "off";
  if (val === "strict") return "strict";
  return "moderate";
}

async function runSearch(q) {
  resultsContainer.innerHTML = "";
  imageResults.innerHTML = "";
  knowledgePanel.classList.add("hidden");
  knowledgePanel.innerHTML = "";

  showLoading(true);
  showNoResults(false);

  let deduped = [];
  let imageSet = [];
  let wikiEntity = null;

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
  } catch (e) {
    console.warn("Search backend error", e);
  }

  showLoading(false);

  if (!deduped.length) {
    showNoResults(true);
    return;
  }

  // Main results
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

  if (wikiEntity) {
    buildKnowledgePanel(wikiEntity);
  }
}

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

  items.forEach((s, idx) => {
    const div = document.createElement("div");
    div.className = "ac-item";
    div.textContent = s.text;
    div.dataset.value = s.text;
    div.dataset.source = s.source;

    const src = document.createElement("span");
    src.className = "ac-source";
    src.textContent =
      s.source === "ddg" ? "Web" :
      s.source === "wiki" ? "Wiki" :
      s.source === "trending" ? "Trending" : "";
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

async function buildKnowledgePanel(title) {
  try {
    const summary = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title
      )}`
    ).then(r => r.json());

    if (!summary.title || !summary.extract) return;

    knowledgePanel.innerHTML = "";

    const thumb = summary.thumbnail?.source || "";
    if (thumb) {
      const img = document.createElement("img");
      img.className = "kp-thumb";
      img.src = thumb;
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

function showLoading(on) {
  if (!loadingEl) return;
  loadingEl.classList.toggle("visible", on);
}

function showNoResults(on) {
  if (!noQueryEl) return;
  noQueryEl.classList.toggle("visible", on);
}

function safeDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/* FAQ accordion */
document.querySelectorAll(".faq-item").forEach(item => {
  const q = item.querySelector(".faq-question");
  q?.addEventListener("click", () => {
    item.classList.toggle("open");
  });
});
