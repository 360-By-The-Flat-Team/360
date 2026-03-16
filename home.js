/* ============================================================
   360 — HOME.JS
   Home page only logic.
   Handles: Clock, Weather, Temp Unit, Music
   Requires: main.js loaded first (supabaseClient available)
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
   TEMP UNIT — persisted, shared with weather chip
   ============================================================ */
let tempUnit   = localStorage.getItem("tempUnit") || "C";
let lastTempC  = null; // store raw °C so we can reconvert on toggle

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
    updateWeatherChip(); // re-render chip with new unit
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
   MUSIC PLAYER (real audio element)
   ============================================================ */
const music       = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");

let musicEnabled = localStorage.getItem("music") === "true";

function syncMusicUI() {
  if (musicToggle) musicToggle.textContent = musicEnabled ? "Music: On" : "Music: Off";
}

if (musicToggle && music) {
  // Auto-play if user had it on last session
  if (musicEnabled) {
    music.play().catch(() => {
      // Autoplay blocked — wait for user interaction
      musicEnabled = false;
      localStorage.setItem("music", false);
      syncMusicUI();
    });
  }

  musicToggle.addEventListener("click", async () => {
    musicEnabled = !musicEnabled;
    localStorage.setItem("music", musicEnabled);

    if (musicEnabled) {
      try { await music.play(); }
      catch (e) { console.error("Music error:", e); }
    } else {
      music.pause();
    }

    syncMusicUI();
  });
}
syncMusicUI();

/* ============================================================
   READY LOG
   ============================================================ */
console.log("%c360 V2.0 — home.js loaded", "color:#38bdf8;font-weight:bold;font-size:14px;");
