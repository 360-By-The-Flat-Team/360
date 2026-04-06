/* ============================================================
   360 — MAIN.JS V2.2 (AUTH FIXED)
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const body = document.body;

/* ============================================================
   SUPABASE CLIENT
   ============================================================ */
const supabaseClient = supabase.createClient(
  "https://wiswfpfsjiowtrdyqpxy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpc3dmcGZzamlvd3RyZHlxcHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzg4OTcsImV4cCI6MjA4MzkxNDg5N30.z_4FtM2c8UwgrRlafPYjolQuod4IoHQats95XHio1zM"
);

/* ============================================================
   PREFETCH
   ============================================================ */
const prefetched = new Set();
function prefetchPage(href) {
  if (!href || href.startsWith("http") || href.startsWith("#") || prefetched.has(href)) return;
  prefetched.add(href);
  const link = document.createElement("link");
  link.rel = "prefetch"; link.href = href; link.as = "document";
  document.head.appendChild(link);
}
document.addEventListener("mouseover", e => {
  const navItem = e.target.closest(".nav-item[data-href]");
  if (navItem) prefetchPage(navItem.dataset.href);
  const anchor = e.target.closest("a[href]");
  if (anchor && !anchor.href.startsWith("mailto") && !anchor.href.startsWith("javascript"))
    prefetchPage(anchor.getAttribute("href"));
});
document.addEventListener("DOMContentLoaded", () => {
  const items = [...$$(".nav-item[data-href]")];
  items.forEach((item, i) => setTimeout(() => prefetchPage(item.dataset.href), 1000 + i * 400));
});

/* ============================================================
   AUTH SYSTEM
   ============================================================ */

// These buttons exist on every page in auth-top-right
const signInBtn  = $("#signInBtn");
const signUpBtn  = $("#signUpBtn");
const signOutBtn = $("#signOutBtn");

// Old inline auth-popup (legacy, kept for compat but hidden by default)
const authPopup    = $("#auth-popup");
const authEmail    = $("#auth-email");
const authPassword = $("#auth-password");
const authLoginBtn = $("#auth-login-btn");
const authSignupBtn= $("#auth-signup-btn");
const authCloseBtn = $("#auth-close-btn");
const authError    = $("#auth-error");

function openAuth()  { if (authPopup) authPopup.classList.remove("hidden"); }
function closeAuth() {
  if (authPopup) authPopup.classList.add("hidden");
  if (authError) authError.textContent = "";
}

// Redirect sign in/up buttons to accounts page
if (signInBtn)  signInBtn.onclick  = () => location.href = "/accounts.html?signin";
if (signUpBtn)  signUpBtn.onclick  = () => location.href = "/accounts.html?signup";
if (signOutBtn) signOutBtn.style.display = "none";

// Close popup on backdrop click
if (authPopup) authPopup.addEventListener("click", e => { if (e.target === authPopup) closeAuth(); });
if (authCloseBtn) authCloseBtn.onclick = closeAuth;

// Legacy inline auth handlers (used on pages that still have the old popup)
if (authSignupBtn) {
  authSignupBtn.onclick = async () => {
    const email = authEmail?.value.trim(), password = authPassword?.value.trim();
    if (!email || !password) { if (authError) authError.textContent = "Email and password required."; return; }
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (authError) authError.textContent = error ? error.message : "Check your email to confirm!";
  };
}

if (authLoginBtn) {
  authLoginBtn.onclick = async () => {
    const email = authEmail?.value.trim(), password = authPassword?.value.trim();
    if (!email || !password) { if (authError) authError.textContent = "Email and password required."; return; }
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { if (authError) authError.textContent = error.message; }
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
    if (error) console.error("GitHub OAuth:", error.message);
  };
}
const googleBtn = $("#google-login");
if (googleBtn) {
  googleBtn.onclick = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) console.error("Google OAuth:", error.message);
  };
}

/* ── Helpers ── */
function getInitials(name) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
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
    min-width:175px;border-radius:12px;overflow:hidden;z-index:200;
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
  profileItem.onclick = e => { e.stopPropagation(); location.href = "/accounts.html"; };

  const signOutItem = makeItem("Sign Out", true);
  signOutItem.onclick = async e => {
    e.stopPropagation();
    signOutItem.textContent = "Signing out…";
    await supabaseClient.auth.signOut();
    location.href = "/accounts.html?login&from=logout";
  };

  dd.appendChild(signedInAs);
  dd.appendChild(profileItem);
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
  if (sidebar) sidebar.querySelectorAll(".nav-item").forEach(i => { i.style.animation = "none"; });
  updateOverlay();
}

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", e => {
    e.stopPropagation();
    if (sidebar?.classList.contains("open")) {
      closeSidebar();
    } else {
      if (sidebar) sidebar.querySelectorAll(".nav-item").forEach(i => { i.style.animation = ""; });
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
    if (href) setTimeout(() => { window.location.href = href; }, 180);
    closeSidebar();
  });
});

/* ============================================================
   NAV ACTIVE STATE
   ============================================================ */
(function markActiveNav() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll(".nav-item[data-href]").forEach(item => {
    let href = "/" + (item.dataset.href || "").replace(/^\/+/, "").replace(/^\.\.\//, "");
    if (href === "/" && (path === "/" || path === "/index.html")) item.classList.add("active");
    else if (href !== "/" && path.startsWith(href)) item.classList.add("active");
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

console.log("%c360 V2.2 — main.js loaded", "color:#4ade80;font-weight:bold;font-size:14px;");
