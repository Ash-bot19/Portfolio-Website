---
phase: 2
plan: "03"
subsystem: animations
tags: [gsap, scroll-trigger, horizontal-scroll, about-animation, skills-animation, accessibility]
dependency_graph:
  requires: ["02-01", "02-02"]
  provides: ["ScrollTrigger CDN tag in index.html", "duplicateSkillCards()", "initAboutAnimation()", "initSkillsAnimation()"]
  affects: ["portfolio/index.html", "portfolio/js/main.js"]
tech_stack:
  added: ["GSAP ScrollTrigger 3.15.0 via jsDelivr CDN"]
  patterns: ["gsap.matchMedia() for responsive pin teardown", "function-based x/end values with invalidateOnRefresh", "document.fonts.ready Pitfall 1 guard", "once:true ScrollTrigger for memory-safe one-shot entrance"]
key_files:
  modified:
    - portfolio/index.html
    - portfolio/js/main.js
decisions:
  - "gsap.matchMedia() used (not deprecated ScrollTrigger.matchMedia removed in GSAP 3.11)"
  - "ease:none on scrubbed skills tween — non-negotiable per RESEARCH anti-pattern"
  - "ScrollTrigger CDN tag without SRI hash (T-02-03-01 accept) — follow-up required before deploy"
  - "scrub:1 for 1-second smoothing lag on horizontal scroll"
  - "once:true on About ScrollTrigger — kills trigger after first fire, frees memory"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-05-05"
  tasks_completed: 2
  files_modified: 2
---

# Phase 2 Plan 03: GSAP ScrollTrigger Animations Summary

**One-liner:** ScrollTrigger pin + horizontal scrub for Skills strip and once-only About fade-up, with gsap.matchMedia mobile revert and full reduced-motion short-circuits.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add ScrollTrigger CDN tag, duplicateSkillCards, initAboutAnimation | 6a4d67f | portfolio/index.html, portfolio/js/main.js |
| 2 | Implement initSkillsAnimation with gsap.matchMedia pin + scrub | 9e97b6c | portfolio/js/main.js |

## What Was Built

### ScrollTrigger CDN Tag (index.html)
- Inserted `ScrollTrigger.min.js` script tag between GSAP core and `main.js` — correct deferred load order
- All three scripts use `defer`, so the browser executes them in DOM order: GSAP core → ScrollTrigger → main.js
- No SRI hash (see Known Follow-ups)

### handoff() call order (main.js)
The three new Phase 2 try/catch calls appended after the existing three:
```
duplicateSkillCards()  → initAboutAnimation()  → initSkillsAnimation()
```
Order is mandatory: `duplicateSkillCards` must run before `initSkillsAnimation` reads `scrollWidth`.

### duplicateSkillCards()
- Queries all 5 `.skill-card` elements inside `.skills-track`
- Clones each with `cloneNode(true)` and immediately sets `aria-hidden="true"`
- Appends clones to track — result is 10 cards (5 readable by AT, 5 invisible to screen readers)
- Mitigates T-02-03-02 (Pitfall 4 — cloned cards readable by screen readers)

### initAboutAnimation()
- Checks `prefers-reduced-motion: reduce` — returns early if set (no animation)
- Guards `!window.gsap || !window.ScrollTrigger` — returns early if CDN failed
- Calls `gsap.registerPlugin(ScrollTrigger)` (idempotent)
- Adds `is-animating` class before tween, removes in `onComplete` (will-change gate — Phase 1 pattern)
- `gsap.from` with `y:40, opacity:0, duration:0.8, ease:'power2.out'`
- ScrollTrigger config: `trigger: aboutInner, start:'top 80%', once:true`
- `once:true` kills the ScrollTrigger after first fire — animation does not replay on scroll-back

### initSkillsAnimation()
- Checks `prefers-reduced-motion: reduce` and CDN guards (same pattern as initAboutAnimation)
- Calls `gsap.registerPlugin(ScrollTrigger)` (idempotent belt-and-braces)
- Uses `gsap.matchMedia()` — NOT deprecated `ScrollTrigger.matchMedia()` (removed GSAP 3.11)
- Desktop media query: `(min-width: 769px)` — pin logic only on viewport ≥ 769px
- `gsap.to(skillsTrack, { x: fn, ease:'none', scrollTrigger: { ... } })`
  - `x`: function returning `-(scrollWidth - innerWidth)` — recomputed on refresh
  - `ease:'none'` — non-negotiable on scrubbed tween (any other ease fights scrub)
  - `start:'top top'`, `pin:true`, `scrub:1`, `invalidateOnRefresh:true`
  - `end`: function returning `'+=' + (scrollWidth - innerWidth)` — pin-spacer height = scroll budget
- `document.fonts.ready.then(ScrollTrigger.refresh)` — Pitfall 1 guard: recomputes after real font metrics load
- Below 769px: `gsap.matchMedia()` auto-reverts the pin — no manual teardown needed

## Verification Results

### Automated checks — all passed
- `ScrollTrigger.min.js` present in index.html script tag
- Script tag order: GSAP core → ScrollTrigger → main.js (lines 29, 37, 41)
- `defer` attribute on ScrollTrigger tag
- `function duplicateSkillCards` declared
- `cloneNode(true)` inside duplicateSkillCards
- `clone.setAttribute('aria-hidden', 'true')` present
- `function initAboutAnimation` declared
- `gsap.registerPlugin(ScrollTrigger)` present
- `is-animating` class add/remove in initAboutAnimation
- `once: true` in ScrollTrigger config
- `start: 'top 80%'` in initAboutAnimation
- `prefers-reduced-motion: reduce` checks in both functions
- `!window.ScrollTrigger` guard in both functions
- `function initSkillsAnimation` declared
- `gsap.matchMedia()` used (not `ScrollTrigger.matchMedia`)
- `(min-width: 769px)` matchMedia query
- `ease: 'none'` on scrubbed tween
- `pin: true`, `scrub: 1`, `invalidateOnRefresh: true`
- `start: 'top top'`
- `skillsTrack.scrollWidth` and `window.innerWidth` in function-based values
- `ScrollTrigger.refresh()` inside `document.fonts.ready.then`
- No actual invocation of deprecated `ScrollTrigger.matchMedia()` (appears only in warning comment)

### Manual browser verification (to be confirmed by user)
- Chrome desktop (1440px): About content fades up once on scroll, does not replay
- Chrome desktop: Skills section pins, card track translates left, all 10 cards pass through
- Chrome desktop: After strip, section unpins; pin-spacer gap visible (expected — RESEARCH Pitfall 2)
- Chrome 375px: No pin, cards stack vertically (CSS from Plan 02 + gsap.matchMedia revert)
- DevTools Elements: 10 `.skill-card` elements, last 5 have `aria-hidden="true"`
- Reduced-motion emulation: About content immediately visible, Skills not pinned

## Deviations from Plan

### Automated test false positive — no code change needed
**Found during:** Task 2 verification
**Issue:** The automated check `!grep -q "ScrollTrigger.matchMedia"` matched line 452 — the warning comment `// Do NOT use the deprecated ScrollTrigger.matchMedia()`. The comment itself contains the deprecated API name as a do-not-use reference.
**Resolution:** No code change. The executable code does not call `ScrollTrigger.matchMedia()`. Only `gsap.matchMedia()` is used in production code. The comment is informative and correct to keep.

## Known Follow-ups

### SRI hash for ScrollTrigger.min.js (T-02-03-01)
The ScrollTrigger CDN script tag was added without an `integrity` attribute. The SRI hash for `gsap@3.15.0/dist/ScrollTrigger.min.js` was not pre-computed (RESEARCH assumption A7 / threat T-02-03-01 disposition: accept).

Compute and add before deploy:
```bash
curl -sL https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```
Then add the result as `integrity="sha384-<hash>"` to the script tag.

## Known Stubs

None. All functions are fully implemented and wired. No placeholder values flow to UI rendering.

## Threat Flags

No new security-relevant surfaces introduced beyond those documented in the plan's threat model (T-02-03-01 through T-02-03-05). All mitigations applied as specified.

## Self-Check: PASSED

- `portfolio/index.html` — contains ScrollTrigger CDN tag, confirmed by grep
- `portfolio/js/main.js` — contains all three functions and handoff wiring, confirmed by grep
- Commit `6a4d67f` — Task 1 (index.html + main.js Task 1 additions)
- Commit `9e97b6c` — Task 2 (initSkillsAnimation)
- Both commits exist on master branch
