/* ============================================================
   360 — CURSOR.JS V2.1
   No device detection. Works on all non-touch devices.
   ============================================================ */
(function initCursor() {
  const body = document.body;

  /* ── Create elements if missing ── */
  function getOrCreate(cls) {
    let el = document.querySelector("." + cls);
    if (!el) {
      el = document.createElement("div");
      el.className = cls;
      document.body.appendChild(el);
    }
    return el;
  }

  const dot       = getOrCreate("cursor-dot");
  const trail     = getOrCreate("cursor-trail");
  const crosshair = getOrCreate("cursor-crosshair");
  const blob      = getOrCreate("cursor-blob");

  let cx = 0, cy = 0;
  let moved = false;

  /* ── Only show cursor after first mouse move ── */
  /* This naturally handles touch devices — they never fire mousemove */
  document.addEventListener("mousemove", e => {
    cx = e.clientX;
    cy = e.clientY;

    if (!moved) {
      moved = true;
      dot.style.opacity       = "1";
      trail.style.opacity     = "1";
      crosshair.style.opacity = "1";
      blob.style.opacity      = "1";
    }

    dot.style.left       = cx + "px";
    dot.style.top        = cy + "px";
    crosshair.style.left = cx + "px";
    crosshair.style.top  = cy + "px";
  }, { passive: true });

  /* ── Trail + blob lag via rAF ── */
  (function animatePassive() {
    trail.style.left = cx + "px";
    trail.style.top  = cy + "px";
    blob.style.left  = cx + "px";
    blob.style.top   = cy + "px";
    requestAnimationFrame(animatePassive);
  })();

  /* ── Apply style ── */
  function applyCursorStyle(style) {
    body.dataset.cursor = style;
    localStorage.setItem("360_cursor_style", style);
    document.querySelectorAll(".cursor-option").forEach(opt => {
      opt.classList.toggle("active", opt.dataset.cursor === style);
    });
  }

  /* ── Apply color ── */
  function applyCursorColor(hex) {
    body.style.setProperty("--cursor-color", hex);
    localStorage.setItem("360_cursor_color", hex);
    const picker = document.getElementById("cursorColorPicker");
    if (picker) picker.value = hex;
  }

  /* ── Load saved prefs ── */
  const savedStyle = localStorage.getItem("360_cursor_style") || "default";
  const savedColor = localStorage.getItem("360_cursor_color");
  applyCursorStyle(savedStyle);
  if (savedColor) applyCursorColor(savedColor);

  /* ── Wire up settings panel ── */
  function initCursorUI() {
    document.querySelectorAll(".cursor-option").forEach(opt => {
      opt.addEventListener("click", e => {
        e.stopPropagation();
        applyCursorStyle(opt.dataset.cursor);
      });
    });

    const picker = document.getElementById("cursorColorPicker");
    if (picker) {
      picker.value = savedColor || "#3b82f6";
      picker.addEventListener("input", e => applyCursorColor(e.target.value));
    }

    const resetBtn = document.getElementById("cursorColorReset");
    if (resetBtn) {
      resetBtn.addEventListener("click", e => {
        e.stopPropagation();
        body.style.removeProperty("--cursor-color");
        localStorage.removeItem("360_cursor_color");
        if (picker) picker.value = "#3b82f6";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCursorUI);
  } else {
    initCursorUI();
  }
})();
