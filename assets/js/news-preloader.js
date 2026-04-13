/* ============================================================
   360 NEWS PRELOADER — news-preloader.js
   ============================================================
   Silently pre-fetches all news categories in the background
   using requestIdleCallback so it NEVER blocks the UI.

   Strategy:
   - Fetches one category at a time, staggered by 2s gaps
   - Stores results in sessionStorage with a 5-min TTL
   - Categories are fetched in priority order (active first)
   - Works across all pages — drop this script globally
   - news.html reads from this cache before ever hitting the network
   ============================================================ */

(function () {
  "use strict";

  const CACHE_PREFIX  = "360_news_";
  const CACHE_TTL_MS  = 5 * 60 * 1000; // 5 minutes
  const FETCH_DELAY   = 2000;           // 2s between category fetches
  const PROXY_URL     = url => `https://api.rss2json.com/v1/api.json?count=28&rss_url=${encodeURIComponent(url)}`;
  const BACKUP_PROXY  = url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

  // All categories in priority order (Top Stories fetched first)
  const CATEGORIES = [
    {
      id: "top",
      label: "Top Stories",
      primary: "https://feeds.bbci.co.uk/news/rss.xml",
      backup:  "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"
    },
    {
      id: "tech",
      label: "Tech",
      primary: "https://feeds.bbci.co.uk/news/technology/rss.xml",
      backup:  "https://techcrunch.com/feed/"
    },
    {
      id: "science",
      label: "Science",
      primary: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
      backup:  "https://www.nasa.gov/rss/dyn/breaking_news.rss"
    },
    {
      id: "business",
      label: "Business",
      primary: "https://feeds.bbci.co.uk/news/business/rss.xml",
      backup:  "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml"
    },
    {
      id: "entertainment",
      label: "Entertainment",
      primary: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
      backup:  "https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml"
    },
    {
      id: "sports",
      label: "Sports",
      primary: "https://feeds.bbci.co.uk/sport/rss.xml",
      backup:  "https://www.espn.com/espn/rss/news"
    },
    {
      id: "world",
      label: "World",
      primary: "https://feeds.bbci.co.uk/news/world/rss.xml",
      backup:  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"
    }
  ];

  /* ── Cache helpers ── */
  function getCached(id) {
    try {
      const raw = sessionStorage.getItem(CACHE_PREFIX + id);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) {
        sessionStorage.removeItem(CACHE_PREFIX + id);
        return null;
      }
      return data;
    } catch { return null; }
  }

  function setCache(id, data) {
    try {
      sessionStorage.setItem(CACHE_PREFIX + id, JSON.stringify({ ts: Date.now(), data }));
    } catch (e) {
      // sessionStorage full — clear old entries and retry
      try {
        Object.keys(sessionStorage)
          .filter(k => k.startsWith(CACHE_PREFIX))
          .forEach(k => sessionStorage.removeItem(k));
        sessionStorage.setItem(CACHE_PREFIX + id, JSON.stringify({ ts: Date.now(), data }));
      } catch {}
    }
  }

  /* ── XML parser fallback ── */
  function parseXML(text) {
    try {
      const doc   = new DOMParser().parseFromString(text, "text/xml");
      const nodes = [...doc.querySelectorAll("item")];
      return nodes.map(n => {
        const raw  = n.querySelector("description")?.textContent || "";
        const imgM = raw.match(/src="([^"]+\.(jpg|jpeg|png|webp))"/i);
        const media = n.querySelector("thumbnail,content");
        return {
          title:       n.querySelector("title")?.textContent?.trim() || "Untitled",
          link:        n.querySelector("link")?.textContent?.trim() || "#",
          description: raw.replace(/<[^>]*>/g, "").slice(0, 200),
          pubDate:     n.querySelector("pubDate")?.textContent || "",
          author:      n.querySelector("author,creator")?.textContent?.trim() || "",
          enclosure:   { link: media?.getAttribute("url") || imgM?.[1] || "" },
          thumbnail:   media?.getAttribute("url") || imgM?.[1] || ""
        };
      });
    } catch { return []; }
  }

  /* ── Fetch a single feed URL ── */
  async function fetchFeed(url) {
    // Try rss2json first
    try {
      const res  = await fetch(PROXY_URL(url), { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const json = await res.json();
        if (json.items && json.items.length > 0) return json.items;
      }
    } catch {}

    // Fallback: allorigins + manual XML parse
    try {
      const res  = await fetch(BACKUP_PROXY(url), { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const json = await res.json();
        const items = parseXML(json.contents || "");
        if (items.length > 0) return items;
      }
    } catch {}

    return [];
  }

  /* ── Fetch one category and cache it ── */
  async function fetchCategory(cat) {
    // Skip if already freshly cached
    if (getCached(cat.id)) return;

    let items = await fetchFeed(cat.primary);
    if (!items.length && cat.backup) {
      items = await fetchFeed(cat.backup);
    }

    if (items.length > 0) {
      setCache(cat.id, items.slice(0, 28));
      // Dispatch event so news.html can react if it's open
      window.dispatchEvent(new CustomEvent("360:newsCached", {
        detail: { id: cat.id, count: items.length }
      }));
    }
  }

  /* ── Schedule all fetches using idle time + stagger ── */
  function scheduleAll() {
    let delay = 0;

    CATEGORIES.forEach((cat, i) => {
      // First category: fetch immediately on idle
      // Subsequent: stagger by FETCH_DELAY each
      const waitMs = i === 0 ? 0 : i * FETCH_DELAY;

      if ("requestIdleCallback" in window) {
        // Use idle callback so we never block paint or interaction
        requestIdleCallback(() => {
          setTimeout(() => fetchCategory(cat), waitMs);
        }, { timeout: 10000 });
      } else {
        // Fallback for Safari: just use a plain timeout
        setTimeout(() => fetchCategory(cat), waitMs + 1000);
      }
    });
  }

  /* ── Auto-refresh: re-fetch stale caches every 5 min ── */
  function scheduleRefresh() {
    setInterval(() => {
      CATEGORIES.forEach((cat, i) => {
        setTimeout(() => {
          // Only re-fetch if cache is expired
          if (!getCached(cat.id)) fetchCategory(cat);
        }, i * FETCH_DELAY);
      });
    }, CACHE_TTL_MS);
  }

  /* ── Expose public API for news.html to read from ── */
  window.NewsCache = {
    get: getCached,
    categories: CATEGORIES,
    /** Force-refresh a specific category (called by news.html refresh btn) */
    refresh: async function (id) {
      const cat = CATEGORIES.find(c => c.id === id);
      if (!cat) return null;
      // Remove stale cache so fetchCategory doesn't skip it
      try { sessionStorage.removeItem(CACHE_PREFIX + id); } catch {}
      await fetchCategory(cat);
      return getCached(id);
    },
    /** Preload a specific category immediately (called when user hovers a tab) */
    preload: function (id) {
      const cat = CATEGORIES.find(c => c.id === id);
      if (cat && !getCached(id)) fetchCategory(cat);
    }
  };

  /* ── Init: wait for page to be interactive first ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      // Give the page 800ms to fully render before any background fetching
      setTimeout(scheduleAll, 800);
      scheduleRefresh();
    });
  } else {
    setTimeout(scheduleAll, 800);
    scheduleRefresh();
  }

})();
