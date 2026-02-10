// =========================
// SUPABASE CLIENTS + HELPERS
// =========================

const select = s => document.querySelector(s);
const selectAll = s => document.querySelectorAll(s);
const b = document.body;

// Main Supabase client (auth + chat)
const supabase = window.supabase.createClient(
  "https://wiswfpfsjiowtrdyqpxy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpc3dmcGZzamlvd3RyZHlxcHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzg4OTcsImV4cCI6MjA4MzkxNDg5N30.z_4FtM2c8UwgrRlafPYjolQuod4IoHQats95XHio1zM"
);

// Separate Supabase client for AI Edge Function
const aiSupabase = window.supabase.createClient(
  "https://yfnwexvsibzqyuqfkepa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbndleHZzaWJ6cXl1cWZrZXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDM1MzMsImV4cCI6MjA4MzMxOTUzM30.t_AAtIDD0o7IDN8sUdwdtKxoqFyKdw5n6_-l3e0I-kM"
);
// =========================
// THEME + APPEARANCE
// =========================

// Load saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  b.classList.add("theme-" + savedTheme);
  const swatch = select(`.swatch[data-theme="${savedTheme}"]`);
  if (swatch) swatch.classList.add("active");
}

// Load saved accent color
const savedAccent = localStorage.getItem("accentColor");
if (savedAccent) b.style.setProperty("--accent", savedAccent);

// Theme swatches
selectAll(".swatch").forEach(swatch => {
  swatch.onclick = () => {
    b.classList.forEach(cls => {
      if (cls.startsWith("theme-")) b.classList.remove(cls);
    });
    const theme = swatch.dataset.theme;
    b.classList.add("theme-" + theme);
    localStorage.setItem("theme", theme);

    selectAll(".swatch").forEach(s => s.classList.remove("active"));
    swatch.classList.add("active");

    const color = getComputedStyle(swatch).backgroundColor;
    b.style.setProperty("--accent", color);
    localStorage.setItem("accentColor", color);
  };
});

// Dark mode toggle
const darkToggle = select("#darkToggle");
darkToggle.checked = localStorage.getItem("darkMode") === "true";
b.classList.toggle("dark", darkToggle.checked);
darkToggle.onchange = e => {
  const v = e.target.checked;
  b.classList.toggle("dark", v);
  localStorage.setItem("darkMode", v);
};
// =========================
// AUTH SYSTEM (EMAIL + OAUTH)
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const authPopup = select("#auth-popup");
  const authEmail = select("#auth-email");
  const authPassword = select("#auth-password");
  const authLoginBtn = select("#auth-login-btn");
  const authSignupBtn = select("#auth-signup-btn");
  const authCloseBtn = select("#auth-close-btn");
  const authError = select("#auth-error");
  const openLoginBtn = select("#open-login-btn");
  const logoutBtn = select("#logout-btn");
  const logoutLabel = select("#logout-label");

  function openAuthPopup() {
    authPopup.classList.remove("hidden");
  }

  function closeAuthPopup() {
    authPopup.classList.add("hidden");
    authError.textContent = "";
  }

  // Email/password signup
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

  // Email/password login
  authLoginBtn.onclick = async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    if (!email || !password) {
      authError.textContent = "Email and password required.";
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      authError.textContent = error.message;
    } else {
      closeAuthPopup();
    }
  };

  // OAuth: GitHub
  const githubBtn = select("#github-login");
  if (githubBtn) {
    githubBtn.onclick = async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: "https://360-search.com" }
      });
      if (error) {
        authError.textContent = "GitHub sign-in failed: " + error.message;
      } else if (data?.url) {
        window.location.href = data.url;
      }
    };
  }

  // OAuth: Google
  const googleBtn = select("#google-login");
  if (googleBtn) {
    googleBtn.onclick = async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: "https://360-search.com" }
      });
      if (error) {
        authError.textContent = "Google sign-in failed: " + error.message;
      } else if (data?.url) {
        window.location.href = data.url;
      }
    };
  }

  // Logout
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  // Auth state UI updates
  function updateAuthUI(user) {
    if (user) {
      const username = user.email.split("@")[0];
      logoutLabel.textContent = `Sign Out — Signed in as ${username}`;
      openLoginBtn.style.display = "none";
      logoutBtn.style.display = "block";
    } else {
      openLoginBtn.style.display = "block";
      logoutBtn.style.display = "none";
    }
  }

  // Initial session check
  supabase.auth.getSession().then(({ data: { session } }) => {
    updateAuthUI(session?.user);
  });

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session?.user);
  });

  // Popup controls
  authCloseBtn.onclick = closeAuthPopup;
  openLoginBtn.onclick = openAuthPopup;
});
// =========================
// AI CHATBOT (EDGE FUNCTION)
// =========================

if (select("#sendBtn")) {
  const today = new Date();
  const currentDate = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  select("#date").innerText = currentDate;

  const chatMemory = [
    {
      role: "system",
      content: `You are a helpful AI assistant. Today's date is ${currentDate}. Answer questions using this date.`
    }
  ];

  async function sendMessage() {
    const input = select("#userInput");
    const chat = select("#chat");
    const userMessage = input.value.trim();
    if (!userMessage) return;

    chat.innerHTML += `<div class="message user">${userMessage}</div>`;
    input.value = "";

    const thinkingId = "msg-" + Date.now();
    chat.innerHTML += `<div class="message ai" id="${thinkingId}">Thinking...</div>`;
    chat.scrollTop = chat.scrollHeight;

    try {
      const { data, error } = await aiSupabase.functions.invoke("hyper-task", {
        body: { message: userMessage, memory: chatMemory }
      });

      if (error) throw error;

      const aiMessage = data?.reply || "No response";

      chatMemory.push({ role: "user", content: userMessage });
      chatMemory.push({ role: "assistant", content: aiMessage });

      select(`#${thinkingId}`).innerHTML = marked.parse(aiMessage);
      chat.scrollTop = chat.scrollHeight;
    } catch (err) {
      select(`#${thinkingId}`).innerText = "Error: " + err.message;
    }
  }

  select("#sendBtn").onclick = sendMessage;
  select("#userInput").addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
  });
}
// =========================
// TRANSLATOR MINI‑APP
// =========================

const translateBtn = select("#translateBtn");

if (translateBtn) {
  translateBtn.onclick = async () => {
    const text = select("#translateInput").value.trim();
    const from = select("#sourceLang").value;
    const to = select("#targetLang").value;
    const output = select("#translateResult");

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
    } catch (e) {
      output.textContent = "Translation failed.";
    }
  };
}
// =========================
// SUPABASE REALTIME CHAT
// =========================

const chatWindow = select("#chat-window");
const messageInput = select("#message-input");
const sendButton = select("#send-button");

let chatLoaded = false;
let chatSubscribed = false;

// Add message to chat UI
function addMessage(username, text) {
  const msg = document.createElement("div");
  msg.classList.add("message");
  msg.innerHTML = `
    <span class="username">${username}:</span>
    <span class="text">${text}</span>
  `;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Load chat history once
async function loadChatHistory() {
  if (chatLoaded) return;
  chatLoaded = true;

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Load error:", error);
    return;
  }

  data.forEach(msg => addMessage(msg.username, msg.text));
}

// Send a new chat message
async function sendChatMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    openAuthPopup();
    return;
  }

  const user = userData.user;

  const { error } = await supabase.from("messages").insert({
    user_id: user.id,
    username: user.email,
    text: text
  });

  if (error) {
    console.error("Send error:", error);
    return;
  }

  messageInput.value = "";
  messageInput.focus();
}

// Subscribe to realtime chat updates
function subscribeToChat() {
  if (chatSubscribed) return;
  chatSubscribed = true;

  supabase
    .channel("public:messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      payload => {
        const msg = payload.new;
        addMessage(msg.username, msg.text);
      }
    )
    .subscribe();
}

// Detect when chat page becomes active
const chatObserver = new MutationObserver(() => {
  const chatPage = select("#page-chat");
  if (chatPage && chatPage.classList.contains("active")) {
    loadChatHistory();
    subscribeToChat();
  }
});

chatObserver.observe(document.body, { attributes: true, subtree: true });

// Chat input events
if (sendButton && messageInput) {
  sendButton.addEventListener("click", sendChatMessage);
  messageInput.addEventListener("keydown", e => {
    if (e.key === "Enter") sendChatMessage();
  });
}
// =========================
// WEATHER + CLOCK + STOCKS + SHORTENER
// =========================

// Clock
setInterval(() => {
  const d = new Date();
  select("#clockTime").textContent = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  select("#clockDate").textContent = d.toLocaleDateString();
}, 1000);

// Weather (Open-Meteo)
let tempC = null, code = null;

const updateWeather = () => {
  if (tempC == null) return;
  const f = (tempC * 9 / 5 + 32).toFixed(1);
  const useF = select("#tempToggle").checked;

  select("#homeWeatherText").textContent = `${useF ? f + "°F" : tempC + "°C"} · Code ${code}`;
  select("#weatherContent").textContent = `Current temperature: ${tempC}°C / ${f}°F\nWeather code: ${code}`;
};

fetch("https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-73.9&current=temperature_2m,weathercode&timezone=auto")
  .then(r => r.json())
  .then(d => {
    tempC = d.current.temperature_2m;
    code = d.current.weathercode;
    updateWeather();
  })
  .catch(() => {
    select("#homeWeatherText").textContent = "Weather unavailable";
    select("#weatherContent").textContent = "Could not load weather data.";
  });

select("#tempToggle").onchange = updateWeather;

// URL Shortener (TinyURL)
select("#shortBtn").onclick = () => {
  const url = select("#shortInput").value.trim();
  if (!url) return;

  fetch("https://api.tinyurl.com/create?api_token=YOUR_TOKEN", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  })
    .then(r => r.json())
    .then(d => {
      select("#shortResult").textContent =
        d.data?.tiny_url || d.errors?.[0]?.message || "Error";
    })
    .catch(e => {
      select("#shortResult").textContent = "Network error: " + e.message;
    });
};

// Stock Quote (Alpha Vantage)
const key = "I3B9DMLF3EUUP0MY";

select("#stockForm").onsubmit = async e => {
  e.preventDefault();
  const t = select("#ticker").value.trim().toUpperCase();
  if (!t) return;

  select("#quote").innerHTML = '<div class="spinner"></div>';

  try {
    const q = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${t}&apikey=${key}`);
    const d = await q.json();
    const g = d["Global Quote"];

    if (!g || !g["05. price"]) throw "no quote";

    select("#quote").textContent = `${t}\n💵 Price: $${g["05. price"]}\n📉 Change: ${g["10. change percent"]}`;
  } catch (e) {
    select("#quote").textContent = "Error: " + e;
  }
};
// =========================
// UI EFFECTS + MUSIC + INSTALL PROMPT
// =========================

// Cursor trail
const dot = select(".cursor-dot"),
      trail = select(".cursor-trail");

let x = 0, y = 0;

document.addEventListener("mousemove", e => {
  x = e.clientX;
  y = e.clientY;
  dot.style.left = `${x}px`;
  dot.style.top = `${y}px`;
});

(function animate() {
  trail.style.left = `${x}px`;
  trail.style.top = `${y}px`;
  requestAnimationFrame(animate);
})();

// Background music toggle
const music = select("#bgMusic"),
      toggle = select("#musicToggle");

if (music && toggle) {
  toggle.onclick = async () => {
    if (music.paused) {
      try {
        await music.play();
        toggle.textContent = "🔈 Music - Playing";
      } catch (e) {
        console.error("Music play error:", e);
      }
    } else {
      music.pause();
      toggle.textContent = "🔇 Music - Paused";
    }
  };
}

// Install prompt
let dp;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  dp = e;
  select("#installBtn").style.display = "block";
});

select("#installBtn").onclick = () => dp?.prompt();

// Sidebar + overlay controls
select("#sidebarToggle").onclick = () => {
  select("#sidebar").classList.toggle("open");
  select("#overlay").classList.toggle("active");
};

select("#overlay").onclick = () => {
  select("#sidebar").classList.remove("open");
  select("#settingsPanel").classList.remove("open");
  select("#overlay").classList.remove("active");
};

document.addEventListener("click", e => {
  const sidebar = select("#sidebar");
  const sidebarToggle = select("#sidebarToggle");
  const settingsPanel = select("#settingsPanel");

  if (!sidebar.contains(e.target) && e.target !== sidebarToggle && !settingsPanel.contains(e.target)) {
    sidebar.classList.remove("open");
  }
});

// Navigation
selectAll(".nav-item").forEach(n => {
  n.onclick = () => {
    selectAll(".nav-item").forEach(i => i.classList.remove("active"));
    n.classList.add("active");

    selectAll(".page").forEach(p => p.classList.remove("active"));
    select("#page-" + n.dataset.page).classList.add("active");

    select("#sidebar").classList.remove("open");
    select("#overlay").classList.remove("active");
  };
});

selectAll(".back-btn").forEach(b => {
  b.onclick = () => {
    selectAll(".page").forEach(p => p.classList.remove("active"));
    select("#page-main360").classList.add("active");
  };
});
