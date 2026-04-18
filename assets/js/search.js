// ============================
// 360 SEARCH V3 — FRONTEND
// ============================

const YOU_KEY = "ydc-sk-d2a60aadc53e8b11-ANqKGAwcV0ApGknI310HgozZDDO1jnJS-a821a00f";  
const VYNTR_KEY = "vyntr_dVZQQztzpWQZiKpsuwpCdStcNiyTnSfooWrKPUyFFDqGvSkETpjtpyuuzBJzwQSf"; 

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
  } else {
    showLoading(false);
    showNoResults(false);
  }
});

async function runSearch(q) {
  resultsContainer.innerHTML = "";
  showLoading(true);
  showNoResults(false);

  const results = [];

  // ============================
  // 1. YOU.COM SEARCH API
  // ============================
  if (YOU_KEY) {
    try {
      const res = await fetch("https://api.ydc-index.io/search", {
        method: "POST",
        headers: {
          "X-API-Key": YOU_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: q,
          num_web_results: 10
        })
      });

      const data = await res.json();

      (data.web || []).forEach(item => {
        results.push({
          title: item.title || "",
          desc: item.snippet || "",
          url: item.url || "",
          img: item.image || ""
        });
      });
    } catch (e) {
      console.warn("You.com error", e);
    }
  }

  // ============================
  // 2. VYNTR (optional)
  // ============================
  if (VYNTR_KEY) {
    try {
      const res = await fetch(`https://api.vyntr.com/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${VYNTR_KEY}` }
      });
      const data = await res.json();

      (data.results || []).slice(0, 10).forEach(r => {
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

  // ============================
  // 3. DUCKDUCKGO LITE
  // ============================
  try {
    const html = await fetch(
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`
    ).then(r => r.text());

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    [...doc.querySelectorAll("a")].slice(0, 10).forEach(a => {
      const href = a.href;
      const text = a.textContent.trim();
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

  // ============================
  // 4. WIKIPEDIA SUMMARY
  // ============================
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

  showLoading(false);

  if (!results.length) {
    showNoResults(true);
    return;
  }

  // Simple dedupe by URL
  const seen = new Set();
  const deduped = [];
  for (const r of results) {
    if (!r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    deduped.push(r);
  }

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
