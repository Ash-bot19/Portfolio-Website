---
phase: 03-content-sections
plan: "01"
subsystem: markup
tags: [html, sections, dual-mode, dom-contract]
dependency_graph:
  requires: [02-03-SUMMARY]
  provides: [what-i-build-markup, work-image-markup, timeline-markup, projects-markup, phase3-css-links]
  affects: [portfolio/index.html]
tech_stack:
  added: []
  patterns: [dual-layer-wib-line, dual-mode-data-attrs, picture-srcset-lazy]
key_files:
  created: []
  modified:
    - portfolio/index.html
decisions:
  - id: work-id-on-work-image
    summary: "id=work preserved on .work-image (not .what-i-build) so nav Work link resolves — NAV-04 contract"
  - id: placeholder-strings-verbatim
    summary: "All [Year], [Role Title], [Company], [Project N] strings are intentional placeholders per D-14/D-23; user replaces before ship"
  - id: wib-dual-layer
    summary: "Each .wib-line carries 4 spans (dark-professional, dark-honest, light-professional, light-honest) — the clip-mask reveal in Plan 04 needs two stacked DOM layers; aria-hidden on light layer prevents double AT reads"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-06"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 1
---

# Phase 3 Plan 01: DOM Markup for All Four Phase 3 Sections — Summary

**One-liner:** HTML DOM contract for four Phase 3 sections (What I Build, Work Image, Timeline, Projects) with four CSS links wired into `<head>` — ready for Plans 02/03 CSS and Plan 04 animation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add four CSS file links to index.html `<head>` | 6c48517 | portfolio/index.html |
| 2 | Add markup for "What I Build" + "Work Image" sections | 684c8ba | portfolio/index.html |
| 3 | Add markup for "Timeline" + "Projects" sections | b6ca99a | portfolio/index.html |

## Sections Added and Their DOM Positions

All four sections inserted after `.skills` section, before `#contact` placeholder, in this order:

| Line | Section | ID | Notes |
|------|---------|-----|-------|
| 293 | `section.what-i-build` | `#what-i-build` | 5 wib-line divs with dual-layer dual-mode spans |
| 344 | `section.work-image` | `#work` | Full-bleed picture element, preserves nav Work anchor |
| 355 | `section.timeline` | `#experience` | 4 timeline-row divs |
| 400 | `section.projects` | `#projects` | 5 project-card articles |
| 468 | `section#contact` (existing) | `#contact` | Retained as Phase 4 anchor |

## Dual-Mode Attribute Pattern Per Section

### `.what-i-build` — dual-layer pattern (unique to this section)

Each `.wib-line` div contains **4 spans**:

```html
<div class="wib-line">
  <span class="wib-line-dark" data-professional>TEXT</span>          <!-- AT reads this -->
  <span class="wib-line-dark" data-honest>TEXT (honest)</span>       <!-- AT reads this in honest mode -->
  <span class="wib-line-light" data-professional aria-hidden="true">TEXT</span>          <!-- clip-reveal layer -->
  <span class="wib-line-light" data-honest aria-hidden="true">TEXT (honest)</span>       <!-- clip-reveal layer -->
</div>
```

The dark layer is always visible (dim); the light layer is revealed by Plan 04's scroll-driven `clip-path` animation. Both layers carry the same text so the clip reveal works correctly in both modes. The `aria-hidden="true"` on light layers prevents screen readers from reading each line twice.

### `.timeline` — standard dual-mode (role column only)

```html
<span class="timeline-role" data-professional>[Role Title]</span>
<span class="timeline-role" data-honest>[Role Title — honest version]</span>
```

Year and company are single strings (no dual-mode needed — they don't change between modes).

### `.projects` — standard dual-mode (description only)

```html
<p class="project-card-desc" data-professional>[One-line professional description]</p>
<p class="project-card-desc" data-honest>[One-line honest description]</p>
```

Name, tech tags, and GitHub link are single per card (no dual-mode).

## Class Names Introduced (for Plans 02/03 CSS selectors)

### `.what-i-build` section
- `.what-i-build` — section root
- `.wib-label` — "WHAT I BUILD" label
- `.wib-prop`, `.wib-prop-left`, `.wib-prop-right` — decorative props (aria-hidden)
- `.wib-stack` — wrapper for all lines
- `.wib-line` — per-domain line container
- `.wib-line-dark` — dim always-visible text layer
- `.wib-line-light` — bright clip-revealed text layer (aria-hidden)

### `.work-image` section
- `.work-image` — section root (also `id="work"`, `aria-hidden="true"`)
- `.work-image-picture` — `<picture>` element
- `.work-image-img` — `<img>` with `loading="lazy" decoding="async"`

### `.timeline` section
- `.timeline` — section root
- `.timeline-inner` — inner wrapper
- `.timeline-label` — "EXPERIENCE" label
- `.timeline-intro` — intro paragraph
- `.timeline-accent` — highlighted words in intro
- `.timeline-rows` — wrapper for all rows
- `.timeline-row` — single experience entry
- `.timeline-year` — year column
- `.timeline-role` — role title column (dual-mode)
- `.timeline-company` — company column

### `.projects` section
- `.projects` — section root
- `.projects-inner` — inner wrapper
- `.projects-label` — "SELECTED WORK" label
- `.projects-grid` — card grid wrapper
- `.project-card` — single project article
- `.project-card-name` — `<h3>` project name
- `.project-card-desc` — description paragraph (dual-mode)
- `.project-card-tags` — `<ul>` tag list
- `.project-tag` — individual tag `<li>`
- `.project-card-link` — GitHub `<a>` link

## CSS Links Added to `<head>`

After existing `css/skills.css`, in page-section order:
```html
<link rel="stylesheet" href="css/what-i-build.css">
<link rel="stylesheet" href="css/work-image.css">
<link rel="stylesheet" href="css/timeline.css">
<link rel="stylesheet" href="css/projects.css">
```

These files do not exist yet — Plans 02 and 03 create them. 404s in DevTools network panel are expected until those plans complete.

## Deviations from Plan

None — plan executed exactly as written.

The `grep -c "wib-line-dark"` count returns 12 (not 10) due to the HTML comment block (lines 289-292) containing the strings `wib-line-dark` and `wib-line-light` as description text. The actual span elements are exactly 10 dark and 10 light (5 lines × 2 modes each). This is a grep counting artifact from the plan-authored comment, not a DOM error. Similarly `id="work"` appears twice (once in a comment, once on the element) — the actual DOM has exactly one element with `id="work"`.

## Known Stubs

The following placeholder strings are intentional per D-14 and D-23 — user replaces them manually before shipping:

| Section | Placeholder | Count |
|---------|------------|-------|
| `.timeline-row` | `[Year]`, `[Role Title]`, `[Role Title — honest version]`, `[Company]` | 4 rows × 4 fields = 16 |
| `.project-card` | `[Project One..Five]`, `[One-line professional description]`, `[One-line honest description]`, `[tech]` | 5 cards |
| `.project-card-link` | `href="#"` placeholder GitHub URLs | 5 links |

These stubs do not prevent the plan's goal (establishing DOM contract) from being achieved. Plans 02/03 (CSS) and Plan 04 (animations) do not depend on real content. User fills real content post-build.

## Threat Surface Scan

No new security-relevant surface introduced beyond what is in the plan's threat model:
- `placehold.co` image src: decorative, `aria-hidden="true"` on section, `alt=""` on img — T-03-01-01 accepted
- Placeholder `href="#"` links: fragment-only, no telemetry — T-03-01-02 accepted
- Placeholder text in HTML source: static, no injection vector — T-03-01-03 accepted

## Self-Check: PASSED

| Item | Status |
|------|--------|
| portfolio/index.html | FOUND |
| 03-01-SUMMARY.md | FOUND |
| commit 6c48517 (Task 1) | FOUND |
| commit 684c8ba (Task 2) | FOUND |
| commit b6ca99a (Task 3) | FOUND |
