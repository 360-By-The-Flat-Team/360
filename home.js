/* ============================================================
   360 — HOME.JS V2.0.1
   Home page only logic.
   Handles: Clock, Weather, Temp Unit, Music, URL search param
   ============================================================ */

/* ============================================================
   CLOCK
   ============================================================ */
function updateClock() {
  const now = new Date();
  const el  = document.getElementById("clock");
  if (el) el.textContent = now.toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit"
  });
}
setInterval(updateClock, 1000);
updateClock();

/* ============================================================
   TEMP UNIT
   ============================================================ */
let tempUnit  = localStorage.getItem("tempUnit") || "C";
let lastTempC = null;

function celsiusToFahrenheit(c) {
  return Math.round((c * 9 / 5) + 32);
}

function updateWeatherChip() {
  const chip = document.getElementById("weatherChip");
  if (!chip || lastTempC === null) return;
  chip.textContent = tempUnit === "C"
    ? `${Math.round(lastTempC)}°C`
    : `${celsiusToFahrenheit(lastTempC)}°F`;
}

function updateTempUnitLabel() {
  const label = document.getElementById("tempUnitLabel");
  if (label) label.textContent = tempUnit === "C" ? "°C" : "°F";
}

const tempUnitBtn = document.getElementById("tempUnitBtn");
if (tempUnitBtn) {
  tempUnitBtn.addEventListener("click", () => {
    tempUnit = tempUnit === "C" ? "F" : "C";
    localStorage.setItem("tempUnit", tempUnit);
    updateTempUnitLabel();
    updateWeatherChip();
  });
}
updateTempUnitLabel();

/* ============================================================
   WEATHER CHIP (Geolocation + Open-Meteo)
   ============================================================ */
async function loadWeather() {
  const chip = document.getElementById("weatherChip");
  if (!chip) return;

  if (!navigator.geolocation) {
    chip.textContent = "Weather N/A";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const res  = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const data = await res.json();
        lastTempC  = data.current_weather.temperature;
        updateWeatherChip();
      } catch {
        chip.textContent = "Weather N/A";
      }
    },
    () => { chip.textContent = "Weather N/A"; }
  );
}
loadWeather();

/* ============================================================
   MUSIC PLAYER
   ============================================================ */
const music       = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");
let musicEnabled  = localStorage.getItem("music") === "true";

function syncMusicUI() {
  if (musicToggle) musicToggle.textContent = musicEnabled ? "Music: On" : "Music: Off";
}

if (musicToggle && music) {
  if (musicEnabled) {
    music.play().catch(() => {
      musicEnabled = false;
      localStorage.setItem("music", false);
      syncMusicUI();
    });
  }

  musicToggle.addEventListener("click", async () => {
    musicEnabled = !musicEnabled;
    localStorage.setItem("music", musicEnabled);
    if (musicEnabled) {
      try { await music.play(); } catch (e) { console.error("Music error:", e); }
    } else {
      music.pause();
    }
    syncMusicUI();
  });
}
syncMusicUI();

/* ============================================================
   AUTO-SEARCH FROM URL PARAMETER
   Handles Chrome address bar searches:
   https://360-search.com/?q=your+search+term
   ============================================================ */
(function autoSearchFromURL() {
  const params = new URLSearchParams(window.location.search);
  const query  = params.get("q");
  if (!query) return;

  window.__gcse = window.__gcse || {};
  const existingCallback = window.__gcse.initializationCallback;

  window.__gcse.initializationCallback = function () {
    if (existingCallback) existingCallback();
    if (!trySearch(query)) {
      const interval = setInterval(() => {
        if (trySearch(query)) clearInterval(interval);
      }, 100);
      setTimeout(() => clearInterval(interval), 5000);
    }
  };

  function trySearch(q) {
    if (window.google?.search?.cse?.element) {
      const el = window.google.search.cse.element.getElement("searchresults-only0")
               || window.google.search.cse.element.getElement("searchresults0");
      if (el) { el.execute(q); return true; }
    }
    const input = document.querySelector("input.gsc-input");
    const btn   = document.querySelector("button.gsc-search-button, .gsc-search-button-v2");
    if (input && btn) {
      input.value = q;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      btn.click();
      return true;
    }
    return false;
  }

  document.title = `${query} — 360`;
})();

/* ============================================================
   READY LOG
   ============================================================ */
console.log("%c360 V2.0.1 — home.js loaded", "color:#38bdf8;font-weight:bold;font-size:14px;");
