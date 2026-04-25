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
   if (gcseObserver) { gcseObserver.disconnect(); gcseObserver = null; }
   clearTimeout(stableTimer);
   clearTimeout(safetyTimer);

   const gcseContainer = document.getElementById('gcse-hidden-container');

   gcseObserver = new MutationObserver(() => {
     if (state.suppressObserver) return;
     clearTimeout(stableTimer);
     // Wait 1200ms of DOM silence before scraping — gives GCSE time to
     // finish rendering all 10 results, not just the first few
     stableTimer = setTimeout(() => {
       scrapeAndRender();
     }, 1200);
   });

   gcseObserver.observe(gcseContainer, {
     childList: true,
     subtree: true,
     characterData: true,
     attributes: false,
   });

   // Safety net — scrape no matter what after 8s
   safetyTimer = setTimeout(() => scrapeAndRender(), 8000);
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
   // GCSE's widget only returns web results with thumbnails.
   // For real image search (30-50 per page), use the Google Custom Search JSON API
   // with searchType=image. cx matches your GCSE cx.
   const CX     = 'e003eb0834b6b4be8';
   const start  = ((state.page - 1) * 10) + 1; // API uses 1-based index, 10 per page

   showLoading();

   // Fetch up to 10 results per API call; to get more we make multiple calls
   // Google CSE API max is 10 per request, so we fetch 3 pages in parallel (30 total)
   const starts = [1, 11, 21].map(offset => start + offset - 1);

   Promise.allSettled(
     starts.map(s =>
       fetch(`https://www.googleapis.com/customsearch/v1?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&cx=${CX}&searchType=image&q=${encodeURIComponent(state.query)}&start=${s}&num=10`)
         .then(r => r.ok ? r.json() : Promise.reject(r.status))
     )
   ).then(responses => {
     const seenSrcs = new Set();
     const imgs = [];

     responses.forEach(res => {
       if (res.status !== 'fulfilled') return;
       const data = res.value;
       if (!data.items) return;
       data.items.forEach(item => {
         const src = item.link || '';
         if (!src || seenSrcs.has(src)) return;
         seenSrcs.add(src);
         imgs.push({
           src,
           href:       item.image?.contextLink || item.displayLink || src,
           alt:        item.title || 'Image',
           displayUrl: item.displayLink || '',
         });
       });
     });

     // Get total count from first response
     const firstOk = responses.find(r => r.status === 'fulfilled' && r.value?.searchInformation);
     const totalResults = firstOk ? parseInt(firstOk.value.searchInformation.totalResults || '0') : 0;
     // Google CSE API allows up to 100 results (pages 1-10 with 10 each)
     const totalPages = Math.min(10, Math.ceil(totalResults / 30));
     const countText  = totalResults ? `About ${totalResults.toLocaleString()} image results` : '';

     if (!imgs.length) {
       // API key missing or quota exceeded — fall back to GCSE thumbnail scrape
       scrapeImageFallback(gcseContainer);
       return;
     }

     renderImageResults(imgs, countText, state.page, Math.max(totalPages, 1));
   }).catch(() => {
     scrapeImageFallback(gcseContainer);
   });
 }

 // Fallback: scrape whatever thumbnails GCSE put in web results
 function scrapeImageFallback(gcseContainer) {
   const seenSrcs = new Set();
   const results = [];
   gcseContainer.querySelectorAll('.gsc-webResult.gsc-result, .gs-result').forEach(el => {
     const thumbEl = el.querySelector('.gs-image img, .gsc-thumbnail img, img.gs-image');
     const titleEl = el.querySelector('.gs-title a');
     if (!thumbEl) return;
     const src = thumbEl.getAttribute('data-src') || thumbEl.src || '';
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
   const { countText, currentPage, totalPages } = getGcsePaginationInfo(gcseContainer);
   if (!results.length) { renderNoResults(); return; }
   renderImageResults(results, countText, currentPage, totalPages);
 }

 function getGcsePaginationInfo(gcseContainer) {
   const countEl       = gcseContainer.querySelector('.gsc-result-info');
   const countText     = countEl ? countEl.textContent.trim() : '';
   const currentPageEl = gcseContainer.querySelector('.gsc-cursor-current-page');
   const currentPage   = currentPageEl ? parseInt(currentPageEl.textContent.trim()) : state.page;
   // GCSE always has exactly 10 pages
   const totalPages = 10;
   state.page = currentPage;
   return { countText, currentPage, totalPages };
 }

 function scrapeImageResults(gcseContainer) {
   // A standard web GCSE widget never renders .gsc-imageResult elements —
   // those only appear in image-search-configured CSEs.
   // The only images available are the thumbnails GCSE embeds inside
   // each web result card. Collect every non-trivial <img> from results.
   const seenSrcs = new Set();
   const results  = [];

   gcseContainer.querySelectorAll('.gsc-webResult.gsc-result').forEach(el => {
     const titleEl = el.querySelector('.gs-title a');

     // Get destination URL
     let href = titleEl ? (titleEl.getAttribute('data-ctorig') || titleEl.href || '#') : '#';
     if (href.includes('google.com/url')) {
       try { href = new URL(href).searchParams.get('q') || href; } catch(e) {}
     }
     const altBase = titleEl ? titleEl.textContent.trim() : 'Image';
     let displayUrl = '';
     try { displayUrl = new URL(href).hostname.replace(/^www\./, ''); } catch(e) { displayUrl = href; }

     // Collect all imgs inside this result — GCSE may put several thumbnails
     el.querySelectorAll('img').forEach(imgEl => {
       // Prefer data-src (lazy-loaded) over src
       let src = imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '';
       // Skip data URIs, blanks, favicons, and tiny tracker pixels
       if (!src || src.startsWith('data:') || /blank|favicon|1x1|pixel|spacer/i.test(src)) return;
       // Skip if already seen
       if (seenSrcs.has(src)) return;
       // Skip images with explicit tiny dimensions
       const w = parseInt(imgEl.getAttribute('width') || '0');
       const h = parseInt(imgEl.getAttribute('height') || '0');
       if ((w > 0 && w < 40) || (h > 0 && h < 40)) return;
       seenSrcs.add(src);

       const alt = imgEl.alt || altBase;
       results.push({ src, href, alt, displayUrl });
     });
   });

   if (!results.length) {
     const noResults = gcseContainer.querySelector('.gs-no-results-result, .gsc-no-results-result');
     if (noResults) { renderNoResults(); return; }
     // Still loading — don't show anything yet
     return;
   }

   const { countText, currentPage, totalPages } = getGcsePaginationInfo(gcseContainer);
   renderImageResults(results, countText, currentPage, totalPages);
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

 // Convert markdown to safe HTML
 function renderMarkdown(text) {
   if (!text) return '';

   // Normalize literal \n (from JSON serialization) to real newlines
   text = text.replace(/\\n/g, '\n');
   // Normalize \r\n and \r
   text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

   const lines = text.split('\n');
   const out   = [];
   let i = 0;

   while (i < lines.length) {
     const line = lines[i];

     // ── Fenced code block ```
     if (line.trim().startsWith('```')) {
       const lang = line.trim().slice(3).trim();
       const codeLines = [];
       i++;
       while (i < lines.length && !lines[i].trim().startsWith('```')) {
         codeLines.push(escHtml(lines[i]));
         i++;
       }
       out.push(`<pre style="background:rgba(0,0,0,0.12);border-radius:10px;padding:14px 16px;overflow-x:auto;font-size:13px;margin:10px 0;line-height:1.5;border:1px solid var(--glass-border);"><code>${codeLines.join('\n')}</code></pre>`);
       i++; // skip closing ```
       continue;
     }

     // ── Table: line that starts and ends with |
     if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
       const tableLines = [];
       while (i < lines.length && lines[i].trim().startsWith('|')) {
         tableLines.push(lines[i]);
         i++;
       }
       out.push(renderTable(tableLines));
       continue;
     }

     // ── Heading #
     const hMatch = line.match(/^(#{1,3})\s+(.+)/);
     if (hMatch) {
       const level = hMatch[1].length;
       const sizes = ['19px','17px','15px'];
       out.push(`<div style="font-size:${sizes[level-1]};font-weight:700;margin:14px 0 4px;line-height:1.3;">${inlineFormat(hMatch[2])}</div>`);
       i++; continue;
     }

     // ── Horizontal rule ---
     if (/^---+$/.test(line.trim())) {
       out.push(`<hr style="border:none;border-top:1px solid var(--glass-border);margin:12px 0;">`);
       i++; continue;
     }

     // ── Unordered list item - or *
     if (/^[\*\-]\s/.test(line)) {
       const listItems = [];
       while (i < lines.length && /^[\*\-]\s/.test(lines[i])) {
         listItems.push(`<li style="margin:4px 0;">${inlineFormat(lines[i].replace(/^[\*\-]\s/, ''))}</li>`);
         i++;
       }
       out.push(`<ul style="padding-left:22px;margin:6px 0;">${listItems.join('')}</ul>`);
       continue;
     }

     // ── Numbered list
     if (/^\d+\.\s/.test(line)) {
       const listItems = [];
       while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
         listItems.push(`<li style="margin:4px 0;">${inlineFormat(lines[i].replace(/^\d+\.\s/, ''))}</li>`);
         i++;
       }
       out.push(`<ol style="padding-left:22px;margin:6px 0;">${listItems.join('')}</ol>`);
       continue;
     }

     // ── Empty line → spacing
     if (line.trim() === '') {
       out.push(`<div style="height:8px;"></div>`);
       i++; continue;
     }

     // ── Regular paragraph
     out.push(`<p style="margin:0 0 6px;line-height:1.7;">${inlineFormat(line)}</p>`);
     i++;
   }

   return out.join('');
 }

 function renderTable(tableLines) {
   if (tableLines.length < 2) return escHtml(tableLines.join('\n'));

   const parseRow = (line) =>
     line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

   const headers = parseRow(tableLines[0]);
   // Skip separator row (---|---|---)
   const bodyLines = tableLines.slice(2);

   let html = `<div style="overflow-x:auto;margin:12px 0;">
     <table style="width:100%;border-collapse:collapse;font-size:13px;">
       <thead><tr>`;
   headers.forEach(h => {
     html += `<th style="padding:8px 12px;border-bottom:2px solid var(--glass-border);text-align:left;font-weight:700;white-space:nowrap;">${inlineFormat(h)}</th>`;
   });
   html += `</tr></thead><tbody>`;

   bodyLines.forEach((line, ri) => {
     if (!line.trim() || /^[\|\s\-:]+$/.test(line)) return;
     const cells = parseRow(line);
     const bg = ri % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent';
     html += `<tr style="background:${bg};">`;
     cells.forEach(c => {
       html += `<td style="padding:7px 12px;border-bottom:1px solid var(--glass-border);vertical-align:top;">${inlineFormat(c)}</td>`;
     });
     html += `</tr>`;
   });

   html += `</tbody></table></div>`;
   return html;
 }

 function inlineFormat(text) {
   // Preserve literal <br> and <br/> before escaping, restore after
   const PLACEHOLDER = '\x00BR\x00';
   let s = text.replace(/<br\s*\/?>/gi, PLACEHOLDER);
   s = escHtml(s);
   // Restore <br> placeholders
   s = s.replace(/\x00BR\x00/g, '<br>');
   // Also convert \n within a cell to <br>
   s = s.replace(/\\n/g, '<br>');
   // Bold **text** or __text__
   s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
   s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
   // Italic *text* or _text_ → underline as requested
   s = s.replace(/\*([^*\n]+)\*/g, '<span style="text-decoration:underline;">$1</span>');
   s = s.replace(/_([^_\n]+)_/g, '<span style="text-decoration:underline;">$1</span>');
   // Strikethrough
   s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
   // Inline code
   s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.10);padding:2px 5px;border-radius:4px;font-size:92%;">$1</code>');
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
     let settled = false;
     let settleTimer = null;

     const timer = setTimeout(() => {
       obs.disconnect();
       if (!settled) resolve();
     }, maxWait);

     const obs = new MutationObserver(() => {
       // Reset settle timer on every mutation — only resolve when DOM
       // has been quiet for 1000ms (all results have finished rendering)
       clearTimeout(settleTimer);
       settleTimer = setTimeout(() => {
         settled = true;
         clearTimeout(timer);
         obs.disconnect();
         resolve();
       }, 1000);
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
    NEWS SEARCH
    Uses RSS feeds via rss2json/allorigins proxies,
    filtered by query if provided. Same feeds as news.html.
 ───────────────────────────────── */
 const NEWS_PROXIES = [
   url => `https://api.rss2json.com/v1/api.json?count=30&rss_url=${encodeURIComponent(url)}`,
   url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
   url => `https://corsproxy.io/?${encodeURIComponent(url)}`
 ];
 const NEWS_CACHE = {};
 const NEWS_CACHE_TTL = 5 * 60 * 1000;
 const NEWS_FEED = 'https://feeds.bbci.co.uk/news/rss.xml';
 const NEWS_FEED_BACKUP = 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml';
  
 function newsTimeAgo(dateStr) {
   if (!dateStr) return '';
   const diff = Date.now() - new Date(dateStr).getTime();
   const m = Math.floor(diff / 60000);
   const h = Math.floor(m / 60);
   const d = Math.floor(h / 24);
   if (m < 1)  return 'Just now';
   if (m < 60) return `${m}m ago`;
   if (h < 24) return `${h}h ago`;
   return `${d}d ago`;
 }
  
 function newsExtractImage(item) {
   if (item.enclosure?.link) return item.enclosure.link;
   if (item.thumbnail && !item.thumbnail.includes('blank')) return item.thumbnail;
   const media = item['media:thumbnail'] || item['media:content'];
   if (media?.url) return media.url;
   const m = (item.description || item.content || '').match(/src="([^"]+\.(jpg|jpeg|png|webp))"/i);
   if (m) return m[1];
   return null;
 }
  
 function newsParseXML(text) {
   try {
     const doc   = new DOMParser().parseFromString(text, 'text/xml');
     const nodes = [...doc.querySelectorAll('item')];
     return nodes.map(n => {
       const raw  = n.querySelector('description')?.textContent || '';
       const imgM = raw.match(/src="([^"]+\.(jpg|jpeg|png|webp))"/i);
       const media = n.querySelector('thumbnail,content');
       return {
         title:       n.querySelector('title')?.textContent?.trim() || 'Untitled',
         link:        n.querySelector('link')?.textContent?.trim() || '#',
         description: raw.replace(/<[^>]*>/g, '').slice(0, 200),
         pubDate:     n.querySelector('pubDate')?.textContent || '',
         author:      n.querySelector('author,creator')?.textContent?.trim() || '',
         enclosure:   { link: media?.getAttribute('url') || imgM?.[1] || '' },
         thumbnail:   media?.getAttribute('url') || imgM?.[1] || ''
       };
     });
   } catch { return []; }
 }
  
 async function newsFetchFeed(url) {
   if (NEWS_CACHE[url] && Date.now() - NEWS_CACHE[url].ts < NEWS_CACHE_TTL) {
     return NEWS_CACHE[url].data;
   }
   for (let i = 0; i < NEWS_PROXIES.length; i++) {
     try {
       const res = await fetch(NEWS_PROXIES[i](url), { signal: AbortSignal.timeout(8000) });
       if (!res.ok) continue;
       const json = await res.json();
       if (json.items) {
         NEWS_CACHE[url] = { ts: Date.now(), data: json.items };
         return json.items;
       }
       const rawText = json.contents || await res.text();
       const items = newsParseXML(rawText);
       if (items.length) {
         NEWS_CACHE[url] = { ts: Date.now(), data: items };
         return items;
       }
     } catch { /* try next proxy */ }
   }
   return [];
 }
  
 async function runNewsSearch(q) {
   newsPanel.innerHTML = `
     <div class="state-box">
       <div class="loader-spinner"></div>
       <p>Loading news…</p>
     </div>`;
  
   let items = await newsFetchFeed(NEWS_FEED);
   if (!items.length) items = await newsFetchFeed(NEWS_FEED_BACKUP);
  
   if (!items.length) {
     newsPanel.innerHTML = `
       <div class="state-box">
         <div class="big-icon">📡</div>
         <h3>Could not load news</h3>
         <p>Check your connection and try again.</p>
       </div>`;
     return;
   }
  
   // Filter by query if one exists
   const filtered = q
     ? items.filter(a =>
         (a.title       || '').toLowerCase().includes(q.toLowerCase()) ||
         (a.description || '').toLowerCase().includes(q.toLowerCase())
       )
     : items;
  
   if (!filtered.length) {
     newsPanel.innerHTML = `
       <div class="state-box">
         <div class="big-icon">😶</div>
         <h3>No news found for "${escHtml(q)}"</h3>
         <p>Try different keywords</p>
       </div>`;
     return;
   }
  
   const countText = q
     ? `${filtered.length} news result${filtered.length !== 1 ? 's' : ''} for "${escHtml(q)}"`
     : `${filtered.length} top stories`;
  
   let html = `<div class="results-info">${countText}</div>`;
   filtered.slice(0, 30).forEach((a, i) => {
     const img    = newsExtractImage(a);
     const desc   = (a.description || a.content || '').replace(/<[^>]*>/g, '').trim();
     const source = a.author || 'News';
     const date   = newsTimeAgo(a.pubDate);
     html += `
       <a class="news-result-card" href="${escHtml(a.link)}" target="_blank" rel="noopener noreferrer"
          style="animation-delay:${i * 0.03}s">
         ${img ? `<img class="news-result-thumb" src="${escHtml(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
         <div class="news-result-body">
           <div class="news-result-source">${escHtml(source)}</div>
           <div class="news-result-title">${escHtml(a.title)}</div>
           ${desc ? `<div class="news-result-desc">${escHtml(desc.slice(0, 160))}</div>` : ''}
           <div class="news-result-date">${escHtml(date)}</div>
         </div>
       </a>`;
   });
   newsPanel.innerHTML = html;
 }

 /* ─────────────────────────────────
    BOOT
 ───────────────────────────────── */
 initFromUrl();

})();
