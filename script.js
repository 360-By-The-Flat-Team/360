// =========================
// GLOBAL HELPERS
// =========================
const select = selector => document.querySelector(selector);
const selectAll = selector => document.querySelectorAll(selector);
const b = document.body;

// Main Supabase client (your original project)
const supa = supabase.createClient(
    "https://dvfsdoybqyxpwtqgffub.supabase.co",
    "sb_publishable_lP5gD4yHS3jLC0VbLv7ldA_TnoMk3gG"
);

// AI Supabase client (FIXED — correct project + correct anon key)
window.aiSupabase = window.supabase.createClient(
    "https://wiswfpfsjiowtrdyqpxy.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpc3dmcGZzamlvd3RyZHlxcHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzg4OTcsImV4cCI6MjA4MzkxNDg5N30.z_4FtM2c8UwgrRlafPYjolQuod4IoHQats95XHio1zM"
);

// =========================
// LOAD SAVED THEME
// =========================
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    document.body.classList.add("theme-" + savedTheme);

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
            document.getElementById("auth-error").textContent =
                "Google sign-in failed: " + error.message;
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
        const clickable = ["button", "a", "input", "label", "div"];

        if (clickable.includes(t) || e.target.onclick || e.target.classList.contains("nav-item")) {
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
            } catch (err) {
                weatherOutput.textContent = "Failed to fetch weather.";
            }
        });
    }
});
// ==========================================================================
//      AI SYSTEM | TRUSTTT, SUPER COOL CAUSE IT'S POWERED BY GROQ
// ==========================================================================

if (select("#sendBtn")) {

    // Fetch AI API key from Supabase (from api.config)
    async function fetchAiKey() {
        const { data, error } = await window.aiSupabase
            .from("config")
            .select("value")
            .eq("key", "groq_api_key")
            .single();

        if (error) {
            console.error("AI key fetch failed:", error);
            return null;
        }

        return data?.value || null;
    }

    // Date for memory
    const today = new Date();
    const currentDate = today.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
    select("#date").innerText = currentDate;

    // Chat memory
    const chatMemory = [
        {
            role: "system",
            content: `You are a helpful AI assistant. Today's date is ${currentDate}.`
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
            // Get AI key
            const apiKey = await fetchAiKey();
            if (!apiKey) {
                select(`#${thinkingId}`).innerText =
                    "Error: Missing AI API key. Please contact us or try again later.";
                return;
            }

            // Call Groq API directly
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "llama3-70b-8192",
                    messages: [
                        ...chatMemory,
                        { role: "user", content: userMessage }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });

            const json = await response.json();
            const aiMessage = json?.choices?.[0]?.message?.content || "No response";

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

const authPopup = document.getElementById("auth-popup");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authLoginBtn = document.getElementById("auth-login-btn");
const authSignupBtn = document.getElementById("auth-signup-btn");
const authCloseBtn = document.getElementById("auth-close-btn");
const authError = document.getElementById("auth-error");
const openLoginBtn = document.getElementById("open-login-btn");

// Popup Controls
function openAuthPopup() {
    authPopup.classList.remove("hidden");
}

function closeAuthPopup() {
    authPopup.classList.add("hidden");
    authError.textContent = "";
}

// Signup
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
        authError.textContent = "✅ Success!!";
    }
});

// Login
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

// Close Button
authCloseBtn.addEventListener("click", closeAuthPopup);

// Open Login Button
openLoginBtn.addEventListener("click", openAuthPopup);

// Auth State Listener
chatSupabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
        console.log("Logged in as:", session.user.email);
        openLoginBtn.style.display = "none";
    } else {
        console.log("Logged out");
        openLoginBtn.style.display = "block";
    }
});

// Duplicate listener (kept exactly as you had it)
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
// BACKGROUND IMAGE SYSTEM
// =========================

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


// =========================
// CURSOR EFFECT
// =========================

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


// =========================
// MUSIC TOGGLE
// =========================

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
