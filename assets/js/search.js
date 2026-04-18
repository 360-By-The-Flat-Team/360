const YOU_KEY = "ydc-sk-d2a60aadc53e8b11-ANqKGAwcV0ApGknI310HgozZDDO1jnJS-a821a00f";   
const VYNTR_KEY = "vyntr_dVZQQztzpWQZiKpsuwpCdStcNiyTnSfooWrKPUyFFDqGvSkETpjtpyuuzBJzwQSf"; 

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

async function runSearch(q) {
  resultsContainer.innerHTML = "";
  imageResults.innerHTML = "";
  knowledgePanel.classList.add("hidden");
  knowledgePanel.innerHTML = "";

  showLoading(true);
  showNoResults(false);

  const results = [];
  const imageCandidates = [];
  let wikiEntity = null;

  // 1. You.com
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
        const r = {
          title: item.title || "",
          desc: item.snippet || "",
          url: item.url || "",
          img: item.image || "",
          source: "You.com"
        };
        results.push(r);
        if (r.img) imageCandidates.push(r);
      });
    } catch (e) {
      console.warn("You.com error", e);
    }
  }

  // 2. Vyntr
  if (VYNTR_KEY) {
    try {
      const res = await fetch(
        `https://vyntr.com/api/v1/search?q=${encodeURIComponent(q)}`,
        {
          headers: { "Authorization": `Bearer ${VYNTR_KEY}` }
        }
      );
      const data = await res.json();
      (data.web || []).slice(0, 10).forEach(item => {
        const r = {
          title: item.title || "",
          desc: item.preview || "",
          url: item.url || "",
          img: "",
          source: "Vyntr"
        };
        results.push(r);
      });
    } catch (e) {
      console.warn("Vyntr error", e);
    }
  }

  // 3. DuckDuckGo AC
  try {
    const ddg = await fetch(
      `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}`
    ).then(r => r.json());

    ddg.slice(0, 8).forEach(item => {
      if (!item?.phrase) return;
      results.push({
        title: item.phrase,
        desc: "",
        url: item.redirect || "",
        img: "",
        source: "DuckDuckGo"
      });
    });
  } catch (e) {
    console.warn("DuckDuckGo AC error", e);
  }

  // 4. Wikipedia search (multi)
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*`
    ).then(r => r.json());

    const searchResults = (wikiRes.query?.search || []).slice(0, 5);
    searchResults.forEach(item => {
      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`;
      results.push({
        title: item.title,
        desc: item.snippet
          ?.replace(/<\/?[^>]+(>|$)/g, "")
          ?.replace(/&quot;/g, '"')
          ?.replace(/&amp;/g, '&')
          ?.replace(/&lt;/g, '<')
          ?.replace(/&gt;/g, '>') || "",
        url: pageUrl,
        img: "",
        source: "Wikipedia"
      });
    });

    if (searchResults.length > 0) {
      wikiEntity = searchResults[0].title;
    }
  } catch (e) {
    console.warn("Wikipedia search error", e);
  }

  showLoading(false);

  if (!results.length) {
    showNoResults(true);
    return;
  }

  // Deduplicate by URL
  const seen = new Set();
  const deduped = [];
  for (const r of results) {
    if (!r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    deduped.push(r);
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

  // Build image tab
  const imageSet = [];
  deduped.forEach(r => { if (r.img) imageSet.push(r); });
  imageCandidates.forEach(r => { if (r.img) imageSet.push(r); });

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

  // Knowledge panel (smart mode)
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
