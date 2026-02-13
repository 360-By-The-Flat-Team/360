// Utility Functions
const select = selector => document.querySelector(selector);
const selectAll = selector => document.querySelectorAll(selector);
const b = document.body;

// Initialize Supabase Client
const supa = supabase.createClient(
    "https://dvfsdoybqyxpwtqgffub.supabase.co", 
    "sb_publishable_lP5gD4yHS3jLC0VbLv7ldA_TnoMk3gG"
);

// =========================
// Handle Google Login
// =========================
window.handleGoogleLogin = async (response) => {
    const { credential } = response;
    const { email } = jwt_decode(credential);
    
    // Sign in with the ID token from Google
    const { data, error } = await supa.auth.signInWithIdToken({
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

// Google OAuth Initialize
google.accounts.id.initialize({
    client_id: "1005132717258-eekf4ab0tp00i1k8gcfqa6ettemllnj6.apps.googleusercontent.com",
    callback: handleGoogleLogin
});

// Render the Google sign-in button
google.accounts.id.renderButton(
    document.getElementById("google-login"), // this element will hold the button
    { theme: "outline", size: "large" }
);

// =========================
// Handle GitHub Login
// =========================
document.getElementById('github-login').onclick = async () => {
    const { data, error } = await supa.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.href }  // Optional: redirect to the current page after login
    });

    if (error) {
        console.error('GitHub login error:', error.message);
    } else if (data?.url) {
        window.location.href = data.url;  // Redirect to GitHub OAuth page
    }
};

// =========================
// Auth State Listener
// =========================
supabase.auth.onAuthStateChange((event, session) => {
    const loginBtn = select("#open-login-btn");
    const logoutBtn = select("#logout-btn");

    if (session?.user) {
        console.log("Logged in as:", session.user.email);
        loginBtn.style.display = "none";
        logoutBtn.style.display = "inline-block";
    } else {
        console.log("Logged out");
        loginBtn.style.display = "block";
        logoutBtn.style.display = "none";
    }
});

// Logout Logic
logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    location.reload(); // Reload the page after logout
};

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

window.addEventListener("DOMContentLoaded", () => {
  const select = s => document.querySelector(s);

  // Google Login logic
  google.accounts.id.initialize({
    client_id: "1005132717258-eekf4ab0tp00i1k8gcfqa6ettemllnj6.apps.googleusercontent.com",
    callback: handleGoogleLogin
  });
  google.accounts.id.renderButton(
    document.getElementById("g_id_signin"),
    { theme: "outline", size: "large" }
  );

  // GitHub Login logic
  document.getElementById('github-login').onclick = async () => {
    const { data, error } = await supa.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.href }
    });

    if (error) {
        console.error('GitHub login error:', error.message);
    } else if (data?.url) {
        window.location.href = data.url;
    }
  };

  // Handle auth state change (login/logout UI update)
  supabase.auth.onAuthStateChange((event, session) => {
    const loginBtn = select("#open-login-btn");
    const logoutBtn = select("#logout-btn");

    if (session?.user) {
        console.log("Logged in as:", session.user.email);
        loginBtn.style.display = "none";
        logoutBtn.style.display = "inline-block";
    } else {
        console.log("Logged out");
        loginBtn.style.display = "block";
        logoutBtn.style.display = "none";
    }
  });

  // Logout button
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    location.reload(); // Reload after logout
  };

  // Click sound
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

  // Sidebar Toggle
  select("#sidebarToggle").onclick = () => {
    select("#sidebar").classList.toggle("open");
    select("#overlay").classList.toggle("active");
  };

  // Weather Form
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

  // Sidebar Overlay Close Logic
  select("#overlay").onclick = () => {
      select("#sidebar").classList.remove("open");
      select("#settingsPanel").classList.remove("open");
      select("#overlay").classList.remove("active");
  };

  // Page Navigation
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

  // Clock Display
  setInterval(() => {
      const d = new Date();
      select("#clockTime").textContent = d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
      });
      select("#clockDate").textContent = d.toLocaleDateString();
  }, 1000);

  // Temperature Update
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

  // Short URL Logic
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

  // Stock Info Logic
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

