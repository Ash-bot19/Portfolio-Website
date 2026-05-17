'use strict';

/* ==========================================================================
   cursor-invert.js — Cursor-tracked invert lens on nav logo + social icons.

   Setup:
     - Each target (.nav-logo, .side-social-link--github, .side-social-link--linkedin)
       contains a <span class="cursor-mirror">.
     - Parent has overflow:hidden (so the mirror is clipped to the target shape).
   Behavior:
     - On mouseenter: hide the main .site-cursor (via .is-on-cursor-invert-target).
     - On mousemove: write --cx, --cy on the target (cursor coords relative to
       the target's box). CSS transforms the mirror to that point.
     - On mouseleave: clear the class — main cursor fades back in.
   The CSS rule .nav-logo:hover .cursor-mirror (etc.) handles the mirror's
   opacity fade; this JS only does position tracking + the global cursor toggle.

   Touch devices: mouseenter/mouseleave still fire on touch but with weird
   sequencing. The cursor-mirror is decorative; if effects look off on touch
   it's acceptable. No special handling here.
   ========================================================================== */

(function initCursorInvert() {
  var mirrors = document.querySelectorAll('.cursor-mirror');
  if (!mirrors.length) return;

  /* .site-cursor is created lazily by main.js's initGlobalCursor() after the
     preloader handoff — it does NOT exist when this IIFE runs. Query it
     inside each event handler instead of caching at startup. Cheap (single
     getElementsByClassName lookup) and resilient to load-order surprises. */
  function getSiteCursor() {
    return document.querySelector('.site-cursor');
  }

  mirrors.forEach(function(mirror) {
    var target = mirror.parentElement;
    if (!target) return;

    target.addEventListener('mouseenter', function() {
      var sc = getSiteCursor();
      if (sc) {
        if (sc.__setTarget) sc.__setTarget(1, 0, true);
        else sc.classList.add('is-on-cursor-invert-target');
      }
    });

    target.addEventListener('mouseleave', function() {
      var sc = getSiteCursor();
      if (sc) {
        if (sc.__setTarget) sc.__setTarget(null, 1);
        else sc.classList.remove('is-on-cursor-invert-target');
      }
      /* Park the mirror off-screen so it's not lingering at the last cursor
         position when the user re-enters — would cause a flash. */
      target.style.setProperty('--cx', '-200px');
      target.style.setProperty('--cy', '-200px');
    });

    target.addEventListener('mousemove', function(e) {
      var rect = target.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      target.style.setProperty('--cx', x + 'px');
      target.style.setProperty('--cy', y + 'px');
    });
  });
})();
