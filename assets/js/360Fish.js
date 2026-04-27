/* ============================================================
   360FISH ULTRA+ — CORE ENGINE
   Hybrid DOM + Canvas Engine
   Author: Z + Copilot
============================================================ */

/* ============================================================
   GLOBAL STATE
============================================================ */
const state = {
  day: 1,
  distance: 0,
  biome: "coastal shallows",
  time: 0, // 0–1 normalized day cycle
  weather: "clear",
  stormIntensity: 0,
  fogIntensity: 0,
  resources: {
    food: 0,
    wood: 0,
    metal: 0,
    fuel: 0,
    cloth: 0,
    rope: 0,
    artifacts: 0
  },
  upgrades: {
    hull: 1,
    engine: 1,
    storage: 1,
    rod: 1,
    sonar: 0,
    autoreel: 0
  },
  particles: [],
  waveOffset: 0,
  saveKey: "360fish_save"
};

/* ============================================================
   DOM HOOKS
============================================================ */
const el = {
  day: document.getElementById("day-counter"),
  distance: document.getElementById("distance-counter"),
  biome: document.getElementById("biome-label"),
  status: document.getElementById("status-text"),
  tensionFill: document.getElementById("tension-fill"),
  depth: document.getElementById("depth-meter"),
  lootPopup: document.getElementById("loot-popup"),
  eventBanner: document.getElementById("event-banner"),
  rain: document.getElementById("rain-layer"),
  fog: document.getElementById("fog-layer"),
  flash: document.getElementById("storm-flash"),
  sun: document.getElementById("sun"),
  moon: document.getElementById("moon"),
  boat: document.getElementById("boat")
};

/* ============================================================
   CANVAS SETUP
============================================================ */
const waterBack = document.getElementById("water-back");
const waterMid = document.getElementById("water-mid");
const waterFront = document.getElementById("water-front");
const particleCanvas = document.getElementById("particle-layer");

const ctxBack = waterBack.getContext("2d");
const ctxMid = waterMid.getContext("2d");
const ctxFront = waterFront.getContext("2d");
const ctxParticles = particleCanvas.getContext("2d");

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight * 0.6;

  [waterBack, waterMid, waterFront, particleCanvas].forEach(c => {
    c.width = w;
    c.height = h;
  });
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* ============================================================
   SAVE / LOAD
============================================================ */
function saveGame() {
  localStorage.setItem(state.saveKey, JSON.stringify(state));
}

function loadGame() {
  const data = localStorage.getItem(state.saveKey);
  if (!data) return;
  try {
    const loaded = JSON.parse(data);
    Object.assign(state, loaded);
  } catch (e) {
    console.warn("Save corrupted, ignoring.");
  }
}
loadGame();

/* ============================================================
   DAY / NIGHT CYCLE
============================================================ */
function updateDayNight(dt) {
  state.time += dt * 0.00003; // slow cycle
  if (state.time > 1) {
    state.time = 0;
    state.day++;
    el.day.textContent = `Day ${state.day}`;
  }

  const t = state.time;

  // sun visible in first half
  el.sun.style.opacity = t < 0.5 ? 1 - t * 2 : 0;

  // moon visible in second half
  el.moon.style.opacity = t > 0.5 ? (t - 0.5) * 2 : 0;

  // sky tint
  document.body.style.background = t < 0.5
    ? `rgba(10,20,40,1)`
    : `rgba(2,4,10,1)`;
}

/* ============================================================
   WEATHER SYSTEM
============================================================ */
function updateWeather(dt) {
  // random chance to start storm
  if (Math.random() < 0.00002) {
    state.weather = "storm";
    state.stormIntensity = 1;
  }

  // random fog
  if (Math.random() < 0.00001) {
    state.weather = "fog";
    state.fogIntensity = 1;
  }

  // clear weather
  if (Math.random() < 0.000015) {
    state.weather = "clear";
  }

  // apply weather visuals
  if (state.weather === "storm") {
    el.rain.style.opacity = 0.8;
    state.stormIntensity = Math.max(0, state.stormIntensity - dt * 0.00005);

    // lightning flash
    if (Math.random() < 0.002) {
      el.flash.style.opacity = 1;
      setTimeout(() => (el.flash.style.opacity = 0), 80);
    }
  } else {
    el.rain.style.opacity = 0;
  }

  if (state.weather === "fog") {
    el.fog.style.opacity = state.fogIntensity;
    state.fogIntensity = Math.max(0, state.fogIntensity - dt * 0.00002);
  } else {
    el.fog.style.opacity = 0;
  }
}

/* ============================================================
   BIOME SYSTEM
============================================================ */
function updateBiome() {
  const d = state.distance;

  let biome = "coastal shallows";
  if (d > 300) biome = "open sea";
  if (d > 900) biome = "deep blue";
  if (d > 2000) biome = "storm belt";
  if (d > 4000) biome = "forgotten trench";

  state.biome = biome;
  el.biome.textContent = biome;
}

/* ============================================================
   WAVE ENGINE
============================================================ */
function drawWaves(ctx, speed, height, color) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(0, h);

  for (let x = 0; x < w; x++) {
    const y = h - Math.sin((x + state.waveOffset * speed) * 0.01) * height - 20;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function updateWaves(dt) {
  state.waveOffset += dt * 0.1;

  drawWaves(ctxBack, 0.3, 6, "#0a2a45");
  drawWaves(ctxMid, 0.6, 10, "#0c3a60");
  drawWaves(ctxFront, 1.0, 14, "#0e4a7a");
}

/* ============================================================
   PARTICLE ENGINE
============================================================ */
function spawnParticle(x, y, color) {
  state.particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -Math.random() * 0.6,
    life: 1,
    color
  });
}

function updateParticles(dt) {
  const p = state.particles;
  const w = particleCanvas.width;
  const h = particleCanvas.height;

  ctxParticles.clearRect(0, 0, w, h);

  for (let i = p.length - 1; i >= 0; i--) {
    const part = p[i];
    part.x += part.vx * dt * 0.1;
    part.y += part.vy * dt * 0.1;
    part.life -= dt * 0.0005;

    if (part.life <= 0) {
      p.splice(i, 1);
      continue;
    }

    ctxParticles.globalAlpha = part.life;
    ctxParticles.fillStyle = part.color;
    ctxParticles.fillRect(part.x, part.y, 3, 3);
  }
}

/* ============================================================
   BOAT PHYSICS
============================================================ */
function updateBoat(dt) {
  const bob = Math.sin(Date.now() * 0.001) * 4;
  el.boat.style.transform = `translateX(-50%) translateY(${bob}px)`;
}

/* ============================================================
   RESOURCE + UPGRADE SYSTEM
============================================================ */
function addResource(type, amount) {
  state.resources[type] += amount;
  document.getElementById(`res-${type}`).textContent = state.resources[type];
  saveGame();
}

function upgrade(type) {
  const cost = state.upgrades[type] * 5;

  if (state.resources.metal < cost) {
    el.status.textContent = "not enough metal";
    return;
  }

  state.resources.metal -= cost;
  state.upgrades[type]++;

  document.getElementById(`res-metal`).textContent = state.resources.metal;
  document.getElementById(`up-${type}-lv`).textContent = state.upgrades[type];

  el.status.textContent = `${type} upgraded`;
  saveGame();
}

document.querySelectorAll(".upgrade-btn").forEach(btn => {
  btn.addEventListener("click", () => upgrade(btn.dataset.up));
});

/* ============================================================
   LOOT POPUP
============================================================ */
function showLoot(text, color) {
  const elp = el.lootPopup;
  elp.textContent = text;
  elp.style.color = color;
  elp.style.opacity = 1;

  setTimeout(() => (elp.style.opacity = 0), 1200);
}

/* ============================================================
   MAIN LOOP
============================================================ */
let last = performance.now();

function loop(now) {
  const dt = now - last;
  last = now;

  updateDayNight(dt);
  updateWeather(dt);
  updateBiome();
  updateWaves(dt);
  updateParticles(dt);
  updateBoat(dt);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

/* ============================================================
   EXPORTS FOR FISHING ENGINE
============================================================ */
window.FishCore = {
  state,
  addResource,
  showLoot,
  spawnParticle,
  saveGame
};
