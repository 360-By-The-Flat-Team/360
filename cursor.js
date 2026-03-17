/* ============================================================
   360 — CURSOR.JS
   Cursor style + color customization.
   Reads/writes localStorage. Works on all pages.
   ============================================================ */

(function initCursor() {
  const body = document.body;
  const dot        = document.querySelector(".cursor-dot");
  const trail      = document.querySelector(".cursor-trail");
  const crosshair  = document.querySelector(".cursor-crosshair");
  const blob       = document.querySelector(".cursor-blob");

  let cx = 0, cy = 0;

  /* ── Mouse tracking ── */
  document.addEventListener("mousemove", e => {
    cx = e.clientX;
    cy = e.clientY;
    if (dot)       { dot.style.left  = cx + "px"; dot.style.top  = cy + "px"; }
    if (crosshair) { crosshair.style.left = cx + "px"; crosshair.style.top = cy + "px"; }
  });

  /* Trail + blob animate separately for smooth lag effect */
  (function animatePassive() {
    if (trail) { trail.style.left = cx + "px"; trail.style.top = cy + "px"; }
    if (blob)  { blob.style.left  = cx + "px"; blob.style.top  = cy + "px"; }
    requestAnimationFrame(animatePassive);
  })();

  /* ── Apply cursor style ── */
  function applyCursorStyle(style) {
    body.dataset.cursor = style;
    localStorage.setItem("360_cursor_style", style);

    /* Update active state in settings UI */
    document.querySelectorAll(".cursor-option").forEach(opt => {
      opt.classList.toggle("active", opt.dataset.cursor === style);
    });
  }

  /* ── Apply cursor color ── */
  function applyCursorColor(hex) {
    body.style.setProperty("--cursor-color", hex);
    localStorage.setItem("360_cursor_color", hex);
    const picker = document.getElementById("cursorColorPicker");
    if (picker) picker.value = hex;
  }

  /* ── Load saved preferences ── */
  const savedStyle = localStorage.getItem("360_cursor_style") || "default";
  const savedColor = localStorage.getItem("360_cursor_color");
  applyCursorStyle(savedStyle);
  if (savedColor) applyCursorColor(savedColor);

  /* ── Wire up settings panel buttons ── */
  function initCursorUI() {
    document.querySelectorAll(".cursor-option").forEach(opt => {
      opt.addEventListener("click", e => {
        e.stopPropagation();
        applyCursorStyle(opt.dataset.cursor);
      });
    });

    const picker = document.getElementById("cursorColorPicker");
    if (picker) {
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

  /* Wait for DOM to be ready before wiring up UI */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCursorUI);
  } else {
    initCursorUI();
  }
})();
