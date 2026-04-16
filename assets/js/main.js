/* ============================================================
   360 — MAIN.JS V2.1.1
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

/* ============================================================
   AUTH CHIP — drop this into main.js replacing the updateAuthUI
   function and adding the chip CSS to main.css
   ============================================================ */

/* ── Gravatar helper ── */
async function getGravatarUrl(email) {
  const clean = email.trim().toLowerCase();
  const msgBuffer = new TextEncoder().encode(clean);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return `https://www.gravatar.com/avatar/${hashHex}?d=404&s=80`;
}

async function updateAuthUI() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const topRight = document.querySelector(".auth-top-right");
  if (!topRight) return;

  if (session) {
    const user = session.user;
    const email = user.email || "";

    // Fetch profile for username
    let username = user.user_metadata?.username || email.split("@")[0] || "User";
    try {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();
      if (profile?.username) username = profile.username;
    } catch {}

    // Try Gravatar
    let avatarHtml = "";
    const initials = username.slice(0, 2).toUpperCase();
    try {
      const gravatarUrl = await getGravatarUrl(email);
      const res = await fetch(gravatarUrl, { method: "HEAD" });
      if (res.ok) {
        avatarHtml = `<img src="${gravatarUrl}" alt="${username}" class="user-chip-avatar" />`;
      } else {
        avatarHtml = `<span class="user-chip-initials">${initials}</span>`;
      }
    } catch {
      avatarHtml = `<span class="user-chip-initials">${initials}</span>`;
    }

    // Build chip
    topRight.innerHTML = `
      <div class="user-chip" id="userChip" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false">
        <div class="user-chip-avatar-wrap">${avatarHtml}</div>
        <span class="user-chip-name">@${username}</span>
        <span class="user-chip-caret">▾</span>
        <div class="user-chip-dropdown" id="userChipDropdown" role="menu">
          <div class="ucd-header">
            <div class="ucd-avatar-wrap">${avatarHtml}</div>
            <div>
              <div class="ucd-username">@${username}</div>
              <div class="ucd-email">${email}</div>
            </div>
          </div>
          <div class="ucd-divider"></div>
          <a class="ucd-item" href="/accounts.html">
            <span>👤</span> My Account
          </a>
          <a class="ucd-item" href="https://gravatar.com" target="_blank" rel="noopener noreferrer">
            <span>🖼️</span> Edit Avatar (Gravatar)
          </a>
          <div class="ucd-divider"></div>
          <button class="ucd-item ucd-signout" id="chipSignOut">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>
    `;

    const chip = document.getElementById("userChip");
    const dropdown = document.getElementById("userChipDropdown");

    // Toggle dropdown
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = chip.classList.contains("open");
      chip.classList.toggle("open", !isOpen);
      chip.setAttribute("aria-expanded", String(!isOpen));
    });

    // Close on outside click
    document.addEventListener("click", () => {
      chip.classList.remove("open");
      chip.setAttribute("aria-expanded", "false");
    });

    // Sign out
    document.getElementById("chipSignOut").onclick = async (e) => {
      e.stopPropagation();
      await supabaseClient.auth.signOut();
      location.href = "/accounts.html?login&from=logout";
    };

  } else {
    // Not signed in — show original buttons
    topRight.innerHTML = `
      <button id="signInBtn" class="auth-btn" onclick="location.href='/accounts.html?signin'">Sign In</button>
      <button id="signUpBtn" class="auth-btn" onclick="location.href='/accounts.html?signup'">Sign Up</button>
    `;
  }
}

/* ============================================================
   SIDEBAR — click outside to close
   ============================================================ */
const sidebar = document.querySelector(".sidebar");
const settingsPanel = document.querySelector(".settings-panel");
const overlay = document.querySelector(".overlay");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const settingsBtn = document.getElementById("settingsBtn");

/* Helper: update overlay based on open panels */
function updateOverlay() {
  const anyOpen =
    sidebar.classList.contains("open") ||
    settingsPanel.classList.contains("open");

  if (anyOpen) {
    overlay.classList.add("active");
  } else {
    overlay.classList.remove("active");
  }
}

/* Sidebar toggle */
sidebarToggle?.addEventListener("click", e => {
  e.stopPropagation();
  sidebar.classList.toggle("open");
  updateOverlay();
});

/* Settings toggle */
settingsBtn?.addEventListener("click", e => {
  e.stopPropagation();
  settingsPanel.classList.toggle("open");
  updateOverlay();
});

/* Clicking overlay closes everything */
overlay?.addEventListener("click", () => {
  sidebar.classList.remove("open");
  settingsPanel.classList.remove("open");
  updateOverlay();
});

/* Clicking anywhere outside closes everything */
document.addEventListener("click", e => {
  const insideSidebar = e.target.closest(".sidebar");
  const insideSettings = e.target.closest(".settings-panel");
  const onToggle = e.target.closest(".sidebar-toggle");
  const onSettingsBtn = e.target.closest("#settingsBtn");

  if (!insideSidebar && !insideSettings && !onToggle && !onSettingsBtn) {
    sidebar.classList.remove("open");
    settingsPanel.classList.remove("open");
    updateOverlay();
  }
});

/* Nav items */
$$(".nav-item").forEach(item => {
  item.onclick = e => {
    e.stopPropagation();
    const href = item.dataset.href;
    if (href) window.location.href = href;
    closeSidebar();
  };
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
