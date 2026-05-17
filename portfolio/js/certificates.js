'use strict';

/* ==========================================================================
   certificates.js — Scroll-progress-driven deck, orbital cycling.

   Motion contract: continuous, scroll-deterministic (CLAUDE.md Design
   Decisions). One ScrollTrigger with scrub:true + computed snap points
   drives the whole deck. From scroll progress we derive p ∈ [0, N-1].

   Two regimes per card, based on phase = i - p:
     - In-stack (phase ∈ [0, N-1] or phase < -1): CSS handles the peek
       transform via --pos. JS clears inline transform/opacity/zIndex.
     - Wrap (phase ∈ (-1, 0]): card is doing the orbital arc — translate
       down out of viewport, then rise behind the stack to land at back
       peek. JS owns transform/opacity/zIndex inline during this regime.

   The two regimes meet at phase=0 (--pos=0, fully visible front) and
   phase=-1 (--pos=N-1, back-peek position) with identical visuals, so
   the handoff is seamless when JS adds/clears inline styles.

   Dwell: section adds 50vh at the start where p stays pinned at 0. This
   gives card 0 "presence" before transitions begin.
   ========================================================================== */

(function initCertDeck() {
  var cards    = Array.from(document.querySelectorAll('.deck-card'));
  if (!cards.length) return;

  var N        = cards.length;
  var scrollEl = document.getElementById('certDeckScroll');
  var ambient  = document.getElementById('certAmbient');
  var rail     = document.getElementById('certRail');
  var progNum  = document.getElementById('certProgNum');
  var progBar  = document.getElementById('certProgBar');
  var hintEl   = document.querySelector('.cert-hint');
  if (!scrollEl) return;

  /* Layout constants — keep in sync with certificates.css formulas. */
  var DWELL_VH        = 50;                            // viewport units of dwell at start
  var PEEK_STEP_PX    = 36;                            // matches CSS: translateY(-36px * --pos)
  var PEEK_SCALE_STEP = 0.045;                         // matches CSS: scale(1 - 0.045 * --pos)
  var ARC_VH          = 0.8;                           // wrap arc amplitude (× viewport height)
  var RELEASE_MS      = 220;                           // matches CSS .is-releasing transform transition

  /* Tilt lookup — alternating ±1-1.5° per peek pos, matches the original
     hand-tuned aesthetic. Linear-interp between integer indices so tilt is
     continuous across the cycle. Extends past N=5 with sensible values so
     the formula doesn't break if cards are added. */
  var TILT_TABLE = [0, 1.2, -0.8, 1.5, -1.1, 0.7, -1.3, 1.0];
  function tiltForPos(pos) {
    var i0 = Math.floor(pos);
    var i1 = Math.min(i0 + 1, TILT_TABLE.length - 1);
    var f  = pos - i0;
    var a  = TILT_TABLE[Math.min(i0, TILT_TABLE.length - 1)];
    var b  = TILT_TABLE[i1];
    return a * (1 - f) + b * f;
  }

  /* Container height: N * 100vh of pin range + DWELL_VH + 100vh sticky pin.
     Resulting pin range (scrollEl.offsetHeight - innerHeight) =
     N*100vh + DWELL_VH. p covers N-1 transitions in (N-1)*100vh after the dwell. */
  scrollEl.style.height = (N * 100 + DWELL_VH) + 'vh';

  /* ── Snap points in raw progress space.
     dwellFrac = portion of pin range that's dwell. Slot 0 snaps to start,
     slots 1..N-1 snap to progress values after the dwell, evenly spaced. */
  function computeDwellFrac() {
    var pinRange = scrollEl.offsetHeight - window.innerHeight;
    return (DWELL_VH * window.innerHeight / 100) / pinRange;
  }
  function computeSnapPoints() {
    var dwellFrac = computeDwellFrac();
    var pts = [0];
    for (var k = 1; k < N; k++) {
      pts.push(dwellFrac + (k / (N - 1)) * (1 - dwellFrac));
    }
    return pts;
  }
  var snapPoints = computeSnapPoints();

  /* ── Rail dots ──────────────────────────────────────────────────── */
  cards.forEach(function(card, i) {
    var d = document.createElement('button');
    d.className = 'cert-rail-dot';
    d.dataset.label = card.dataset.label || ('Card ' + (i + 1));
    d.setAttribute('aria-label', d.dataset.label);
    d.addEventListener('click', function() { promoteCard(i); });
    rail.appendChild(d);
  });
  var dots = Array.from(rail.children);

  /* ── Active-index UI ──────────────────────────────────────────── */
  var activeIdx = -1;
  function updateUI(i) {
    if (i === activeIdx) return;
    activeIdx = i;
    var glow = getComputedStyle(cards[i]).getPropertyValue('--glow').trim();
    if (ambient) ambient.style.setProperty('--card-glow', glow);
    dots.forEach(function(d, k) { d.classList.toggle('active', k === i); });
    if (progNum) progNum.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
    if (progBar) progBar.style.setProperty('--p', ((i + 1) / N * 100) + '%');
    if (hintEl && i > 0) hintEl.style.opacity = '0';
  }

  /* ── Click-promote state (Reading B). ────────────────────────────
     overrideIdx is the index of the card currently click-promoted to
     front, or -1 if none. While set:
       - paint() skips that card so scrub doesn't fight the override.
       - paint() also skips active-index updates (the promoted card is
         visually the active one).
       - On the next scroll input, ScrollTrigger.onUpdate calls
         cancelPromote() which releases the card with a brief 220ms
         transform transition so it catches up smoothly. ─────────── */
  var overrideIdx = -1;

  /* Release a specific card from promoted state. Adds .is-releasing for
     a transient transform transition; removes .is-promoted so CSS rule
     falls back to the scroll-driven formula (using whatever --pos/--tilt
     paint() writes next). */
  function releaseCard(idx) {
    var card = cards[idx];
    card.classList.add('is-releasing');
    card.classList.remove('is-promoted');
    setTimeout(function() { card.classList.remove('is-releasing'); }, RELEASE_MS + 20);
  }

  function cancelPromote() {
    if (overrideIdx < 0) return;
    releaseCard(overrideIdx);
    overrideIdx = -1;
  }

  function promoteCard(i) {
    if (overrideIdx === i) return;
    if (overrideIdx >= 0) releaseCard(overrideIdx);

    overrideIdx = i;
    var card = cards[i];
    card.classList.remove('is-releasing');
    card.classList.add('is-promoted');
    /* Snap --pos/--tilt to front values so they're correct when CSS rule
       eventually takes over (after release). Doesn't affect promoted
       transform — that's hardcoded in the .is-promoted rule. */
    card.style.setProperty('--pos', '0');
    card.style.setProperty('--tilt', '0deg');
    updateUI(i);
  }

  /* ── In-stack: clear inline overrides, let CSS formula apply.
     --pos and --tilt are written every frame; --hover-lift is handled
     by CSS :hover and intentionally untouched here. ─────────────── */
  function setInStack(card, stackPos) {
    card.style.transform = '';
    card.style.opacity = '';
    card.style.zIndex = '';
    card.style.setProperty('--pos', stackPos.toFixed(3));
    card.style.setProperty('--tilt', tiltForPos(stackPos).toFixed(2) + 'deg');
  }

  /* ── Wrap regime: parabolic arc down + behind stack.
     wrapT ∈ [0, 1]: 0 = just left front; 0.5 = far below viewport, invisible;
     1 = arriving at back-peek position. The card is "above" the stack
     during the descent (z high) and "behind" the stack during the rise
     (z low) — the discrete swap at wrapT=0.5 is invisible because
     opacity is 0 at that instant.
     The peak amplitude of the arc puts the card well below the viewport
     so the user reads it as "the card has gone underneath the deck." */
  function setInWrap(card, wrapT) {
    var vh        = window.innerHeight;
    var sinTerm   = Math.sin(wrapT * Math.PI);     // 0 at boundaries, 1 at midpoint
    var backY     = -PEEK_STEP_PX * (N - 1);       // y of back-peek position
    var backScale = 1 - PEEK_SCALE_STEP * (N - 1); // scale of back-peek position

    var y       = sinTerm * vh * ARC_VH + wrapT * backY;
    var scale   = (1 - sinTerm * 0.15) * (1 + wrapT * (backScale - 1));
    var opacity = Math.cos(wrapT * Math.PI);
    opacity     = opacity * opacity;                // cos² — visible at boundaries, 0 at midpoint
    var z       = wrapT < 0.5 ? 60 : 5;             // above stack during descent; behind during rise

    /* Tilt tracks linearly across the cycle so wrap boundaries (pos 0 and
       pos N-1) match the in-stack tilt for that position exactly. */
    var linearPos = wrapT * (N - 1);
    var tilt = tiltForPos(linearPos);

    /* Keep --pos tracking linearly so content fade reads continuously. */
    card.style.setProperty('--pos', linearPos.toFixed(3));
    card.style.setProperty('--tilt', tilt.toFixed(2) + 'deg');
    card.style.transform =
      'translateY(' + y.toFixed(2) + 'px) ' +
      'scale(' + scale.toFixed(4) + ') ' +
      'rotate(' + tilt.toFixed(2) + 'deg)';
    card.style.opacity = opacity.toFixed(3);
    card.style.zIndex = String(z);
  }

  /* ── Core: paint deck state from raw scroll progress. ─────────── */
  function paint(progress) {
    var dwellFrac = computeDwellFrac();
    var p;
    if (progress <= dwellFrac) {
      p = 0;
    } else {
      p = (progress - dwellFrac) / (1 - dwellFrac) * (N - 1);
    }

    cards.forEach(function(card, i) {
      /* While a card is click-promoted, scrub doesn't touch it — the
         .is-promoted CSS rule owns its transform. Skip it here. */
      if (i === overrideIdx) return;

      var phase = i - p;

      if (phase >= 0) {
        /* Card is in the front-side of the stack at peek pos `phase`. */
        setInStack(card, phase);
      } else if (phase > -1) {
        /* Card is on the orbital arc, going front → back the long way. */
        setInWrap(card, -phase);
      } else {
        /* Card has completed its wrap. Now in stack at back-side at
           peek pos = phase + N. Clamp to [0, N-1] in edge cases. */
        var stackPos = Math.max(0, Math.min(N - 1, phase + N));
        setInStack(card, stackPos);
      }
    });

    /* While an override is active, the promoted card is the active one;
       leave UI as updateUI(promoteCard) set it. Only scroll-driven flow
       updates the active index from scroll progress. */
    if (overrideIdx < 0) {
      var i = Math.min(N - 1, Math.max(0, Math.round(p)));
      updateUI(i);
    }
  }

  /* ── Programmatic scroll for rail/card click + keyboard nav.
     Uses snapPoints to land exactly on slot boundaries. ──────────── */
  function scrollToSlot(i) {
    var rect = scrollEl.getBoundingClientRect();
    var sectionTop = rect.top + window.pageYOffset;
    var pinRange = scrollEl.offsetHeight - window.innerHeight;
    var target = sectionTop + snapPoints[i] * pinRange;
    window.scrollTo({ top: target, behavior: 'smooth' });
  }

  cards.forEach(function(card, i) {
    card.addEventListener('click', function(e) { e.preventDefault(); promoteCard(i); });
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); promoteCard(i); }
    });
  });

  window.addEventListener('keydown', function(e) {
    var t = e.target;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
    var rect = scrollEl.getBoundingClientRect();
    if (rect.top > window.innerHeight || rect.bottom < 0) return;
    var target;
    if      (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); target = Math.min(N - 1, Math.max(0, activeIdx) + 1); }
    else if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); target = Math.max(0, Math.max(0, activeIdx) - 1); }
    else if (e.key === 'Home')                              { e.preventDefault(); target = 0; }
    else if (e.key === 'End')                               { e.preventDefault(); target = N - 1; }
    if (target !== undefined) promoteCard(target);
  });

  /* ── ScrollTrigger setup, gated on reduced-motion ──────────────── */
  function startScroll() {
    if (typeof ScrollTrigger === 'undefined') {
      window.addEventListener('load', startScroll, { once: true });
      return;
    }
    ScrollTrigger.matchMedia({
      '(prefers-reduced-motion: no-preference)': function() {
        ScrollTrigger.create({
          trigger: scrollEl,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          snap: {
            snapTo: snapPoints,
            duration: { min: 0.2, max: 0.6 },
            ease: 'power1.inOut'
          },
          onUpdate: function(self) {
            /* First scroll input after a click-promote releases it.
               cancelPromote sets overrideIdx = -1 + adds .is-releasing
               for a 220ms catch-up transition; paint() below writes the
               correct --pos/--tilt so the CSS rule transitions into them. */
            if (overrideIdx >= 0) cancelPromote();
            paint(self.progress);
          }
        });
      },
      '(prefers-reduced-motion: reduce)': function() {
        paint(0);
      }
    });

    /* Recompute snap points + dwell fraction on viewport resize. */
    window.addEventListener('resize', function() {
      snapPoints = computeSnapPoints();
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    });
  }
  startScroll();

  /* ── Subtitle fade-in (one-shot, not scroll-linked) ────────────── */
  var sub = document.querySelector('.certs-deck-sub');
  if (sub && 'IntersectionObserver' in window) {
    var lo = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { sub.classList.add('in-view'); lo.disconnect(); }
      });
    }, { threshold: 0.3 });
    lo.observe(sub);
  }

  /* Initial paint so the deck looks right before ScrollTrigger attaches. */
  paint(0);
})();
