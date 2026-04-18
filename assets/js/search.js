// ===============================
// 360 SEARCH V3 — FULL REWRITE
// ===============================

// DOM refs
const resultsContainer = document.getElementById("resultsContainer");
const imageResults = document.getElementById("imageResults");
const knowledgePanel = document.getElementById("knowledgePanel");
const stripSearchInput = document.getElementById("strip-search-input");
const stripSearchForm = document.getElementById("strip-search-form");
const safeSelect = document.getElementById("safeSelect");
const paaSection = document.getElementById("paaSection");
const paaList = document.getElementById("paaList");
const loader = document.getElementById("frame-loader");
const noQueryBox = document.getElementById("no-query");
const tabAll = document.getElementById("tabAll");
const tabImages = document.getElementById("tabImages");
const listViewBtn = document.getElementById("listViewBtn");
const gridViewBtn = document.getElementById("gridViewBtn");

// SPEED TEST DOM
const speedModule = document.getElementById("speedTestModule");
const speedCanvas = document.getElementById("speedometer");
const pingEl = document.getElementById("pingResult");
const downEl = document.getElementById("downloadResult");
const upEl = document.getElementById("uploadResult");
const unitLabel = document.getElementById("unitLabel");
const unitLabel2 = document.getElementById("unitLabel2");
const speedFeedback = document.getElementById("speedFeedback");
const speedResultsBox = document.getElementById("speedResults");
const startSpeedTestBtn = document.getElementById("startSpeedTest");
const unitSelect = document.getElementById("unitSelect");

// ===============================
// URL QUERY → INPUT + AUTO SEARCH
// ===============================
const params = new URLSearchParams(window.location.search);
const initialQ = params.get("q");

if (initialQ) {
  stripSearchInput.value = initialQ;
  runSearch(initialQ);
}

// ===============================
// MAIN SEARCH HANDLER
// ===============================
stripSearchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = stripSearchInput.value.trim();
  if (!q) return;
  runSearch(q);
});

// ===============================
// TAB SWITCHING
// ===============================
tabAll.addEventListener("click", () => {
  tabAll.classList.add("active");
  tabImages.classList.remove("active");
  resultsContainer.classList.remove("hidden");
  imageResults.classList.add("hidden");
});

tabImages.addEventListener("click", () => {
  tabImages.classList.add("active");
  tabAll.classList.remove("active");
  resultsContainer.classList.add("hidden");
  imageResults.classList.remove("hidden");
});

// ===============================
// VIEW TOGGLE
// ===============================
listViewBtn.addEventListener("click", () => {
  listViewBtn.classList.add("active");
  gridViewBtn.classList.remove("active");
  resultsContainer.classList.add("list-view");
  resultsContainer.classList.remove("grid-view");
});

gridViewBtn.addEventListener("click", () => {
  gridViewBtn.classList.add("active");
  listViewBtn.classList.remove("active");
  resultsContainer.classList.remove("list-view");
  resultsContainer.classList.add("grid-view");
});

// ===============================
// SPEED KEYWORD DETECTION
// ===============================
const speedKeywords = [
  "speed test", "speedtest", "internet speed", "wifi speed",
  "network speed", "ping test", "latency test", "speed check"
];

function shouldShowSpeedTest(query) {
  const q = query.toLowerCase();
  return speedKeywords.some(k => q.includes(k));
}

// ===============================
// RUN SEARCH (HOOK TO YOUR EDGE FUNCTION)
// ===============================
async function runSearch(query) {
  // Speed test visibility
  if (shouldShowSpeedTest(query)) {
    speedModule.classList.remove("hidden");
  } else {
    speedModule.classList.add("hidden");
  }

  loader.classList.add("visible");
  noQueryBox.classList.remove("visible");
  resultsContainer.innerHTML = "";
  imageResults.innerHTML = "";
  knowledgePanel.classList.add("hidden");
  paaSection.classList.add("hidden");

  try {
    // TODO: Replace with your real backend call
    // const res = await fetch("/functions/v1/search", { ... });
    // const data = await res.json();

    const data = { results: [], images: [], kp: null, paa: [] }; // placeholder

    renderResults(data.results);
    renderImages(data.images);
    renderKP(data.kp);
    renderPAA(data.paa);

    if (!data.results.length && !data.images.length) {
      noQueryBox.classList.add("visible");
    }
  } catch (err) {
    console.error(err);
    noQueryBox.classList.add("visible");
  } finally {
    loader.classList.remove("visible");
  }
}

// ===============================
// RENDER HELPERS
// ===============================
function renderResults(items) {
  resultsContainer.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="result-header">
        ${item.favicon ? `<img class="result-favicon" src="${item.favicon}" />` : ""}
        <div class="result-title">${item.title || "Untitled"}</div>
      </div>
      <div class="result-url">${item.url || ""}</div>
      <div class="result-desc">${item.snippet || ""}</div>
    `;
    resultsContainer.appendChild(card);
  });
}

function renderImages(items) {
  imageResults.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "image-card";
    card.innerHTML = `
      <img src="${item.src}" alt="${item.title || ""}" />
      <div class="image-card-caption">${item.title || ""}</div>
    `;
    imageResults.appendChild(card);
  });
}

function renderKP(kp) {
  if (!kp) {
    knowledgePanel.classList.add("hidden");
    return;
  }
  knowledgePanel.classList.remove("hidden");
  knowledgePanel.innerHTML = `
    <div class="kp-title">${kp.title || ""}</div>
    <div class="kp-subtitle">${kp.subtitle || ""}</div>
    ${kp.image ? `<img class="kp-thumb" src="${kp.image}" />` : ""}
    <div class="kp-extract">${kp.extract || ""}</div>
    ${kp.url ? `<a class="kp-link" href="${kp.url}" target="_blank">More info</a>` : ""}
  `;
}

function renderPAA(items) {
  if (!items || !items.length) {
    paaSection.classList.add("hidden");
    return;
  }
  paaSection.classList.remove("hidden");
  paaList.innerHTML = "";
  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "paa-item";
    row.innerHTML = `
      <div class="paa-question">
        <span>${item.question}</span>
        <span class="chevron">›</span>
      </div>
      <div class="paa-answer">${item.answer}</div>
    `;
    row.addEventListener("click", () => {
      row.classList.toggle("open");
    });
    paaList.appendChild(row);
  });
}

// ===============================
// SPEEDOMETER CANVAS
// ===============================
const ctx = speedCanvas.getContext("2d");
let needleValue = 0;

function drawSpeedometer(value, labelText) {
  const w = speedCanvas.width;
  const h = speedCanvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.lineWidth = 10;
  ctx.strokeStyle = "#444";
  ctx.beginPath();
  ctx.arc(w/2, h, 100, Math.PI, Math.PI*2);
  ctx.stroke();

  const angle = Math.PI + (Math.min(value, 100) / 100) * Math.PI;
  const nx = w/2 + Math.cos(angle) * 90;
  const ny = h + Math.sin(angle) * 90;

  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w/2, h);
  ctx.lineTo(nx, ny);
  ctx.stroke();

  ctx.fillStyle = "#e5e7eb";
  ctx.font = "16px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(labelText, w/2, h - 20);
}

function animateNeedle(target, labelText) {
  let start = needleValue;
  let t = 0;
  function step() {
    t += 0.02;
    const eased = Math.sin((t * Math.PI) / 2);
    needleValue = start + (target - start) * eased;
    drawSpeedometer(needleValue, labelText);
    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

drawSpeedometer(0, "0 Mbps");

// ===============================
// SPEED TEST ENGINE
// ===============================
let baseDownMbps = null;
let baseUpMbps = null;

startSpeedTestBtn.addEventListener("click", async () => {
  speedResultsBox.style.display = "block";
  speedFeedback.textContent = "Testing…";

  // PING
  const pingStart = performance.now();
  await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
  const pingEnd = performance.now();
  const ping = Math.round(pingEnd - pingStart);
  pingEl.textContent = ping;

  // DOWNLOAD (20MB)
  const downloadStart = performance.now();
  const blob = await fetch("https://speed.cloudflare.com/__down?bytes=20000000");
  await blob.arrayBuffer();
  const downloadEnd = performance.now();
  const seconds = (downloadEnd - downloadStart) / 1000;
  const mbps = (20 / seconds) * 8;
  baseDownMbps = mbps;
  downEl.textContent = mbps.toFixed(1);
  animateNeedle(Math.min(mbps, 100), `${mbps.toFixed(1)} Mbps`);

  // UPLOAD (5MB)
  const uploadData = new Uint8Array(5_000_000);
  const uploadStart = performance.now();
  await fetch("https://httpbin.org/post", {
    method: "POST",
    body: uploadData
  });
  const uploadEnd = performance.now();
  const upSeconds = (uploadEnd - uploadStart) / 1000;
  const upMbps = (5 / upSeconds) * 8;
  baseUpMbps = upMbps;
  upEl.textContent = upMbps.toFixed(1);

  // FEEDBACK
  let msg = "";
  if (mbps > 100) msg = "Your connection is excellent for gaming, 4K streaming, and large downloads.";
  else if (mbps > 40) msg = "Great connection — smooth HD streaming and fast downloads.";
  else if (mbps > 15) msg = "Decent connection — HD streaming should work, but large downloads may be slower.";
  else msg = "Slow connection — expect buffering, lag, and slow downloads.";
  msg += ` Ping: ${ping} ms.`;
  speedFeedback.textContent = msg;
});

// ===============================
// UNIT SWITCHING
// ===============================
unitSelect.addEventListener("change", () => {
  if (baseDownMbps == null || baseUpMbps == null) return;

  const unit = unitSelect.value;
  let d = baseDownMbps;
  let u = baseUpMbps;

  if (unit === "mbps") {
    unitLabel.textContent = "Mbps";
    unitLabel2.textContent = "Mbps";
    downEl.textContent = d.toFixed(1);
    upEl.textContent = u.toFixed(1);
    animateNeedle(Math.min(d, 100), `${d.toFixed(1)} Mbps`);
  } else if (unit === "mbps2") {
    unitLabel.textContent = "MB/s";
    unitLabel2.textContent = "MB/s";
    downEl.textContent = (d / 8).toFixed(2);
    upEl.textContent = (u / 8).toFixed(2);
    animateNeedle(Math.min(d, 100), `${(d/8).toFixed(2)} MB/s`);
  } else if (unit === "kbps") {
    unitLabel.textContent = "Kbps";
    unitLabel2.textContent = "Kbps";
    downEl.textContent = (d * 1000).toFixed(0);
    upEl.textContent = (u * 1000).toFixed(0);
    animateNeedle(Math.min(d, 100), `${(d*1000).toFixed(0)} Kbps`);
  }
});
