---
phase: 03-content-sections
plan: "04"
subsystem: js
tags: [js, gsap, scrolltrigger, animation, parallax, clip-path, stagger]
dependency_graph:
  requires:
    - "03-01"  # DOM markup for .what-i-build, .work-image, .timeline, .projects sections
    - "03-02"  # what-i-build.css clip-path rest state; work-image.css will-change + headroom
    - "03-03"  # timeline.css and projects.css .is-animating will-change gates
  provides:
    - four init functions wired into handoff() — Phase 3 animations live
  affects:
    - handoff() now invokes 10 init functions in DOM order
tech_stack:
  added: []
  patterns:
    - "gsap.matchMedia() desktop pin guard (mirrors initSkillsAnimation)"
    - "GSAP timeline with pinned ScrollTrigger driving multiple scrub tweens"
    - "fromTo yPercent parallax spanning full section travel (top bottom → bottom top)"
    - "gsap.from stagger entrance with once:true ScrollTrigger"
    - "Transient .is-animating class add/remove on full batch in onStart/onComplete"
key_files:
  created: []
  modified:
    - portfolio/js/main.js
decisions:
  - "Single pinned timeline for .what-i-build (one ScrollTrigger, multiple tweens) — more efficient than 5 separate ScrollTriggers"
  - "stagger: 0.15 inside the clip timeline — 5 lines × 0.15 = 0.75 of pin duration, last line settles in remaining 0.25"
  - "initWorkImageParallax has no matchMedia guard — single y tween is cheap on mobile; CSS already shortens section to 60vh on mobile"
  - "onStart/onComplete batch the .is-animating add/remove across all rows/cards — simpler than per-element tweens, will-change window covers the full ~1s entrance"
  - "Four new calls in handoff() ordered by DOM position — matches existing convention"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-06"
  tasks_completed: 3
  files_created: 0
  files_modified: 1
  total_lines_added: 173
---

# Phase 3 Plan 04: Section Animations JS Summary

One-liner: Four GSAP ScrollTrigger animation functions wired into handoff() — clip-path scrub reveal on .what-i-build, yPercent parallax on .work-image-img, stagger slide-up on .timeline-rows, and stagger scale+fade on .projects-grid.

## What Was Built

### portfolio/js/main.js — 173 lines added

Four new init functions appended after `initSkillsAnimation()`, four new try/catch calls appended inside `handoff()`.

#### initWhatIBuildAnimation() (lines 510–570)

**ScrollTrigger config:**
- trigger: `.what-i-build`, start: `top top`, end: `+=100%`
- pin: true, scrub: 1, invalidateOnRefresh: true
- Wrapped in `gsap.matchMedia()` → `(min-width: 769px)` guard

**Tweens on the pinned timeline:**
- `lightLines` (all `.wib-line-light` spans): `clipPath: 'inset(0 0 100% 0)' → 'inset(0 0 0% 0)'`, ease: none, stagger: 0.15, at timeline position 0
- `propLeft` (if present): `y: '-15vh'`, ease: none, at 0
- `propRight` (if present): `y: '10vh'`, ease: none, at 0

**Guards:** prefers-reduced-motion → return; !window.gsap || !window.ScrollTrigger → return. Mobile (≤768px): matchMedia auto-reverts, no pin, no scrub.

#### initWorkImageParallax() (lines 571–604)

**ScrollTrigger config:**
- trigger: `.work-image`, start: `top bottom`, end: `bottom top`
- scrub: 1, invalidateOnRefresh: true
- No matchMedia guard (mobile-safe single y tween)

**Tween:** `gsap.fromTo(img, { yPercent: 15 }, { yPercent: -15, ease: 'none' })` — image drifts upward at ~0.3x scroll speed through the full section travel.

**Guards:** prefers-reduced-motion → return; !window.gsap || !window.ScrollTrigger → return.

#### initTimelineAnimation() (lines 605–643)

**ScrollTrigger config:**
- trigger: `.timeline-rows`, start: `top 85%`
- once: true (self-disposes after firing)

**Tween:** `gsap.from(rows, { y: 40, opacity: 0, duration: 0.7, ease: 'power2.out', stagger: 0.1 })`

**is-animating gate:** onStart adds `.is-animating` to all rows; onComplete removes it from all rows. Satisfies the will-change gate in timeline.css.

**Guards:** rows.length === 0 → return; prefers-reduced-motion → return; !window.gsap || !window.ScrollTrigger → return.

#### initProjectsAnimation() (lines 644–682)

**ScrollTrigger config:**
- trigger: `.projects-grid`, start: `top 85%`
- once: true (self-disposes after firing)

**Tween:** `gsap.from(cards, { scale: 0.92, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 })`

**is-animating gate:** onStart adds `.is-animating` to all cards; onComplete removes it from all cards. Satisfies the will-change gate in projects.css.

**Guards:** cards.length === 0 → return; prefers-reduced-motion → return; !window.gsap || !window.ScrollTrigger → return.

### handoff() — four calls added (lines 168–171)

`handoff()` now invokes 10 init functions in DOM order:
1. `initNavScrollBehavior`
2. `initNavLinks`
3. `initHeroAnimation`
4. `duplicateSkillCards`
5. `initAboutAnimation`
6. `initSkillsAnimation`
7. `initWhatIBuildAnimation` ← new
8. `initWorkImageParallax` ← new
9. `initTimelineAnimation` ← new
10. `initProjectsAnimation` ← new

`runFallbackBoot()` is unchanged — Phase 3 animations are intentionally absent from the no-GSAP fallback path. CSS rest states (clip-path: none on mobile, opacity: 1 on reduced-motion) cover no-JS rendering.

## Requirements Closed

- **WORK-02**: .work-image-img yPercent parallax (0.3x speed) — implemented in `initWorkImageParallax`
- **TIME-03**: .timeline-row stagger slide-up entrance — implemented in `initTimelineAnimation`
- **PROJ-02**: .project-card stagger scale+fade entrance — implemented in `initProjectsAnimation`

## ScrollTrigger.refresh() — Not Called Explicitly

No explicit `ScrollTrigger.refresh()` call was needed. The existing `initSkillsAnimation()` already calls `ScrollTrigger.refresh()` inside `document.fonts.ready.then()`, which runs after `handoff()` completes and covers all subsequently registered ScrollTriggers. The `once: true` entrance triggers don't need refresh (no size-dependent calculations). The `invalidateOnRefresh: true` flag on the pin and parallax triggers handles all resize-driven recalculation automatically.

## Deviations from Plan

None — plan executed exactly as written. All function definitions match the plan's `<action>` blocks verbatim, including comment headers, guard order, tween parameters, and stagger values.

## Known Stubs

None introduced by this plan. Content placeholders (`[Year]`, `[Role Title]`, etc.) from Plan 01 remain in `index.html` — these are data stubs predating this plan, tracked in 03-03-SUMMARY.md.

## Threat Flags

None. This plan adds no new network endpoints, auth paths, file access patterns, or schema changes. All DOM mutations (classList.add/remove) use string literals from within main.js with no user-derived input. Consistent with the threat posture documented in the plan's `<threat_model>`.

## Self-Check: PASSED

- `portfolio/js/main.js` exists: FOUND
- Task 1 commit `ffec9a8`: FOUND
- Task 2 commit `13b4d83`: FOUND
- Task 3 commit `0cbdf9f`: FOUND
- `node --check portfolio/js/main.js` exits 0: PASSED
- All 4 function definitions present (grep -c returns 1 each): PASSED
- All 4 handoff try/catch calls present (grep -c returns 1 each): PASSED
