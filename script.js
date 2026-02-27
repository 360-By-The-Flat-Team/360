// Utility Functions
const select = s => document.querySelector(s);
const selectAll = s => document.querySelectorAll(s);

// Supabase Auth Client (already initialized in index.html as `supabase`)

// Auth Buttons
const openLoginBtn = select("#open-login-btn");
const logoutBtn = select("#logout-btn");
const authPopup = select("#auth-popup");
const loginBtn = select("#auth-login-btn");
const signupBtn = select("#auth-signup-btn");
const closeBtn = select("#auth-close-btn");
const errorMsg = select("#auth-error");

// Auth UI
openLoginBtn.onclick = () => {
  authPopup.classList.remove("hidden");
  errorMsg.textContent = "";
};
closeBtn.onclick = () => authPopup.classList.add("hidden");

// Email Login
loginBtn.onclick = async () => {
  const email = select("#auth-email").value;
  const password = select("#auth-password").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errorMsg.textContent = error.message;
  } else {
    location.reload();
  }
};

// Email Signup
signupBtn.onclick = async () => {
  const email = select("#auth-email").value;
  const password = select("#auth-password").value;
  const { error } = await supabase.auth.signUp({ email, password });
  errorMsg.textContent = error ? error.message : "Check your email to confirm your account!";
};

// Logout
logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

// Auth State
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    logoutBtn.style.display = "inline-block";
    openLoginBtn.style.display = "none";
    const label = select("#logout-label");
    if (label) label.textContent = `(${session.user.email})`;
  }
});

// Theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  document.body.classList.add("theme-" + savedTheme);
  const swatch = select(`.swatch[data-theme="${savedTheme}"]`);
  if (swatch) swatch.classList.add("active");
}
window.addEventListener("DOMContentLoaded", () => {
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

  // Sidebar toggle
  select("#sidebarToggle").onclick = () => {
    select("#sidebar").classList.toggle("open");
    select("#overlay").classList.toggle("active");
  };

  // Overlay click to close sidebar/settings
  select("#overlay").onclick = () => {
    select("#sidebar").classList.remove("open");
    select("#settingsPanel")?.classList.remove("open");
    select("#overlay").classList.remove("active");
  };

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

  // Back buttons
  selectAll(".back-btn").forEach(b => {
    b.onclick = () => {
      selectAll(".page").forEach(p => p.classList.remove("active"));
      select("#page-main360").classList.add("active");
    };
  });

  // Clock
  setInterval(() => {
    const d = new Date();
    select("#clockTime").textContent = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    select("#clockDate").textContent = d.toLocaleDateString();
  }, 1000);

  // Weather form
  const weatherForm = select("#weatherForm");
  const weatherOutput = select("#weatherContent");
  let lastCity = null;

  if (weatherForm) {
    weatherForm.addEventListener("submit", async e => {
      e.preventDefault();
      const city = select("#city").value.trim();
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
  // Temperature toggle
  let tempC = null, code = null;

  const updateWeather = () => {
    if (tempC == null) return;
    const f = (tempC * 9 / 5 + 32).toFixed(1);
    const useF = select("#tempToggle").checked;

    select("#homeWeatherText").textContent =
      `${useF ? f + "°F" : tempC + "°C"} · Code ${code}`;

    select("#weatherContent").textContent =
      `Current temperature: ${tempC}°C / ${f}°F\nWeather code: ${code}`;
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

  // URL Shortener
  select("#shortBtn").onclick = () => {
    const url = select("#shortInput").value.trim();
    if (!url) return;

    fetch("https://api.tinyurl.com/create?api_token=V5ZvSYBwbNLS1EpVsspGYIFuwrUjuHfYkhj0RDVXzqnatqcatFU6vNvSJ9j6", {
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

  // Stock Quotes
  const stockKey = "I3B9DMLF3EUUP0MY";
  select("#stockForm").onsubmit = async e => {
    e.preventDefault();
    const t = select("#ticker").value.trim().toUpperCase();
    if (!t) return;

    select("#quote").innerHTML = '<div class="spinner"></div>';

    try {
      const q = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${t}&apikey=${stockKey}`);
      const d = await q.json();
      const g = d["Global Quote"];

      if (!g || !g["05. price"]) throw "no quote";

      select("#quote").textContent =
        `${t}\n💵 Price: $${g["05. price"]}\n📉 Change: ${g["10. change percent"]}`;
    } catch (e) {
      select("#quote").textContent = "Error: " + e;
    }
  };

  // AI Chatbot
  if (select("#sendBtn")) {
    const aiSupabase = supabase.createClient(
      "https://yfnwexvsibzqyuqfkepa.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbndleHZzaWJ6cXl1cWZrZXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDM1MzMsImV4cCI6MjA4MzMxOTUzM30.t_AAtIDD0o7IDN8sUdwdtKxoqFyKdw5n6_-l3e0I-kM"
    );

    const today = new Date();
    const options = { year: "numeric", month: "long", day: "numeric" };
    const currentDate = today.toLocaleDateString("en-US", options);
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
          body: {
            message: userMessage,
            memory: chatMemory
          }
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
// Temperature toggle (Open-Meteo)
tempC = null
code = null;

const updateWeather = () => {
  if (tempC == null) return;
  const f = (tempC * 9 / 5 + 32).toFixed(1);
  const useF = select("#tempToggle").checked;

  select("#homeWeatherText").textContent =
    `${useF ? f + "°F" : tempC + "°C"} · Code ${code}`;

  const weatherContent = select("#weatherContent");
  if (weatherContent) {
    weatherContent.textContent =
      `Current temperature: ${tempC}°C / ${f}°F\nWeather code: ${code}`;
  }
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

select("#tempToggle")?.addEventListener("change", updateWeather);

// URL Shortener
select("#shortBtn")?.addEventListener("click", () => {
  const url = select("#shortInput").value.trim();
  if (!url) return;

  fetch("https://api.tinyurl.com/create?api_token=V5ZvSYBwbNLS1EpVsspGYIFuwrUjuHfYkhj0RDVXzqnatqcatFU6vNvSJ9j6", {
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
});

// Stock Quotes
const stockKey = "I3B9DMLF3EUUP0MY";
select("#stockForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const t = select("#ticker").value.trim().toUpperCase();
  if (!t) return;

  select("#quote").innerHTML = '<div class="spinner"></div>';

  try {
    const q = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${t}&apikey=${stockKey}`);
    const d = await q.json();
    const g = d["Global Quote"];

    if (!g || !g["05. price"]) throw "No quote found.";

    select("#quote").textContent =
      `${t}\n💵 Price: $${g["05. price"]}\n📉 Change: ${g["10. change percent"]}`;
  } catch (e) {
    select("#quote").textContent = "Error: " + e;
  }
});

// AI Chatbot (separate Supabase client)
const aiSupabase = supabase.createClient(
  "https://yfnwexvsibzqyuqfkepa.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbndleHZzaWJ6cXl1cWZrZXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDM1MzMsImV4cCI6MjA4MzMxOTUzM30.t_AAtIDD0o7IDN8sUdwdtKxoqFyKdw5n6_-l3e0I-kM"
);

if (select("#sendBtn")) {
  const today = new Date();
  const options = { year: "numeric", month: "long", day: "numeric" };
  const currentDate = today.toLocaleDateString("en-US", options);
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
        body: {
          message: userMessage,
          memory: chatMemory
        }
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

  select("#sendBtn").addEventListener("click", sendMessage);
  select("#userInput").addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
  });
}
