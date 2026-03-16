/* ============================================================
   360 — MAIN.JS
   Universal logic for all pages.
   Handles: Supabase, Auth, Sidebar, Settings, Theme,
            Dark Mode, Background, Cursor, Ripple, PWA
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
   AUTH SYSTEM (REAL SUPABASE — NOT LOCALSTORAGE)
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

if (signInBtn) signInBtn.onclick = openAuth;
if (signUpBtn) signUpBtn.onclick = openAuth;
if (authCloseBtn) authCloseBtn.onclick = closeAuth;

/* Email Signup */
if (authSignupBtn) {
  authSignupBtn.onclick = async () => {
    const email    = authEmail?.value.trim();
    const password = authPassword?.value.trim();
    if (!email || !password) { authError.textContent = "Email and password required."; return; }
    const { error } = await supabaseClient.auth.signUp({ email, password });
    authError.textContent = error ? error.message : "Check your email to confirm your account!";
  };
}

/* Email Login */
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

/* GitHub OAuth — FIXED (no skipBrowserRedirect) */
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

/* Google OAuth — FIXED (no skipBrowserRedirect) */
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

/* Sign Out */
if (signOutBtn) {
  signOutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    updateAuthUI();
  };
}

/* Update Auth UI based on real session */
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
const sidebar       = $("#sidebar");
const sidebarToggle = $("#sidebarToggle");
const overlay       = $("#overlay");
const settingsPanel = $("#settingsPanel");
const settingsBtn   = $("#settingsBtn");

if (sidebarToggle) {
  sidebarToggle.onclick = () => {
    sidebar?.classList.toggle("open");
    overlay?.classList.toggle("active");
  };
}

if (overlay) {
  overlay.onclick = () => {
    sidebar?.classList.remove("open");
    settingsPanel?.classList.remove("open");
    overlay.classList.remove("active");
  };
}

/* Nav items — multi-page routing */
$$(".nav-item").forEach(item => {
  item.onclick = () => {
    const href = item.dataset.href;
    if (href) window.location.href = href;
    sidebar?.classList.remove("open");
    overlay?.classList.remove("active");
  };
});

/* ============================================================
   SETTINGS PANEL
   ============================================================ */
if (settingsBtn) {
  settingsBtn.onclick = () => {
    settingsPanel?.classList.toggle("open");
    overlay?.classList.toggle("active");
  };
}

/* ============================================================
   THEME SYSTEM
   ============================================================ */
$$(".swatch").forEach(swatch => {
  swatch.onclick = () => {
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

/* Load saved theme */
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
  body.style.backgroundImage    = `url('${url}')`;
  body.style.backgroundSize     = "cover";
  body.style.backgroundPosition = "center";
  body.style.backgroundAttachment = "fixed";
  localStorage.setItem("customBG", url);
}

/* Load saved background */
(function loadBackground() {
  const saved = localStorage.getItem("customBG");
  if (saved) applyBackground(saved);
})();

/* File upload */
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

/* URL apply */
const bgUrlBtn = $("#bgUrlBtn");
if (bgUrlBtn) {
  bgUrlBtn.onclick = () => {
    const url = $("#bgUrlInput")?.value.trim();
    if (url) applyBackground(url);
  };
}

/* Reset */
const bgResetBtn = $("#bgResetBtn");
if (bgResetBtn) {
  bgResetBtn.onclick = () => {
    localStorage.removeItem("customBG");
    body.style.backgroundImage = "";
  };
}

/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
const dot   = $(".cursor-dot");
const trail = $(".cursor-trail");
let cx = 0, cy = 0;

document.addEventListener("mousemove", e => {
  cx = e.clientX;
  cy = e.clientY;
  if (dot)   { dot.style.left = cx + "px";   dot.style.top = cy + "px"; }
});

(function animateTrail() {
  if (trail) { trail.style.left = cx + "px"; trail.style.top = cy + "px"; }
  requestAnimationFrame(animateTrail);
})();

/* ============================================================
   RIPPLE EFFECT
   ============================================================ */
document.addEventListener("click", e => {
  const target = e.target.closest("[data-ripple]");
  if (!target) return;

  const rect   = target.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height);
  const x      = e.clientX - rect.left - size / 2;
  const y      = e.clientY - rect.top  - size / 2;
  const ripple = document.createElement("span");

  Object.assign(ripple.style, {
    position: "absolute", width: size + "px", height: size + "px",
    left: x + "px", top: y + "px", borderRadius: "50%",
    background: "rgba(255,255,255,0.35)", transform: "scale(0)",
    opacity: "1", pointerEvents: "none",
    transition: "transform 0.45s ease, opacity 0.45s ease"
  });

  target.style.position = "relative";
  target.style.overflow = "hidden";
  target.appendChild(ripple);

  requestAnimationFrame(() => {
    ripple.style.transform = "scale(2.5)";
    ripple.style.opacity   = "0";
  });

  setTimeout(() => ripple.remove(), 500);
});

/* ============================================================
   CLICK SOUND
   ============================================================ */
const clickSound = $("#clickSound");
if (clickSound) {
  document.addEventListener("click", e => {
    const tag = e.target.tagName.toLowerCase();
    if (["button", "a", "input", "label"].includes(tag) ||
        e.target.classList.contains("nav-item")) {
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

if (installBtn) {
  installBtn.onclick = () => deferredPrompt?.prompt();
}

/* ============================================================
   READY LOG
   ============================================================ */
console.log("%c360 V2.0 — main.js loaded", "color:#4ade80;font-weight:bold;font-size:14px;");
