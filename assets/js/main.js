/* ============================================================
   360 — MAIN.JS V2.2.0
   User chip with Gravatar + initials fallback, full dropdown
   ============================================================ */

//CHANGE THE FOLLOWING TO CHANGE ALL THE PAGE'S VERSION!!
const version = "v2.2.0";

//CHANGES THE FOOTER IN ALL PAGES!!
const _sidebarVer = document.getElementById("sidebar-ver");
if (_sidebarVer) _sidebarVer.textContent = "© " + new Date().getFullYear() + " 360 INC. · " + version;

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
   GRAVATAR HELPER
   MD5 is needed for Gravatar — we use a lightweight implementation
   ============================================================ */
async function getGravatarUrl(email, size = 40) {
  const clean = email.trim().toLowerCase();
  const msgBuffer = new TextEncoder().encode(clean);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  // Gravatar now accepts SHA-256
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return `https://www.gravatar.com/avatar/${hashHex}?s=${size}&d=404`;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ============================================================
   BUILD USER CHIP
   Replaces the three auth buttons (signIn / signUp / signOut)
   with a single pill containing PFP + @username + dropdown.
   ============================================================ */
async function buildUserChip(user) {
  // Claim the spot synchronously before any awaits — if a chip already
  // exists (real or placeholder) every concurrent call bails out here.
  const container = document.querySelector(".auth-top-right") || document.body;
  if (container.querySelector(".user-chip")) return;
  const chip = document.createElement("div");
  chip.className = "user-chip";
  chip.style.display = "none"; // hidden until fully built
  container.appendChild(chip); // in the DOM NOW — blocks all other calls

  // Hide the three legacy buttons
  const signInBtn  = $("#signInBtn");
  const signUpBtn  = $("#signUpBtn");
  const signOutBtn = $("#signOutBtn");
  if (signInBtn)  signInBtn.style.display  = "none";
  if (signUpBtn)  signUpBtn.style.display  = "none";
  if (signOutBtn) signOutBtn.style.display = "none";

  // Fetch profile for username + avatar_url
  let username = user.user_metadata?.username
              || user.user_metadata?.full_name
              || user.email?.split("@")[0]
              || "User";
  let avatarUrl = user.user_metadata?.avatar_url || null;

  try {
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.username)   username  = profile.username;
    if (profile?.avatar_url) avatarUrl = profile.avatar_url;
  } catch {}

  // Try Gravatar if no avatar
  if (!avatarUrl) {
    try {
      const gUrl = await getGravatarUrl(user.email || "", 80);
      const probe = await fetch(gUrl, { method: "HEAD" });
      if (probe.ok) avatarUrl = gUrl;
    } catch {}
  }

  const initials = getInitials(username);
  const displayName = "@" + username;

  // Populate the chip that's already in the DOM
  chip.setAttribute("role", "button");
  chip.setAttribute("aria-haspopup", "true");
  chip.setAttribute("aria-expanded", "false");

  const avatarHTML = avatarUrl
    ? `<div class="user-chip-avatar-wrap">
         <img class="user-chip-avatar" src="${avatarUrl}" alt="${initials}"
              onerror="this.outerHTML='<div class=\\'user-chip-initials\\'>${initials}</div>'" />
       </div>`
    : `<div class="user-chip-avatar-wrap">
         <div class="user-chip-initials">${initials}</div>
       </div>`;

  chip.innerHTML = `
    ${avatarHTML}
    <span class="user-chip-name">${displayName}</span>
    <span class="user-chip-caret">▾</span>
    <div class="user-chip-dropdown">
      <div class="ucd-header">
        ${avatarUrl
          ? `<div class="ucd-avatar-wrap"><img class="user-chip-avatar" src="${avatarUrl}" alt="${initials}"
               onerror="this.outerHTML='<div class=\\'user-chip-initials\\'>${initials}</div>'" /></div>`
          : `<div class="ucd-avatar-wrap"><div class="user-chip-initials">${initials}</div></div>`}
        <div>
          <div class="ucd-username">${username}</div>
          <div class="ucd-email">${user.email || ""}</div>
        </div>
      </div>
      <div class="ucd-divider"></div>
      <a class="ucd-item" href="/accounts.html"><span>👤</span> My Account</a>
      <div class="ucd-divider"></div>
      <button class="ucd-item ucd-signout" id="chipSignOut"><span>🚪</span> Sign Out</button>
    </div>`;

  // Chip is already in the DOM — just make it visible now
  chip.style.display = "";

  // Toggle dropdown
  chip.addEventListener("click", e => {
    e.stopPropagation();
    const isOpen = chip.classList.toggle("open");
    chip.setAttribute("aria-expanded", isOpen);
  });

  // Close on outside click
  document.addEventListener("click", () => {
    chip.classList.remove("open");
    chip.setAttribute("aria-expanded", "false");
  });

  // Sign out
  document.getElementById("chipSignOut")?.addEventListener("click", async e => {
    e.stopPropagation();
    await supabaseClient.auth.signOut();
    location.href = "/accounts.html?login&from=logout";
  });
}

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

if (authPopup) {
  authPopup.addEventListener("click", e => {
    if (e.target === authPopup) closeAuth();
  });
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
    await supabaseClient.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin }
    });
  };
}

const googleBtn = $("#google-login");
if (googleBtn) {
  googleBtn.onclick = async () => {
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  };
}

if (signOutBtn) {
  signOutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    location.href = "/accounts.html?login&from=logout";
  };
}

async function updateAuthUI() {
  // accounts.html manages its own auth UI — skip the chip there
  if (window.SKIP_AUTH_CHIP) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  const user = session?.user ?? null;

  if (user) {
    // Show chip, hide legacy buttons
    await buildUserChip(user);
  } else {
    // Remove chip if present
    document.querySelector(".user-chip")?.remove();
    // Show sign in / sign up buttons
    if (signInBtn)  signInBtn.style.display  = "inline-block";
    if (signUpBtn)  signUpBtn.style.display  = "inline-block";
    if (signOutBtn) signOutBtn.style.display = "none";
  }
}

// Run on load
updateAuthUI();

// React to auth state changes (e.g. OAuth redirect)
supabaseClient.auth.onAuthStateChange((event, session) => {
  // accounts.html manages its own auth UI — skip the chip there
  if (window.SKIP_AUTH_CHIP) return;
  // INITIAL_SESSION is handled by updateAuthUI() above — skip it here
  // TOKEN_REFRESHED, USER_UPDATED etc. don't need a chip rebuild
  if (event === "SIGNED_OUT") {
    document.querySelector(".user-chip")?.remove();
    if (signInBtn)  signInBtn.style.display  = "inline-block";
    if (signUpBtn)  signUpBtn.style.display  = "inline-block";
    if (signOutBtn) signOutBtn.style.display = "none";
  } else if (event === "SIGNED_IN" && session?.user && !document.querySelector(".user-chip")) {
    buildUserChip(session.user);
  }
});

/* ============================================================
   SIDEBAR — click outside to close
   ============================================================ */
const sidebar       = document.querySelector(".sidebar");
const settingsPanel = document.querySelector(".settings-panel");
const overlay       = document.querySelector(".overlay");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const settingsBtn   = document.getElementById("settingsBtn");

function updateOverlay() {
  const anyOpen = sidebar?.classList.contains("open") || settingsPanel?.classList.contains("open");
  overlay?.classList.toggle("active", !!anyOpen);
}

sidebarToggle?.addEventListener("click", e => {
  e.stopPropagation();
  sidebar?.classList.toggle("open");
  updateOverlay();
});

settingsBtn?.addEventListener("click", e => {
  e.stopPropagation();
  settingsPanel?.classList.toggle("open");
  updateOverlay();
});

overlay?.addEventListener("click", () => {
  sidebar?.classList.remove("open");
  settingsPanel?.classList.remove("open");
  updateOverlay();
});

document.addEventListener("click", e => {
  if (!e.target.closest(".sidebar") && !e.target.closest(".settings-panel")
    && !e.target.closest(".sidebar-toggle") && !e.target.closest("#settingsBtn")) {
    sidebar?.classList.remove("open");
    settingsPanel?.classList.remove("open");
    updateOverlay();
  }
});

$$(".nav-item").forEach(item => {
  item.onclick = e => {
    e.stopPropagation();
    const href = item.dataset.href;
    if (href) window.location.href = href;
    sidebar?.classList.remove("open");
    updateOverlay();
  };
});

/* ============================================================
   THEME SYSTEM
   ============================================================ */
$$(".swatch").forEach(swatch => {
  swatch.onclick = e => {
    e.stopPropagation();
    const theme = swatch.dataset.theme;
    body.classList.forEach(cls => { if (cls.startsWith("theme-")) body.classList.remove(cls); });
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
   RIPPLE EFFECT
   ============================================================ */
document.addEventListener("click", e => {
  const target = e.target.closest("[data-ripple], button, .nav-item, .swatch, .auth-btn");
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
   ACTIVE NAV MARK
   ============================================================ */
(function markActiveNav() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  $$(".nav-item[data-href]").forEach(item => {
    const href = item.dataset.href.replace(/\/+$/, "") || "/";
    // Normalise: strip leading ../
    const normHref = href.replace(/^(\.\.\/)+/, "/");
    item.classList.toggle("active", path === normHref || path.endsWith(normHref));
  });
})();

console.log("%c360 V2.2.0 — main.js loaded (user chip active)", "color:#4ade80;font-weight:bold;font-size:14px;");
