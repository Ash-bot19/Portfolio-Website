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
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // Skip preloader when returning from a project page in the same session.
  // Check BEFORE setting the flag so the first-ever visit (even with a hash) still
  // shows the preloader. The flag is written below, after the check.
  var returnHash = window.location.hash;
  if (returnHash && sessionStorage.getItem('site-entered')) {
    skipToContent(returnHash);
    return;
  }
  try { sessionStorage.setItem('site-entered', '1'); } catch (e) {}

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
  window.scrollTo(0, 0);
  document.body.style.overflow = '';
  document.body.classList.add('site-ready');
  // Call init stubs in try/catch — one failure must not block the others.
  try { initNavScrollBehavior(); } catch (e) { console.error('[boot] initNavScrollBehavior failed:', e); }
  try { initNavLinks();          } catch (e) { console.error('[boot] initNavLinks failed:', e); }
  try { initGlobalCursor();      } catch (e) { console.error('[boot] initGlobalCursor failed:', e); }
  try { initMagneticLogo();      } catch (e) { console.error('[boot] initMagneticLogo failed:', e); }
  try { initHeroAnimation();     } catch (e) { console.error('[boot] initHeroAnimation failed:', e); }
  try { initContactAnimation();  } catch (e) { console.error('[boot] initContactAnimation failed:', e); }
}

// Skips the preloader when returning from a project page (same session + hash).
// Mirrors handoff() but replaces window.scrollTo(0,0) with a scroll to the hash.
function skipToContent(hash) {
  var preloaderEl = document.querySelector('.preloader');
  var mainEl = document.getElementById('page-main');
  if (preloaderEl) preloaderEl.style.display = 'none';
  document.body.style.overflow = '';
  document.body.classList.add('site-ready');
  if (mainEl) mainEl.removeAttribute('inert');

  var target;
  try { target = document.querySelector(hash); } catch (e) {}
  history.replaceState(null, '', window.location.pathname);

  function runInits() {
    try { initNavScrollBehavior(); } catch (e) {}
    try { initNavLinks();          } catch (e) {}
    try { initGlobalCursor();      } catch (e) {}
    try { initMagneticLogo();      } catch (e) {}
    try { initHeroLens();          } catch (e) {}
    try { initAboutLens();         } catch (e) {}
    try { initTimelineLens();      } catch (e) {}
    try { initHeroAnimation();     } catch (e) {}
    try { duplicateSkillCards();   } catch (e) {}
    try { initAboutAnimation();    } catch (e) {}
    try { initSkillsAnimation();   } catch (e) {}
    try { initWhatIBuildAnimation(); } catch (e) {}
    try { initWorkImageParallax();   } catch (e) {}
    try { initTimelineAnimation();   } catch (e) {}
    try { initProjectsAnimation();   } catch (e) {}
    try { initContactAnimation();    } catch (e) {}
    try { initNewSectionTitles();    } catch (e) {}
    try { initInPageAnchors();       } catch (e) {}
    // Delay scroll until ScrollTrigger has set up pin offsets
    setTimeout(function () {
      if (target) target.scrollIntoView({ behavior: 'instant' });
    }, 200);
  }

  if (!window.gsap) { runInits(); return; }
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 400); })]).then(runInits);
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
  // Maps mouse screen position into the overlay SVG's 922×1152 viewBox,
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
    var svgX = (e.clientX - rect.left) / rect.width  * 922;
    var svgY = (e.clientY - rect.top)  / rect.height * 1152;
    if (eyeL) movePupil(eyeL, 451, 426, svgX, svgY);
    if (eyeR) movePupil(eyeR, 591, 428, svgX, svgY);
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
  // opts.skipHide: don't hide preloader — slide-up tween is still in progress.
  // opts.skipScrollInits: skip scroll-based animations — they fire in the slide's onComplete
  //   so ScrollTrigger's internal page-scrolling (for pin measurement) can't trigger
  //   the toolbelt IntersectionObserver while the preloader is still covering the page.
  // Called with no args (reducedMotion path) → both flags false → full sync handoff.
  function handoff(opts) {
    var skipHide        = opts && opts.skipHide;
    var skipScrollInits = opts && opts.skipScrollInits;
    document.removeEventListener('mousemove', onMouseMove);
    window.scrollTo(0, 0);
    document.body.style.overflow = '';
    document.body.classList.add('site-ready');
    if (mainEl) mainEl.removeAttribute('inert');
    if (!skipHide) preloaderEl.style.display = 'none';
    // Phase A — always: nav, cursor, hero entrance (must be before slide so hero
    // elements are already in their from-state when the preloader lifts)
    try { initNavScrollBehavior(); } catch (e) { console.error('[handoff] initNavScrollBehavior failed:', e); }
    try { initNavLinks();          } catch (e) { console.error('[handoff] initNavLinks failed:', e); }
    try { initGlobalCursor();      } catch (e) { console.error('[handoff] initGlobalCursor failed:', e); }
    try { initMagneticLogo();      } catch (e) { console.error('[handoff] initMagneticLogo failed:', e); }
    try { initHeroLens();          } catch (e) { console.error('[handoff] initHeroLens failed:', e); }
    try { initAboutLens();         } catch (e) { console.error('[handoff] initAboutLens failed:', e); }
    try { initTimelineLens();      } catch (e) { console.error('[handoff] initTimelineLens failed:', e); }
    try { initMobileLens();        } catch (e) { console.error('[handoff] initMobileLens failed:', e); }
    try { initHeroAnimation();     } catch (e) { console.error('[handoff] initHeroAnimation failed:', e); }
    // Phase B — scroll-based: deferred when skipScrollInits (fired in slide onComplete instead)
    if (!skipScrollInits) {
      try { duplicateSkillCards();   } catch (e) { console.error('[handoff] duplicateSkillCards failed:', e); }
      try { initAboutAnimation();    } catch (e) { console.error('[handoff] initAboutAnimation failed:', e); }
      try { initSkillsAnimation();   } catch (e) { console.error('[handoff] initSkillsAnimation failed:', e); }
      try { initWhatIBuildAnimation(); } catch (e) { console.error('[handoff] initWhatIBuildAnimation failed:', e); }
      try { initWorkImageParallax();   } catch (e) { console.error('[handoff] initWorkImageParallax failed:', e); }
      try { initTimelineAnimation();   } catch (e) { console.error('[handoff] initTimelineAnimation failed:', e); }
      try { initProjectsAnimation();   } catch (e) { console.error('[handoff] initProjectsAnimation failed:', e); }
      try { initContactAnimation();    } catch (e) { console.error('[handoff] initContactAnimation failed:', e); }
      try { initNewSectionTitles();    } catch (e) { console.error('[handoff] initNewSectionTitles failed:', e); }
      try { initInPageAnchors();       } catch (e) { console.error('[handoff] initInPageAnchors failed:', e); }
    }
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
    gsap.timeline({ delay: 0.3 })
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
      // Phase A: nav + cursor + hero — runs before slide so hero is in its from-state
      .call(function () { handoff({ skipHide: true, skipScrollInits: true }); })
      .to(preloaderEl, {
        y: '-100%',
        duration: 0.9,
        ease: 'power4.inOut',
        onComplete: function () {
          preloaderEl.style.display = 'none';
          // Phase B: scroll-based animations — after slide so ScrollTrigger pin
          // measurement scrolling can't pre-trigger the toolbelt IntersectionObserver
          try { duplicateSkillCards();     } catch (e) { console.error('[scroll-init] duplicateSkillCards failed:', e); }
          try { initAboutAnimation();      } catch (e) { console.error('[scroll-init] initAboutAnimation failed:', e); }
          try { initSkillsAnimation();     } catch (e) { console.error('[scroll-init] initSkillsAnimation failed:', e); }
          try { initWhatIBuildAnimation(); } catch (e) { console.error('[scroll-init] initWhatIBuildAnimation failed:', e); }
          try { initWorkImageParallax();   } catch (e) { console.error('[scroll-init] initWorkImageParallax failed:', e); }
          try { initTimelineAnimation();   } catch (e) { console.error('[scroll-init] initTimelineAnimation failed:', e); }
          try { initProjectsAnimation();   } catch (e) { console.error('[scroll-init] initProjectsAnimation failed:', e); }
          try { initContactAnimation();    } catch (e) { console.error('[scroll-init] initContactAnimation failed:', e); }
          try { initNewSectionTitles();    } catch (e) { console.error('[scroll-init] initNewSectionTitles failed:', e); }
          try { initInPageAnchors();       } catch (e) { console.error('[scroll-init] initInPageAnchors failed:', e); }
        }
      }, '+=0.12');

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

  // Scrollspy: keep the link for the section in view in the light state.
  var aboutLink = document.querySelector('.nav-link[href="#about"]');
  var workLink = document.querySelector('.nav-link[href="#what-i-build"]');
  var certsLink = document.querySelector('.nav-link[href="#certifications"]');
  var contactLink = document.querySelector('.nav-link[href="#contact"]');

  var sectionToLink = [
    { section: document.getElementById('about'), link: aboutLink },
    { section: document.getElementById('what-i-build'), link: workLink },
    { section: document.getElementById('work'), link: workLink },
    { section: document.getElementById('experience'), link: workLink },
    { section: document.getElementById('projects'), link: workLink },
    { section: document.getElementById('certifications'), link: certsLink },
    { section: document.getElementById('contact'), link: contactLink }
  ].filter(function (item) { return item.section && item.link; });

  var activeLink = null;

  function setActiveLink(link) {
    if (activeLink === link) return;
    if (activeLink) activeLink.classList.remove('is-active');
    activeLink = link;
    if (activeLink) activeLink.classList.add('is-active');
  }

  if (sectionToLink.length > 0) {
    var scrollspyRaf = 0;

    function updateActiveLinkFromViewport() {
      scrollspyRaf = 0;

      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      var bandTop = viewportHeight * 0.25;
      var bandBottom = viewportHeight * 0.55;
      var bestItem = null;
      var bestOverlap = 0;

      sectionToLink.forEach(function (item) {
        var rect = item.section.getBoundingClientRect();
        var overlap = Math.min(rect.bottom, bandBottom) - Math.max(rect.top, bandTop);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestItem = item;
        }
      });

      setActiveLink(bestItem ? bestItem.link : null);
    }

    function requestScrollspyUpdate() {
      if (scrollspyRaf) return;
      scrollspyRaf = window.requestAnimationFrame(updateActiveLinkFromViewport);
    }

    window.addEventListener('scroll', requestScrollspyUpdate, { passive: true });
    window.addEventListener('resize', requestScrollspyUpdate);
    window.addEventListener('load', requestScrollspyUpdate);
    requestScrollspyUpdate();
  }
}

function initGlobalCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.site-cursor')) return;

  var cursor = document.createElement('div');
  cursor.className = 'site-cursor';
  document.body.appendChild(cursor);
  if (window.gsap) {
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
  }

  // Minhpham architecture: cursor size driven via --cursor-size CSS var tweened by GSAP.
  // Position lerps every frame (EASE 0.07). Opacity lerps (O_EASE 0.12) for lens hide/show.
  // Size is NOT lerped — GSAP tweens drive it directly so contract/extend have exact timing.
  var DEFAULT_SIZE = 40;
  var EASE   = 0.07;
  var O_EASE = 0.12;
  var targetX = 0, targetY = 0;
  var currentX = 0, currentY = 0;
  var targetOpacity = 0, currentOpacity = 0;
  var lensHidden = false;
  var hasPos = false;

  // GSAP tweens this proxy; onUpdate writes --cursor-size to the element.
  var sizeProxy = { v: DEFAULT_SIZE };

  function setSize(px) {
    cursor.style.setProperty('--cursor-size', px.toFixed(1) + 'px');
  }

  function tweenSize(px, duration, ease) {
    if (!window.gsap) { setSize(px); return; }
    gsap.killTweensOf(sizeProxy);
    sizeProxy.v = parseFloat(cursor.style.getPropertyValue('--cursor-size')) || DEFAULT_SIZE;
    gsap.to(sizeProxy, {
      v: px,
      duration: duration,
      ease: ease || 'power3.out',
      onUpdate: function() { setSize(sizeProxy.v); }
    });
  }

  function moveCursor(e) {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!hasPos) {
      currentX = targetX;
      currentY = targetY;
      hasPos = true;
    }
    targetOpacity = lensHidden ? 0 : 1;
  }

  function tickCursor() {
    if (!hasPos) return;
    currentX += (targetX - currentX) * EASE;
    currentY += (targetY - currentY) * EASE;
    currentOpacity += (targetOpacity - currentOpacity) * O_EASE;
    if (window.gsap) {
      gsap.set(cursor, { x: currentX, y: currentY, opacity: currentOpacity });
    } else {
      cursor.style.transform = 'translate3d(' + currentX + 'px, ' + currentY + 'px, 0) translate(-50%, -50%)';
      cursor.style.opacity = currentOpacity;
    }
  }

  if (window.gsap && gsap.ticker) {
    gsap.ticker.add(tickCursor);
  } else {
    (function raf() { tickCursor(); requestAnimationFrame(raf); })();
  }

  // Public hook for the section lenses (initHeroLens / initAboutLens /
  // initTimelineLens) to hide the dot while their reveal circle is active.
  // Scale param kept for API compat — ignored, size is GSAP-driven.
  cursor.__setTarget = function(scale, opacity, immediate) {
    if (opacity != null) {
      lensHidden = opacity === 0;
      targetOpacity = opacity;
    }
    if (immediate) {
      if (opacity != null) currentOpacity = opacity;
      tickCursor();
    }
  };

  // Expose size tweener for any external caller that needs direct size control.
  cursor.__tweenSize = tweenSize;

  document.addEventListener('pointermove', moveCursor, { passive: true });
  document.addEventListener('pointerleave', function () {
    targetOpacity = 0;
  });

  // Contract — cursor shrinks to nothing (minhpham js-cursor-contract: 0px, 0.3s power3.out).
  // Applies to text links, buttons, and WIB lines.
  document.querySelectorAll('a:not(.nav-logo):not(.side-social-link):not(.project-card-link), button:not(.cs-tab):not(.pipe-btn), .wib-line-dark').forEach(function(el) {
    el.addEventListener('mouseenter', function() { tweenSize(0, 0.3, 'power3.out'); });
    el.addEventListener('mouseleave', function() { tweenSize(DEFAULT_SIZE, 0.6, 'power3.out'); });
  });

  // Extend — cursor balloons to large circle (minhpham js-cursor-extend: 450px, 0.6s power3.out).
  document.querySelectorAll('.skill-card').forEach(function(el) {
    el.addEventListener('mouseenter', function() { tweenSize(450, 0.6, 'power3.out'); });
    el.addEventListener('mouseleave', function() { tweenSize(DEFAULT_SIZE, 0.6, 'power3.out'); });
  });
}

function initMagneticLogo() {
  var logo = document.querySelector('.nav-logo');
  if (!logo) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap) return;

  createMagneticTarget(logo, {
    activeClass: 'is-magnetic',
    zoneRadius: 82,
    maxPull: 20,
    pullRatio: 0.62,
    moveDuration: 0.18,
    resetDuration: 0.42
  });

  document.querySelectorAll('.side-social-link--github, .side-social-link--linkedin').forEach(function (el) {
    createMagneticTarget(el, {
      activeClass: 'is-magnetic-side',
      zoneRadius: 86,
      maxPull: 20,
      pullRatio: 0.62,
      cursorScale: 1,
      moveDuration: 0.18,
      resetDuration: 0.42
    });
  });
}

var magneticTargets = [];
var magneticRuntimeReady = false;

function createMagneticTarget(el, opts) {
  if (!el) return;
  if (el.dataset.magneticReady === 'true') return;
  if (!window.gsap) return;

  el.dataset.magneticReady = 'true';

  var activeClass = opts && opts.activeClass ? opts.activeClass : '';
  var zoneRadius = opts && opts.zoneRadius ? opts.zoneRadius : 56;
  var maxPull = opts && opts.maxPull ? opts.maxPull : 12;
  var pullRatio = opts && opts.pullRatio ? opts.pullRatio : 0.6;
  var moveDuration = opts && opts.moveDuration ? opts.moveDuration : 0.28;
  var resetDuration = opts && opts.resetDuration ? opts.resetDuration : 0.55;
  var latched = false;

  function getCenter() {
    var rect = el.getBoundingClientRect();
    var currentX = gsap.getProperty(el, 'x') || 0;
    var currentY = gsap.getProperty(el, 'y') || 0;
    return {
      x: rect.left + rect.width / 2 - currentX,
      y: rect.top + rect.height / 2 - currentY
    };
  }

  function resetTarget() {
    if (!latched) return;
    latched = false;
    if (activeClass) el.classList.remove(activeClass);
    gsap.to(el, {
      x: 0,
      y: 0,
      duration: resetDuration,
      ease: 'elastic.out(1, 0.45)',
      overwrite: 'auto'
    });
  }

  function activateTarget(dx, dy, distance) {
    if (!latched) {
      latched = true;
      if (activeClass) el.classList.add(activeClass);
    }

    var pull = Math.min(distance, maxPull);
    var ratio = distance === 0 ? 0 : (pull / distance) * pullRatio;
    gsap.to(el, {
      x: dx * ratio,
      y: dy * ratio,
      duration: moveDuration,
      ease: 'power3.out',
      overwrite: 'auto'
    });
  }

  magneticTargets.push({
    el: el,
    zoneRadius: zoneRadius,
    getCenter: getCenter,
    resetTarget: resetTarget,
    activateTarget: activateTarget
  });

  if (magneticRuntimeReady) return;
  magneticRuntimeReady = true;

  document.addEventListener('pointermove', function (e) {
    var bestTarget = null;
    var bestDx = 0;
    var bestDy = 0;
    var bestDistance = Infinity;

    magneticTargets.forEach(function (target) {
      var center = target.getCenter();
      var dx = e.clientX - center.x;
      var dy = e.clientY - center.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= target.zoneRadius && distance < bestDistance) {
        bestTarget = target;
        bestDx = dx;
        bestDy = dy;
        bestDistance = distance;
      }
    });

    magneticTargets.forEach(function (target) {
      if (target === bestTarget) {
        target.activateTarget(bestDx, bestDy, bestDistance);
      } else {
        target.resetTarget();
      }
    });
  }, { passive: true });

  window.addEventListener('blur', function () {
    magneticTargets.forEach(function (target) {
      target.resetTarget();
    });
  });
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

  if (words.length === 0) {
    console.error('[hero] no word spans for variant: ' + variantAttr);
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

  // gsap.set() is synchronous — applies from-states immediately in the same call
  // stack, with no RAF-frame gap. gsap.from() would wait one tick before snapping
  // elements invisible, leaving a brief flash at natural opacity.
  gsap.set(nameLabel, { y: 20, opacity: 0 });
  gsap.set(words,     { y: 40, opacity: 0 });

  var tl = gsap.timeline({
    onComplete: function () {
      // REVIEWS priority 7: cleanup — release GPU layers
      heroInner.classList.remove('is-animating');
    }
  });

  // 1. Name label fade-up
  tl.to(nameLabel, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' });

  // 2. Headline word stagger — '-=0.3' overlaps with tail of name label
  tl.to(words, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.06 }, '-=0.3');
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

// ── Shared left-to-right line reveal for large editorial copy ──
// Each line has a dim base layer and a bright copy masked in place.
// The bright copy does not move; clip-path reveals it from left to right.
function initLineMaskReveal(opts) {
  var section = document.querySelector(opts.sectionSelector);
  var triggerEl = document.querySelector(opts.triggerSelector || opts.sectionSelector);
  var lineInners = Array.from(document.querySelectorAll(opts.lineSelector)).filter(function (line) {
    return line.getClientRects().length > 0;
  });
  if (!section || !triggerEl || lineInners.length === 0) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  var mm = gsap.matchMedia();
  mm.add('(min-width: 769px)', function () {
    section.classList.add('is-line-reveal-ready');
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerEl,
        start: opts.start || 'top bottom',
        end: opts.end || 'bottom top',
        scrub: opts.scrub || 0.45,
        invalidateOnRefresh: true
      }
    });

    lineInners.forEach(function (line) {
      tl.fromTo(line,
        { clipPath: 'inset(0 100% 0 0)' },
        {
        clipPath: 'inset(0 0% 0 0)',
        ease: 'none',
        duration: 1
        }
      );
    });
  });
}

// ── About section: left-to-right line-by-line reveal ──
function initAboutAnimation() {
  initLineMaskReveal({
    sectionSelector: '.about',
    triggerSelector: '.about .about-text-reveal',
    lineSelector: '.about .about-text-reveal .reveal-line-inner',
    start: 'top 90%',
    end: 'bottom 55%',
    scrub: 0.45
  });
}

// ── Experience intro: left-to-right line-by-line reveal ──
function initTimelineIntroReveal() {
  initLineMaskReveal({
    sectionSelector: '.timeline',
    triggerSelector: '.timeline .timeline-intro-reveal',
    lineSelector: '.timeline .timeline-intro-reveal .reveal-line-inner',
    start: 'top 90%',
    end: 'bottom 55%',
    scrub: 0.45
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
    gsap.to(lightLines, {
      clipPath: 'inset(0 0% 0 0)',
      duration: 1.2,
      ease: 'none',
      stagger: 0.06,
      scrollTrigger: {
        trigger: section,
        start: 'top 50%',
        end: 'top -20%',
        scrub: 1,
        invalidateOnRefresh: true
      }
    });

    // Parallax props drift while the section passes the viewport. No pin here:
    // page scroll should stay synced with user input.
    if (propLeft) {
      gsap.to(propLeft, {
        y: '-15vh',
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
          invalidateOnRefresh: true
        }
      });
    }
    if (propRight) {
      gsap.to(propRight, {
        y: '10vh',
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
          invalidateOnRefresh: true
        }
      });
    }


  });

  // Hover panel split: reveal only the orange/black overlay from the row center.
  // The scroll-driven .wib-line-light clip remains untouched.
  var wibLines = document.querySelectorAll('.what-i-build .wib-line');
  wibLines.forEach(function (line) {
    var accentEls = line.querySelectorAll('.wib-line-accent');
    if (accentEls.length === 0) return;
    var isOpen = false;

    function getTextRect() {
      var textEls = line.querySelectorAll('.wib-line-dark, .wib-line-light');
      for (var i = 0; i < textEls.length; i += 1) {
        if (window.getComputedStyle(textEls[i]).display === 'none') continue;
        var range = document.createRange();
        range.selectNodeContents(textEls[i]);
        var rect = range.getBoundingClientRect();
        range.detach();
        if (rect.width > 0 && rect.height > 0) return rect;
      }
      return null;
    }

    function openPanel() {
      if (isOpen) return;
      isOpen = true;
      gsap.fromTo(accentEls,
        { clipPath: 'inset(50% 0 50% 0)' },
        {
          clipPath: 'inset(0% 0 0% 0)',
          duration: 0.85,
          ease: 'power3.out',
          overwrite: true
        }
      );
    }

    function closePanel() {
      if (!isOpen) return;
      isOpen = false;
      gsap.to(accentEls, {
        clipPath: 'inset(50% 0 50% 0)',
        immediateRender: false,
        duration: 0.65,
        ease: 'power2.inOut',
        overwrite: true
      });
    }

    line.addEventListener('mousemove', function (e) {
      var rect = getTextRect();
      if (!rect) {
        closePanel();
        return;
      }
      var isOverText = e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (isOverText) {
        openPanel();
      } else {
        closePanel();
      }
    });
    line.addEventListener('mouseleave', closePanel);
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

// ── Phase 3: Timeline — intro clip reveal + rows stagger + role hover splits ──
function initTimelineAnimation() {
  var rows = document.querySelectorAll('.timeline-rows .timeline-row');
  if (rows.length === 0) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  initTimelineIntroReveal();

  // Rows stagger slide-up
  gsap.from(rows, {
    y: 40,
    opacity: 0,
    duration: 0.7,
    ease: 'power2.out',
    stagger: 0.1,
    scrollTrigger: {
      trigger: '.timeline-rows',
      start: 'top 85%',
      once: true
    },
    onStart: function () {
      rows.forEach(function (row) { row.classList.add('is-animating'); });
    },
    onComplete: function () {
      rows.forEach(function (row) { row.classList.remove('is-animating'); });
    }
  });

  // Role hover splits — skip on touch devices
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('.timeline-role-wrap').forEach(function (wrap) {
    var accent = wrap.querySelector('.timeline-role-accent');
    if (!accent) return;
    var isOpen = false;

    function openPanel() {
      if (isOpen) return;
      isOpen = true;
      gsap.fromTo(accent,
        { clipPath: 'inset(50% 0 50% 0)' },
        { clipPath: 'inset(0% 0 0% 0)', duration: 0.85, ease: 'power3.out', overwrite: true }
      );
    }

    function closePanel() {
      if (!isOpen) return;
      isOpen = false;
      gsap.to(accent, {
        clipPath: 'inset(50% 0 50% 0)',
        immediateRender: false,
        duration: 0.65,
        ease: 'power2.inOut',
        overwrite: true
      });
    }

    wrap.addEventListener('mouseenter', openPanel);
    wrap.addEventListener('mouseleave', closePanel);
  });
}

// ── Phase 3: Project cards — stagger scale+fade on scroll (PROJ-02, D-21) ──
// Each .project-card enters with scale: 0.92 → 1 and opacity: 0 → 1, staggered
// 0.1s per card. ScrollTrigger fires once at top 85%. Same .is-animating gate
// pattern as initTimelineAnimation, paired with .project-card.is-animating
// will-change rule in projects.css.
function initProjectsAnimation() {
  var cards = document.querySelectorAll('.projects-grid .project-card');
  if (cards.length === 0) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.from(cards, {
    scale: 0.92,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    stagger: 0.1,
    clearProps: 'transform,opacity',      /* remove inline styles after animation so CSS :hover scale works */
    scrollTrigger: {
      trigger: '.projects-grid',
      start: 'top 85%',
      once: true
    },
    onStart: function () {
      cards.forEach(function (card) { card.classList.add('is-animating'); });
    },
    onComplete: function () {
      cards.forEach(function (card) { card.classList.remove('is-animating'); });
    }
  });
}

// ── Hero lens — cursor expands to orange circle revealing honest text ──
// The .hero-lens overlay has clip-path: circle(0px at X Y) at rest.
// On mouseenter the circle radius animates to 160px via GSAP (lensData proxy).
// On mousemove the circle center updates synchronously so the lens tracks the cursor.
// The site-cursor dot hides while inside the hero to avoid doubling with the circle.
function initHeroLens() {
  var hero = document.querySelector('.hero');
  var triggerEl = document.querySelector('.hero-inner');
  var lens = document.querySelector('.hero-lens');
  if (!hero || !triggerEl || !lens) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  // ≤1024px is the touch/hold-button breakpoint — the mobile hold owns the
  // lens clip-path there. Without this guard this ticker would reset
  // clip-path to radius 0 every frame and wipe whatever the hold draws.
  if (window.matchMedia('(max-width: 1024px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap) return;

  var mqHandheld = window.matchMedia('(max-width: 1024px)');

  // Lerped position so the lens trails the cursor identically. EASE matches
  // initGlobalCursor (0.07) — heavy minhpham-style lag.
  var CURSOR_RADIUS = 19;
  var LENS_RADIUS = 160;
  var lensData = { r: 0 };
  var EASE = 0.07;
  var targetX = 0, targetY = 0;
  var lensX = 0, lensY = 0;
  var active = false;

  function updateLensClip() {
    lens.style.clipPath = 'circle(' + lensData.r.toFixed(1) + 'px at ' +
      lensX.toFixed(1) + 'px ' + lensY.toFixed(1) + 'px)';
  }

  function tickLens() {
    // If the viewport is resized down to the handheld range after load, hand
    // the lens to the mobile hold button: stop driving clip-path here (reset
    // to hidden once) so the desktop ticker and the hold never fight.
    if (mqHandheld.matches) { lens.style.clipPath = 'circle(0px at 50% 50%)'; return; }
    // Always run while gsap may still be animating r toward 0 — early returns
    // here leave the clip-path stuck at a tiny non-zero radius, producing the
    // "small orange dot left behind" bug.
    lensX += (targetX - lensX) * EASE;
    lensY += (targetY - lensY) * EASE;
    updateLensClip();
  }
  gsap.ticker.add(tickLens);

  // Position tracks against the lens box so the circle stays whole through
  // the lens bleed outside the section boundary.
  // Also handles late-entry when preloader covered the hero at init time
  // (late-entry guard fires before preloader slides, `:hover` is false then).
  hero.addEventListener('mousemove', function (e) {
    var rect = lens.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    if (!active && triggerEl.matches(':hover')) {
      lensX = targetX;
      lensY = targetY;
      active = true;
      var sc = document.querySelector('.site-cursor');
      if (sc && sc.__tweenSize) sc.__tweenSize(40, 0);
      if (sc && sc.__setTarget) sc.__setTarget(1, 0, true);
      gsap.to(lensData, { r: LENS_RADIUS, duration: 0.7, ease: 'power3.out', overwrite: true });
    }
  });

  // Lens activates only when over the inner text content — not the section padding
  triggerEl.addEventListener('mouseenter', function (e) {
    var rect = lens.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    // Snap lens position to mouse on entry — first frame starts at cursor.
    lensX = targetX;
    lensY = targetY;
    active = true;
    var cursor = document.querySelector('.site-cursor');
    if (cursor && cursor.__tweenSize) cursor.__tweenSize(40, 0);
    if (cursor && cursor.__setTarget) cursor.__setTarget(1, 0, true);
    gsap.fromTo(lensData, { r: CURSOR_RADIUS }, { r: LENS_RADIUS, duration: 0.7, ease: 'power3.out', overwrite: true });
  });

  triggerEl.addEventListener('mouseleave', function () {
    active = false;
    gsap.to(lensData, {
      r: CURSOR_RADIUS, duration: 0.45, ease: 'power2.out', overwrite: true,
      onComplete: function () {
        lensData.r = 0;
        updateLensClip();
        var c = document.querySelector('.site-cursor');
        if (c && c.__setTarget) c.__setTarget(null, 1, true);
      }
    });
  });
  // Late-entry guard: cursor already inside triggerEl when listener registered — mouseenter never fires.
  if (triggerEl.matches(':hover')) {
    active = true;
    var sc = document.querySelector('.site-cursor');
    if (sc && sc.__tweenSize) sc.__tweenSize(40, 0);
    if (sc && sc.__setTarget) sc.__setTarget(1, 0, true);
    gsap.to(lensData, { r: LENS_RADIUS, duration: 0.7, ease: 'power3.out', overwrite: true });
  }
}

// ── About section: cursor lens — honest text revealed by orange circle ──
// Same clip-path circle pattern as initHeroLens. Trigger is .about-inner
// (inner text wrapper) so the lens only activates when over the text, not the 17vw padding.
function initAboutLens() {
  var section = document.querySelector('.about');
  var triggerEl = document.querySelector('.about-inner');
  var lens = document.querySelector('.about-lens');
  if (!section || !triggerEl || !lens) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  // ≤1024px is the touch/hold-button breakpoint — the mobile hold owns the
  // lens clip-path there. Without this guard this ticker would reset
  // clip-path to radius 0 every frame and wipe whatever the hold draws.
  if (window.matchMedia('(max-width: 1024px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap) return;

  var mqHandheld = window.matchMedia('(max-width: 1024px)');

  var CURSOR_RADIUS = 19;
  var LENS_RADIUS = 160;
  var lensData = { r: 0 };
  var EASE = 0.07;
  var targetX = 0, targetY = 0;
  var lensX = 0, lensY = 0;
  var active = false;

  function updateLensClip() {
    lens.style.clipPath = 'circle(' + lensData.r.toFixed(1) + 'px at ' +
      lensX.toFixed(1) + 'px ' + lensY.toFixed(1) + 'px)';
  }

  function tickLens() {
    // If the viewport is resized down to the handheld range after load, hand
    // the lens to the mobile hold button: stop driving clip-path here (reset
    // to hidden once) so the desktop ticker and the hold never fight.
    if (mqHandheld.matches) { lens.style.clipPath = 'circle(0px at 50% 50%)'; return; }
    // Always run while gsap may still be animating r toward 0 — early returns
    // here leave the clip-path stuck at a tiny non-zero radius, producing the
    // "small orange dot left behind" bug.
    lensX += (targetX - lensX) * EASE;
    lensY += (targetY - lensY) * EASE;
    updateLensClip();
  }
  gsap.ticker.add(tickLens);

  section.addEventListener('mousemove', function (e) {
    var rect = lens.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    if (!active && triggerEl.matches(':hover')) {
      lensX = targetX;
      lensY = targetY;
      active = true;
      var sc = document.querySelector('.site-cursor');
      if (sc && sc.__tweenSize) sc.__tweenSize(40, 0);
      if (sc && sc.__setTarget) sc.__setTarget(1, 0, true);
      gsap.to(lensData, { r: LENS_RADIUS, duration: 0.7, ease: 'power3.out', overwrite: true });
    }
  });

  triggerEl.addEventListener('mouseenter', function (e) {
    var rect = lens.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    lensX = targetX;
    lensY = targetY;
    active = true;
    var cursor = document.querySelector('.site-cursor');
    if (cursor && cursor.__tweenSize) cursor.__tweenSize(40, 0);
    if (cursor && cursor.__setTarget) cursor.__setTarget(1, 0, true);
    gsap.fromTo(lensData, { r: CURSOR_RADIUS }, { r: LENS_RADIUS, duration: 0.7, ease: 'power3.out', overwrite: true });
  });

  triggerEl.addEventListener('mouseleave', function () {
    active = false;
    gsap.to(lensData, {
      r: CURSOR_RADIUS, duration: 0.45, ease: 'power2.out', overwrite: true,
      onComplete: function () {
        lensData.r = 0;
        updateLensClip();
        var c = document.querySelector('.site-cursor');
        if (c && c.__setTarget) c.__setTarget(null, 1, true);
      }
    });
  });
  // Late-entry guard: cursor already inside triggerEl when listener registered — mouseenter never fires.
  if (triggerEl.matches(':hover')) {
    active = true;
    var sc = document.querySelector('.site-cursor');
    if (sc && sc.__tweenSize) sc.__tweenSize(40, 0);
    if (sc && sc.__setTarget) sc.__setTarget(1, 0, true);
    gsap.to(lensData, { r: LENS_RADIUS, duration: 0.7, ease: 'power3.out', overwrite: true });
  }
}

// ── Timeline section: cursor lens — honest intro revealed by orange circle ──
function initTimelineLens() {
  var section = document.querySelector('.timeline');
  var triggerEl = document.querySelector('.timeline-intro-wrap');
  var lens = document.querySelector('.timeline-lens');
  if (!section || !triggerEl || !lens) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  // ≤1024px is the touch/hold-button breakpoint — the mobile hold owns the
  // lens clip-path there. Without this guard this ticker would reset
  // clip-path to radius 0 every frame and wipe whatever the hold draws.
  if (window.matchMedia('(max-width: 1024px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap) return;

  var mqHandheld = window.matchMedia('(max-width: 1024px)');

  var CURSOR_RADIUS = 19;
  var LENS_RADIUS = 160;
  var lensData = { r: 0 };
  var EASE = 0.07;
  var targetX = 0, targetY = 0;
  var lensX = 0, lensY = 0;
  var active = false;

  function updateLensClip() {
    lens.style.clipPath = 'circle(' + lensData.r.toFixed(1) + 'px at ' +
      lensX.toFixed(1) + 'px ' + lensY.toFixed(1) + 'px)';
  }

  function tickLens() {
    // If the viewport is resized down to the handheld range after load, hand
    // the lens to the mobile hold button: stop driving clip-path here (reset
    // to hidden once) so the desktop ticker and the hold never fight.
    if (mqHandheld.matches) { lens.style.clipPath = 'circle(0px at 50% 50%)'; return; }
    // Always run while gsap may still be animating r toward 0 — early returns
    // here leave the clip-path stuck at a tiny non-zero radius, producing the
    // "small orange dot left behind" bug.
    lensX += (targetX - lensX) * EASE;
    lensY += (targetY - lensY) * EASE;
    updateLensClip();
  }
  gsap.ticker.add(tickLens);

  section.addEventListener('mousemove', function (e) {
    var rect = lens.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    if (!active && triggerEl.matches(':hover')) {
      lensX = targetX;
      lensY = targetY;
      active = true;
      var sc = document.querySelector('.site-cursor');
      if (sc && sc.__tweenSize) sc.__tweenSize(40, 0);
      if (sc && sc.__setTarget) sc.__setTarget(1, 0, true);
      gsap.to(lensData, { r: LENS_RADIUS, duration: 0.7, ease: 'power3.out', overwrite: true });
    }
  });

  triggerEl.addEventListener('mouseenter', function (e) {
    var rect = lens.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    lensX = targetX;
    lensY = targetY;
    active = true;
    var cursor = document.querySelector('.site-cursor');
    if (cursor && cursor.__tweenSize) cursor.__tweenSize(40, 0);
    if (cursor && cursor.__setTarget) cursor.__setTarget(1, 0, true);
    gsap.fromTo(lensData, { r: CURSOR_RADIUS }, { r: LENS_RADIUS, duration: 0.7, ease: 'power3.out', overwrite: true });
  });

  triggerEl.addEventListener('mouseleave', function () {
    active = false;
    gsap.to(lensData, {
      r: CURSOR_RADIUS, duration: 0.45, ease: 'power2.out', overwrite: true,
      onComplete: function () {
        lensData.r = 0;
        updateLensClip();
        var c = document.querySelector('.site-cursor');
        if (c && c.__setTarget) c.__setTarget(null, 1, true);
      }
    });
  });
  // Late-entry guard: cursor already inside triggerEl when listener registered — mouseenter never fires.
  if (triggerEl.matches(':hover')) {
    active = true;
    var sc = document.querySelector('.site-cursor');
    if (sc && sc.__tweenSize) sc.__tweenSize(40, 0);
    if (sc && sc.__setTarget) sc.__setTarget(1, 0, true);
    gsap.to(lensData, { r: LENS_RADIUS, duration: 0.7, ease: 'power3.out', overwrite: true });
  }
}

// ── Mobile hold-to-reveal — single fixed button, viewport-anchored ──
// Detects which lens section is most visible on pointerdown, then spreads
// that section's overlay from the button's position outward.
// On sections without a lens nothing happens.
function initMobileLens() {
  if (!window.gsap) return;

  var btn = document.querySelector('.lens-reveal-btn');
  if (!btn) return;

  var lenses = [
    { section: document.querySelector('.hero'),     el: document.querySelector('.hero-lens') },
    { section: document.querySelector('.about'),    el: document.querySelector('.about-lens') },
    { section: document.querySelector('.timeline'), el: document.querySelector('.timeline-lens') }
  ].filter(function(p) { return p.section && p.el; });
  if (!lenses.length) return;

  var data       = { r: 0 };
  var activeLens = null;
  var ox = 0, oy = 0;
  var mq = window.matchMedia('(max-width: 1024px)');

  // ── Contextual visibility ─────────────────────────────────────────────────
  // The button fades in only while a dual-text section (hero/about/experience)
  // is on or near screen, and only at ≤1024px. Generous rootMargin so it
  // appears just before the section enters and lingers after it leaves — a
  // fast scroll cannot slip past it. Adjacent dual-text sections keep it
  // visible across the seam (no flicker).
  var onScreen = (typeof Set === 'function') ? new Set() : null;
  var fallbackVisible = false;
  function refreshBtn() {
    var anyVisible = onScreen ? onScreen.size > 0 : fallbackVisible;
    if (mq.matches && anyVisible) btn.classList.add('is-visible');
    else btn.classList.remove('is-visible');
  }
  if ('IntersectionObserver' in window && onScreen) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) onScreen.add(en.target);
        else onScreen.delete(en.target);
      });
      refreshBtn();
    }, { root: null, rootMargin: '25% 0px 25% 0px', threshold: 0 });
    lenses.forEach(function (p) { io.observe(p.section); });
  } else {
    // No IntersectionObserver — fall back to "visible whenever ≤1024".
    fallbackVisible = true;
  }
  if (mq.addEventListener) mq.addEventListener('change', refreshBtn);
  else if (mq.addListener) mq.addListener(refreshBtn);
  refreshBtn();

  // Return the lens pair whose section overlaps the viewport the most.
  function findActivePair() {
    var vh = window.innerHeight;
    var best = null, bestPx = 0;
    lenses.forEach(function(pair) {
      var r   = pair.section.getBoundingClientRect();
      var vis = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (vis > bestPx) { bestPx = vis; best = pair; }
    });
    return best;
  }

  function calcMaxR(lensEl) {
    var br = btn.getBoundingClientRect();
    var lr = lensEl.getBoundingClientRect();
    var x  = br.left + br.width  / 2 - lr.left;
    var y  = br.top  + br.height / 2 - lr.top;
    ox = x; oy = y;
    return Math.ceil(Math.sqrt(
      Math.pow(Math.max(x, lr.width  - x), 2) +
      Math.pow(Math.max(y, lr.height - y), 2)
    ));
  }

  function setClip(lensEl, r) {
    lensEl.style.clipPath = 'circle(' + r.toFixed(1) + 'px at ' +
      ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px)';
  }

  btn.addEventListener('pointerdown', function(e) {
    if (!mq.matches) return;
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}

    var pair = findActivePair();
    if (!pair) return;
    activeLens = pair.el;

    var maxR = calcMaxR(activeLens);
    data.r = 0;
    gsap.killTweensOf(data);
    gsap.to(data, {
      r: maxR,
      duration: 0.65,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: function() { if (activeLens) setClip(activeLens, data.r); }
    });
  });

  function release() {
    if (!activeLens) return;
    var lens = activeLens;
    gsap.killTweensOf(data);
    gsap.to(data, {
      r: 0,
      duration: 0.4,
      ease: 'power2.in',
      overwrite: true,
      onUpdate: function() { setClip(lens, data.r); },
      onComplete: function() {
        lens.style.clipPath = 'circle(0px at 50% 50%)';
        activeLens = null;
      }
    });
  }

  btn.addEventListener('pointerup',         release);
  btn.addEventListener('pointercancel',     release);
  btn.addEventListener('lostpointercapture', release);
}

// ── New section titles — left-to-right line-by-line reveal, scrubbed, bidirectional ──
// One ScrollTrigger + sequential timeline per title — identical pattern to initLineMaskReveal.
function initNewSectionTitles() {
  var titles = Array.from(document.querySelectorAll('.ps-section-title'));
  if (!titles.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  var mm = gsap.matchMedia();
  mm.add('(min-width: 769px)', function () {
    titles.forEach(function (title) {
      var lineInners = Array.from(title.querySelectorAll('.reveal-line-inner')).filter(function (el) {
        return el.getClientRects().length > 0;
      });
      if (!lineInners.length) return;

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: title,
          start: 'top 90%',
          end: 'top 35%',
          scrub: 0.45,
          invalidateOnRefresh: true
        }
      });

      lineInners.forEach(function (line) {
        tl.fromTo(line,
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)', ease: 'none', duration: 1 }
        );
      });
    });
  });
}

// ── Contact section — scroll entrance + orange hover panel ──
// Stagger-fades .contact-link items on scroll. On desktop, mouseenter expands
// .contact-link-accent from the vertical centre (same clip-path pattern as
// initWhatIBuildAnimation). Touch devices skip the hover wiring entirely.
function initContactAnimation() {
  var links = document.querySelectorAll('.contact-link');
  if (links.length === 0) return;
  if (!window.gsap) return;

  // Scroll entrance
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(links, {
      y: 24,
      opacity: 0,
      duration: 0.55,
      ease: 'power2.out',
      stagger: 0.07,
      clearProps: 'transform,opacity',
      scrollTrigger: {
        trigger: '.contact-grid',
        start: 'top 85%',
        once: true
      }
    });
  }

  // Hover panel — skip on touch devices
  if (window.matchMedia('(pointer: coarse)').matches) return;

  links.forEach(function (link) {
    var accentEl = link.querySelector('.contact-link-accent');
    if (!accentEl) return;
    var isOpen = false;

    function openPanel() {
      if (isOpen) return;
      isOpen = true;
      gsap.fromTo(accentEl,
        { clipPath: 'inset(50% 0 50% 0)' },
        { clipPath: 'inset(0% 0 0% 0)', duration: 0.85, ease: 'power3.out', overwrite: true }
      );
    }

    function closePanel() {
      if (!isOpen) return;
      isOpen = false;
      gsap.to(accentEl, {
        clipPath: 'inset(50% 0 50% 0)',
        immediateRender: false,
        duration: 0.65,
        ease: 'power2.inOut',
        overwrite: true
      });
    }

    link.addEventListener('mouseenter', openPanel);
    link.addEventListener('mouseleave', closePanel);
  });
}

// ── In-page anchor smooth scroll — covers any a[href^="#"] outside the nav ──
function initInPageAnchors() {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    // Skip links already handled by initNav (inside .nav-links)
    if (link.closest('.nav-links')) return;
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });
}
