/* ============================================================
   360 — MAIN.JS V2.2 (FIXED)
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
   PREFETCH — instant page loads on hover
   ============================================================ */
const prefetched = new Set();

function prefetchPage(href) {
  if (!href || href.startsWith("http") || href.startsWith("#") || prefetched.has(href)) return;
  prefetched.add(href);
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  link.as = "document";
  document.head.appendChild(link);
}

document.addEventListener("mouseover", e => {
  const navItem = e.target.closest(".nav-item[data-href]");
  if (navItem) prefetchPage(navItem.dataset.href);

  const anchor = e.target.closest("a[href]");
  if (anchor && !anchor.href.startsWith("mailto") && !anchor.href.startsWith("javascript")) {
    prefetchPage(anchor.getAttribute("href"));
  }
});

document.addEventListener("DOMContentLoaded", () => {
  $$(".nav-item[data-href]").forEach(item => {
    setTimeout(() => prefetchPage(item.dataset.href), 300);
  });
});

/* ============================================================
   AUTH SYSTEM + USER CHIP
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

if (authPopup) {
  authPopup.addEventListener("click", e => { if (e.target === authPopup) closeAuth(); });
}

if (authSignupBtn) {
  authSignupBtn.onclick = async () => {
    const email    = authEmail?.value.trim();
    const password = authPassword?.value.trim();
    if (!email || !password) { if (authError) authError.textContent = "Email and password required."; return; }
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (authError) authError.textContent = error ? error.message : "Check your email to confirm your account!";
  };
}

if (authLoginBtn) {
  authLoginBtn.onclick = async () => {
    const email    = authEmail?.value.trim();
    const password = authPassword?.value.trim();
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

if (signOutBtn) {
  signOutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    location.href = "/accounts.html?login&from=logout";
  };
}

/* ── User Chip ── */
function getInitials(name) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
}

function buildUserChip(user, profile) {
  document.querySelector(".user-chip")?.remove();

  const username  = profile?.username
    || user.user_metadata?.username
    || user.user_metadata?.full_name
    || user.email?.split("@")[0]
    || "User";

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;

  const chip = document.createElement("div");
  chip.className = "user-chip";
  chip.title = "Signed in as " + username;

  chip.innerHTML = `
    <div class="user-chip-avatar" id="chipAvatar">
      ${avatarUrl ? `<img src="${avatarUrl}" alt="${username}" onerror="this.remove()" />` : getInitials(username)}
    </div>
    <span class="user-chip-label">@${username}</span>
    <div class="user-chip-dropdown">
      <div class="chip-drop-item" id="chipProfile">👤 My Account</div>
      <div class="chip-drop-item danger" id="chipSignOut">Sign Out</div>
    </div>
  `;

  chip.style.display = "flex";

  chip.addEventListener("click", e => {
    e.stopPropagation();
    chip.classList.toggle("open");
  });
  document.addEventListener("click", () => chip.classList.remove("open"));

  chip.querySelector("#chipProfile").onclick = e => {
    e.stopPropagation();
    location.href = "/accounts.html";
  };
  chip.querySelector("#chipSignOut").onclick = async e => {
    e.stopPropagation();
    await supabaseClient.auth.signOut();
    location.href = "/accounts.html?login&from=logout";
  };

  return chip;
}

async function updateAuthUI() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  const showBtns = !session;
  if (signInBtn)  signInBtn.style.display  = showBtns ? "inline-block" : "none";
  if (signUpBtn)  signUpBtn.style.display  = showBtns ? "inline-block" : "none";
  if (signOutBtn) signOutBtn.style.display = "none";

  if (session) {
    let profile = null;
    try {
      const { data } = await supabaseClient
        .from("profiles")
        .select("username,avatar_url")
        .eq("id", session.user.id)
        .single();
      profile = data;
    } catch {}

    const authRight = $(".auth-top-right");
    if (authRight) {
      const chip = buildUserChip(session.user, profile);
      authRight.appendChild(chip);
    }
  } else {
    document.querySelector(".user-chip")?.remove();
  }
}
updateAuthUI();

supabaseClient.auth.onAuthStateChange(() => updateAuthUI());

/* ============================================================
   SIDEBAR — open/close
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
  if (sidebar) {
    sidebar.querySelectorAll(".nav-item").forEach(item => {
      item.style.animation = "none";
    });
  }
  updateOverlay();
}

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", e => {
    e.stopPropagation();
    if (sidebar?.classList.contains("open")) {
      closeSidebar();
    } else {
      if (sidebar) {
        sidebar.querySelectorAll(".nav-item").forEach(item => {
          item.style.animation = "";
        });
      }
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
  if (
    !e.target.closest(".sidebar") &&
    !e.target.closest(".settings-panel") &&
    !e.target.closest(".sidebar-toggle") &&
    !e.target.closest("#settingsBtn")
  ) {
    closeSidebar();
    settingsPanel?.classList.remove("open");
    updateOverlay();
  }
});

/* ── Nav item click + RIPPLE ── */
// NOTE: Use querySelectorAll directly here — do NOT redeclare $$
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", e => {
    e.stopPropagation();

    // Ripple effect
    const rect = item.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const rip = document.createElement("span");
    rip.className = "nav-ripple";
    Object.assign(rip.style, {
      width: size + "px", height: size + "px",
      left: x + "px", top: y + "px",
    });
    item.appendChild(rip);
    rip.addEventListener("animationend", () => rip.remove());

    const href = item.dataset.href;
    if (href) {
      setTimeout(() => { window.location.href = href; }, 180);
    }
    closeSidebar();
  });
});

/* ============================================================
   NAV ACTIVE STATE
   ============================================================ */
(function markActiveNav() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll(".nav-item[data-href]").forEach(item => {
    let href = item.dataset.href || "";
    // Normalize: strip leading "../" and ensure leading "/"
    href = "/" + href.replace(/^\/+/, "").replace(/^\.\.\//, "");
    if (href === "/" && (path === "/" || path === "/index.html")) {
      item.classList.add("active");
    } else if (href !== "/" && path.startsWith(href)) {
      item.classList.add("active");
    }
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
  const left  = activeRect.left - tabsRect.left;
  const width = activeRect.width;
  let styleTag = document.getElementById("_tab_slider_style");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "_tab_slider_style";
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = `.ac-tabs::before { left: ${left}px !important; width: ${width}px !important; }`;
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
  const x      = e.clientX - rect.left - size / 2;
  const y      = e.clientY - rect.top  - size / 2;
  const ripple = document.createElement("span");
  ripple.className = "ripple-fx";

  Object.assign(ripple.style, {
    position:      "absolute",
    width:         size + "px",
    height:        size + "px",
    left:          x + "px",
    top:           y + "px",
    borderRadius:  "50%",
    background:    "rgba(255,255,255,0.28)",
    transform:     "scale(0)",
    opacity:       "1",
    pointerEvents: "none",
    transition:    "transform 0.5s ease, opacity 0.5s ease"
  });

  const prevPos = getComputedStyle(target).position;
  if (prevPos === "static") target.style.position = "relative";
  target.style.overflow = "hidden";
  target.appendChild(ripple);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ripple.style.transform = "scale(2.5)";
      ripple.style.opacity   = "0";
    });
  });

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

/* ============================================================
   READY LOG
   ============================================================ */
console.log("%c360 V2.2 FIXED — main.js loaded", "color:#4ade80;font-weight:bold;font-size:14px;");
