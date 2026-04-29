/* ═══════════════════════════════════════
   OrbitOS v2.0 — app.js
   360 Digital, Co.
═══════════════════════════════════════ */

/* ── GLOBALS ── */
const OS = {
  user: null,
  zTop: 100,
  wallpaper: 'aurora',
  customWallpaperURL: null,
  musicPlaying: false,
  curTrack: 0,
  termHistory: [],
  termHistIdx: -1,
  musicProgress: 0,
  musicTimer: null,
};

const APPS = {
  browser:  { win: 'win-browser',   label: '🌐 360 Browser' },
  files:    { win: 'win-files',     label: '📁 Files' },
  terminal: { win: 'win-terminal',  label: '💻 Terminal' },
  editor:   { win: 'win-editor',    label: '📝 Editor' },
  music:    { win: 'win-music',     label: '🎵 Music' },
  settings: { win: 'win-settings',  label: '⚙️ Settings' },
};

const TRACKS = [
  { title: 'Orbit Theme',          artist: '360 Digital' },
  { title: 'Glassmorphic Dreams',  artist: 'OrbitOS' },
  { title: 'Neon Cascade',         artist: 'Zaki Beats' },
  { title: 'Aurora Drive',         artist: '360 Digital' },
];

/* ════════════════════════════════════════
   AUTH / LOGIN
════════════════════════════════════════ */
const MOCK_USERS = [
  { username: 'zaki',  password: '360',      name: 'Zaki',       email: 'zaki@360-search.com',  avatar: 'Z', provider: '360' },
  { username: 'admin', password: 'orbit',    name: 'Admin',      email: 'admin@orbitos.io',     avatar: 'A', provider: '360' },
];

function initLogin() {
  const screen = document.getElementById('login-screen');
  if (!screen) return;

  // Tab switching
  document.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.login-panel').forEach(p => p.style.display = 'none');
      document.getElementById('panel-' + tab.dataset.panel).style.display = 'flex';
    });
  });

  // 360 sign-in
  document.getElementById('btn-360-login').addEventListener('click', () => {
    const u = document.getElementById('inp-user').value.trim();
    const p = document.getElementById('inp-pass').value;
    const match = MOCK_USERS.find(x => (x.username === u || x.email === u) && x.password === p);
    if (match) {
      loginSuccess(match);
    } else {
      document.getElementById('login-error').textContent = 'Wrong username or password.';
      setTimeout(() => document.getElementById('login-error').textContent = '', 2500);
    }
  });

  // Enter key on inputs
  ['inp-user','inp-pass'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-360-login').click();
    });
  });

  // OAuth mocks
  document.getElementById('btn-google').addEventListener('click', () => {
    loginSuccess({ name: 'Google User', email: 'user@gmail.com', avatar: 'G', provider: 'Google' });
  });
  document.getElementById('btn-github').addEventListener('click', () => {
    loginSuccess({ name: 'GitHub User', email: 'user@github.com', avatar: 'GH', provider: 'GitHub' });
  });

  // Guest
  document.getElementById('login-guest').addEventListener('click', () => {
    loginSuccess({ name: 'Guest', email: '', avatar: '?', provider: 'guest' });
  });
}

function loginSuccess(user) {
  OS.user = user;
  const screen = document.getElementById('login-screen');
  screen.style.animation = 'fadeOut .35s ease forwards';
  setTimeout(() => {
    screen.style.display = 'none';
    bootDesktop();
  }, 340);
}

/* ════════════════════════════════════════
   BOOT
════════════════════════════════════════ */
function bootDesktop() {
  // Set user in taskbar
  document.getElementById('tb-avatar').textContent   = OS.user.avatar;
  document.getElementById('tb-username').textContent = OS.user.name;

  // Update start menu
  document.querySelector('.sm-user strong').textContent = OS.user.name;
  document.querySelector('.sm-user span').textContent   = OS.user.email || OS.user.provider;

  // Boot browser window open, rest hidden
  Object.keys(APPS).forEach(id => {
    const el = document.getElementById(APPS[id].win);
    if (id === 'browser') {
      el.style.display = 'flex';
      bringToFront(APPS[id].win);
    } else {
      el.style.display = 'none';
    }
  });

  refreshTaskbar();
  startClock();
  initWallpapers();
  initFiles();
  initTerminal();
  initEditor();
  initMusic();
  initSettings();
  initContextMenu();
  initDragDrop();

  setTimeout(() => notify('Welcome to OrbitOS 🪐', `Signed in as ${OS.user.name} · 360 Digital, Co.`), 600);
}

/* ════════════════════════════════════════
   CLOCK
════════════════════════════════════════ */
function startClock() {
  function tick() {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2,'0');
    const mm  = String(now.getMinutes()).padStart(2,'0');
    const ss  = String(now.getSeconds()).padStart(2,'0');
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const date   = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    document.getElementById('dc-time').textContent = `${hh}:${mm}:${ss}`;
    document.getElementById('dc-date').textContent = date;
    document.getElementById('tb-time').textContent = `${hh}:${mm}`;
    document.getElementById('tb-date').textContent = `${months[now.getMonth()]} ${now.getDate()}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ════════════════════════════════════════
   WINDOW MANAGEMENT
════════════════════════════════════════ */
function openApp(id) {
  const cfg = APPS[id];
  if (!cfg) return;
  const win = document.getElementById(cfg.win);
  win.style.display = 'flex';
  win.classList.remove('minimized');
  bringToFront(cfg.win);
  refreshTaskbar();
}

function closeWin(id) {
  const win = document.getElementById(APPS[id].win);
  win.style.display = 'none';
  refreshTaskbar();
}

function minimizeWin(id) {
  document.getElementById(APPS[id].win).classList.add('minimized');
  refreshTaskbar();
}

function maximizeWin(id) {
  const win = document.getElementById(APPS[id].win);
  const tbH = document.getElementById('taskbar').offsetHeight;
  if (win.dataset.maxed === '1') {
    win.style.left   = win.dataset.ox;
    win.style.top    = win.dataset.oy;
    win.style.width  = win.dataset.ow;
    win.style.height = win.dataset.oh;
    win.dataset.maxed = '0';
  } else {
    win.dataset.ox = win.style.left;
    win.dataset.oy = win.style.top;
    win.dataset.ow = win.style.width;
    win.dataset.oh = win.style.height;
    win.style.left   = '0';
    win.style.top    = '0';
    win.style.width  = '100vw';
    win.style.height = (window.innerHeight - tbH) + 'px';
    win.dataset.maxed = '1';
  }
}

function bringToFront(winId) {
  document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
  const win = document.getElementById(winId);
  OS.zTop++;
  win.style.zIndex = OS.zTop;
  win.classList.add('focused');
}

function refreshTaskbar() {
  const bar = document.getElementById('taskbar-apps');
  bar.innerHTML = '';
  Object.keys(APPS).forEach(id => {
    const win = document.getElementById(APPS[id].win);
    if (win.style.display === 'none') return;
    const isMin = win.classList.contains('minimized');
    const isFoc = win.classList.contains('focused');
    const div = document.createElement('div');
    div.className = 'tb-app' + (isFoc ? ' active' : '');
    const parts = APPS[id].label.split(' ');
    div.innerHTML = `<span class="tbi">${parts[0]}</span><span>${parts.slice(1).join(' ')}</span>`;
    div.onclick = () => {
      if (isMin) { win.classList.remove('minimized'); bringToFront(APPS[id].win); }
      else bringToFront(APPS[id].win);
      refreshTaskbar();
    };
    bar.appendChild(div);
  });
}

// click on desktop brings nothing to front
document.querySelectorAll('.window').forEach(win => {
  win.addEventListener('mousedown', () => {
    bringToFront(win.id);
    refreshTaskbar();
  });
});

/* ── DRAG ── */
function startDrag(e, winId) {
  if (e.target.classList.contains('win-dot')) return;
  const win = document.getElementById(winId);
  bringToFront(winId);
  refreshTaskbar();
  const startX = e.clientX - win.offsetLeft;
  const startY = e.clientY - win.offsetTop;
  const tbH = document.getElementById('taskbar').offsetHeight;
  function onMove(e) {
    win.style.left = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - startX)) + 'px';
    win.style.top  = Math.max(0, Math.min(window.innerHeight - tbH - 40, e.clientY - startY)) + 'px';
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  e.preventDefault();
}

/* ── RESIZE ── */
function startResize(e, winId) {
  const win = document.getElementById(winId);
  const startX = e.clientX, startY = e.clientY;
  const startW = win.offsetWidth, startH = win.offsetHeight;
  function onMove(e) {
    win.style.width  = Math.max(300, startW + (e.clientX - startX)) + 'px';
    win.style.height = Math.max(200, startH + (e.clientY - startY)) + 'px';
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  e.preventDefault();
}

/* ════════════════════════════════════════
   START MENU
════════════════════════════════════════ */
function toggleStart() {
  document.getElementById('start-menu').classList.toggle('open');
}
document.addEventListener('click', e => {
  const sm = document.getElementById('start-menu');
  const sb = document.getElementById('start-btn');
  if (!sm.contains(e.target) && e.target !== sb) sm.classList.remove('open');
});

/* ════════════════════════════════════════
   CONTEXT MENU
════════════════════════════════════════ */
function initContextMenu() {
  document.getElementById('desktop').addEventListener('contextmenu', e => {
    if (e.target.closest('.window') || e.target.closest('#taskbar')) return;
    e.preventDefault();
    const ctx = document.getElementById('ctx-menu');
    ctx.style.left = Math.min(e.clientX, window.innerWidth  - 175) + 'px';
    ctx.style.top  = Math.min(e.clientY, window.innerHeight - 170) + 'px';
    ctx.classList.add('open');
  });
  document.addEventListener('click', () => document.getElementById('ctx-menu').classList.remove('open'));
}

/* ════════════════════════════════════════
   NOTIFICATIONS
════════════════════════════════════════ */
function notify(title, msg) {
  const stack = document.getElementById('notif-stack');
  const card  = document.createElement('div');
  card.className = 'notif-card';
  card.innerHTML = `<div class="notif-title">${title}</div><div class="notif-msg">${msg}</div>`;
  stack.appendChild(card);
  setTimeout(() => {
    card.style.animation = 'fadeOut .3s ease forwards';
    setTimeout(() => card.remove(), 300);
  }, 3200);
}

/* ════════════════════════════════════════
   WALLPAPERS
════════════════════════════════════════ */
const WP_DEFS = [
  { id: 'aurora',       label: 'Aurora',      bg: 'linear-gradient(135deg,#0d0820 0%,#1a0d35 30%,#0a1628 60%,#0d1f3a 100%)' },
  { id: 'forest',       label: 'Forest Night', bg: 'linear-gradient(135deg,#002210,#003d2b,#001a40,#1a0040)' },
  { id: 'crimson',      label: 'Crimson',      bg: 'linear-gradient(135deg,#1a0000,#2d0020,#000d2d,#0d0020)' },
  { id: 'gold',         label: 'Gold Dust',    bg: 'linear-gradient(135deg,#1a1a00,#002020,#200020,#001020)' },
  { id: 'matrix',       label: '⬛ Matrix',    animated: true },
  { id: 'starfield',    label: '✨ Starfield',  animated: true },
  { id: 'neongrid',     label: '🔷 Neon Grid', animated: true },
  { id: 'aurorawave',   label: '🌊 Aurora',    animated: true },
  { id: 'particles',    label: '⚡ Particles', animated: true },
  { id: 'lava',         label: '🫧 Lava',      animated: true },
];

let animFrame = null;

function initWallpapers() {
  const scroll = document.getElementById('wp-scroll');
  scroll.innerHTML = '';

  WP_DEFS.forEach(wp => {
    const el = document.createElement('div');
    el.className = 'wp-thumb' + (wp.id === OS.wallpaper ? ' active' : '');
    el.textContent = wp.label;
    if (!wp.animated && wp.bg) el.style.background = wp.bg;
    else el.style.background = '#111';
    el.onclick = () => {
      document.querySelectorAll('.wp-thumb').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      applyWallpaper(wp.id);
    };
    scroll.appendChild(el);
  });

  // Upload button
  const uploadBtn = document.createElement('div');
  uploadBtn.className = 'wp-upload-btn';
  uploadBtn.innerHTML = `<span style="font-size:18px">📁</span><span>Upload</span>`;
  uploadBtn.onclick = () => document.getElementById('wp-file-input').click();
  scroll.appendChild(uploadBtn);

  applyWallpaper(OS.wallpaper);
}

function applyWallpaper(id) {
  OS.wallpaper = id;
  const canvas  = document.getElementById('wallpaper-canvas');
  const imgEl   = document.getElementById('wallpaper-img');
  const layerEl = document.getElementById('wallpaper-layer');

  // stop previous animation
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  canvas.style.display = 'none';
  imgEl.style.display  = 'none';
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const def = WP_DEFS.find(w => w.id === id);

  if (id === 'custom') {
    imgEl.src = OS.customWallpaperURL;
    imgEl.style.display = 'block';
    layerEl.style.background = '#000';
    return;
  }

  if (def && !def.animated) {
    layerEl.style.background = def.bg;
    return;
  }

  // animated wallpapers
  layerEl.style.background = '#060412';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  switch (id) {
    case 'matrix':     wpMatrix(ctx, canvas);    break;
    case 'starfield':  wpStarfield(ctx, canvas);  break;
    case 'neongrid':   wpNeonGrid(ctx, canvas);   break;
    case 'aurorawave': wpAurora(ctx, canvas);      break;
    case 'particles':  wpParticles(ctx, canvas);   break;
    case 'lava':       wpLava(ctx, canvas);        break;
  }
}

/* ── MATRIX ── */
function wpMatrix(ctx, canvas) {
  const cols  = Math.floor(canvas.width / 16);
  const drops = Array(cols).fill(1);
  const chars = '0123456789ABCDEFアイウエオカキクケコサシスセソタチツテトナニヌネノ';
  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff41';
    ctx.font = '14px monospace';
    drops.forEach((y, i) => {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * 16, y * 16);
      if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
    animFrame = requestAnimationFrame(draw);
  }
  draw();
}

/* ── STARFIELD ── */
function wpStarfield(ctx, canvas) {
  const stars = Array.from({length: 280}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: Math.random() * canvas.width,
    pz: 0,
  }));
  const cx = canvas.width / 2, cy = canvas.height / 2;
  function draw() {
    ctx.fillStyle = 'rgba(4,2,16,0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.pz = s.z;
      s.z -= 4;
      if (s.z <= 0) { s.x = Math.random()*canvas.width; s.y = Math.random()*canvas.height; s.z = canvas.width; s.pz = s.z; }
      const sx = (s.x - cx) * (canvas.width / s.z)  + cx;
      const sy = (s.y - cy) * (canvas.width / s.z)  + cy;
      const px = (s.x - cx) * (canvas.width / s.pz) + cx;
      const py = (s.y - cy) * (canvas.width / s.pz) + cy;
      const size = Math.max(0.2, (1 - s.z / canvas.width) * 3);
      ctx.strokeStyle = `rgba(180,170,255,${1 - s.z/canvas.width})`;
      ctx.lineWidth = size;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
    });
    animFrame = requestAnimationFrame(draw);
  }
  draw();
}

/* ── NEON GRID ── */
function wpNeonGrid(ctx, canvas) {
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#04020e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const size = 48;
    const pulse = Math.sin(t * 0.03) * 0.5 + 0.5;
    // horizontal
    for (let y = 0; y < canvas.height; y += size) {
      const alpha = 0.08 + pulse * 0.12;
      ctx.strokeStyle = `rgba(124,109,250,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    // vertical
    for (let x = 0; x < canvas.width; x += size) {
      const alpha = 0.08 + pulse * 0.12;
      ctx.strokeStyle = `rgba(250,109,154,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    // glowing nodes
    for (let x = 0; x < canvas.width; x += size) {
      for (let y = 0; y < canvas.height; y += size) {
        const glow = Math.sin(t * 0.04 + x * 0.02 + y * 0.02) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 2 + glow * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(109,250,205,${0.2 + glow * 0.5})`;
        ctx.fill();
      }
    }
    t++;
    animFrame = requestAnimationFrame(draw);
  }
  draw();
}

/* ── AURORA ── */
function wpAurora(ctx, canvas) {
  let t = 0;
  function draw() {
    ctx.fillStyle = 'rgba(4,2,20,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const bands = [
      { c1: 'rgba(124,109,250,', c2: 'rgba(109,250,205,', off: 0 },
      { c1: 'rgba(250,109,154,', c2: 'rgba(124,109,250,', off: 2 },
      { c1: 'rgba(109,250,205,', c2: 'rgba(250,200,109,', off: 4 },
    ];
    bands.forEach((b, i) => {
      const y = canvas.height * 0.3 + Math.sin(t * 0.008 + b.off) * canvas.height * 0.2;
      const grd = ctx.createLinearGradient(0, y - 120, 0, y + 120);
      grd.addColorStop(0,   b.c1 + '0)');
      grd.addColorStop(0.5, b.c1 + '0.22)');
      grd.addColorStop(1,   b.c2 + '0)');
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 8) {
        const wave = Math.sin(x * 0.008 + t * 0.012 + i * 1.2) * 60 +
                     Math.sin(x * 0.015 + t * 0.007) * 30;
        ctx.lineTo(x, y + wave);
      }
      ctx.lineTo(canvas.width, y + 200);
      ctx.lineTo(0, y + 200);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();
    });
    t++;
    animFrame = requestAnimationFrame(draw);
  }
  draw();
}

/* ── PARTICLES ── */
function wpParticles(ctx, canvas) {
  const pts = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - .5) * .8,
    vy: (Math.random() - .5) * .8,
    r: Math.random() * 2 + 1,
  }));
  const CONNECT = 110;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(4,2,20,0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124,109,250,.8)';
      ctx.fill();
    });
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < CONNECT) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(124,109,250,${(1 - d/CONNECT) * 0.35})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    animFrame = requestAnimationFrame(draw);
  }
  draw();
}

/* ── LAVA ── */
function wpLava(ctx, canvas) {
  const blobs = Array.from({length: 7}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - .5) * 1.2,
    vy: (Math.random() - .5) * 1.2,
    r: 100 + Math.random() * 120,
    hue: Math.floor(Math.random() * 360),
  }));
  function draw() {
    ctx.fillStyle = 'rgba(4,2,14,0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blobs.forEach(b => {
      b.x += b.vx; b.y += b.vy;
      if (b.x - b.r < 0 || b.x + b.r > canvas.width)  b.vx *= -1;
      if (b.y - b.r < 0 || b.y + b.r > canvas.height) b.vy *= -1;
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grd.addColorStop(0,   `hsla(${b.hue},90%,65%,0.45)`);
      grd.addColorStop(0.6, `hsla(${b.hue+40},80%,50%,0.18)`);
      grd.addColorStop(1,   `hsla(${b.hue+80},70%,40%,0)`);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      b.hue += 0.3;
    });
    animFrame = requestAnimationFrame(draw);
  }
  draw();
}

/* ── WALLPAPER FILE UPLOAD ── */
function initWallpaperUpload() {
  const input = document.getElementById('wp-file-input');
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    OS.customWallpaperURL = url;
    // add a custom thumb
    const scroll = document.getElementById('wp-scroll');
    let existing = document.getElementById('wp-custom-thumb');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'wp-custom-thumb';
      existing.className = 'wp-thumb';
      scroll.insertBefore(existing, scroll.lastElementChild);
    }
    existing.textContent = '🖼️ Custom';
    existing.style.backgroundImage = `url(${url})`;
    existing.style.backgroundSize  = 'cover';
    existing.onclick = () => {
      document.querySelectorAll('.wp-thumb').forEach(t => t.classList.remove('active'));
      existing.classList.add('active');
      applyWallpaper('custom');
    };
    existing.click();
    notify('Wallpaper', `Set to: ${file.name}`);
    input.value = '';
  });
}

/* Desktop drag-and-drop for image/GIF wallpaper */
function initDragDrop() {
  const desk = document.getElementById('desktop');
  desk.addEventListener('dragover', e => e.preventDefault());
  desk.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type.startsWith('image/') || file.type.startsWith('audio/')) {
      if (file.type.startsWith('image/')) {
        OS.customWallpaperURL = URL.createObjectURL(file);
        applyWallpaper('custom');
        notify('Wallpaper', `Applied: ${file.name}`);
      } else {
        // audio → music player
        loadAudioFile(file);
      }
    }
  });
}

/* ════════════════════════════════════════
   FILE EXPLORER
════════════════════════════════════════ */
const FS = [
  {name:'Documents',ico:'📁'},{name:'Downloads',ico:'📥'},{name:'Pictures',ico:'🖼️'},
  {name:'Music',ico:'🎵'},{name:'360 Projects',ico:'⚡'},{name:'README.md',ico:'📄'},
  {name:'orbit.config',ico:'⚙️'},{name:'startup.sh',ico:'📜'},{name:'notes.txt',ico:'📝'},
  {name:'wallpaper.gif',ico:'🎞️'},{name:'360-logo.svg',ico:'🎨'},{name:'trash',ico:'🗑️'},
];
function initFiles() {
  const grid = document.getElementById('files-grid');
  grid.innerHTML = '';
  FS.forEach(f => {
    const d = document.createElement('div');
    d.className = 'file-item';
    d.innerHTML = `<div class="file-ico">${f.ico}</div><div class="file-name">${f.name}</div>`;
    d.ondblclick = () => notify('File Explorer', `Opening: ${f.name}`);
    grid.appendChild(d);
  });
}

/* ════════════════════════════════════════
   TERMINAL
════════════════════════════════════════ */
function initTerminal() {
  termPrint('OrbitOS v2.0 — 360 Digital, Co.', 'term-out');
  termPrint(`Signed in as ${OS.user.name}  |  Type "help" for commands.`, 'term-out');
  termPrint('', 'term-out');
  document.getElementById('term-input').addEventListener('keydown', handleTerm);
}

function termPrint(text, cls = 'term-out') {
  const out = document.getElementById('term-output');
  const row = document.createElement('div');
  row.className = 'term-row';
  const span = document.createElement('span');
  span.className = cls;
  span.textContent = text;
  row.appendChild(span);
  out.appendChild(row);
  out.scrollTop = out.scrollHeight;
}

function termEcho(cmd, out, isErr = false) {
  const outEl = document.getElementById('term-output');
  const row = document.createElement('div');
  row.className = 'term-row';
  row.innerHTML = `<span class="term-prompt">zaki@orbitos ~ $</span><span class="term-cmd"> ${cmd}</span>`;
  outEl.appendChild(row);
  if (out !== null && out !== undefined) termPrint(out, isErr ? 'term-err' : 'term-out');
  outEl.scrollTop = outEl.scrollHeight;
}

const CMDS = {
  help: () => `Commands: help  ls  pwd  whoami  echo  clear  date  uname  neofetch  open  logout  exit`,
  ls:   () => 'Documents/  Downloads/  Music/  Pictures/  360 Projects/  README.md  orbit.config',
  pwd:  () => '/home/zaki',
  whoami: () => `${OS.user.name} (${OS.user.provider}) — OrbitOS`,
  date: () => new Date().toString(),
  uname:() => 'OrbitOS 2.0.0 x86_64 360-kernel',
  clear:() => { document.getElementById('term-output').innerHTML = ''; return null; },
  exit: () => { closeWin('terminal'); return null; },
  logout:() => { signOut(); return null; },
  neofetch: () =>
`       ██████╗ ██████╗ ██████╗ ██╗████████╗
      ██╔═══██╗██╔══██╗██╔══██╗██║╚══██╔══╝
      ██║   ██║██████╔╝██████╔╝██║   ██║   
      ██║   ██║██╔══██╗██╔══██╗██║   ██║   
      ╚██████╔╝██║  ██║██████╔╝██║   ██║   
       ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝   

  OS:         OrbitOS 2.0.0
  Host:       360 Digital, Co.
  User:       ${OS.user.name}
  Provider:   ${OS.user.provider}
  Shell:      orbit-sh 2.0
  Resolution: ${window.innerWidth}x${window.innerHeight}
  DE:         Glassmorphism
  WM:         OrbitWM
  Wallpaper:  ${OS.wallpaper}
  Uptime:     ${Math.round(performance.now()/1000)}s`,
};

function handleTerm(e) {
  const inp = document.getElementById('term-input');
  if (e.key === 'Enter') {
    const raw = inp.value.trim();
    if (!raw) return;
    OS.termHistory.unshift(raw);
    OS.termHistIdx = -1;
    inp.value = '';
    const parts = raw.split(' ');
    const cmd   = parts[0].toLowerCase();
    const args  = parts.slice(1).join(' ');
    if (cmd === 'echo') termEcho(raw, args || '');
    else if (cmd === 'open') { termEcho(raw, `Opening ${args}...`); openApp(args.replace('./','').toLowerCase()); }
    else if (CMDS[cmd] !== undefined) { const r = CMDS[cmd](); if (r !== null) termEcho(raw, r); }
    else termEcho(raw, `command not found: ${cmd}`, true);
  } else if (e.key === 'ArrowUp') {
    OS.termHistIdx = Math.min(OS.termHistIdx + 1, OS.termHistory.length - 1);
    inp.value = OS.termHistory[OS.termHistIdx] || '';
  } else if (e.key === 'ArrowDown') {
    OS.termHistIdx = Math.max(OS.termHistIdx - 1, -1);
    inp.value = OS.termHistIdx >= 0 ? OS.termHistory[OS.termHistIdx] : '';
  }
}

/* ════════════════════════════════════════
   TEXT EDITOR
════════════════════════════════════════ */
function initEditor() {
  document.getElementById('editor-area').addEventListener('input', function() {
    const lines = this.value.split('\n').length;
    document.getElementById('editor-status').textContent = `UTF-8 · Plain Text · ${lines} line${lines !== 1 ? 's' : ''}`;
  });
}
function edSave() {
  document.getElementById('ed-saved').textContent = '✓ Saved';
  notify('Text Editor', 'File saved!');
  setTimeout(() => document.getElementById('ed-saved').textContent = '', 2000);
}
function edNew() { document.getElementById('editor-area').value = ''; notify('Text Editor', 'New file.'); }

/* ════════════════════════════════════════
   MUSIC PLAYER
════════════════════════════════════════ */
function initMusic() {
  renderTrack();
  // progress simulation when playing
  setInterval(() => {
    if (!OS.musicPlaying) return;
    OS.musicProgress = (OS.musicProgress + 0.3) % 100;
    document.getElementById('music-progress-fill').style.width = OS.musicProgress + '%';
    const totalSec = 180;
    const curSec   = Math.floor(OS.musicProgress / 100 * totalSec);
    document.getElementById('m-cur').textContent = `${Math.floor(curSec/60)}:${String(curSec%60).padStart(2,'0')}`;
    document.getElementById('m-dur').textContent = '3:00';
  }, 300);
}
function renderTrack() {
  document.getElementById('music-title').textContent  = TRACKS[OS.curTrack].title;
  document.getElementById('music-artist').textContent = TRACKS[OS.curTrack].artist;
}
function togglePlay() {
  OS.musicPlaying = !OS.musicPlaying;
  document.getElementById('play-btn').textContent = OS.musicPlaying ? '⏸' : '▶';
  const art = document.getElementById('music-art');
  art.className = OS.musicPlaying ? 'playing' : '';
  notify('Music', OS.musicPlaying ? `▶ ${TRACKS[OS.curTrack].title}` : 'Paused');
}
function nextTrack() {
  OS.curTrack = (OS.curTrack + 1) % TRACKS.length;
  OS.musicProgress = 0;
  renderTrack();
  notify('Music', `Next: ${TRACKS[OS.curTrack].title}`);
}
function prevTrack() {
  OS.curTrack = (OS.curTrack - 1 + TRACKS.length) % TRACKS.length;
  OS.musicProgress = 0;
  renderTrack();
  notify('Music', `Prev: ${TRACKS[OS.curTrack].title}`);
}
function setVol(v) { /* real audio would use AudioContext */ }
function seekMusic(e) {
  const bar = document.getElementById('music-progress-bar');
  OS.musicProgress = (e.offsetX / bar.offsetWidth) * 100;
  document.getElementById('music-progress-fill').style.width = OS.musicProgress + '%';
}
function loadAudioFile(file) {
  TRACKS.unshift({ title: file.name.replace(/\.[^.]+$/, ''), artist: 'Local File' });
  OS.curTrack = 0;
  renderTrack();
  openApp('music');
  notify('Music', `Loaded: ${file.name}`);
}

/* ════════════════════════════════════════
   SETTINGS
════════════════════════════════════════ */
function initSettings() {
  initWallpapers();
  initWallpaperUpload();
  document.getElementById('sys-user').textContent     = OS.user.name;
  document.getElementById('sys-provider').textContent = OS.user.provider;
  document.getElementById('sys-wp').textContent       = OS.wallpaper;
}

/* ════════════════════════════════════════
   SIGN OUT
════════════════════════════════════════ */
function signOut() {
  OS.user = null;
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  // reset desktop
  Object.keys(APPS).forEach(id => {
    document.getElementById(APPS[id].win).style.display = 'none';
  });
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-screen').style.animation = 'winOpen .3s ease';
  notify('OrbitOS', 'Signed out.');
}

/* ════════════════════════════════════════
   BROWSER
════════════════════════════════════════ */
function browserGo() {
  let url = document.getElementById('browser-url').value.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  document.getElementById('browser-frame').src = url;
  document.getElementById('browser-url').value = url;
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
window.addEventListener('resize', () => {
  const canvas = document.getElementById('wallpaper-canvas');
  if (canvas.style.display !== 'none') {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    applyWallpaper(OS.wallpaper);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
});
