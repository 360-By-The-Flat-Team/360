/* ============================================================
   360 — MAIN.JS V2.3 (AUTH + CHAT + GRAVATAR)
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const body = document.body;
const ROUTE_ALIASES = new Set([
  "accounts","ai","apps","chat","find","games","mail","new-tab","news",
  "privacypolicy","settings","spaceGlider","stocks","tos","translator",
  "url-shortener","weather","zone","360vids","404"
]);

function normalizeInternalPath(rawPath = "/") {
  if (!rawPath) return "/";
  let path = String(rawPath).trim();
  if (path === "." || path === "./" || path === ".." || path === "../") return "/index.html";

  if (/^https?:\/\//i.test(path)) {
    try { path = new URL(path).pathname; } catch (_) { return "/"; }
  } else if (!path.startsWith("/")) {
    try { path = new URL(path, window.location.href).pathname; } catch (_) {}
  }
  if (!path.startsWith("/")) path = "/" + path;
  path = path.replace(/\/{2,}/g, "/");
  if (path === "/") return "/index.html";

  const clean = path.replace(/\/+$/, "");
  if (clean === "/index.html") return "/index.html";

  const dotHtml = clean.match(/^\/assets\/html\/([^/]+)\.html$/i);
  if (dotHtml) return `/assets/html/${dotHtml[1]}`;

  const rootHtml = clean.match(/^\/([^/]+)\.html$/i);
  if (rootHtml && ROUTE_ALIASES.has(rootHtml[1])) return `/assets/html/${rootHtml[1]}`;

  const shortAssets = clean.match(/^\/assets\/([^/]+)$/i);
  if (shortAssets && ROUTE_ALIASES.has(shortAssets[1])) return `/assets/html/${shortAssets[1]}`;
  const shortAssetsIndex = clean.match(/^\/assets\/([^/]+)\/index\.html$/i);
  if (shortAssetsIndex && ROUTE_ALIASES.has(shortAssetsIndex[1])) return `/assets/html/${shortAssetsIndex[1]}`;

  const rootSlug = clean.match(/^\/([^/]+)$/i);
  if (rootSlug && ROUTE_ALIASES.has(rootSlug[1])) return `/assets/html/${rootSlug[1]}`;

  return clean || "/";
}

(function applyCanonicalRoute() {
  const normalized = normalizeInternalPath(window.location.pathname || "/");
  const current = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  if (normalized !== current) {
    if (normalized.startsWith("/assets/html/") && current.startsWith("/assets/html/") && current.endsWith(".html")) {
      history.replaceState(null, "", normalized + (window.location.search || "") + (window.location.hash || ""));
    } else {
      window.location.replace(normalized + (window.location.search || "") + (window.location.hash || ""));
    }
  }
})();

/* ============================================================
   SUPABASE CLIENT
   ============================================================ */
const supabaseClient = (window.supabase && typeof window.supabase.createClient === "function")
  ? window.supabase.createClient(
      "https://wiswfpfsjiowtrdyqpxy.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpc3dmcGZzamlvd3RyZHlxcHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzg4OTcsImV4cCI6MjA4MzkxNDg5N30.z_4FtM2c8UwgrRlafPYjolQuod4IoHQats95XHio1zM"
    )
  : {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => {},
        signUp: async () => ({ error: { message: "Auth unavailable." } }),
        signInWithPassword: async () => ({ error: { message: "Auth unavailable." } }),
        signInWithOAuth: async () => ({ error: { message: "Auth unavailable." } }),
        signOut: async () => ({})
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null })
          })
        })
      })
    };

// expose for chat.js (fixes chat history + auth)
window.sb = supabaseClient;

/* ============================================================
   AUTH SYSTEM
   ============================================================ */

const authPopup    = $("#auth-popup");
const authEmail    = $("#auth-email");
const authPassword = $("#auth-password");
const authLoginBtn = $("#auth-login-btn");
const authSignupBtn= $("#auth-signup-btn");
const authCloseBtn = $("#auth-close-btn");
const authError    = $("#auth-error");
const signInBtn    = $("#signInBtn");
const signUpBtn    = $("#signUpBtn");
const signOutBtn   = $("#signOutBtn");

function openAuth()  { if (authPopup) authPopup.classList.remove("hidden"); }
function closeAuth() {
  if (authPopup) authPopup.classList.add("hidden");
  if (authError) authError.textContent = "";
}

if (signInBtn) signInBtn.onclick = () => location.href = "/accounts.html?signin";
if (signUpBtn) signUpBtn.onclick = () => location.href = "/accounts.html?signup";
if (authCloseBtn) authCloseBtn.onclick = closeAuth;

/* Click backdrop to close auth popup */
if (authPopup) {
  authPopup.addEventListener("click", e => {
    if (e.target === authPopup) closeAuth();
  });
}

if (authSignupBtn) {
  authSignupBtn.onclick = async () => {
    const email    = authEmail?.value.trim();
    const password = authPassword?.value.trim();
    if (!email || !password) { authError.textContent = "Email and password required."; return; }
    const { error } = await supabaseClient.auth.signUp({ email, password });
    authError.textContent = error ? error.message : "Check your email to confirm your account!";
  };
}

if (authLoginBtn) {
  authLoginBtn.onclick = async () => {
    const email    = authEmail?.value.trim();
    const password = authPassword?.value.trim();
    if (!email || !password) { authError.textContent = "Email and password required."; return; }
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) authError.textContent = error.message;
    else { closeAuth(); updateAuthUI(); }
  };
}

const githubBtn = $("#github-login");
if (githubBtn) {
  githubBtn.onclick = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin }
    });
    if (error) console.error("GitHub OAuth error:", error.message);
  };
}

const googleBtn = $("#google-login");
if (googleBtn) {
  googleBtn.onclick = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) console.error("Google OAuth error:", error.message);
  };
}

if (signOutBtn) {
  signOutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    location.href = "/accounts.html?login&from=logout";
  };
}

async function updateAuthUI() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (signInBtn)  signInBtn.style.display  = session ? "none"         : "inline-block";
  if (signUpBtn)  signUpBtn.style.display  = session ? "none"         : "inline-block";
  if (signOutBtn) signOutBtn.style.display = session ? "inline-block" : "none";
}
updateAuthUI();

/* ── Helpers ── */
function getInitials(name) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return p[0][0].toUpperCase();
}

/* ── tiny MD5 (for Gravatar) ── */
function md5(str) {
  function L(x, c) { return (x << c) | (x >>> (32 - c)); }
  function K(x, y, z) { return (x & y) | (~x & z); }
  function G(x, y, z) { return (x & z) | (y & ~z); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | ~z); }
  function FF(a, b, c, d, x, s, t) { return (b + L((a + K(b, c, d) + x + t) | 0, s)) | 0; }
  function GG(a, b, c, d, x, s, t) { return (b + L((a + G(b, c, d) + x + t) | 0, s)) | 0; }
  function HH(a, b, c, d, x, s, t) { return (b + L((a + H(b, c, d) + x + t) | 0, s)) | 0; }
  function II(a, b, c, d, x, s, t) { return (b + L((a + I(b, c, d) + x + t) | 0, s)) | 0; }

  function toBlocks(str) {
    const n = (((str.length + 8) >> 6) + 1) * 16;
    const blocks = new Array(n).fill(0);
    for (let i = 0; i < str.length; i++) {
      blocks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    }
    blocks[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
    blocks[n - 2] = str.length * 8;
    return blocks;
  }

  const x = toBlocks(unescape(encodeURIComponent(str)));
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;

    a = FF(a, b, c, d, x[i+0], 7, -680876936);
    d = FF(d, a, b, c, x[i+1], 12, -389564586);
    c = FF(c, d, a, b, x[i+2], 17, 606105819);
    b = FF(b, c, d, a, x[i+3], 22, -1044525330);
    a = FF(a, b, c, d, x[i+4], 7, -176418897);
    d = FF(d, a, b, c, x[i+5], 12, 1200080426);
    c = FF(c, d, a, b, x[i+6], 17, -1473231341);
    b = FF(b, c, d, a, x[i+7], 22, -45705983);
    a = FF(a, b, c, d, x[i+8], 7, 1770035416);
    d = FF(d, a, b, c, x[i+9], 12, -1958414417);
    c = FF(c, d, a, b, x[i+10], 17, -42063);
    b = FF(b, c, d, a, x[i+11], 22, -1990404162);
    a = FF(a, b, c, d, x[i+12], 7, 1804603682);
    d = FF(d, a, b, c, x[i+13], 12, -40341101);
    c = FF(c, d, a, b, x[i+14], 17, -1502002290);
    b = FF(b, c, d, a, x[i+15], 22, 1236535329);

    a = GG(a, b, c, d, x[i+1], 5, -165796510);
    d = GG(d, a, b, c, x[i+6], 9, -1069501632);
    c = GG(c, d, a, b, x[i+11], 14, 643717713);
    b = GG(b, c, d, a, x[i+0], 20, -373897302);
    a = GG(a, b, c, d, x[i+5], 5, -701558691);
    d = GG(d, a, b, c, x[i+10], 9, 38016083);
    c = GG(c, d, a, b, x[i+15], 14, -660478335);
    b = GG(b, c, d, a, x[i+4], 20, -405537848);
    a = GG(a, b, c, d, x[i+9], 5, 568446438);
    d = GG(d, a, b, c, x[i+14], 9, -1019803690);
    c = GG(c, d, a, b, x[i+3], 14, -187363961);
    b = GG(b, c, d, a, x[i+8], 20, 1163531501);
    a = GG(a, b, c, d, x[i+13], 5, -1444681467);
    d = GG(d, a, b, c, x[i+2], 9, -51403784);
    c = GG(c, d, a, b, x[i+7], 14, 1735328473);
    b = GG(b, c, d, a, x[i+12], 20, -1926607734);

    a = HH(a, b, c, d, x[i+5], 4, -378558);
    d = HH(d, a, b, c, x[i+8], 11, -2022574463);
    c = HH(c, d, a, b, x[i+11], 16, 1839030562);
    b = HH(b, c, d, a, x[i+14], 23, -35309556);
    a = HH(a, b, c, d, x[i+1], 4, -1530992060);
    d = HH(d, a, b, c, x[i+4], 11, 1272893353);
    c = HH(c, d, a, b, x[i+7], 16, -155497632);
    b = HH(b, c, d, a, x[i+10], 23, -1094730640);
    a = HH(a, b, c, d, x[i+13], 4, 681279174);
    d = HH(d, a, b, c, x[i+0], 11, -358537222);
    c = HH(c, d, a, b, x[i+3], 16, -722521979);
    b = HH(b, c, d, a, x[i+6], 23, 76029189);
    a = HH(a, b, c, d, x[i+9], 4, -640364487);
    d = HH(d, a, b, c, x[i+12], 11, -421815835);
    c = HH(c, d, a, b, x[i+15], 16, 530742520);
    b = HH(b, c, d, a, x[i+2], 23, -995338651);

    a = II(a, b, c, d, x[i+0], 6, -198630844);
    d = II(d, a, b, c, x[i+7], 10, 1126891415);
    c = II(c, d, a, b, x[i+14], 15, -1416354905);
    b = II(b, c, d, a, x[i+5], 21, -57434055);
    a = II(a, b, c, d, x[i+12], 6, 1700485571);
    d = II(d, a, b, c, x[i+3], 10, -1894986606);
    c = II(c, d, a, b, x[i+10], 15, -1051523);
    b = II(b, c, d, a, x[i+1], 21, -2054922799);
    a = II(a, b, c, d, x[i+8], 6, 1873313359);
    d = II(d, a, b, c, x[i+15], 10, -30611744);
    c = II(c, d, a, b, x[i+6], 15, -1560198380);
    b = II(b, c, d, a, x[i+13], 21, 1309151649);
    a = II(a, b, c, d, x[i+4], 6, -145523070);
    d = II(d, a, b, c, x[i+11], 10, -1120210379);
    c = II(c, d, a, b, x[i+2], 15, 718787259);
    b = II(b, c, d, a, x[i+9], 21, -343485551);

    a = (a + oa) | 0;
    b = (b + ob) | 0;
    c = (c + oc) | 0;
    d = (d + od) | 0;
  }

  function toHex(x) {
    let s = "", v;
    for (let i = 0; i < 4; i++) {
      v = (x >> (i * 8)) & 255;
      s += ("0" + v.toString(16)).slice(-2);
    }
    return s;
  }
  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

/* ── Gravatar link helper ── */
async function linkGravatarForUser(user) {
  if (!user?.email) return;
  const email = user.email.trim().toLowerCase();
  const hash = md5(email);
  const url = `https://www.gravatar.com/avatar/${hash}?s=256&d=identicon`;
  try {
    await supabaseClient.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  } catch (e) {
    console.warn("Gravatar link failed:", e);
  }
  return url;
}

/* ── Build user chip ── */
function buildUserChip(user, profile) {
  document.querySelector(".user-chip")?.remove();

  const username = profile?.username
    || user.user_metadata?.username
    || user.user_metadata?.full_name
    || user.email?.split("@")[0]
    || "User";
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;
  const isDark = body.classList.contains("dark");

  const chip = document.createElement("div");
  chip.className = "user-chip";
  chip.style.cssText = `
    display:flex;align-items:center;gap:8px;
    padding:5px 12px 5px 5px;border-radius:999px;
    background:${isDark ? "rgba(9,9,20,0.97)" : "rgba(255,255,255,0.9)"};
    backdrop-filter:blur(12px);
    border:1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.4)"};
    cursor:pointer;position:relative;z-index:50;
    font-size:13px;font-weight:600;white-space:nowrap;max-width:220px;
    box-shadow:0 2px 12px rgba(0,0,0,0.1);
  `;

  /* Avatar */
  const av = document.createElement("div");
  av.style.cssText = `
    width:28px;height:28px;border-radius:50%;flex-shrink:0;overflow:hidden;
    background:linear-gradient(135deg,var(--a,#3b82f6),var(--a2,#06b6d4));
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:800;color:#050816;
  `;
  if (avatarUrl) {
    const img = document.createElement("img");
    img.src = avatarUrl; img.alt = username;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    img.onerror = () => { img.remove(); av.textContent = getInitials(username); };
    av.appendChild(img);
  } else {
    av.textContent = getInitials(username);
  }

  /* Label */
  const lbl = document.createElement("span");
  lbl.textContent = "@" + username;
  lbl.style.cssText = `
    color:${isDark ? "#e7e7ea" : "#111827"};
    overflow:hidden;text-overflow:ellipsis;max-width:110px;
  `;

  /* Caret */
  const caret = document.createElement("span");
  caret.textContent = "▾";
  caret.style.cssText = "font-size:10px;opacity:0.5;";

  /* Dropdown */
  const dd = document.createElement("div");
  dd.style.cssText = `
    display:none;position:absolute;top:calc(100% + 8px);right:0;
    min-width:190px;border-radius:12px;overflow:hidden;z-index:200;
    background:${isDark ? "rgba(9,9,20,0.98)" : "rgba(255,255,255,0.98)"};
    border:1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"};
    box-shadow:0 8px 32px rgba(0,0,0,0.18);
  `;

  const makeItem = (text, danger = false) => {
    const item = document.createElement("div");
    item.textContent = text;
    item.style.cssText = `
      padding:11px 16px;font-size:13px;font-weight:500;cursor:pointer;
      color:${danger ? "#ef4444" : (isDark ? "#e7e7ea" : "#111827")};
      transition:background 0.15s;
    `;
    item.addEventListener("mouseenter", () => item.style.background = danger ? "rgba(239,68,68,0.08)" : "rgba(148,163,184,0.15)");
    item.addEventListener("mouseleave", () => item.style.background = "");
    return item;
  };

  const signedInAs = makeItem("Signed in as @" + username);
  signedInAs.style.cssText += "font-size:11px;opacity:0.5;cursor:default;border-bottom:1px solid rgba(148,163,184,0.2);";
  signedInAs.addEventListener("mouseenter", () => signedInAs.style.background = "");

  const profileItem = makeItem("👤 My Account");
  profileItem.onclick = e => { e.stopPropagation(); location.href = "/assets/html/accounts?profile"; };

  const gravatarItem = makeItem("🔗 Link Gravatar");
  gravatarItem.onclick = async e => {
    e.stopPropagation();
    gravatarItem.textContent = "Linking…";
    const url = await linkGravatarForUser(user);
    if (url) {
      // refresh chip avatar immediately
      av.innerHTML = "";
      const img = document.createElement("img");
      img.src = url; img.alt = username;
      img.style.cssText = "width:100%;height:100%;object-fit:cover;";
      img.onerror = () => { img.remove(); av.textContent = getInitials(username); };
      av.appendChild(img);
      gravatarItem.textContent = "Gravatar linked";
    } else {
      gravatarItem.textContent = "Link Gravatar";
    }
  };

  const signOutItem = makeItem("Sign Out", true);
  signOutItem.onclick = async e => {
    e.stopPropagation();
    signOutItem.textContent = "Signing out…";
    await supabaseClient.auth.signOut();
    location.href = "/assets/html/accounts?signin&from=logout";
  };

  dd.appendChild(signedInAs);
  dd.appendChild(profileItem);
  dd.appendChild(gravatarItem);
  dd.appendChild(signOutItem);

  chip.appendChild(av);
  chip.appendChild(lbl);
  chip.appendChild(caret);
  chip.appendChild(dd);

  let open = false;
  chip.addEventListener("click", e => {
    e.stopPropagation();
    open = !open;
    dd.style.display = open ? "block" : "none";
    caret.textContent = open ? "▴" : "▾";
  });
  document.addEventListener("click", () => {
    open = false; dd.style.display = "none"; caret.textContent = "▾";
  });

  return chip;
}

/* ── Update auth UI ── */
async function updateAuthUI() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (signOutBtn) signOutBtn.style.display = "none";
    document.querySelector(".user-chip")?.remove();

    if (session) {
      if (signInBtn) signInBtn.style.display = "none";
      if (signUpBtn) signUpBtn.style.display = "none";

      let profile = null;
      try {
        const { data } = await supabaseClient
          .from("profiles").select("username,avatar_url").eq("id", session.user.id).single();
        profile = data;
      } catch (_) {}

      const chip = buildUserChip(session.user, profile);
      const authRight = $(".auth-top-right");
      if (authRight) authRight.appendChild(chip);

    } else {
      if (signInBtn) { signInBtn.style.display = "inline-block"; }
      if (signUpBtn) { signUpBtn.style.display = "inline-block"; }
    }
  } catch (err) {
    console.warn("updateAuthUI error:", err);
  }
}

updateAuthUI();
supabaseClient.auth.onAuthStateChange(() => updateAuthUI());

/* ============================================================
   SIDEBAR
   ============================================================ */
const sidebar       = $(".sidebar");
const settingsPanel = $(".settings-panel");
const overlay       = $(".overlay");
const sidebarToggle = $(".sidebar-toggle");
const settingsBtn   = $("#settingsBtn");

function updateOverlay() {
  const anyOpen = sidebar?.classList.contains("open") || settingsPanel?.classList.contains("open");
  overlay?.classList.toggle("active", !!anyOpen);
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  sidebar?.classList.add("sidebar-closed");
  updateOverlay();
}

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", e => {
    e.stopPropagation();
    if (sidebar?.classList.contains("open")) {
      closeSidebar();
    } else {
      sidebar?.classList.remove("sidebar-closed");
      sidebar?.classList.add("open");
      updateOverlay();
    }
  });
}

if (settingsBtn) {
  settingsBtn.addEventListener("click", e => {
    e.stopPropagation();
    settingsPanel?.classList.toggle("open");
    updateOverlay();
  });
}

if (overlay) {
  overlay.addEventListener("click", () => {
    closeSidebar();
    settingsPanel?.classList.remove("open");
    updateOverlay();
  });
}

document.addEventListener("click", e => {
  if (!e.target.closest(".sidebar") && !e.target.closest(".settings-panel") &&
      !e.target.closest(".sidebar-toggle") && !e.target.closest("#settingsBtn")) {
    closeSidebar();
    settingsPanel?.classList.remove("open");
    updateOverlay();
  }
});

/* ── Nav item click + ripple ── */
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", e => {
    e.stopPropagation();
    const rect = item.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const rip = document.createElement("span");
    rip.className = "nav-ripple";
    Object.assign(rip.style, {
      width: size + "px", height: size + "px",
      left: (e.clientX - rect.left - size / 2) + "px",
      top:  (e.clientY - rect.top  - size / 2) + "px",
    });
    item.appendChild(rip);
    rip.addEventListener("animationend", () => rip.remove());
    const href = item.dataset.href;
    if (href) {
      const target = normalizeInternalPath(href);
      setTimeout(() => { window.location.href = target; }, 180);
    }
    closeSidebar();
  });
});

/* ============================================================
   NAV ACTIVE STATE
   ============================================================ */
(function markActiveNav() {
  const path = normalizeInternalPath(location.pathname || "/");
  document.querySelectorAll(".nav-item[data-href]").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".nav-item[data-href]").forEach(item => {
    const href = normalizeInternalPath(item.dataset.href || "/");
    if (href === path) item.classList.add("active");
  });
})();

/* ============================================================
   THEME SYSTEM
   ============================================================ */
document.querySelectorAll(".swatch").forEach(swatch => {
  swatch.onclick = e => {
    e.stopPropagation();
    const theme = swatch.dataset.theme;
    body.classList.forEach(cls => { if (cls.startsWith("theme-")) body.classList.remove(cls); });
    body.classList.add("theme-" + theme);
    localStorage.setItem("theme", theme);
    document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
    swatch.classList.add("active");
  };
});

(function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (!saved) return;
  body.classList.add("theme-" + saved);
  const sw = document.querySelector(`.swatch[data-theme="${saved}"]`);
  if (sw) sw.classList.add("active");
})();

/* ============================================================
   DARK MODE
   ============================================================ */
const darkToggle = $("#darkToggle");

(function loadDarkMode() {
  const saved = localStorage.getItem("darkMode") === "true";
  body.classList.toggle("dark", saved);
  if (darkToggle) darkToggle.checked = saved;
})();

if (darkToggle) {
  darkToggle.onchange = e => {
    const v = e.target.checked;
    body.classList.toggle("dark", v);
    localStorage.setItem("darkMode", v);
  };
}

/* ============================================================
   BACKGROUND ENGINE
   ============================================================ */
function applyBackground(url) {
  body.style.backgroundImage     = `url('${url}')`;
  body.style.backgroundSize      = "cover";
  body.style.backgroundPosition  = "center";
  body.style.backgroundAttachment= "fixed";
  localStorage.setItem("customBG", url);
}

(function loadBackground() {
  const saved = localStorage.getItem("customBG");
  if (saved) applyBackground(saved);
})();

const bgUpload   = $("#bgUpload");
const bgUrlBtn   = $("#bgUrlBtn");
const bgResetBtn = $("#bgResetBtn");

if (bgUpload) {
  bgUpload.addEventListener("change", e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyBackground(reader.result);
    reader.readAsDataURL(file);
  });
}
if (bgUrlBtn) {
  bgUrlBtn.onclick = () => {
    const url = $("#bgUrlInput")?.value.trim();
    if (url) applyBackground(url);
  };
}
if (bgResetBtn) {
  bgResetBtn.onclick = () => {
    localStorage.removeItem("customBG");
    body.style.backgroundImage = "";
  };
}

/* ============================================================
   AUTH TAB SLIDING INDICATOR
   ============================================================ */
function syncTabSlider(tabsEl) {
  if (!tabsEl) return;
  const active = tabsEl.querySelector(".ac-tab.active");
  if (!active) return;
  const tabsRect   = tabsEl.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  let styleTag = document.getElementById("_tab_slider_style");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "_tab_slider_style";
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = `.ac-tabs::before { left: ${activeRect.left - tabsRect.left}px !important; width: ${activeRect.width}px !important; }`;
}

document.addEventListener("click", e => {
  const tab = e.target.closest(".ac-tab");
  if (!tab) return;
  const tabs = tab.closest(".ac-tabs");
  if (!tabs) return;
  requestAnimationFrame(() => syncTabSlider(tabs));
});

document.addEventListener("DOMContentLoaded", () => {
  syncTabSlider($(".ac-tabs"));
});

/* ============================================================
   RIPPLE EFFECT (global buttons)
   ============================================================ */
document.addEventListener("click", e => {
  const target = e.target.closest("[data-ripple], button, .swatch, .auth-btn");
  if (!target) return;
  if (target.matches("input, textarea, select, .overlay, .auth-popup, .nav-item")) return;

  const rect   = target.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "ripple-fx";
  Object.assign(ripple.style, {
    position: "absolute",
    width: size + "px", height: size + "px",
    left: (e.clientX - rect.left - size / 2) + "px",
    top:  (e.clientY - rect.top  - size / 2) + "px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.28)",
    transform: "scale(0)", opacity: "1",
    pointerEvents: "none",
    transition: "transform 0.5s ease, opacity 0.5s ease"
  });

  const prevPos = getComputedStyle(target).position;
  if (prevPos === "static") target.style.position = "relative";
  target.style.overflow = "hidden";
  target.appendChild(ripple);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    ripple.style.transform = "scale(2.5)";
    ripple.style.opacity   = "0";
  }));

  ripple.addEventListener("transitionend", () => {
    ripple.remove();
    if (!target.querySelector(".ripple-fx")) {
      target.style.overflow = "";
      if (prevPos === "static") target.style.position = "";
    }
  }, { once: true });
});

/* ============================================================
   CLICK SOUND
   ============================================================ */
const clickSound = $("#clickSound");
if (clickSound) {
  document.addEventListener("click", e => {
    const tag = e.target.tagName.toLowerCase();
    if (["button","a"].includes(tag) || e.target.classList.contains("nav-item")) {
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {});
    }
  });
}

/* ============================================================
   PWA INSTALL
   ============================================================ */
let deferredPrompt;
const installBtn = $("#installBtn");
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = "block";
});
if (installBtn) installBtn.onclick = () => deferredPrompt?.prompt();

console.log("%c360 V2.3 — main.js loaded", "color:#4ade80;font-weight:bold;font-size:14px;");
