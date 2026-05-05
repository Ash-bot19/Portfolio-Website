'use strict';

// =============================================================================
// main.js — Portfolio entry point
//
// Boot sequence:
//   1. Wait for DOM ready (safe for deferred scripts)
//   2. If GSAP unavailable (CDN failure / bad SRI): runFallbackBoot()
//   3. Wait for fonts (or 800ms), then startPreloader()
//   4. GSAP preloader timeline: ring head sweep → tail chase → slide-up
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
//
// Two-phase entrance:
//   Phase 1 — Avatar + START visible. Eye pupils track the mouse cursor.
//   Phase 2 — START clicked: button fades out, disc stays, ring fades in centered
//              on disc, head sweeps 0→100%, tail chases, preloader slides up → handoff.
// =============================================================================
function startPreloader() {
  var preloaderEl = document.querySelector('.preloader');
  var centerEl    = document.querySelector('.preloader-center');
  var ringSvgEl   = document.querySelector('.ring-svg');
  var ringArcEl   = document.querySelector('.ring-arc');
  var ringPctEl     = document.querySelector('.ring-pct');
  var avatarEyesSvg = document.querySelector('.avatar-eyes-svg');
  var eyeL          = document.querySelector('.eye-l');
  var eyeR          = document.querySelector('.eye-r');
  var startBtn      = document.querySelector('.start-btn');
  var srLoadingEl = document.querySelector('.sr-loading');
  var mainEl      = document.getElementById('page-main');

  if (!preloaderEl || !centerEl || !ringArcEl || !startBtn) {
    console.error('[preloader] required DOM elements missing — running fallback');
    runFallbackBoot();
    return;
  }

  document.body.style.overflow = 'hidden';

  var SVG_CENTER    = 100;
  var CIRCUMFERENCE = 515.2;
  var LABEL_R       = 94;   // SVG units — places pct label just outside the moving arc
  var MAX_PUPIL     = 6;    // subtle pupil drift so the eye reads as a single tracked dot
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Pupil tracking ──
  // Maps mouse screen position into the overlay SVG's 736×920 viewBox,
  // then nudges each pupil up to MAX_PUPIL units toward the cursor.
  function movePupil(el, baseCx, baseCy, svgX, svgY) {
    var dx   = svgX - baseCx;
    var dy   = svgY - baseCy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    var t = Math.min(dist, MAX_PUPIL) / dist;
    el.setAttribute('cx', (baseCx + dx * t).toFixed(1));
    el.setAttribute('cy', (baseCy + dy * t).toFixed(1));
  }

  function onMouseMove(e) {
    if (!avatarEyesSvg) return;
    var rect = avatarEyesSvg.getBoundingClientRect();
    if (!rect.width) return;
    var svgX = (e.clientX - rect.left) / rect.width  * 736;
    var svgY = (e.clientY - rect.top)  / rect.height * 920;
    if (eyeL) movePupil(eyeL, 360, 340, svgX, svgY);
    if (eyeR) movePupil(eyeR, 472, 342, svgX, svgY);
  }

  if (!reducedMotion) {
    document.addEventListener('mousemove', onMouseMove, { passive: true });
  }

  // ── Ring arc + floating percentage label ──
  // Arc starts from top (SVG rotate -90°) and sweeps clockwise.
  // Label orbits the arc tip at radius LABEL_R.
  function updateRing(headPct, tailPct) {
    var head = Math.max(0, Math.min(100, headPct));
    var tail = Math.max(0, Math.min(head, typeof tailPct === 'number' ? tailPct : 0));
    var v = Math.round(head);
    var visibleLen = CIRCUMFERENCE * ((head - tail) / 100);

    ringArcEl.setAttribute(
      'stroke-dasharray',
      (visibleLen > 0.01 ? visibleLen.toFixed(2) : '0') + ' ' + CIRCUMFERENCE.toFixed(2)
    );
    ringArcEl.setAttribute('stroke-dashoffset', '0');
    ringArcEl.setAttribute(
      'transform',
      'rotate(' + (-90 + tail * 3.6).toFixed(2) + ' ' + SVG_CENTER + ' ' + SVG_CENTER + ')'
    );

    if (ringPctEl) {
      var rad = (-90 + head * 3.6) * Math.PI / 180;
      ringPctEl.setAttribute('x', (SVG_CENTER + LABEL_R * Math.cos(rad)).toFixed(1));
      ringPctEl.setAttribute('y', (SVG_CENTER + LABEL_R * Math.sin(rad)).toFixed(1));
      ringPctEl.textContent = v + '%';
    }
    if (srLoadingEl) srLoadingEl.textContent = 'Loading ' + v + '%';
  }

  // ── Handoff — single exit point shared by normal and reduced-motion paths ──
  function handoff() {
    document.removeEventListener('mousemove', onMouseMove);
    document.body.style.overflow = '';
    if (mainEl) mainEl.removeAttribute('inert');
    preloaderEl.style.display = 'none';
    try { initNavScrollBehavior(); } catch (e) { console.error('[handoff] initNavScrollBehavior failed:', e); }
    try { initNavLinks();          } catch (e) { console.error('[handoff] initNavLinks failed:', e); }
    try { initHeroAnimation();     } catch (e) { console.error('[handoff] initHeroAnimation failed:', e); }
    try { duplicateSkillCards();   } catch (e) { console.error('[handoff] duplicateSkillCards failed:', e); }
    try { initAboutAnimation();    } catch (e) { console.error('[handoff] initAboutAnimation failed:', e); }
    try { initSkillsAnimation();   } catch (e) { console.error('[handoff] initSkillsAnimation failed:', e); }
  }

  // ── START click ──
  startBtn.addEventListener('click', function () {
    updateRing(0, 0);

    if (reducedMotion) {
      updateRing(100, 0);
      setTimeout(handoff, 200);
      return;
    }

    // Button fades out; disc stays put; ring fades in centered on the same disc.
    gsap.to(startBtn, {
      opacity: 0,
      y: 8,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: function () { startBtn.style.pointerEvents = 'none'; }
    });
    gsap.to(ringSvgEl, { opacity: 1, duration: 0.35, delay: 0.15, ease: 'power1.out' });

    var ringState = { head: 0, tail: 0 };
    gsap.timeline({ delay: 0.3, onComplete: handoff })
      .to(ringState, {
        head: 100,
        duration: 1.85,
        ease: 'power2.inOut',
        onUpdate: function () { updateRing(ringState.head, ringState.tail); }
      })
      .to(ringState, {
        tail: 100,
        duration: 0.55,
        ease: 'power2.in',
        onUpdate: function () { updateRing(ringState.head, ringState.tail); }
      })
      .to(preloaderEl, {
        y: '-100%',
        duration: 0.9,
        ease: 'power4.inOut'
      }, '+=0.12')
      .call(function () { /* timeline end marker */ });

  }, { once: true });

  // Keep START unfocused on load so the hover fill appears only on real interaction.
  updateRing(0, 0);
}

// =============================================================================
// Handoff stubs — Plans 02 and 03 will replace these no-ops.
//
// These exist NOW so the preloader handoff() and runFallbackBoot() can call them
// safely. Signature is the contract Plans 02 and 03 must match.
// =============================================================================

function initNavScrollBehavior() {
  var nav = document.querySelector('nav');
  if (!nav) return;

  // Toggle .nav-scrolled at 100px scroll threshold (NAV-02).
  // Plain scroll listener with passive:true is preferred over ScrollTrigger
  // for a single class toggle — see RESEARCH.md Pattern 3 recommendation.
  var onScroll = function () {
    nav.classList.toggle('nav-scrolled', window.scrollY >= 100);
  };
  // Fire once on init in case page loads already scrolled (e.g. anchor navigation, bfcache restore)
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initNavLinks() {
  var navLinks  = document.querySelector('.nav-links');
  var hamburger = document.querySelector('.hamburger');
  var linkEls   = document.querySelectorAll('.nav-link');

  if (!navLinks || !hamburger || linkEls.length === 0) return;

  // matchMedia for both the breakpoint AND the reduced-motion preference.
  var reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobileMq        = window.matchMedia('(max-width: 768px)');

  // === Helper: close the mobile menu and restore body state ===
  // Used by: link click, hamburger click (when open), Escape key, breakpoint change.
  function closeMenu(opts) {
    var returnFocus = opts && opts.returnFocus;
    navLinks.classList.remove('nav-open');
    document.body.classList.remove('menu-open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open navigation menu');
    if (returnFocus) hamburger.focus();
  }

  // === Helper: open the mobile menu and move focus into it ===
  function openMenu() {
    navLinks.classList.add('nav-open');
    document.body.classList.add('menu-open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Close navigation menu');
    // Move focus to the first nav link inside the open menu (REVIEWS keyboard rule)
    var firstLink = linkEls[0];
    if (firstLink) firstLink.focus();
  }

  // === Smooth-scroll on link click (NAV-04) + close mobile menu (NAV-05) ===
  linkEls.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      // T-02-01: guard ensures only fragment selectors reach querySelector
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        // REVIEWS priority 4: respect reduced-motion preference for the scroll behavior
        var scrollBehavior = reducedMotionMq.matches ? 'auto' : 'smooth';
        target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      }
      // Always collapse mobile menu on link click. Don't return focus to hamburger
      // (we just navigated, focus management would be jarring).
      if (navLinks.classList.contains('nav-open')) {
        closeMenu({ returnFocus: false });
      }
    });
  });

  // === Hamburger toggle (NAV-05) ===
  hamburger.addEventListener('click', function () {
    var isOpen = navLinks.classList.contains('nav-open');
    if (isOpen) {
      closeMenu({ returnFocus: false });
    } else {
      openMenu();
    }
  });

  // === Escape-to-close (REVIEWS keyboard rule) ===
  // Listens at the document level so Escape works regardless of where focus currently is.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!navLinks.classList.contains('nav-open')) return;
    closeMenu({ returnFocus: true });
  });

  // === Breakpoint reset using matchMedia change listener (REVIEWS LOW + RESEARCH Pitfall 6) ===
  // Fires only when crossing the 768px boundary, not on every resize pixel.
  var onBreakpointChange = function (e) {
    // If we just left mobile and the menu is open, reset state cleanly.
    if (!e.matches && navLinks.classList.contains('nav-open')) {
      closeMenu({ returnFocus: false });
    }
  };
  // Modern browsers: addEventListener('change', ...). Older Safari: addListener.
  if (mobileMq.addEventListener) {
    mobileMq.addEventListener('change', onBreakpointChange);
  } else if (mobileMq.addListener) {
    mobileMq.addListener(onBreakpointChange);
  }
}

function initHeroAnimation() {
  var heroInner = document.querySelector('.hero-inner');
  var nameLabel = document.querySelector('.hero-name-label');
  if (!heroInner || !nameLabel) {
    console.error('[hero] required DOM elements missing');
    return;
  }

  // === REVIEWS priority 3: resolve the active mode AT RUN TIME ===
  // Whichever variant is currently visible (display:block) is the one we animate.
  // Default body has no class → Professional. body.mode-honest → Honest.
  var isHonestMode = document.body.classList.contains('mode-honest');
  var variantAttr = isHonestMode ? 'data-honest' : 'data-professional';

  var words = document.querySelectorAll('[' + variantAttr + '] .word');
  var subtitle = document.querySelector('.hero-subtitle[' + variantAttr + ']');

  if (words.length === 0 || !subtitle) {
    console.error('[hero] no word spans or subtitle for variant: ' + variantAttr);
    return;
  }

  // === REVIEWS priority 4 + GSAP-fallback short-circuit ===
  // If user prefers reduced motion, OR GSAP is unavailable (runFallbackBoot path),
  // skip the timeline entirely. Content is already visible because we haven't applied
  // any from-state yet. CSS @media (prefers-reduced-motion: reduce) is belt-and-braces.
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !window.gsap) {
    return;
  }

  // === REVIEWS priority 7: apply will-change ONLY during the animation ===
  // CSS gates will-change on .hero-inner.is-animating descendants. We add it now,
  // remove it in onComplete so GPU layers are released after the ~1.5s entry.
  heroInner.classList.add('is-animating');

  // Build a timeline so subsequent steps reference relative positions
  // and the whole sequence can be paused/seeked as a unit.
  var tl = gsap.timeline({
    onComplete: function () {
      // REVIEWS priority 7: cleanup — release GPU layers
      heroInner.classList.remove('is-animating');
    }
  });

  // 1. Name label fade-up (UI-SPEC: y 20px → 0, opacity 0 → 1, 0.6s, power2.out)
  tl.from(nameLabel, {
    y: 20,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out'
  });

  // 2. Headline word stagger (UI-SPEC: y 40px → 0, opacity 0 → 1, 0.7s per word,
  //    0.06s stagger, power2.out). Selector is scoped to the ACTIVE variant
  //    (REVIEWS priority 3 — animating the hidden display:none variant would either
  //    no-op or leave it stuck if the user later toggles mode).
  //    Position '-=0.3' overlaps with the tail of the name label fade for a tighter feel,
  //    matching UI-SPEC's "0.06s between words, starting near name label end".
  tl.from(words, {
    y: 40,
    opacity: 0,
    duration: 0.7,
    ease: 'power2.out',
    stagger: 0.06
  }, '-=0.3');

  // 3. Subtitle fade-up (UI-SPEC: y 20px → 0, opacity 0 → 1, 0.6s, power2.out,
  //    starts ~0.1s after last word). Position '-=0.2' lands the subtitle entrance
  //    approximately 0.1s after the last word begins its tween.
  tl.from(subtitle, {
    y: 20,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out'
  }, '-=0.2');
}

// ── Phase 2: duplicate skill cards for infinite-feel strip ──
// Must be called BEFORE initSkillsAnimation() so scrollWidth includes cloned cards.
// Clones get aria-hidden="true" so screen readers see only the 5 original cards.
function duplicateSkillCards() {
  var track = document.querySelector('.skills-track');
  if (!track) return;
  var origCards = Array.from(track.querySelectorAll('.skill-card'));
  origCards.forEach(function (card) {
    var clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });
}

// ── Phase 2: about section fade-up on scroll ──
function initAboutAnimation() {
  var aboutInner = document.querySelector('.about-inner');
  if (!aboutInner) return;

  // Short-circuit: no animation for reduced-motion or missing GSAP / ScrollTrigger
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  // Apply will-change only during animation — CSS gates it on .is-animating
  aboutInner.classList.add('is-animating');

  gsap.from(aboutInner, {
    y: 40,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: aboutInner,
      start: 'top 80%',
      once: true   // fire once; kills the ScrollTrigger after firing to free memory
    },
    onComplete: function () {
      aboutInner.classList.remove('is-animating');
    }
  });
}

// ── Phase 2: horizontal scroll pin for skills strip ──
// MUST be called AFTER duplicateSkillCards() so scrollWidth includes all 10 cards.
// gsap.matchMedia() auto-reverts the pin when viewport drops below 769px (SKILL-05).
// Do NOT use the deprecated ScrollTrigger.matchMedia() — that API was removed in GSAP 3.11.
function initSkillsAnimation() {
  var skillsSection = document.querySelector('.skills');
  var skillsTrack   = document.querySelector('.skills-track');
  if (!skillsSection || !skillsTrack) return;

  // Short-circuit: no pin animation for reduced-motion or missing GSAP / ScrollTrigger
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  // gsap.matchMedia() wraps desktop-only pin logic.
  // When viewport drops to 768px or below, GSAP auto-reverts all ScrollTriggers
  // created inside this callback — no manual teardown needed (RESEARCH anti-pattern).
  var mm = gsap.matchMedia();

  mm.add('(min-width: 769px)', function () {
    gsap.to(skillsTrack, {
      // Translate the track leftward by exactly (scrollWidth - viewportWidth) pixels.
      // Function-based value so invalidateOnRefresh recomputes it on window resize.
      x: function () {
        return -(skillsTrack.scrollWidth - window.innerWidth);
      },
      ease: 'none', // CRITICAL: any ease other than 'none' fights the scrub timing
      scrollTrigger: {
        trigger: skillsSection,
        start: 'top top',
        // end distance must equal the x travel so pin-spacer height matches the scroll budget
        end: function () {
          return '+=' + (skillsTrack.scrollWidth - window.innerWidth);
        },
        pin: true,
        scrub: 1,             // 1-second smoothing lag (adjust to scrub:true for instant lock)
        invalidateOnRefresh: true // recomputes x and end values on ScrollTrigger.refresh() (resize)
      }
    });

    // Pitfall 1 guard: refresh after fonts are fully loaded so scrollWidth uses real font metrics.
    // document.fonts.ready fires after all @font-face fonts have loaded.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        ScrollTrigger.refresh();
      });
    }
  });
}

// ── Phase 3: "What I Build" — pin + clip-path scrub reveal + parallax props ──
// Pairs with what-i-build.css. Mirrors initSkillsAnimation() matchMedia pattern:
//   - Desktop (≥769px): pin the section, scrub clip-path on each .wib-line-light
//     from inset(0 0 100% 0) → inset(0 0 0% 0), and parallax both .wib-prop elements.
//   - Mobile (≤768px): no pin, no scrub. CSS already shows .wib-line-light fully
//     and hides .wib-prop. gsap.matchMedia auto-reverts when crossing the breakpoint.
function initWhatIBuildAnimation() {
  var section    = document.querySelector('.what-i-build');
  var lightLines = document.querySelectorAll('.what-i-build .wib-line-light');
  var propLeft   = document.querySelector('.what-i-build .wib-prop-left');
  var propRight  = document.querySelector('.what-i-build .wib-prop-right');
  if (!section || lightLines.length === 0) return;

  // Short-circuit: reduced-motion users + GSAP/ScrollTrigger missing
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  var mm = gsap.matchMedia();
  mm.add('(min-width: 769px)', function () {
    // One ScrollTrigger pins the section; multiple tweens scrub against that pin.
    // We build a master timeline so the per-line clip animations stagger naturally
    // along the pin duration. end: '+=100%' = pin for one full viewport of scroll.
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=100%',
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true
      }
    });

    // Stagger the clip reveal across the 5 lines. Each line tweens its bottom
    // inset value from 100% → 0% (fully revealed). stagger: 0.15 inside the
    // timeline maps to 0.15 of progress per line — across 5 lines that's 0.75
    // of the pin duration, leaving the last 0.25 for the final line to settle.
    tl.to(lightLines, {
      clipPath: 'inset(0 0 0% 0)',
      ease: 'none',
      stagger: 0.15
    }, 0);

    // Parallax props: drift downward at ~0.3x–0.5x scroll speed during the pin.
    // Negative y on the left prop, positive y on the right prop creates a slight
    // counter-drift effect (cheap visual interest). Values are vh-scaled so they
    // stay subtle on tall and short viewports.
    if (propLeft) {
      tl.to(propLeft, { y: '-15vh', ease: 'none' }, 0);
    }
    if (propRight) {
      tl.to(propRight, { y: '10vh', ease: 'none' }, 0);
    }
  });
}

// ── Phase 3: Work image — single-axis y parallax (WORK-02, D-11 0.3x speed) ──
// .work-image-img is positioned at top: -15% with height: 130% (Plan 02 CSS),
// giving 15% headroom above and below the section boundary. We tween yPercent
// from +15 → -15 over the section's travel through the viewport — the image
// drifts upward as you scroll past, at roughly 0.3x scroll speed.
//
// No matchMedia guard: parallax is a single y tween, cheap on mobile, and the
// CSS authored in Plan 02 (work-image.css) shortens the section to 60vh on
// mobile so the effect remains tasteful.
function initWorkImageParallax() {
  var img = document.querySelector('.work-image .work-image-img');
  if (!img) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  // fromTo locks the start state explicitly so the image rests at +15% when the
  // section first enters the viewport (matches the CSS top: -15% offset visually).
  // start/end span the full section travel: 'top bottom' = section top hits
  // viewport bottom; 'bottom top' = section bottom leaves viewport top.
  gsap.fromTo(img,
    { yPercent: 15 },
    {
      yPercent: -15,
      ease: 'none',
      scrollTrigger: {
        trigger: '.work-image',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
        invalidateOnRefresh: true
      }
    }
  );
}
