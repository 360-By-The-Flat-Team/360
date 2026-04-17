/* ============================================================
   360 — SEARCH ENGINE
   This file replaces the old GCSE loader entirely.
   It contains the full native SearXNG renderer.
   ============================================================ */

(function () {
  // CHANGE THIS to your Worker URL
  const API_BASE = "https://api.360-search.com/search";

  const resultsShell = document.getElementById("results-shell");
  const resultsContainer = document.getElementById("results-container");
  const loadingEl = document.getElementById("results-loading");
  const noQueryEl = document.getElementById("no-query");
  const paginationEl = document.getElementById("results-pagination");

  const form = document.getElementById("strip-search-form");
  const input = document.getElementById("strip-search-input");

  const url = new URL(window.location.href);
  const initialQ = url.searchParams.get("q") || "";
  let currentPage = parseInt(url.searchParams.get("page") || "1", 10);

  if (input) input.value = initialQ;

  if (!initialQ) {
    showNoQuery();
  } else {
    runSearch(initialQ, currentPage);
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      currentPage = 1;
      updateUrl(q, currentPage);
      runSearch(q, currentPage);
    });
  }

  function updateUrl(q, page) {
    const u = new URL(window.location.href);
    u.searchParams.set("q", q);
    if (page > 1) u.searchParams.set("page", String(page));
    else u.searchParams.delete("page");
    window.history.replaceState({}, "", u.toString());
  }

  async function runSearch(q, page) {
    showLoading();
    try {
      const params = new URLSearchParams({
        q,
        page: String(page),
        format: "json"
      });

      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      renderResults(data, q, page);
    } catch (err) {
      renderError(err);
    }
  }

  function showLoading() {
    loadingEl.style.display = "flex";
    noQueryEl.style.display = "none";
    resultsContainer.innerHTML = "";
    paginationEl.innerHTML = "";
  }

  function showNoQuery() {
    loadingEl.style.display = "none";
    noQueryEl.style.display = "flex";
    resultsContainer.innerHTML = "";
    paginationEl.innerHTML = "";
  }

  function renderResults(data, q, page) {
    loadingEl.style.display = "none";
    noQueryEl.style.display = "none";
    resultsContainer.innerHTML = "";
    paginationEl.innerHTML = "";

    const results = data.results || data["results"] || [];

    if (!results.length) {
      resultsContainer.innerHTML = `
        <div class="result-card">
          <div class="result-snippet">No results found for <strong>${escapeHtml(q)}</strong>.</div>
        </div>
      `;
      return;
    }

    results.forEach((r) => {
      const url = r.url || r.link || "";
      const title = r.title || url || "Untitled";
      const snippet = r.content || r.snippet || "";

      const card = document.createElement("article");
      card.className = "result-card";

      const meta = document.createElement("div");
      meta.className = "result-meta";

      const favicon = document.createElement("img");
      favicon.className = "result-favicon";
      favicon.loading = "lazy";

      try {
        const u = new URL(url);
        favicon.src = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
      } catch {
        favicon.style.display = "none";
      }

      const urlSpan = document.createElement("span");
      urlSpan.textContent = url;

      meta.appendChild(favicon);
      meta.appendChild(urlSpan);

      const titleEl = document.createElement("h2");
      titleEl.className = "result-title";
      titleEl.innerHTML = `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>`;

      const snippetEl = document.createElement("p");
      snippetEl.className = "result-snippet";
      snippetEl.textContent = snippet;

      card.appendChild(meta);
      card.appendChild(titleEl);
      card.appendChild(snippetEl);

      resultsContainer.appendChild(card);
    });

    renderPagination(data, q, page);
  }

  function renderPagination(data, q, page) {
    const total = data.number_of_results || data.total || 0;
    const perPage = data.page_size || data.limit || 10;

    if (!total || !perPage) return;

    const maxPages = Math.min(10, Math.ceil(total / perPage));
    if (maxPages <= 1) return;

    for (let p = 1; p <= maxPages; p++) {
      const btn = document.createElement("button");
      btn.className = "page-btn" + (p === page ? " active" : "");
      btn.textContent = String(p);
      btn.disabled = p === page;

      btn.addEventListener("click", () => {
        currentPage = p;
        updateUrl(q, p);
        runSearch(q, p);
      });

      paginationEl.appendChild(btn);
    }
  }

  function renderError(err) {
    loadingEl.style.display = "none";
    noQueryEl.style.display = "none";
    resultsContainer.innerHTML = `
      <div class="result-card">
        <div class="result-snippet">
          Something went wrong while searching. Please try again in a moment.
        </div>
      </div>
    `;
    console.error(err);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }
})();
