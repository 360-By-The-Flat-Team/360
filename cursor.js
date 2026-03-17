/* ============================================================
   360 — CURSOR.JS  (fixed)
   ============================================================ */
(function initCursor() {
  const DEFAULT_COLOR = "#3b82f6";

  let dot, trail, crosshair, blob;
  let cx = 0, cy = 0;

  /* ── Resolve cursor elements after DOM is ready ── */
  function resolveElements() {
    dot       = document.querySelector(".cursor-dot");
    trail     = document.querySelector(".cursor-trail");
    crosshair = document.querySelector(".cursor-crosshair");
    blob      = document.querySelector(".cursor-blob");
  }

  /* ── Mouse tracking ── */
  document.addEventListener("mousemove", e => {
    cx = e.clientX;
    cy = e.clientY;
    if (dot)       { dot.style.left       = cx + "px"; dot.style.top       = cy + "px"; }
    if (crosshair) { crosshair.style.left = cx + "px"; crosshair.style.top = cy + "px"; }
  });

  /* Trail + blob animate separately for smooth lag */
  (function animatePassive() {
    if (trail) { trail.style.left = cx + "px"; trail.style.top = cy + "px"; }
    if (blob)  { blob.style.left  = cx + "px"; blob.style.top  = cy + "px"; }
    requestAnimationFrame(animatePassive);
  })();

  /* ── Apply cursor style ── */
  function applyCursorStyle(style) {
    document.body.dataset.cursor = style;
    localStorage.setItem("360_cursor_style", style);
    document.querySelectorAll(".cursor-option").forEach(opt => {
      opt.classList.toggle("active", opt.dataset.cursor === style);
    });
  }

  /* ── Apply cursor color ── */
  function applyCursorColor(hex) {
    // FIX: set on :root so the CSS variable cascades everywhere
    document.documentElement.style.setProperty("--cursor-color", hex);
    document.body.style.setProperty("--cursor-color", hex); // belt-and-suspenders
    localStorage.setItem("360_cursor_color", hex);
    const picker = document.getElementById("cursorColorPicker");
    if (picker) picker.value = hex;
  }

  /* ── Load saved preferences ── */
  function loadPreferences() {
    const savedStyle = localStorage.getItem("360_cursor_style") || "default";
    // FIX: always fall back to DEFAULT_COLOR so first-time visitors get a color
    const savedColor = localStorage.getItem("360_cursor_color") || DEFAULT_COLOR;
    applyCursorStyle(savedStyle);
    applyCursorColor(savedColor);
  }

  /* ── Wire up settings panel ── */
  function initCursorUI() {
    resolveElements(); // FIX: elements are guaranteed to exist now

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
        applyCursorColor(DEFAULT_COLOR);
        localStorage.removeItem("360_cursor_color");
      });
    }
  }

  /* ── Boot ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { loadPreferences(); initCursorUI(); });
  } else {
    loadPreferences();
    initCursorUI();
  }
})();
