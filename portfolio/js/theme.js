/* DARK THEME DISABLED — theme toggle JS commented out.
   To re-enable: see CLAUDE.md "Dark Theme / Dual Toggle — Disabled" section.

'use strict';

(function () {
  var root = document.documentElement;
  var btn  = document.getElementById('theme-toggle');
  if (!btn) return;

  function isLight() {
    return root.classList.contains('theme-light');
  }

  function applyTheme(light) {
    root.classList.toggle('theme-light', light);
    btn.setAttribute('aria-pressed', String(light));
    btn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    try { localStorage.setItem('portfolio-theme', light ? 'light' : 'dark'); } catch (e) {}
  }

  btn.addEventListener('click', function () {
    applyTheme(!isLight());
  });

  // Sync button state with whatever the early-init script applied
  btn.setAttribute('aria-pressed', String(isLight()));
  btn.setAttribute('aria-label', isLight() ? 'Switch to dark theme' : 'Switch to light theme');
})();

*/
