const API_URL = "https://api.360-search.com/search?q=";

const input = document.getElementById("strip-search-input");
const form = document.getElementById("strip-search-form");
const container = document.getElementById("results-container");

form.addEventListener("submit", e => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  history.replaceState({}, "", "?q=" + encodeURIComponent(q));
  loadResults(q);
});

window.addEventListener("load", () => {
  const params = new URLSearchParams(location.search);
  const q = params.get("q");
  if (q) {
    input.value = q;
    loadResults(q);
  }
});

async function loadResults(q) {
  container.innerHTML = skeletonSet();

  let data;
  try {
    const res = await fetch(API_URL + encodeURIComponent(q));
    data = await res.json();
  } catch {
    return renderErrorCards();
  }

  if (!data || !data.results || data.results.length === 0) {
    return container.innerHTML = `<div class="error-card">No results found.</div>`;
  }

  renderHybrid(data.results);
}

function renderHybrid(results) {
  const web = results.filter(r => r.type === "web");
  const media = results.filter(r => r.type === "image" || r.type === "video");

  container.innerHTML = "";

  if (web.length) {
    web.forEach(r => container.appendChild(webCard(r)));
  }

  if (media.length) {
    const wrap = document.createElement("div");
    wrap.className = "grid-wrap";
    media.forEach(r => wrap.appendChild(mediaCard(r)));
    container.appendChild(wrap);
  }
}

function webCard(r) {
  const div = document.createElement("div");
  div.className = "result-card";
  div.innerHTML = `
    <div class="result-title">${r.title || "Untitled"}</div>
    <div class="result-desc">${r.description || ""}</div>
    <div class="result-url">${r.url || ""}</div>
  `;
  return div;
}

function mediaCard(r) {
  const div = document.createElement("div");
  div.className = "grid-card";
  div.innerHTML = `
    <img src="${r.image || r.thumbnail || ""}" onerror="this.style.display='none'">
    <div class="grid-card-body">
      <div class="grid-card-title">${r.title || "Untitled"}</div>
    </div>
  `;
  return div;
}

function skeletonSet() {
  return `
    <div class="result-card">
      <div class="skel" style="width:60%"></div>
      <div class="skel" style="width:90%;margin-top:8px"></div>
      <div class="skel" style="width:40%;margin-top:8px"></div>
    </div>
    <div class="result-card">
      <div class="skel" style="width:50%"></div>
      <div class="skel" style="width:80%;margin-top:8px"></div>
      <div class="skel" style="width:30%;margin-top:8px"></div>
    </div>
  `;
}

function renderErrorCards() {
  container.innerHTML = `
    <div class="result-card error-card">⚠ Worker offline — showing cached layout</div>
    <div class="result-card error-card">⚠ Could not load results</div>
  `;
}
