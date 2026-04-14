/* ============================================================
   360 — MAIN.JS V2.1 
   Fixes: Ripple, click-outside menus, OAuth SVG icons
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
   THEME SYSTEM
   ============================================================ */
$$(".swatch").forEach(swatch => {
  swatch.onclick = e => {
    e.stopPropagation();
    const theme = swatch.dataset.theme;
    body.classList.forEach(cls => {
      if (cls.startsWith("theme-")) body.classList.remove(cls);
    });
    body.classList.add("theme-" + theme);
    localStorage.setItem("theme", theme);
    $$(".swatch").forEach(s => s.classList.remove("active"));
    swatch.classList.add("active");
  };
});

(function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (!saved) return;
  body.classList.add("theme-" + saved);
  const swatch = $(`.swatch[data-theme="${saved}"]`);
  if (swatch) swatch.classList.add("active");
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

const bgUpload = $("#bgUpload");
if (bgUpload) {
  bgUpload.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyBackground(reader.result);
    reader.readAsDataURL(file);
  });
}

const bgUrlBtn = $("#bgUrlBtn");
if (bgUrlBtn) {
  bgUrlBtn.onclick = () => {
    const url = $("#bgUrlInput")?.value.trim();
    if (url) applyBackground(url);
  };
}

const bgResetBtn = $("#bgResetBtn");
if (bgResetBtn) {
  bgResetBtn.onclick = () => {
    localStorage.removeItem("customBG");
    body.style.backgroundImage = "";
  };
}

/* ============================================================
   RIPPLE EFFECT — FIXED
   Double rAF ensures transition fires correctly.
   Cleans up after itself via transitionend.
   ============================================================ */
document.addEventListener("click", e => {
  const target = e.target.closest(
    "[data-ripple], button, .nav-item, .swatch, .auth-btn"
  );
  if (!target) return;
  if (target.matches("input, textarea, select, .overlay, .auth-popup")) return;

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
    background:    "rgba(255,255,255,0.3)",
    transform:     "scale(0)",
    opacity:       "1",
    pointerEvents: "none",
    transition:    "transform 0.5s ease, opacity 0.5s ease"
  });

  const prevPosition = getComputedStyle(target).position;
  if (prevPosition === "static") target.style.position = "relative";
  target.style.overflow = "hidden";
  target.appendChild(ripple);

  /* Double rAF — ensures browser paints scale(0) before animating */
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
      if (prevPosition === "static") target.style.position = "";
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
    if (["button", "a"].includes(tag) || e.target.classList.contains("nav-item")) {
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
console.log("%c360 V2.1 — main.js loaded (cursor handled by cursor.js)", "color:#4ade80;font-weight:bold;font-size:14px;");
