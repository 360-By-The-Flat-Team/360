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

    const clickSound = select("#clickSound");

    document.addEventListener("click", e => {
        if (!clickSound) return;

        const t = e.target.tagName.toLowerCase();
        const i = ["button", "a", "input", "label", "div"];

        if (
            i.includes(t) ||
            e.target.onclick ||
            e.target.classList.contains("nav-item")
        ) {
            clickSound.currentTime = 0;
            clickSound.play().catch(() => {});
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

    if (select("#sendBtn")) {
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
});
