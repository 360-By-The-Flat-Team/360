(() => {
/* ─────────────────────────────────
   STATE
───────────────────────────────── */
const state = {
  query: '',
  tab: 'web',
  page: 1,
  suggestIdx: -1,
  suggestList: [],
  gcseReady: false,
  pendingSearch: null,
  // track whether suggestion dropdown should stay open
  suggestOpen: false,
  // prevent observer from firing during suggestion mirroring
  suppressObserver: false,
};

/* ─────────────────────────────────
   ELEMENT REFS
───────────────────────────────── */
const input       = document.getElementById('custom-search-input');
const clearBtn    = document.getElementById('custom-clear-btn');
const searchBtn   = document.getElementById('custom-search-btn');
const dropdown    = document.getElementById('suggestions-dropdown');
const resultsArea = document.getElementById('custom-results-area');
const aiPanel     = document.getElementById('ai-panel');
const tabsEl      = document.getElementById('results-tabs');

/* ─────────────────────────────────
   INIT FROM URL
───────────────────────────────── */
function initFromUrl() {
  const params = new URL(location.href).searchParams;
  const q = params.get('q') || '';
  const t = params.get('tab') || 'web';
  if (q) {
    input.value = q;
    state.query = q;
    state.tab = t;
    updateClearBtn();
    setActiveTab(t);
    if (t === 'ai') {
      showResultsArea(false);
      runAiSearch(q);
    } else {
      showResultsArea(true);
      waitForGcseAndSearch(q, t);
    }
  }
}

/* ─────────────────────────────────
   SHOW / HIDE RESULTS vs AI PANEL
───────────────────────────────── */
function showResultsArea(show) {
  resultsArea.style.display = show ? '' : 'none';
  aiPanel.classList.toggle('active', !show);
}

/* ─────────────────────────────────
   WAIT FOR GCSE THEN SEARCH
───────────────────────────────── */
function waitForGcseAndSearch(q, tab) {
  if (state.gcseReady) {
    triggerGcseSearch(q, tab);
  } else {
    state.pendingSearch = { q, tab };
  }
}

/* ─────────────────────────────────
   GCSE READY DETECTION
───────────────────────────────── */
let gcseCheckInterval = setInterval(() => {
  const gcseInput = getGcseInput();
  if (gcseInput) {
    clearInterval(gcseCheckInterval);
    state.gcseReady = true;
    if (state.pendingSearch) {
      triggerGcseSearch(state.pendingSearch.q, state.pendingSearch.tab);
      state.pendingSearch = null;
    }
  }
}, 100);

/* ─────────────────────────────────
   GET GCSE ELEMENTS
───────────────────────────────── */
function getGcseInput() {
  return document.querySelector('#gcse-hidden-container input.gsc-input');
}
function getGcseBtn() {
  return document.querySelector('#gcse-hidden-container .gsc-search-button-v2, #gcse-hidden-container button.gsc-search-button');
}

/* ─────────────────────────────────
   TRIGGER GCSE SEARCH
───────────────────────────────── */
function triggerGcseSearch(q, tab) {
  const gcseInput = getGcseInput();
  if (!gcseInput) return;

  // Suppress observer while we set the value
  state.suppressObserver = true;
  gcseInput.value = q;
  gcseInput.dispatchEvent(new Event('input', { bubbles: true }));
  gcseInput.dispatchEvent(new Event('change', { bubbles: true }));
  setTimeout(() => { state.suppressObserver = false; }, 200);

  // Try the google.search.cse API first
  if (window.google && google.search && google.search.cse) {
    try {
      const el = google.search.cse.element.getElement('searchresults-only0') ||
                 google.search.cse.element.getAllElements()[0];
      if (el) {
        el.execute(q);
        setupGcseObserver();
        return;
      }
    } catch(e) {}
  }

  // Fallback: click GCSE search button
  const btn = getGcseBtn();
  if (btn) {
    setTimeout(() => {
      btn.click();
      setupGcseObserver();
    }, 50);
  }
}

/* ─────────────────────────────────
   OBSERVE GCSE RESULTS + SCRAPE
   Only fires after a real search,
   not while mirroring suggestion input.
───────────────────────────────── */
let gcseObserver = null;
let stableTimer  = null;
let safetyTimer  = null;

function setupGcseObserver() {
  showLoading();
  // Tear down previous observer fully
  if (gcseObserver) { gcseObserver.disconnect(); gcseObserver = null; }
  clearTimeout(stableTimer);
  clearTimeout(safetyTimer);

  const gcseContainer = document.getElementById('gcse-hidden-container');

  gcseObserver = new MutationObserver(() => {
    // Skip mutations caused by suggestion mirroring
    if (state.suppressObserver) return;
    clearTimeout(stableTimer);
    stableTimer = setTimeout(() => {
      scrapeAndRender();
    }, 500);
  });

  gcseObserver.observe(gcseContainer, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: false, // don't watch attribute changes — reduces noise
  });

  // Safety net scrape
  safetyTimer = setTimeout(() => scrapeAndRender(), 5000);
}

/* ─────────────────────────────────
   SCRAPE GCSE RESULTS
   Web and images use different GCSE DOM structures.
───────────────────────────────── */
function scrapeAndRender() {
  if (state.tab === 'ai') return;

  const gcseContainer = document.getElementById('gcse-hidden-container');

  if (state.tab === 'images') {
    scrapeImageResults(gcseContainer);
  } else {
    scrapeWebResults(gcseContainer);
  }
}

function scrapeWebResults(gcseContainer) {
  const resultEls = gcseContainer.querySelectorAll('.gsc-webResult.gsc-result');
  if (!resultEls.length) {
    const noResults = gcseContainer.querySelector('.gs-no-results-result, .gsc-no-results-result');
    if (noResults) { renderNoResults(); return; }
    return; // still loading
  }

  const seenHrefs = new Set();
  const results = [];

  resultEls.forEach(el => {
    const titleAnchor = el.querySelector('.gs-title a[data-ctorig], .gs-title a, a.gs-title');
    const snippetEl   = el.querySelector('.gs-snippet');
    const urlEl       = el.querySelector('.gs-visibleUrl, .gsc-url-top, .gs-visibleUrl-long');
    const thumbEl     = el.querySelector('.gs-image img, .gsc-thumbnail img, img.gs-image');

    let href = '';
    if (titleAnchor) {
      href = titleAnchor.getAttribute('data-ctorig') || titleAnchor.href || '';
    }
    if (href.includes('google.com/url')) {
      try { href = new URL(href).searchParams.get('q') || href; } catch(e) {}
    }
    const hrefKey = href.replace(/\/$/, '').toLowerCase();
    if (!href || !titleAnchor || seenHrefs.has(hrefKey)) return;
    seenHrefs.add(hrefKey);

    const title   = titleAnchor.textContent.trim();
    const snippet = snippetEl ? snippetEl.innerHTML : '';

    let displayUrl = '';
    try {
      const u = new URL(href);
      const host = u.hostname.replace(/^www\./, '');
      const path = u.pathname.replace(/\/$/, '');
      displayUrl = path ? `${host} › ${path}` : host;
    } catch(e) {
      displayUrl = urlEl ? urlEl.textContent.trim() : href;
    }

    const thumb = thumbEl ? (thumbEl.src || thumbEl.getAttribute('data-src') || '') : '';
    results.push({ title, href, displayUrl, snippet, thumb });
  });

  const { countText, currentPage, totalPages } = getGcsePaginationInfo(gcseContainer);
  renderWebResults(results, countText, currentPage, totalPages);
}

function scrapeImageResults(gcseContainer) {
  // GCSE image results are in .gsc-imageResult elements
  // Each has an <a> wrapping an <img> and a caption
  const imageEls = gcseContainer.querySelectorAll(
    '.gsc-imageResult, .gsc-imageResult-classic, .gs-imageResult, .gsc-imageResult-column, [class*="imageResult"]'
  );

  const seenSrcs = new Set();
  const results = [];

  imageEls.forEach(el => {
    const anchor  = el.querySelector('a');
    const imgEl   = el.querySelector('img');
    const titleEl = el.querySelector('.gs-title, .gsc-thumbnail-title, [class*="title"]');

    if (!imgEl) return;

    // Get the real image src — GCSE may use data-src or src
    let src = imgEl.getAttribute('data-src') || imgEl.src || '';
    // Skip tiny placeholder/spinner images
    if (!src || src.startsWith('data:') || src.includes('blank.gif')) return;
    if (seenSrcs.has(src)) return;
    seenSrcs.add(src);

    // Get the destination URL
    let href = anchor ? (anchor.getAttribute('data-ctorig') || anchor.href || '#') : '#';
    if (href.includes('google.com/url')) {
      try { href = new URL(href).searchParams.get('q') || href; } catch(e) {}
    }

    const alt = imgEl.alt || (titleEl ? titleEl.textContent.trim() : '') || 'Image';

    let displayUrl = '';
    try {
      displayUrl = new URL(href).hostname.replace(/^www\./, '');
    } catch(e) { displayUrl = href; }

    results.push({ src, href, alt, displayUrl });
  });

  // If GCSE image-specific elements not found, fall back to thumbnails in web results
  if (!results.length) {
    const webEls = gcseContainer.querySelectorAll('.gsc-webResult.gsc-result, .gs-result');
    webEls.forEach(el => {
      const thumbEl = el.querySelector('.gs-image img, .gsc-thumbnail img, img.gs-image');
      const titleEl = el.querySelector('.gs-title a');
      if (!thumbEl) return;
      const src = thumbEl.src || thumbEl.getAttribute('data-src') || '';
      if (!src || src.startsWith('data:') || seenSrcs.has(src)) return;
      seenSrcs.add(src);
      let href = titleEl ? (titleEl.getAttribute('data-ctorig') || titleEl.href || '#') : '#';
      if (href.includes('google.com/url')) {
        try { href = new URL(href).searchParams.get('q') || href; } catch(e) {}
      }
      const alt = titleEl ? titleEl.textContent.trim() : 'Image';
      let displayUrl = '';
      try { displayUrl = new URL(href).hostname.replace(/^www\./, ''); } catch(e) { displayUrl = href; }
      results.push({ src, href, alt, displayUrl });
    });
  }

  if (!results.length) {
    const noResults = gcseContainer.querySelector('.gs-no-results-result, .gsc-no-results-result');
    if (noResults) { renderNoResults(); return; }
    return; // still loading
  }

  const { countText, currentPage, totalPages } = getGcsePaginationInfo(gcseContainer);
  renderImageResults(results, countText, currentPage, totalPages);
}

function getGcsePaginationInfo(gcseContainer) {
  const countEl       = gcseContainer.querySelector('.gsc-result-info');
  const countText     = countEl ? countEl.textContent.trim() : '';
  const pageEls       = gcseContainer.querySelectorAll('.gsc-cursor-page');
  const currentPageEl = gcseContainer.querySelector('.gsc-cursor-current-page');
  const currentPage   = currentPageEl ? parseInt(currentPageEl.textContent.trim()) : state.page;

  // Highest page number visible in GCSE cursor
  let totalPages = 0;
  pageEls.forEach(el => {
    const n = parseInt(el.textContent.trim());
    if (!isNaN(n) && n > totalPages) totalPages = n;
  });
  // If there's a next-arrow, more pages exist beyond the cursor window
  const hasNextArrow = !!gcseContainer.querySelector('.gsc-cursor-next-page');
  if (hasNextArrow) totalPages = Math.max(totalPages, currentPage + 1);
  if (totalPages < 1) totalPages = 1;

  state.page = currentPage;
  return { countText, currentPage, totalPages };
}

/* ─────────────────────────────────
   LIVE SUGGESTIONS
   Mirror to GCSE with suppressObserver=true
   so the observer doesn't fire on suggestion updates.
   Use JSONP from Google Suggest as primary source.
───────────────────────────────── */
let suggestTimeout   = null;
let lastSuggestQuery = '';
// Track whether input is currently focused
let inputFocused = false;

function fetchSuggestions(q) {
  if (!q.trim()) return;
  if (q === lastSuggestQuery) return;
  lastSuggestQuery = q;

  // Mirror to GCSE for its own autocomplete — suppress observer
  const gcseInput = getGcseInput();
  if (gcseInput) {
    state.suppressObserver = true;
    gcseInput.value = q;
    gcseInput.dispatchEvent(new Event('input', { bubbles: true }));
    gcseInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    setTimeout(() => { state.suppressObserver = false; }, 300);
  }

  // JSONP from Google Suggest
  const old = document.getElementById('suggest-jsonp');
  if (old) old.remove();

  window.__suggestCallback = function(data) {
    // Only show if input still focused and query still matches
    if (!inputFocused) return;
    if (data && data[1]) {
      const suggs = data[1].slice(0, 7).map(s => Array.isArray(s) ? s[0] : s);
      showSuggestions(suggs, q);
    }
  };

  const script = document.createElement('script');
  script.id = 'suggest-jsonp';
  script.src = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}&callback=__suggestCallback`;
  document.head.appendChild(script);
}

function showSuggestions(items, query) {
  if (!items || !items.length || !inputFocused) { hideSuggestions(); return; }

  state.suggestList = items;
  state.suggestIdx = -1;
  state.suggestOpen = true;

  const q = query.toLowerCase();
  dropdown.innerHTML = items.map((s, i) => {
    const lower = s.toLowerCase();
    let display;
    if (lower.startsWith(q)) {
      display = `<em>${escHtml(s.slice(0, q.length))}</em>${escHtml(s.slice(q.length))}`;
    } else {
      display = escHtml(s);
    }
    return `<div class="suggestion-item" data-idx="${i}" data-val="${escHtml(s)}">
      <span class="suggestion-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>
      <span class="suggestion-text">${display}</span>
      <span class="suggestion-arrow"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></span>
    </div>`;
  }).join('');

  dropdown.classList.add('visible');

  dropdown.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('mousedown', e => {
      e.preventDefault(); // prevent blur from firing before click
      const val = item.getAttribute('data-val');
      input.value = val;
      state.query = val;
      lastSuggestQuery = val;
      hideSuggestions();
      updateClearBtn();
      doSearch(val);
    });
  });
}

function hideSuggestions() {
  dropdown.classList.remove('visible');
  state.suggestOpen = false;
  state.suggestIdx = -1;
}

/* ─────────────────────────────────
   KEYBOARD NAVIGATION
───────────────────────────────── */
input.addEventListener('keydown', e => {
  const items = dropdown.querySelectorAll('.suggestion-item');
  if (dropdown.classList.contains('visible') && items.length) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.suggestIdx = Math.min(state.suggestIdx + 1, items.length - 1);
      updateSuggestHighlight(items);
      if (state.suggestIdx >= 0) input.value = state.suggestList[state.suggestIdx];
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.suggestIdx = Math.max(state.suggestIdx - 1, -1);
      updateSuggestHighlight(items);
      if (state.suggestIdx >= 0) input.value = state.suggestList[state.suggestIdx];
      else input.value = state.query;
      return;
    }
    if (e.key === 'Escape') { hideSuggestions(); return; }
  }
  if (e.key === 'Enter') {
    hideSuggestions();
    const q = input.value.trim();
    if (q) doSearch(q);
  }
});

function updateSuggestHighlight(items) {
  items.forEach((el, i) => el.classList.toggle('active', i === state.suggestIdx));
}

/* ─────────────────────────────────
   INPUT EVENTS
───────────────────────────────── */
input.addEventListener('input', () => {
  const val = input.value;
  state.query = val;
  updateClearBtn();
  if (!val.trim()) {
    hideSuggestions();
    lastSuggestQuery = '';
    return;
  }
  clearTimeout(suggestTimeout);
  suggestTimeout = setTimeout(() => fetchSuggestions(val), 150);
});

input.addEventListener('focus', () => {
  inputFocused = true;
  // Re-show suggestions if we have them and there's a query
  if (input.value.trim() && state.suggestList.length) {
    dropdown.classList.add('visible');
    state.suggestOpen = true;
  }
});

input.addEventListener('blur', () => {
  inputFocused = false;
  // Delay so mousedown on suggestion fires first
  setTimeout(() => {
    if (!inputFocused) hideSuggestions();
  }, 180);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.custom-search-wrapper')) hideSuggestions();
});

/* ─────────────────────────────────
   CLEAR BUTTON
───────────────────────────────── */
clearBtn.addEventListener('click', () => {
  input.value = '';
  state.query = '';
  lastSuggestQuery = '';
  state.suggestList = [];
  updateClearBtn();
  hideSuggestions();
  input.focus();
  showEmptyState();
  updateUrl('', state.tab);
});

function updateClearBtn() {
  clearBtn.classList.toggle('visible', !!input.value);
}

/* ─────────────────────────────────
   SEARCH BUTTON
───────────────────────────────── */
searchBtn.addEventListener('click', () => {
  const q = input.value.trim();
  if (q) { hideSuggestions(); doSearch(q); }
});

/* ─────────────────────────────────
   TABS
───────────────────────────────── */
tabsEl.addEventListener('click', e => {
  const tab = e.target.closest('.results-tab');
  if (!tab) return;
  const t = tab.getAttribute('data-tab');
  if (t === state.tab) return; // no-op if same tab
  state.tab = t;
  state.page = 1;
  setActiveTab(t);
  updateUrl(state.query, t);

  if (t === 'ai') {
    showResultsArea(false);
    if (state.query) runAiSearch(state.query);
    return;
  }

  showResultsArea(true);
  if (state.query) {
    waitForGcseAndSearch(state.query, t);
  }
});

function setActiveTab(t) {
  tabsEl.querySelectorAll('.results-tab').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-tab') === t);
  });
}

/* ─────────────────────────────────
   LIGHTBOX
───────────────────────────────── */
const lightbox   = document.getElementById('img-lightbox');
const lbImg      = document.getElementById('lb-img');
const lbDesc     = document.getElementById('lb-desc');
const lbUrl      = document.getElementById('lb-url');
const lbVisit    = document.getElementById('lb-visit');
const lbCloseBtn = document.getElementById('lb-close-btn');

function openLightbox({ src, href, alt, url }) {
  lbImg.src = src;
  lbImg.alt = alt || '';
  lbDesc.textContent = alt || 'Image';
  lbUrl.href = href;
  lbUrl.textContent = url || href;
  lbVisit.href = href;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lbImg.src = '';
}

lbCloseBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

/* ─────────────────────────────────
   AI SEARCH
   Calls Supabase edge function.
   Returns { reply: "..." } — extract .reply.
   Renders markdown-lite formatting.
───────────────────────────────── */
let aiAbortController = null;

const AI_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 1 0 5 5"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;

// Convert basic markdown to safe HTML
function renderMarkdown(text) {
  if (!text) return '';
  // Escape HTML first
  let s = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```)
  s = s.replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.08);border-radius:8px;padding:12px;overflow-x:auto;font-size:13px;margin:8px 0;"><code>$1</code></pre>');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.08);padding:2px 5px;border-radius:4px;font-size:13px;">$1</code>');
  // Bold **text** or __text__
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic *text* or _text_  (after bold so ** doesn't trigger)
  s = s.replace(/\*([^*\n]+)\*/g, '<em style="text-decoration:underline;font-style:normal;">$1</em>');
  s = s.replace(/_([^_\n]+)_/g, '<em style="text-decoration:underline;font-style:normal;">$1</em>');
  // Strikethrough ~~text~~
  s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Headers ### ## #
  s = s.replace(/^### (.+)$/gm, '<h3 style="margin:12px 0 4px;font-size:15px;font-weight:700;">$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2 style="margin:14px 0 4px;font-size:17px;font-weight:700;">$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h1 style="margin:16px 0 4px;font-size:19px;font-weight:800;">$1</h1>');
  // Bullet lists
  s = s.replace(/^[\*\-] (.+)$/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>');
  s = s.replace(/(<li[\s\S]*?<\/li>)/g, '<ul style="padding-left:20px;margin:6px 0;">$1</ul>');
  // Numbered lists
  s = s.replace(/^\d+\. (.+)$/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>');
  // Horizontal rule
  s = s.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid var(--glass-border);margin:12px 0;">');
  // Newlines → <br> (but not inside block elements)
  s = s.replace(/\n{2,}/g, '<br><br>');
  s = s.replace(/\n/g, '<br>');

  return s;
}

async function runAiSearch(q) {
  // Offline check
  if (!navigator.onLine) {
    aiPanel.innerHTML = `
      <div class="ai-response-card">
        <div class="ai-response-label">${AI_ICON} AI Answer</div>
        <div class="ai-response-text" style="color:var(--mut)">📡 You appear to be offline. Please check your internet connection and try again.</div>
      </div>`;
    return;
  }

  if (aiAbortController) aiAbortController.abort();
  aiAbortController = new AbortController();

  aiPanel.innerHTML = `
    <div class="ai-response-card">
      <div class="ai-response-label">${AI_ICON} AI Answer</div>
      <div class="ai-thinking">
        <div class="ai-thinking-dots"><span></span><span></span><span></span></div>
        Thinking…
      </div>
    </div>`;

  const card = aiPanel.querySelector('.ai-response-card');

  function showAnswer(text) {
    card.innerHTML = `<div class="ai-response-label">${AI_ICON} AI Answer</div><div class="ai-response-text">${renderMarkdown(text)}</div>`;
  }

  try {
    const resp = await fetch('https://wiswfpfsjiowtrdyqpxy.supabase.co/functions/v1/search-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q }),
      signal: aiAbortController.signal,
    });

    if (!resp.ok) {
      let errMsg = `Error ${resp.status}`;
      try { const e = await resp.json(); errMsg = e.error || e.message || errMsg; } catch(e) {}
      throw new Error(errMsg);
    }

    const j = await resp.json();

    // Your edge function returns { reply: "..." }
    const answer = j.reply
                ?? j.response
                ?? j.content
                ?? j.text
                ?? j.message
                ?? j.answer
                ?? j.choices?.[0]?.message?.content
                ?? JSON.stringify(j, null, 2);

    showAnswer(answer);

  } catch(err) {
    if (err.name === 'AbortError') return;
    const isOffline = !navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('NetworkError');
    card.innerHTML = `
      <div class="ai-response-label">${AI_ICON} AI Answer</div>
      <div class="ai-response-text" style="color:var(--mut)">${isOffline ? '📡 No internet connection.' : '⚠ ' + escHtml(err.message || 'Something went wrong.')}</div>`;
  }
}

/* ─────────────────────────────────
   DO SEARCH (main entry point)
───────────────────────────────── */
function doSearch(q) {
  // Offline check for web/images searches
  if (!navigator.onLine && state.tab !== 'ai') {
    resultsArea.innerHTML = `
      <div class="state-box">
        <div class="big-icon">📡</div>
        <h3>No internet connection</h3>
        <p>Please check your connection and try again.</p>
      </div>`;
    return;
  }

  state.query = q;
  state.page = 1;
  input.value = q;
  updateClearBtn();
  updateUrl(q, state.tab);

  if (state.tab === 'ai') {
    showResultsArea(false);
    runAiSearch(q);
    return;
  }

  showResultsArea(true);
  waitForGcseAndSearch(q, state.tab);
}

/* ─────────────────────────────────
   URL MANAGEMENT — uses %20 not + for spaces
───────────────────────────────── */
function updateUrl(q, tab) {
  const base = location.pathname;
  if (q) {
    history.replaceState(null, '', `${base}?q=${encodeURIComponent(q)}&tab=${encodeURIComponent(tab)}`);
  } else {
    history.replaceState(null, '', base);
  }
}

function syncGcsQuery() {
  const hash = window.location.hash;

  // Only act if the hash actually contains a GCSE query token
  if (!hash.includes('gsc.q=')) {
    // GCSE fired a replaceState without a query — just strip the hash
    // but DO NOT wipe the search params we set ourselves
    if (window.location.hash) {
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(null, '', url.toString());
    }
    return;
  }

  const qMatch   = hash.match(/gsc\.q=([^&]*)/);
  const tabMatch = hash.match(/gsc\.tab=([^&]*)/);

  if (!qMatch || !qMatch[1]) return; // nothing useful in hash — leave URL alone

  const gscQuery = decodeURIComponent(qMatch[1].replace(/\+/g, ' ')).trim();
  if (!gscQuery) return; // empty query — leave URL alone

  const tab      = tabMatch ? tabMatch[1] : '0';
  const base     = location.pathname;
  const curQ     = new URLSearchParams(location.search).get('q') || '';

  // Only update if it differs from what we already have
  if (gscQuery !== curQ) {
    window.history.replaceState(null, '',
      `${base}?q=${encodeURIComponent(gscQuery)}&tab=${encodeURIComponent(tab)}`);
  } else {
    // Same query — just strip the hash fragment
    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState(null, '', url.toString());
  }
}

const _origPushState    = history.pushState.bind(history);
const _origReplaceState = history.replaceState.bind(history);

history.pushState = function(...args) {
  _origPushState(...args);
  // Only sync if GCSE put its own hash in
  if (args[2] && String(args[2]).includes('gsc.')) setTimeout(syncGcsQuery, 50);
};
history.replaceState = function(...args) {
  if (args[2] && String(args[2]).includes('gsc.')) {
    _origReplaceState(...args);
    setTimeout(syncGcsQuery, 50);
  } else {
    _origReplaceState(...args);
  }
};

window.addEventListener('hashchange', () => {
  if (window.location.hash.includes('gsc.')) syncGcsQuery();
});
window.addEventListener('load', () => setTimeout(syncGcsQuery, 300));

// Also detect going offline/online while the page is open
window.addEventListener('offline', () => {
  resultsArea.innerHTML = `
    <div class="state-box">
      <div class="big-icon">📡</div>
      <h3>You went offline</h3>
      <p>Results may not load until your connection is restored.</p>
    </div>`;
});

/* ─────────────────────────────────
   RENDER FUNCTIONS
───────────────────────────────── */
function showLoading() {
  resultsArea.innerHTML = `
    <div class="state-box">
      <div class="loader-spinner"></div>
      <p>Searching…</p>
    </div>`;
}

function showEmptyState() {
  resultsArea.innerHTML = `
    <div class="state-box">
      <div class="big-icon">🔍</div>
      <h3>Search anything</h3>
      <p>Type in the bar above and press Search or Enter</p>
    </div>`;
  aiPanel.innerHTML = '';
  aiPanel.classList.remove('active');
  resultsArea.style.display = '';
}

function renderNoResults() {
  resultsArea.innerHTML = `
    <div class="state-box">
      <div class="big-icon">😶</div>
      <h3>No results found</h3>
      <p>Try different keywords or check your spelling</p>
    </div>`;
}

function renderWebResults(results, countText, currentPage, totalPages) {
  if (!results.length) { renderNoResults(); return; }

  // Each GCSE page has its own result set — show all of them
  const visible = results;

  let html = '';
  if (countText) html += `<div class="results-info">${escHtml(countText)}</div>`;

  visible.forEach((r, i) => {
    let hostname = '';
    try { hostname = new URL(r.href).hostname.replace('www.', ''); } catch(e) {}
    const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(r.href)}`;
    const delay = i * 0.03;

    html += `
      <div class="result-card" style="animation-delay:${delay}s">
        <div class="result-card-inner">
          <div class="result-card-text">
            <div class="result-site-row">
              <img class="result-favicon" src="${escHtml(faviconUrl)}" alt="" loading="lazy" onerror="this.style.display='none'"/>
              <span class="result-site-name">${escHtml(hostname)}</span>
            </div>
            <div class="result-url">${escHtml(r.displayUrl || r.href)}</div>
            <a class="result-title" href="${escHtml(r.href)}" target="_blank" rel="noopener noreferrer">${escHtml(r.title)}</a>
            ${r.snippet ? `<div class="result-snippet">${r.snippet}</div>` : ''}
          </div>
          ${r.thumb ? `<img class="result-thumbnail" src="${escHtml(r.thumb)}" alt="" loading="lazy" onerror="this.remove()"/>` : ''}
        </div>
      </div>`;
  });

  if (totalPages > 1) html += buildPagination(currentPage, totalPages);
  resultsArea.innerHTML = html;
  resultsArea.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => goToPage(parseInt(btn.getAttribute('data-page'))));
  });
}

function renderImageResults(imgs, countText, currentPage, totalPages) {
  if (!imgs.length) { renderNoResults(); return; }

  let html = '';
  if (countText) html += `<div class="results-info">${escHtml(countText)}</div>`;

  html += `<div id="image-results-grid">`;
  imgs.forEach((img, i) => {
    const isGif = /\.gif($|\?)/i.test(img.src);
    html += `
      <div class="image-result-item"
        data-src="${escHtml(img.src)}"
        data-href="${escHtml(img.href)}"
        data-alt="${escHtml(img.alt)}"
        data-url="${escHtml(img.displayUrl || img.href)}"
        style="animation-delay:${i*0.02}s">
        <img src="${escHtml(img.src)}" alt="${escHtml(img.alt)}" loading="lazy"
          style="${isGif ? 'object-fit:contain;background:#000;height:140px;' : ''}"
          onerror="this.closest('.image-result-item').remove()"/>
        <div class="image-result-label">${escHtml(img.alt || 'Image')}</div>
      </div>`;
  });
  html += `</div>`;

  if (totalPages > 1) html += buildPagination(currentPage, totalPages);
  resultsArea.innerHTML = html;

  resultsArea.querySelectorAll('.image-result-item').forEach(tile => {
    tile.addEventListener('click', () => openLightbox({
      src:  tile.dataset.src,
      href: tile.dataset.href,
      alt:  tile.dataset.alt,
      url:  tile.dataset.url,
    }));
  });

  resultsArea.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => goToPage(parseInt(btn.getAttribute('data-page'))));
  });
}

function buildPagination(current, total) {
  const pages = [];
  for (let i = 1; i <= Math.min(total, 10); i++) pages.push(i);
  let html = `<div class="results-pagination">`;
  html += `<button class="page-btn" data-page="${current-1}" ${current<=1?'disabled':''}>← Prev</button>`;
  pages.forEach(p => {
    html += `<button class="page-btn ${p===current?'active':''}" data-page="${p}">${p}</button>`;
  });
  html += `<button class="page-btn" data-page="${current+1}" ${current>=total?'disabled':''}>Next →</button>`;
  html += `</div>`;
  return html;
}

/* ─────────────────────────────────
   GO TO PAGE
   1. Disconnect the mutation observer so partial
      GCSE updates don't trigger premature scrapes.
   2. Click the right GCSE cursor button (direct if
      visible, or step via Next/Prev arrows).
   3. Wait for the GCSE results container to change
      using a MutationObserver promise.
   4. Scrape and render the new page.
───────────────────────────────── */
function goToPage(targetPage) {
  if (targetPage < 1) return;
  if (targetPage === state.page) return;

  showLoading();

  // Stop observer so mid-navigation DOM changes don't trigger early scrapes
  if (gcseObserver) { gcseObserver.disconnect(); gcseObserver = null; }
  clearTimeout(stableTimer);
  clearTimeout(safetyTimer);

  const gcseContainer = document.getElementById('gcse-hidden-container');

  // Step through GCSE pages until we reach the target
  navigateGcseTo(gcseContainer, targetPage, () => {
    // Wait for GCSE to finish rendering the new page, then scrape
    waitForGcseChange(gcseContainer, 3000).then(() => {
      scrapeAndRender();
      // Re-attach observer for any future changes
      setupGcseObserver();
    });
  });
}

// Recursively navigate GCSE one step at a time toward targetPage
function navigateGcseTo(gcseContainer, targetPage, done) {
  // Try direct click first
  const cursorBtns = gcseContainer.querySelectorAll('.gsc-cursor-page');
  for (const btn of cursorBtns) {
    const num = parseInt(btn.textContent.trim());
    if (num === targetPage && !btn.classList.contains('gsc-cursor-current-page')) {
      btn.click();
      setTimeout(done, 100);
      return;
    }
  }

  // Can't click directly — use prev/next arrow
  const currentBtn = gcseContainer.querySelector('.gsc-cursor-current-page');
  const currentNum = currentBtn ? parseInt(currentBtn.textContent.trim()) : state.page;
  const goForward  = targetPage > currentNum;

  const arrowBtn = goForward
    ? gcseContainer.querySelector('.gsc-cursor-next-page')
    : gcseContainer.querySelector('.gsc-cursor-previous-page');

  if (!arrowBtn) {
    // No arrow available — just scrape wherever we are
    setTimeout(done, 100);
    return;
  }

  // Click arrow, wait for GCSE to update cursor, then recurse
  arrowBtn.click();
  waitForGcseChange(gcseContainer, 2500).then(() => {
    navigateGcseTo(gcseContainer, targetPage, done);
  });
}

// Returns a promise that resolves when GCSE results container changes,
// or after `maxWait` ms (whichever comes first)
function waitForGcseChange(gcseContainer, maxWait) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      obs.disconnect();
      resolve();
    }, maxWait);

    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      obs.disconnect();
      // Small buffer so GCSE finishes all its DOM writes
      setTimeout(resolve, 300);
    });

    obs.observe(gcseContainer, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false,
    });
  });
}

function waitAndScrape(ms) {
  clearTimeout(safetyTimer);
  safetyTimer = setTimeout(() => scrapeAndRender(), ms);
}

/* ─────────────────────────────────
   UTILS
───────────────────────────────── */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────
   BOOT
───────────────────────────────── */
initFromUrl();

})();
