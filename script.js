// === Helper Functions (expanded) ===
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const b = document.body;

// === Supabase + Google Sign-In ===
const supa = supabase.createClient(
    "https://dvfsdoybqyxpwtqgffub.supabase.co",
    "sb_publishable_lP5gD4yHS3jLC0VbLv7ldA_TnoMk3gG"
);

window.handleCredentialResponse = async (response) => {
    try {
        const user = jwt_decode(response.credential);

        const container = document.querySelector(".home-inner");
        const profileBox = document.createElement("div");
        profileBox.style = "display:flex;flex-direction:column;align-items:center;margin-top:20px";

        const img = document.createElement("img");
        img.src = user.picture;
        img.style = "width:80px;height:80px;border-radius:50%";

        const name = document.createElement("span");
        name.textContent = user.name;
        name.style = "margin-top:10px;font-weight:bold";

        profileBox.append(img, name);
        container.append(profileBox);

        await supa.from("users").upsert([
            {
                id: user.sub,
                name: user.name,
                avatar_url: user.picture,
                created_at: new Date().toISOString()
            }
        ]);
    } catch (e) {
        console.error(e);
    }
};

window.addEventListener("DOMContentLoaded", () => {

    // === Sidebar ===
    document.querySelector("#sidebarToggle").onclick = () => {
        const sidebar = document.querySelector("#sidebar");
        const overlay = document.querySelector("#overlay");

        sidebar.classList.toggle("open");
        overlay.classList.toggle("active");
    };

    document.querySelector("#overlay").onclick = () => {
        const sidebar = document.querySelector("#sidebar");
        const overlay = document.querySelector("#overlay");

        sidebar.classList.remove("open");
        overlay.classList.remove("active");
    };

    document.querySelectorAll(".nav-item").forEach(navItem => {
        navItem.onclick = () => {

            document.querySelectorAll(".nav-item").forEach(item => {
                item.classList.remove("active");
            });

            navItem.classList.add("active");

            const pageName = navItem.dataset.page;

            document.querySelectorAll(".page").forEach(page => {
                page.classList.remove("active");
            });

            const targetPage = document.querySelector("#page-" + pageName);
            targetPage.classList.add("active");

            document.querySelector("#sidebar").classList.remove("open");
            document.querySelector("#overlay").classList.remove("active");
        };
    });

    document.querySelector(".ai").onclick = () => {
        window.location.href = "/ai.html";
    };
    
    document.querySelector(".weather").onclick = () => {
        window.location.href = "/weather.html";
    };
    
    document.querySelector(".back-btn").onclick = () => {
        location.reload();
    };

    // === Clock ===
    setInterval(() => {
        const d = new Date();
        document.querySelector("#clockTime").textContent =
            d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        document.querySelector("#clockDate").textContent =
            d.toLocaleDateString();
    }, 1000);

    // === Weather with °C/°F toggle ===
    let tempC = null, code = null;

    const updateWeather = () => {
        if (tempC == null) return;

        const f = (tempC * 9 / 5 + 32).toFixed(1);
        const useF = document.querySelector("#tempToggle").checked;

        document.querySelector("#homeWeatherText").textContent =
            `${useF ? f + "°F" : tempC + "°C"} · Code ${code}`;

        document.querySelector("#weatherContent").textContent =
            `Current temperature: ${tempC}°C / ${f}°F\nWeather code: ${code}`;
    };

    fetch("https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-73.9&current=temperature_2m,weathercode&timezone=auto")
        .then(r => r.json())
        .then(data => {
            tempC = data.current.temperature_2m;
            code = data.current.weathercode;
            updateWeather();
        })
        .catch(() => {
            document.querySelector("#homeWeatherText").textContent = "Weather unavailable";
            document.querySelector("#weatherContent").textContent = "Could not load weather data.";
        });

    document.querySelector("#tempToggle").onchange = updateWeather;

    // === Shortener ===
    document.querySelector("#shortBtn").onclick = () => {
        const url = document.querySelector("#shortInput").value.trim();
        if (!url) return;

        fetch("https://api.tinyurl.com/create?api_token=YOUR_TOKEN", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        })
            .then(r => r.json())
            .then(data => {
                document.querySelector("#shortResult").textContent =
                    data.data?.tiny_url || data.errors?.[0]?.message || "Error";
            })
            .catch(e => {
                document.querySelector("#shortResult").textContent = "Network error: " + e.message;
            });
    };

    // === Stocks ===
    const key = "I3B9DMLF3EUUP0MY";
    const ctx = document.querySelector("#chart").getContext("2d");
    let chart;

    document.querySelector("#stockForm").onsubmit = async (e) => {
        e.preventDefault();

        const ticker = document.querySelector("#ticker").value.trim().toUpperCase();
        if (!ticker) return;

        document.querySelector("#quote").innerHTML = '<div class="spinner"></div>';

        try {
            const q = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${key}`);
            const qd = await q.json();
            const g = qd["Global Quote"];

            if (!g || !g["05. price"]) throw "no quote";

            document.querySelector("#quote").textContent =
                `${ticker}\n💵 Price: $${g["05. price"]}\n📉 Change: ${g["10. change percent"]}`;

            const s = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${key}`);
            const sd = await s.json();
            const ts = sd["Time Series (Daily)"];

            if (!ts) throw "no series";

            const dates = Object.keys(ts).slice(0, 30).reverse();
            const prices = dates.map(d => +ts[d]["4. close"]);

            if (chart) chart.destroy();

            chart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: dates,
                    datasets: [{
                        label: ticker,
                        data: prices,
                        borderColor: "#6aa9ff",
                        backgroundColor: "rgba(106,169,255,0.2)",
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    animation: {
                        duration: 1200,
                        easing: "easeOutQuart"
                    },
                    plugins: {
                        legend: {
                            labels: { color: "#e7e7ea" }
                        }
                    },
                    scales: {
                        x: { ticks: { color: "#e7e7ea" } },
                        y: { ticks: { color: "#e7e7ea" } }
                    }
                }
            });

        } catch (e) {
            document.querySelector("#quote").textContent = "Error: " + e;
        }
    };

    // === Settings ===
    document.addEventListener("click", e => {
        if (!document.querySelector("#settingsPanel").contains(e.target) &&
            !document.querySelector("#settingsBtn").contains(e.target)) {
            document.querySelector("#settingsPanel").classList.remove("open");
        }
    });
    
    document.querySelector("#settingsBtn").onclick = () =>
        document.querySelector("#settingsPanel").classList.toggle("open");

    const darkToggle = document.querySelector("#darkToggle");
    darkToggle.checked = localStorage.getItem("darkMode") === "true";
    b.classList.toggle("dark", darkToggle.checked);

    darkToggle.onchange = (e) => {
        const value = e.target.checked;
        b.classList.toggle("dark", value);
        localStorage.setItem("darkMode", value);
    };

    const savedAccent = localStorage.getItem("accentColor");
    if (savedAccent) b.style.setProperty("--accent", savedAccent);

    document.querySelectorAll(".swatch").forEach(swatch => {
        swatch.onclick = () => {
            document.querySelectorAll(".swatch").forEach(x => x.classList.remove("active"));
            swatch.classList.add("active");

            const color = getComputedStyle(swatch).backgroundColor;
            b.style.setProperty("--accent", color);
            localStorage.setItem("accentColor", color);
        };
    });

    // === Install Prompt ===
    let dp;
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        dp = e;
        document.querySelector("#installBtn").style.display = "block";
    });

    document.querySelector("#installBtn").onclick = () => dp.prompt();

    // === Cursor ===
    const dot = document.querySelector(".cursor-dot");
    const trail = document.querySelector(".cursor-trail");
    let x = 0, y = 0;

    document.addEventListener("mousemove", (e) => {
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

    // === Music ===
    const music = document.querySelector("#bgMusic");
    const toggle = document.querySelector("#musicToggle");
    
    console.log("music element:", music);
    console.log("toggle element:", toggle);
    
    if (!music || !toggle) {
        console.error("Missing #bgMusic or #musicToggle in the DOM");
    } else {
        toggle.addEventListener("click", async () => {
            console.log("Toggle clicked. Music paused?", music.paused);
    
            if (music.paused) {
                try {
                    await music.play();
                    toggle.textContent = "🔈 Music - Playing";
                    console.log("Music playing");
                } catch (err) {
                    console.error("Error calling music.play():", err);
                }
            } else {
                music.pause();
                toggle.textContent = "🔇 Music - Paused";
                console.log("Music paused");
            }
        });
    }

});