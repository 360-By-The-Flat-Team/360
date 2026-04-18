// 360 Search — Supabase Backend Version

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

// View toggle
listBtn.addEventListener("click", () => {
  listBtn.classList.add("active");
  gridBtn.classList.remove("active");
  resultsContainer.classList.remove("grid-view");
  resultsContainer.classList.add("list-view");
});

gridBtn.addEventListener("click", () => {
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
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  runSearch(q);
  const url = new URL(window.location.href);
  url.searchParams.set("q", q);
  window.history.replaceState(null, "", url.toString());
});

// On load
window.addEventListener("load", () => {
  const url = new URL(window.location.href);
  const q = url.searchParams.get("q") || "";
  if (q) {
    input.value = q;
    runSearch(q);
  } else {
    showLoading(false);
    showNoResults(false);
  }
});

// ⭐ NEW: Supabase-powered search
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
    const res = await fetch(
      "https://wiswfpfsjiowtrdyqpxy.supabase.co/functions/v1/search?q=" + encodeURIComponent(q),
      { method: "GET" }
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

  // Render main results
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

  // Image tab
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
}

async function buildKnowledgePanel(title) {
  try {
    const summary = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
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
