/* ============================================================
   CORE UTILITIES
============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const body = document.body;

/* ============================================================
   SUPABASE CLIENT (ONE CLIENT ONLY)
============================================================ */
const supabase = supabase.createClient(
  "https://wiswfpfsjiowtrdyqpxy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpc3dmcGZzamlvd3RyZHlxcHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzg4OTcsImV4cCI6MjA4MzkxNDg5N30.z_4FtM2c8UwgrRlafPYjolQuod4IoHQats95XHio1zM"
);

/* ============================================================
   AUTH POPUP UI
============================================================ */
const authPopup = $("#auth-popup");
const authEmail = $("#auth-email");
const authPassword = $("#auth-password");
const authLoginBtn = $("#auth-login-btn");
const authSignupBtn = $("#auth-signup-btn");
const authCloseBtn = $("#auth-close-btn");
const authError = $("#auth-error");
const openLoginBtn = $("#open-login-btn");
const logoutBtn = $("#logout-btn");

/* -------------------------
   Popup Controls
------------------------- */
function openAuth() { authPopup.classList.remove("hidden"); }
function closeAuth() { authPopup.classList.add("hidden"); authError.textContent = ""; }

openLoginBtn.onclick = openAuth;
authCloseBtn.onclick = closeAuth;

/* -------------------------
   Email Signup
------------------------- */
authSignupBtn.onclick = async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    authError.textContent = "Email and password required.";
    return;
  }

  const { error } = await supabase.auth.signUp({ email, password });
  authError.textContent = error ? error.message : "Check your email to confirm.";
};

/* -------------------------
   Email Login
------------------------- */
authLoginBtn.onclick = async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    authError.textContent = "Email and password required.";
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) authError.textContent = error.message;
  else closeAuth();
};

/* -------------------------
   GitHub Login
------------------------- */
$("#github-login").onclick = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: window.location.origin, skipBrowserRedirect: true }
  });

  if (error) return console.error(error.message);
  if (data?.url) window.open(data.url, "_blank");
};

/* -------------------------
   Google Login
------------------------- */
$("#google-login").onclick = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin, skipBrowserRedirect: true }
  });

  if (error) return console.error(error.message);
  if (data?.url) window.open(data.url, "_blank");
};

/* -------------------------
   Logout
------------------------- */
logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

/* ============================================================
   CHAT SYSTEM — NEW LOGIC, OLD UI
============================================================ */

/* -------------------------
   DOM Elements (Old UI IDs)
------------------------- */
const chatWindow = $("#chat-window");
const messageInput = $("#message-input");
const sendButton = $("#send-button");

/* -------------------------
   Fetch User Profile
------------------------- */
async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, avatar_url, role, tag")
    .eq("id", userId)
    .single();

  if (error) {
    console.warn("Profile fetch error:", error.message);
    return {
      username: "Unknown",
      avatar_url: null,
      role: "user",
      tag: null
    };
  }

  return data;
}

/* -------------------------
   Avatar Rendering
------------------------- */
function getInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ");
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[1][0]).toUpperCase();
}

function renderAvatar(url, username) {
  return url
    ? `<img class="chat-avatar" src="${url}" alt="${username}">`
    : `<div class="chat-avatar initials">${getInitials(username)}</div>`;
}

/* Inject avatar styles */
document.head.insertAdjacentHTML(
  "beforeend",
  `<style>
    .chat-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 8px;
    }
    .chat-avatar.initials {
      background: #4b5563;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    .chat-message {
      display: flex;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .chat-bubble {
      background: rgba(255,255,255,0.1);
      padding: 6px 10px;
      border-radius: 8px;
      max-width: 80%;
    }
    .role-badge {
      display: inline-block;
      margin-left: 6px;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: bold;
    }
    .role-admin { background: #dc2626; color: white; }
    .role-mod { background: #7c3aed; color: white; }
    .role-user { background: #6b7280; color: white; }
    .user-tag {
      color: #facc15;
      font-weight: bold;
      margin-left: 4px;
    }
  </style>`
);

/* -------------------------
   Render Message (Hybrid Style)
------------------------- */
function renderMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("chat-message");

  const roleBadge = msg.role
    ? `<span class="role-badge role-${msg.role}">${msg.role}</span>`
    : "";

  const tagBadge = msg.tag
    ? `<span class="user-tag">[${msg.tag}]</span>`
    : "";

  div.innerHTML = `
    ${renderAvatar(msg.avatar_url, msg.username)}
    <div class="chat-bubble">
      <strong>${msg.username} ${tagBadge} ${roleBadge}</strong>
      <p>${msg.text}</p>
    </div>
  `;

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* -------------------------
   Load Chat History
------------------------- */
async function loadChatHistory() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Chat history error:", error.message);
    return;
  }

  chatWindow.innerHTML = "";
  data.forEach(renderMessage);
}

/* -------------------------
   Realtime Listener
------------------------- */
supabase
  .channel("realtime-messages")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    payload => renderMessage(payload.new)
  )
  .subscribe();

/* -------------------------
   Slash Commands
------------------------- */
async function runCommand(text) {
  const parts = text.trim().split(" ");
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return;

  const profile = await getUserProfile(user.id);

  if (profile.role !== "admin") {
    alert("Only admins can use commands.");
    return;
  }

  if (cmd === "/promote") {
    await supabase.from("profiles").update({ role: "mod" }).eq("username", args[0]);
    alert(`Promoted ${args[0]} to mod.`);
    return;
  }

  if (cmd === "/demote") {
    await supabase.from("profiles").update({ role: "user" }).eq("username", args[0]);
    alert(`Demoted ${args[0]} to user.`);
    return;
  }

  if (cmd === "/tag") {
    const target = args[0];
    const tag = args.slice(1).join(" ");
    await supabase.from("profiles").update({ tag }).eq("username", target);
    alert(`Set tag for ${target}: ${tag}`);
    return;
  }

  alert("Unknown command.");
}

/* -------------------------
   Send Chat Message
------------------------- */
async function sendChatMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  // Slash command?
  if (text.startsWith("/")) {
    await runCommand(text);
    messageInput.value = "";
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    openAuth();
    return;
  }

  const profile = await getUserProfile(user.id);

  await supabase.from("messages").insert({
    user_id: user.id,
    username: profile.username,
    avatar_url: profile.avatar_url,
    tag: profile.tag,
    text: text,
    role: profile.role
  });

  messageInput.value = "";
}

/* -------------------------
   Typing Indicators
------------------------- */
const typingIndicator =
  $("#typing-indicator") ||
  (() => {
    const el = document.createElement("div");
    el.id = "typing-indicator";
    el.style.margin = "6px";
    chatWindow.parentNode.insertBefore(el, chatWindow.nextSibling);
    return el;
  })();

let typingTimeouts = {};

function showTyping(username) {
  typingIndicator.innerHTML = `${username} is typing…`;

  if (typingTimeouts[username]) clearTimeout(typingTimeouts[username]);

  typingTimeouts[username] = setTimeout(() => {
    typingIndicator.innerHTML = "";
  }, 2000);
}

messageInput.addEventListener("input", async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return;

  const profile = await getUserProfile(user.id);

  supabase.channel("typing").send({
    type: "broadcast",
    event: "typing",
    payload: { username: profile.username }
  });
});

supabase
  .channel("typing")
  .on("broadcast", { event: "typing" }, payload => {
    showTyping(payload.payload.username);
  })
  .subscribe();

/* -------------------------
   Button + Enter Key
------------------------- */
sendButton.onclick = sendChatMessage;
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendChatMessage();
});

/* -------------------------
   Load Chat on Page Activation
------------------------- */
const chatObserver = new MutationObserver(() => {
  const chatPage = $("#page-chat");
  if (chatPage.classList.contains("active")) {
    loadChatHistory();
  }
});

chatObserver.observe(document.body, { attributes: true, subtree: true });
/* ============================================================
   AI SYSTEM — GROQ STREAMING (NEW LOGIC, OLD UI)
============================================================ */

/* -------------------------
   DOM Elements
------------------------- */
const aiInput = $("#ai-input");
const aiSendBtn = $("#ai-send-btn");
const aiOutput = $("#ai-output");

/* -------------------------
   Stream AI Response
------------------------- */
async function sendAIRequest() {
  const prompt = aiInput.value.trim();
  if (!prompt) return;

  aiOutput.innerHTML = `<p><em>Thinking...</em></p>`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_GROQ_API_KEY"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt }
        ],
        stream: true
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    aiOutput.innerHTML = ""; // clear output

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const json = line.replace("data:", "").trim();
        if (json === "[DONE]") continue;

        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) aiOutput.innerHTML += delta;
        } catch (err) {
          console.warn("Stream parse error:", err);
        }
      }
    }
  } catch (err) {
    aiOutput.innerHTML = `<p style="color:red;">AI Error: ${err.message}</p>`;
  }
}

/* -------------------------
   Event Listeners
------------------------- */
aiSendBtn.onclick = sendAIRequest;

aiInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendAIRequest();
});
/* ============================================================
   SIDEBAR + PAGE NAVIGATION
============================================================ */
const sidebar = $("#sidebar");
const sidebarToggle = $("#sidebarToggle");
const overlay = $("#overlay");
const settingsPanel = $("#settingsPanel");

sidebarToggle.onclick = () => {
  sidebar.classList.toggle("open");
  overlay.classList.toggle("active");
};

overlay.onclick = () => {
  sidebar.classList.remove("open");
  settingsPanel.classList.remove("open");
  overlay.classList.remove("active");
};

document.addEventListener("click", e => {
  if (!sidebar.contains(e.target) && e.target !== sidebarToggle && !settingsPanel.contains(e.target)) {
    sidebar.classList.remove("open");
  }
});

/* Page switching */
$$(".nav-item").forEach(item => {
  item.onclick = () => {
    $$(".nav-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    $$(".page").forEach(p => p.classList.remove("active"));
    $("#page-" + item.dataset.page).classList.add("active");

    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  };
});

/* Back buttons */
$$(".back-btn").forEach(btn => {
  btn.onclick = () => {
    $$(".page").forEach(p => p.classList.remove("active"));
    $("#page-main360").classList.add("active");
  };
});

/* ============================================================
   CLOCK
============================================================ */
setInterval(() => {
  const d = new Date();
  $("#clockTime").textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  $("#clockDate").textContent = d.toLocaleDateString();
}, 1000);

/* ============================================================
   WEATHER — OPENWEATHER (City Search)
============================================================ */
let lastCity = null;

const weatherForm = $("#weatherForm");
const weatherOutput = $("#weatherContent");

if (weatherForm) {
  weatherForm.addEventListener("submit", async e => {
    e.preventDefault();

    const city = $("#city").value.trim();
    if (!city || city === lastCity) return;

    lastCity = city;
    weatherOutput.textContent = "Loading weather...";

    try {
      const apiKey = "c235c3c0b8aa90de94301809df9a50e4";
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
      );
      const data = await res.json();

      if (data.cod !== 200) {
        weatherOutput.textContent = `Error: ${data.message}`;
        return;
      }

      const temp = data.main.temp;
      const desc = data.weather[0].description;
      weatherOutput.textContent = `Weather in ${city}: ${temp}°C, ${desc}`;
    } catch {
      weatherOutput.textContent = "Failed to fetch weather.";
    }
  });
}

/* ============================================================
   WEATHER — OPEN-METEO (Home Weather)
============================================================ */
let tempC = null;
let code = null;

function updateWeather() {
  if (tempC == null) return;

  const f = (tempC * 9 / 5 + 32).toFixed(1);
  const useF = $("#tempToggle").checked;

  $("#homeWeatherText").textContent = `${useF ? f + "°F" : tempC + "°C"} · Code ${code}`;
  $("#weatherContent").textContent = `Current temperature: ${tempC}°C / ${f}°F\nWeather code: ${code}`;
}

fetch("https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-73.9&current=temperature_2m,weathercode&timezone=auto")
  .then(r => r.json())
  .then(d => {
    tempC = d.current.temperature_2m;
    code = d.current.weathercode;
    updateWeather();
  })
  .catch(() => {
    $("#homeWeatherText").textContent = "Weather unavailable";
    $("#weatherContent").textContent = "Could not load weather data.";
  });

$("#tempToggle").onchange = updateWeather;

/* ============================================================
   STOCKS — ALPHAVANTAGE
============================================================ */
const alphaKey = "I3B9DMLF3EUUP0MY";

$("#stockForm").onsubmit = async e => {
  e.preventDefault();

  const t = $("#ticker").value.trim().toUpperCase();
  if (!t) return;

  $("#quote").innerHTML = '<div class="spinner"></div>';

  try {
    const q = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${t}&apikey=${alphaKey}`
    );
    const d = await q.json();
    const g = d["Global Quote"];

    if (!g || !g["05. price"]) throw "No quote";

    $("#quote").textContent =
      `${t}\n💵 Price: $${g["05. price"]}\n📉 Change: ${g["10. change percent"]}`;
  } catch (e) {
    $("#quote").textContent = "Error: " + e;
  }
};

/* ============================================================
   TRANSLATOR — MYMEMORY API
============================================================ */
const translateBtn = $("#translateBtn");

if (translateBtn) {
  translateBtn.onclick = async () => {
    const text = $("#translateInput").value.trim();
    const from = $("#sourceLang").value;
    const to = $("#targetLang").value;
    const output = $("#translateResult");

    if (!text) {
      output.textContent = "Please enter text.";
      return;
    }

    output.textContent = "Translating...";

    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
      );
      const data = await res.json();
      output.textContent = data.responseData.translatedText;
    } catch {
      output.textContent = "Translation failed.";
    }
  };
}

/* ============================================================
   BACKGROUND UPLOADER
============================================================ */
$("#setBgBtn").onclick = () => {
  const file = $("#bgUpload").files[0];
  const url = $("#bgUrl").value.trim();

  if (file) {
    const reader = new FileReader();
    reader.onload = e => applyBackground(e.target.result);
    reader.readAsDataURL(file);
  } else if (url) {
    applyBackground(url);
  } else {
    alert("Upload a file or paste an image URL.");
  }
};

function applyBackground(src) {
  body.style.backgroundImage = `url('${src}')`;
  body.style.backgroundSize = "cover";
  body.style.backgroundPosition = "center";
  body.style.backgroundAttachment = "fixed";
  localStorage.setItem("bgImage", src);
}

window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("bgImage");
  if (saved) applyBackground(saved);
});

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

const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  body.classList.add("theme-" + savedTheme);
  const swatch = document.querySelector(`.swatch[data-theme="${savedTheme}"]`);
  if (swatch) swatch.classList.add("active");
}

/* ============================================================
   SETTINGS PANEL
============================================================ */
$("#settingsBtn").onclick = () => {
  settingsPanel.classList.toggle("open");
  overlay.classList.add("active");
};

document.addEventListener("click", e => {
  if (!settingsPanel.contains(e.target) && !$("#settingsBtn").contains(e.target)) {
    settingsPanel.classList.remove("open");
    overlay.classList.remove("active");
  }
});

/* Dark mode toggle */
const darkToggle = $("#darkToggle");
darkToggle.checked = localStorage.getItem("darkMode") === "true";
body.classList.toggle("dark", darkToggle.checked);

darkToggle.onchange = e => {
  const v = e.target.checked;
  body.classList.toggle("dark", v);
  localStorage.setItem("darkMode", v);
};

/* Accent color */
const savedAccent = localStorage.getItem("accentColor");
if (savedAccent) body.style.setProperty("--accent", savedAccent);

$$(".swatch").forEach(s => {
  s.onclick = () => {
    $$(".swatch").forEach(x => x.classList.remove("active"));
    s.classList.add("active");

    const c = getComputedStyle(s).backgroundColor;
    body.style.setProperty("--accent", c);
    localStorage.setItem("accentColor", c);
  };
});

/* ============================================================
   PWA INSTALL
============================================================ */
let deferredPrompt;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  $("#installBtn").style.display = "block";
});

$("#installBtn").onclick = () => deferredPrompt?.prompt();

/* ============================================================
   CURSOR EFFECTS
============================================================ */
const dot = $(".cursor-dot");
const trail = $(".cursor-trail");

let cx = 0, cy = 0;

document.addEventListener("mousemove", e => {
  cx = e.clientX;
  cy = e.clientY;

  dot.style.left = `${cx}px`;
  dot.style.top = `${cy}px`;
});

(function animate() {
  trail.style.left = `${cx}px`;
  trail.style.top = `${cy}px`;
  requestAnimationFrame(animate);
})();

/* ============================================================
   MUSIC PLAYER
============================================================ */
const music = $("#bgMusic");
const musicToggle = $("#musicToggle");

if (music && musicToggle) {
  musicToggle.onclick = async () => {
    if (music.paused) {
      try {
        await music.play();
        musicToggle.textContent = "🔈 Music - Playing";
      } catch (e) {
        console.error("Music play error:", e);
      }
    } else {
      music.pause();
      musicToggle.textContent = "🔇 Music - Paused";
    }
  };
}
