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
// 2. VYNTR (correct endpoint)
// ============================
if (VYNTR_KEY) {
  try {
    const res = await fetch(
      `https://vyntr.com/api/v1/search?q=${encodeURIComponent(q)}`,
      {
        headers: {
          "Authorization": `Bearer ${VYNTR_KEY}`
        }
      }
    );

    const data = await res.json();

    (data.web || []).slice(0, 10).forEach(item => {
      results.push({
        title: item.title || "",
        desc: item.preview || "",
        url: item.url || "",
        img: "" // Vyntr doesn't return images
      });
    });

  } catch (e) {
    console.warn("Vyntr error", e);
  }
}
  
// ============================
// 3. DUCKDUCKGO — MULTIPLE BEST MATCHES (AC API)
// ============================
try {
  const ddg = await fetch(
    `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}`
  ).then(r => r.json());

  ddg.slice(0, 8).forEach(item => {
    if (!item?.phrase) return;

    results.push({
      title: item.phrase,
      desc: "", // AC API has no snippet
      url: item.redirect || "",
      img: ""
    });
  });
} catch (e) {
  console.warn("DuckDuckGo AC error", e);
}


 // ============================
// 4. WIKIPEDIA — MULTIPLE BEST MATCHES
// ============================
try {
  const wikiRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*`
  ).then(r => r.json());

  // Take top 5 best matches
  (wikiRes.query?.search || []).slice(0, 5).forEach(item => {
    const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`;

    results.push({
      title: item.title,
      desc: item.snippet
        ?.replace(/<\/?[^>]+(>|$)/g, "") // remove HTML tags
        ?.replace(/&quot;/g, '"')
        ?.replace(/&amp;/g, '&')
        ?.replace(/&lt;/g, '<')
        ?.replace(/&gt;/g, '>') || "",
      url: pageUrl,
      img: "" // Wikipedia search API does not include images
    });
  });

} catch (e) {
  console.warn("Wikipedia search error", e);
}
