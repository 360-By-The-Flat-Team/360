// ============================
// 360 SEARCH V3 — FRONTEND
// ============================

const VYNTR_KEY = "vyntr_dVZQQztzpWQZiKpsuwpCdStcNiyTnSfooWrKPUyFFDqGvSkETpjtpyuuzBJzwQSf"; 
const GOOGLE_CX = "e003eb0834b6b4be8"; // if you want GCSE API later, Ming
const GOOGLE_KEY = ""; // optional, for Custom Search API

const resultsContainer = document.getElementById("resultsContainer");
const loadingEl = document.getElementById("frame-loader");
const noQueryEl = document.getElementById("no-query");

const listBtn = document.getElementById("listViewBtn");
const gridBtn = document.getElementById("gridViewBtn");
const form = document.getElementById("strip-search-form");
const input = document.getElementById("strip-search-input");

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

// On load, hydrate from ?q=
window.addEventListener("load", () => {
  const url = new URL(window.location.href);
  const q = url.searchParams.get("q") || "";
  if (q) {
    input.value = q;
    runSearch(q);
  }
});

async function runSearch(q) {
  resultsContainer.innerHTML = "";
  showLoading(true);
  showNoResults(false);

  const results = [];

  // Vyntr
  if (VYNTR_KEY) {
    try {
      const res = await fetch(`https://api.vyntr.com/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${VYNTR_KEY}` }
      });
      const data = await res.json();
      (data.results || []).forEach(r => {
        results.push({
          title: r.title || "",
          desc: r.snippet || "",
          url: r.url || "",
          img: r.image || ""
        });
      });
    } catch (e) {
      console.warn("Vyntr error", e);
    }
  }

  // Wikipedia
  try {
    const wiki = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`
    ).then(r => r.json());
    if (wiki.title && wiki.extract) {
      results.push({
        title: wiki.title,
        desc: wiki.extract,
        url: wiki.content_urls?.desktop?.page || "",
        img: wiki.thumbnail?.source || ""
      });
    }
  } catch (e) {
    console.warn("Wiki error", e);
  }

  // DuckDuckGo Lite (best-effort)
  try {
    const html = await fetch(
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`
    ).then(r => r.text());
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc.querySelectorAll("a").forEach(a => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent?.trim() || "";
      if (!href.startsWith("http")) return;
      if (!text) return;
      results.push({
        title: text,
        desc: "",
        url: href,
        img: ""
      });
    });
  } catch (e) {
    console.warn("DDG error", e);
  }

  showLoading(false);

  if (!results.length) {
    showNoResults(true);
    return;
  }

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

    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = r.title || r.url || "(no title)";
    card.appendChild(title);

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
}

function showLoading(on) {
  if (!loadingEl) return;
  loadingEl.classList.toggle("visible", on);
}

function showNoResults(on) {
  if (!noQueryEl) return;
  noQueryEl.classList.toggle("visible", on);
}
