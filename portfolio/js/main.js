'use strict';

// =============================================================================
// main.js — Portfolio entry point
//
// Boot sequence:
//   1. Wait for DOM ready (safe for deferred scripts)
//   2. If GSAP unavailable (CDN failure / bad SRI): runFallbackBoot()
//   3. Wait for fonts (or 800ms), then startPreloader()
//   4. GSAP master timeline: counter (2.2s) → pause (0.2s) → slide-up (0.9s)
//   5. Master timeline onComplete → handoff() → init* functions (Plans 02 + 03)
//
// Init stubs: initNavScrollBehavior, initNavLinks, initHeroAnimation
//   Plans 02 and 03 replace these no-ops with real implementations.
//   Do NOT change these function signatures — they are the handoff contract.
// =============================================================================

// Single entry point — handles both deferred-script (DOM already ready) and
// non-deferred cases via readyState check.
function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

ready(function () {
  // === GSAP availability check (REVIEWS priority 2) ===
  // If the GSAP CDN script failed (bad SRI, network error, CSP block), window.gsap
  // is undefined. Run the fallback path so the page is at least usable.
  if (!window.gsap) {
    console.warn('[boot] GSAP unavailable — running no-animation fallback');
    runFallbackBoot();
    return;
  }

  // === Font load race guard (RESEARCH Pitfall 5) ===
  // Wait for fonts (or 800ms, whichever wins) before starting the preloader
  // timeline. This prevents FOUT on the counter if Clash Display is slow to load.
  var fontsReady = (document.fonts && document.fonts.ready)
    ? document.fonts.ready
    : Promise.resolve();
  var fontsTimeout = new Promise(function (resolve) { setTimeout(resolve, 800); });

  Promise.race([fontsReady, fontsTimeout]).then(startPreloader);
});

// =============================================================================
// Fallback boot path (no GSAP — CDN failure, SRI mismatch, network block)
// Hide preloader, release inert, unlock scroll, call init stubs.
// Result: page renders without animation but everything is interactive.
// =============================================================================
function runFallbackBoot() {
  var preloaderEl = document.querySelector('.preloader');
  var mainEl = document.getElementById('page-main');
  if (preloaderEl) preloaderEl.style.display = 'none';
  if (mainEl) mainEl.removeAttribute('inert');      // REVIEWS priority 6
  document.body.style.overflow = '';
  // Call init stubs in try/catch — one failure must not block the others.
  try { initNavScrollBehavior(); } catch (e) { console.error('[boot] initNavScrollBehavior failed:', e); }
  try { initNavLinks();          } catch (e) { console.error('[boot] initNavLinks failed:', e); }
  try { initHeroAnimation();     } catch (e) { console.error('[boot] initHeroAnimation failed:', e); }
}

// =============================================================================
// Main preloader path — only reached when window.gsap is available
// =============================================================================
function startPreloader() {
  var counter    = { value: 0 };
  var counterEl  = document.querySelector('.preloader-counter');
  var preloaderEl = document.querySelector('.preloader');
  var barFillEl  = document.querySelector('.preloader-bar-fill');
  var mainEl     = document.getElementById('page-main');

  // Guard: if any required element is missing (e.g. markup error), fall back.
  if (!counterEl || !preloaderEl || !barFillEl) {
    console.error('[preloader] required DOM elements missing — running fallback');
    runFallbackBoot();
    return;
  }

  // Lock scroll while preloader is visible (LOAD-03).
  // overflow:hidden only — RESEARCH confirms position:fixed causes iOS scroll jump.
  document.body.style.overflow = 'hidden';

  // ============================================================================
  // MASTER TIMELINE (REVIEWS priority 1)
  //
  // onComplete is attached to the TIMELINE OBJECT, not to the counter tween.
  // GSAP fires a timeline's onComplete after ALL tweens in the timeline finish,
  // meaning it fires after the slide-up (the last tween), NOT after the counter.
  //
  // Timeline structure:
  //   t=0.0  counter 0→100 over 2.2s (power2.inOut) — onUpdate drives counter + bar
  //   t=2.4  preloaderEl slides y: 0 → -100% over 0.9s (power4.inOut) ["+=0.2" gap]
  //   t=3.3  timeline onComplete → handoff() runs
  // ============================================================================
  var tl = gsap.timeline({
    onComplete: handoff
  });

  // Step 1: counter 0 → 100, eased, 2.2s (LOAD-02, UI-SPEC animation contract)
  // Only onUpdate here — the counter tween has NO onComplete (that's on the timeline).
  tl.to(counter, {
    value: 100,
    duration: 2.2,
    ease: 'power2.inOut',
    onUpdate: function () {
      var v = Math.floor(counter.value);
      counterEl.textContent = v + '%';
      barFillEl.style.width = v + '%'; // progress bar fills in lockstep with counter
    }
  })
  // Step 2: overlay slides up off-screen (LOAD-04 — total feel ≥ 2.4s before reveal)
  // "+=0.2" position parameter = 0.2s gap AFTER counter finishes (counter ends at 2.2s,
  // slide starts at 2.4s, slide ends at 3.3s — total > 2.4s requirement satisfied).
  .to(preloaderEl, {
    y: '-100%',
    duration: 0.9,
    ease: 'power4.inOut'
  }, '+=0.2')
  // Step 3: belt-and-braces .call() marker at the very end of the timeline.
  // The real handoff is via the timeline's onComplete above.
  // This no-op ensures future edits cannot accidentally insert tweens after slide-up
  // without noticing that the timeline end has moved.
  .call(function () { /* timeline end marker — onComplete above does the real work */ });

  // ==========================================================================
  // handoff — runs ONLY after the master timeline (slide-up tween) completes.
  // This is the single handoff point for Plans 02 (nav) and 03 (hero).
  // ==========================================================================
  function handoff() {
    // Restore scroll
    document.body.style.overflow = '';
    // Release inert so keyboard and screen-reader users can interact (REVIEWS priority 6)
    if (mainEl) mainEl.removeAttribute('inert');
    // Remove preloader from paint tree to free GPU compositor layer
    preloaderEl.style.display = 'none';
    // Hand off to nav + hero — filled by Plans 02 and 03.
    try { initNavScrollBehavior(); } catch (e) { console.error('[handoff] initNavScrollBehavior failed:', e); }
    try { initNavLinks();          } catch (e) { console.error('[handoff] initNavLinks failed:', e); }
    try { initHeroAnimation();     } catch (e) { console.error('[handoff] initHeroAnimation failed:', e); }
  }
}

// =============================================================================
// Handoff stubs — Plans 02 and 03 will replace these no-ops.
//
// These exist NOW so the preloader handoff() and runFallbackBoot() can call them
// safely. Signature is the contract Plans 02 and 03 must match.
// =============================================================================

function initNavScrollBehavior() {
  // Filled by Plan 02 (NAV-02) — scroll listener toggling nav-scrolled class
}

function initNavLinks() {
  // Filled by Plan 02 (NAV-04, NAV-05) — smooth scroll + hamburger behavior
}

function initHeroAnimation() {
  // Filled by Plan 03 (HERO-03) — hero word stagger entry animation
}
