const select = selector => document.querySelector(selector);
const selectAll = selector => document.querySelectorAll(selector);
const b = document.body;

const supa = supabase.createClient(
    "https://dvfsdoybqyxpwtqgffub.supabase.co",
    "sb_publishable_lP5gD4yHS3jLC0VbLv7ldA_TnoMk3gG"
);

// =========================
// LOAD SAVED THEME
// =========================
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    document.body.classList.add("theme-" + savedTheme);

    // Mark correct swatch as active
    const swatch = document.querySelector(`.swatch[data-theme="${savedTheme}"]`);
    if (swatch) swatch.classList.add("active");
}


window.handleCredentialResponse = async r => {
    try {
        const u = jwt_decode(r.credential);
        const c = select(".home-inner");

        const box = document.createElement("div");
        box.style = "display:flex;flex-direction:column;align-items:center;margin-top:20px";

        const img = Object.assign(document.createElement("img"), {
            src: u.picture,
            style: "width:80px;height:80px;border-radius:50%"
        });

        const name = Object.assign(document.createElement("span"), {
            textContent: u.name,
            style: "margin-top:10px;font-weight:bold"
        });

        box.append(img, name);
        c.append(box);

        await supa.from("users").upsert([
            {
                id: u.sub,
                name: u.name,
                avatar_url: u.picture,
                created_at: new Date().toISOString()
            }
        ]);
    } catch (e) {
        console.error(e);
    }
};

window.addEventListener("DOMContentLoaded", () => {
  const select = s => document.querySelector(s);

  window.handleGoogleLogin = async (response) => {
    const { credential } = response;
    const { email } = jwt_decode(credential);
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential
    });
    if (error) {
      document.getElementById("auth-error").textContent = "Google sign-in failed: " + error.message;
    } else {
      document.getElementById("auth-popup").classList.add("hidden");
      document.getElementById("logout-btn").style.display = "inline-block";
      document.getElementById("open-login-btn").style.display = "none";
    }
  };

  google.accounts.id.initialize({
    client_id: "1005132717258-eekf4ab0tp00i1k8gcfqa6ettemllnj6.apps.googleusercontent.com",
    callback: handleGoogleLogin
  });
  google.accounts.id.renderButton(
    document.getElementById("g_id_signin"),
    { theme: "outline", size: "large" }
  );

  const clickSound = select("#clickSound");
  document.addEventListener("click", e => {
    if (!clickSound) return;
    const t = e.target.tagName.toLowerCase();
    const i = ["button", "a", "input", "label", "div"];
    if (i.includes(t) || e.target.onclick || e.target.classList.contains("nav-item")) {
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {});
    }
  });

  select("#sidebarToggle").onclick = () => {
    select("#sidebar").classList.toggle("open");
    select("#overlay").classList.toggle("active");
  };
  let lastCity = null;

const weatherForm = document.querySelector("#weatherForm");
const weatherOutput = document.querySelector("#weatherContent");

if (weatherForm) {
  weatherForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const city = document.querySelector("#city").value.trim();
    if (!city || city === lastCity) return;

    lastCity = city;
    weatherOutput.textContent = "Loading weather...";

    try {
      const apiKey = "c235c3c0b8aa90de94301809df9a50e4"; 
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
      const data = await res.json();

      if (data.cod !== 200) {
        weatherOutput.textContent = `Error: ${data.message}`;
        return;
      }

      const temp = data.main.temp;
      const desc = data.weather[0].description;
      weatherOutput.textContent = `Weather in ${city}: ${temp}°C, ${desc}`;
    } catch (err) {
      weatherOutput.textContent = "Failed to fetch weather.";
    }
  });
}

});


select("#sidebarToggle").onclick = () => {
    select("#sidebar").classList.toggle("open");
    select("#overlay").classList.toggle("active");
};



select("#overlay").onclick = () => {
    select("#sidebar").classList.remove("open");
    select("#settingsPanel").classList.remove("open");
    select("#overlay").classList.remove("active");
};

document.addEventListener("click", (e) => {
  if (!sidebar.contains(e.target) && e.target !== sidebarToggle && !settingsPanel.contains(e.target)) {
    sidebar.classList.remove("open");
  }
});


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

setInterval(() => {
    const d = new Date();
    select("#clockTime").textContent = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
    select("#clockDate").textContent = d.toLocaleDateString();
}, 1000);

let tempC = null,
    code = null;

const updateWeather = () => {
    if (tempC == null) return;

    const f = (tempC * 9 / 5 + 32).toFixed(1);
    const useF = select("#tempToggle").checked;

    select("#homeWeatherText").textContent =
        `${useF ? f + "°F" : tempC + "°C"} · Code ${code}`;

    select("#weatherContent").textContent =
        `Current temperature: ${tempC}°C / ${f}°F\nWeather code: ${code}`;
};

fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-73.9&current=temperature_2m,weathercode&timezone=auto"
)
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
                d.data?.tiny_url ||
                d.errors?.[0]?.message ||
                "Error";
        })
        .catch(e => {
            select("#shortResult").textContent = "Network error: " + e.message;
        });
};

const key = "I3B9DMLF3EUUP0MY";

select("#stockForm").onsubmit = async e => {
    e.preventDefault();

    const t = select("#ticker").value.trim().toUpperCase();
    if (!t) return;

    select("#quote").innerHTML = '<div class="spinner"></div>';

    try {
        const q = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${t}&apikey=${key}`
        );
        const d = await q.json();
        const g = d["Global Quote"];

        if (!g || !g["05. price"]) throw "no quote";

        select("#quote").textContent =
            `${t}\n💵 Price: $${g["05. price"]}\n📉 Change: ${g["10. change percent"]}`;
    } catch (e) {
        select("#quote").textContent = "Error: " + e;
    }
};

// =========================
// NEW AI CHATBOT LOGIC
// =========================

if (select("#sendBtn")) {

    // Create NEW Supabase client ONLY for AI
    const aiSupabase = window.supabase.createClient(
        "https://yfnwexvsibzqyuqfkepa.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbndleHZzaWJ6cXl1cWZrZXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDM1MzMsImV4cCI6MjA4MzMxOTUzM30.t_AAtIDD0o7IDN8sUdwdtKxoqFyKdw5n6_-l3e0I-kM"
    );

    // Date for AI memory
    const today = new Date();
    const options = { year: "numeric", month: "long", day: "numeric" };
    const currentDate = today.toLocaleDateString("en-US", options);
    select("#date").innerText = currentDate;

    // Chat memory (per session)
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

        // Show user message
        chat.innerHTML += `<div class="message user">${userMessage}</div>`;
        input.value = "";

        // Thinking placeholder
        const thinkingId = "msg-" + Date.now();
        chat.innerHTML += `<div class="message ai" id="${thinkingId}">Thinking...</div>`;
        chat.scrollTop = chat.scrollHeight;

        try {
            // Call Supabase Edge Function
            const { data, error } = await aiSupabase.functions.invoke("hyper-task", {
                body: {
                    message: userMessage,
                    memory: chatMemory
                }
            });

            if (error) throw error;

            const aiMessage = data?.reply || "No response";

            // Update memory
            chatMemory.push({ role: "user", content: userMessage });
            chatMemory.push({ role: "assistant", content: aiMessage });

            // Render markdown
            select(`#${thinkingId}`).innerHTML = marked.parse(aiMessage);
            chat.scrollTop = chat.scrollHeight;

        } catch (err) {
            select(`#${thinkingId}`).innerText = "Error: " + err.message;
        }
    }

    // Event listeners
    select("#sendBtn").onclick = sendMessage;
    select("#userInput").addEventListener("keydown", e => {
        if (e.key === "Enter") sendMessage();
    });
}

const settingsBtn = select("#settingsBtn"),
      settingsPanel = select("#settingsPanel");

settingsBtn.onclick = () => {
    settingsPanel.classList.toggle("open");
    select("#overlay").classList.add("active");
};

document.addEventListener("click", e => {
    if (
        !settingsPanel.contains(e.target) &&
        !settingsBtn.contains(e.target)
    ) {
        settingsPanel.classList.remove("open");
        select("#overlay").classList.remove("active");
    }
});

const darkToggle = select("#darkToggle");
darkToggle.checked = localStorage.getItem("darkMode") === "true";

b.classList.toggle("dark", darkToggle.checked);

darkToggle.onchange = e => {
    const v = e.target.checked;
    b.classList.toggle("dark", v);
    localStorage.setItem("darkMode", v);
};

const savedAccent = localStorage.getItem("accentColor");
if (savedAccent) b.style.setProperty("--accent", savedAccent);

selectAll(".swatch").forEach(s => {
    s.onclick = () => {
        selectAll(".swatch").forEach(x => x.classList.remove("active"));
        s.classList.add("active");

        const c = getComputedStyle(s).backgroundColor;
        b.style.setProperty("--accent", c);
        localStorage.setItem("accentColor", c);
    };
});

let dp;

window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    dp = e;
    select("#installBtn").style.display = "block";
});

select("#installBtn").onclick = () => dp?.prompt();

const dot = select(".cursor-dot"),
      trail = select(".cursor-trail");

let x = 0,
    y = 0;

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

// ----------------------
// Translator Mini‑App
// ----------------------
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
// THEME COLOR SYSTEM FIX
// =========================

selectAll(".swatch").forEach(swatch => {
    swatch.onclick = () => {
        const theme = swatch.dataset.theme;

        // Remove old theme classes
        document.body.classList.forEach(cls => {
            if (cls.startsWith("theme-")) {
                document.body.classList.remove(cls);
            }
        });

        // Apply new theme
        document.body.classList.add("theme-" + theme);

        // Save theme
        localStorage.setItem("theme", theme);

        // Mark active swatch
        selectAll(".swatch").forEach(s => s.classList.remove("active"));
        swatch.classList.add("active");
    };
});

// =========================
// SUPABASE REALTIME CHAT
// =========================

const chatSupabase = supabase.createClient(
    "https://wiswfpfsjiowtrdyqpxy.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpc3dmcGZzamlvd3RyZHlxcHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzg4OTcsImV4cCI6MjA4MzkxNDg5N30.z_4FtM2c8UwgrRlafPYjolQuod4IoHQats95XHio1zM"
);

const chatWindow = document.getElementById("chat-window");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

let chatLoaded = false;
let chatSubscribed = false;

// Add message to UI
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

    const { data, error } = await chatSupabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Load error:", error);
        return;
    }

    data.forEach(msg => addMessage(msg.username, msg.text));
}

// Send a message
async function sendChatMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    // Check if user is logged in
    const { data: userData } = await chatSupabase.auth.getUser();
    if (!userData?.user) {
        openAuthPopup();
        return;
    }

    const user = userData.user;

    const { error } = await chatSupabase.from("messages").insert({
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

// Subscribe to realtime updates once
function subscribeToChat() {
    if (chatSubscribed) return;
    chatSubscribed = true;

    chatSupabase
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

// Detect when Chat page becomes active
const chatObserver = new MutationObserver(() => {
    const chatPage = document.getElementById("page-chat");

    if (chatPage.classList.contains("active")) {
        loadChatHistory();
        subscribeToChat();
    }
});

chatObserver.observe(document.body, { attributes: true, subtree: true });

// Button + Enter key
sendButton.addEventListener("click", sendChatMessage);
messageInput.addEventListener("keydown", e => {
    if (e.key === "Enter") sendChatMessage();
});

// =========================
// SUPABASE AUTH POPUP
// =========================

// Elements
const authPopup = document.getElementById("auth-popup");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authLoginBtn = document.getElementById("auth-login-btn");
const authSignupBtn = document.getElementById("auth-signup-btn");
const authCloseBtn = document.getElementById("auth-close-btn");
const authError = document.getElementById("auth-error");
const openLoginBtn = document.getElementById("open-login-btn");

// -------------------------
// Popup Controls
// -------------------------

function openAuthPopup() {
  authPopup.classList.remove("hidden");
}

function closeAuthPopup() {
  authPopup.classList.add("hidden");
  authError.textContent = "";
}

// -------------------------
// Signup
// -------------------------

authSignupBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    authError.textContent = "Email and password required.";
    return;
  }

  const { error } = await chatSupabase.auth.signUp({ email, password });

  if (error) {
    authError.textContent = error.message;
  } else {
    //authError.textContent = "Check your email to confirm your account.";
    authError.textContent = "✅ Success!!";
  }
});

// -------------------------
// Login
// -------------------------

authLoginBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    authError.textContent = "Email and password required.";
    return;
  }

  const { error } = await chatSupabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    authError.textContent = error.message;
  } else {
    closeAuthPopup();
  }
});

// -------------------------
// Close Button
// -------------------------

authCloseBtn.addEventListener("click", closeAuthPopup);

// -------------------------
// Open Login Button (Main Page)
// -------------------------

openLoginBtn.addEventListener("click", openAuthPopup);

// -------------------------
// Auth State Listener
// -------------------------

chatSupabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    console.log("Logged in as:", session.user.email);
    openLoginBtn.style.display = "none";
  } else {
    console.log("Logged out");
    openLoginBtn.style.display = "block";
  }
});

// =========================
// AUTH BUTTON SWAP LOGIC
// =========================

// Main page buttons
const logoutBtn = document.getElementById("logout-btn");         // Sign Out button
const logoutLabel = document.getElementById("logout-label");     // Text inside logout button

// Logout action
logoutBtn.addEventListener("click", async () => {
  await chatSupabase.auth.signOut();
});

// Auth state listener
chatSupabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    // Extract username before "@"
    const email = session.user.email;
    const username = email.split("@")[0];

    // Update logout button text
    logoutLabel.textContent = `Sign Out — Signed in as ${username}`;

    // Show logout button, hide login button
    openLoginBtn.style.display = "none";
    logoutBtn.style.display = "block";
  } else {
    // Logged out
    openLoginBtn.style.display = "block";
    logoutBtn.style.display = "none";
  }
});
document.getElementById('setBgBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('bgUpload');
  const urlInput = document.getElementById('bgUrl');
  const file = fileInput.files[0];
  const url = urlInput.value.trim();

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      applyBackground(e.target.result);
    };
    reader.readAsDataURL(file);
  } else if (url) {
    applyBackground(url);
  } else {
    alert('Upload a file or paste an image URL.');
  }
});

function applyBackground(imageSrc) {
  document.body.style.backgroundImage = `url('${imageSrc}')`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundAttachment = 'fixed';
  localStorage.setItem('bgImage', imageSrc);
}

// Load saved background on page load
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('bgImage');
  if (saved) applyBackground(saved);
});












