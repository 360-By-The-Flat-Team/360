(function initGalliumToggle() {
  const visGalliumToggle = document.getElementById('visGalliumToggle');
  if (!visGalliumToggle) return;

  function applyGallium(enabled) {
    document.body.classList.toggle('gallium-enabled', enabled);
    visGalliumToggle.classList.toggle('on', enabled);
    localStorage.setItem('360_gallium_on', enabled ? 'true' : 'false');
  }

  applyGallium(localStorage.getItem('360_gallium_on') === 'true');
  visGalliumToggle.addEventListener('click', () => {
    applyGallium(!document.body.classList.contains('gallium-enabled'));
  });
})();
