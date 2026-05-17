<!-- GSD:project-start source:PROJECT.md -->
## Project

**Portfolio Website — Ayush Samantaray**

A visually striking personal portfolio website for Ayush Samantaray, a final-year B.Tech student targeting fintech/data-engineering roles. Replicates the aesthetic, scroll behavior, and interaction patterns of minhpham.design — dark, moody, animation-heavy — with Ayush's own content. Built with vanilla HTML/CSS/JS + GSAP; no framework, no build tools.

**Core Value:** A visitor who lands on this site should immediately feel the craft — the preloader, the scroll animations, the dual-mode toggle — and leave with a clear picture of what Ayush builds and why he's worth hiring.

### Constraints

- **Tech stack**: Vanilla HTML/CSS/JS + GSAP only — no React, no bundler, no npm
- **Assets**: All placeholder until user supplies real images/audio/logo
- **Performance**: Images lazy-loaded, `will-change: transform` on animated elements, GSAP `batch()` for repeated scroll animations, target <200KB per image (WebP)
- **Responsiveness**: Desktop-first; mobile breakpoints at 1024px, 768px, 480px
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



## Running Locally

The site is vanilla HTML/CSS/JS — no build step. Serve the `portfolio/` folder as static files on port 8080.

**Python (quickest — no install needed):**
```powershell
cd D:\Portfolio\portfolio
python -m http.server 8080
```
Then open: http://localhost:8080

**VS Code Live Server (auto-reloads on save):**
Install the "Live Server" extension → right-click `portfolio/index.html` → "Open with Live Server". Change the port to 8080 in VS Code settings (`liveServer.settings.port: 8080`) if needed.

**Node (if Python isn't available):**
```powershell
npx serve D:\Portfolio\portfolio -l 8080
```

---

## Dark Theme / Dual Toggle — Disabled

The site currently runs **light theme only**. The dark theme and toggle button exist but are commented out. To re-enable both in one pass, make these 4 changes:

### 1. `portfolio/index.html`
- Line 2: remove `class="theme-light"` from `<html>` tag
- Uncomment the `<!-- DARK THEME DISABLED: early theme init ...-->` block (restore the `<script>` that reads localStorage)
- Uncomment the `<!-- DARK THEME DISABLED: theme.js commented out -->` block (restore `<script defer src="js/theme.js"></script>`)
- Uncomment the `<!-- DARK THEME DISABLED: theme toggle button ... -->` block (restores the `<button class="theme-toggle">` in the nav)

### 2. `portfolio/js/theme.js`
- Remove the outer `/* DARK THEME DISABLED ... */` wrapper — the IIFE inside is the full toggle logic.

### 3. `portfolio/css/nav.css`
- The `/* ── Theme toggle — DARK THEME DISABLED ── ... ── end DARK THEME DISABLED ── */` block holds all the button CSS. Convert the block comment back to live CSS (remove the opening `/*` after the section header and the closing `*/`).

### 4. Verify
All `:root.theme-light` rules across the other CSS files (`main.css`, `preloader.css`, `hero.css`, `about.css`, `timeline.css`, `certificates.css`, `sections.css`, `what-i-build.css`) are **already live** — they were never commented out. They continue to apply because `theme-light` is currently hardcoded on `<html>`; after re-enabling the toggle they will apply dynamically.

---

## Pending Work

### Portfolio improvements audit — 2026-05-12
Findings from a full-page review. **Priority: feel & functionality first.** Content/metadata fill-in is deferred — those are paste-in-text problems, not site problems. Lock the experience first, then fill content.

**Tier 1 — feel & functionality (do these first)**

1. ~~**Font preload misconfigured.**~~ ✅ DONE 2026-05-12 — `index.html` lines 8–19 rewritten to use `<link rel="preload" as="style" ... onload="this.onload=null;this.rel='stylesheet'">` + `<noscript>` fallback. Non-render-blocking. Revert: restore the original 3 preloads + 3 stylesheets block.
2. **Toolbelt makes 12 separate CDN requests** to `cdn.simpleicons.org`. Each is render-blocking-ish on slow connections — the section pops in late. Vendor them locally as an SVG sprite (simpleicons is MIT-licensed).
3. **Hero video autoplays even with `prefers-reduced-motion`.** Violates WCAG 2.2.2 and feels aggressive on low-end machines. Pause or swap to poster image when that media query matches.
4. **`cursor: none` on all interactive elements** when `pointer: fine` (in `main.css`). Keyboard user with mouse plugged in loses cursor feedback after tabbing. Gate the custom cursor behind a class only set after mouse movement is observed; restore native cursor on `keydown`.
5. **Light theme palette is jarring.** `--color-text: #1E5EFF` (saturated blue) on `#F8FAFC` reads as a glitch, not an alternate mode. Soften toward minhpham's warm-cream layer inspiration.
6. **`placehold.co` is on a third-party domain** for `work-image` section. If it goes down or rate-limits during a demo, that section breaks visually. Ship a local PNG.
7. **ScrollTrigger CDN has no SRI hash.** ⏳ BLOCKED — sandbox can't reach jsdelivr to compute the hash. **User action:** run this in your local terminal and paste the output back so Claude can wire it in:
   ```powershell
   powershell -Command "$b=(iwr 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js' -UseBasicParsing).RawContentStream.ToArray(); 'sha384-'+[Convert]::ToBase64String([System.Security.Cryptography.SHA384]::Create().ComputeHash($b))"
   ```
   Output looks like `sha384-...`. Drop the value into the `integrity` attribute on the ScrollTrigger `<script>` tag at `index.html` line 43-45 and delete the TODO comment on lines 40-42.

**Tier 2 — content fill-in (deferred — only after Tier 1 is locked)**

User intent: these are paste-in-text problems, not site problems. Don't surface as blockers.

8. **Placeholders still visible.** Timeline `[Year]` / `[Role Title]` / `[Company]` × 4. Projects grid `[Project One]`…`[Project Five]` with `[tech]` tags and `href="#"`. Contact phone `+91 [your number]`. `hero-bg.mp4` referenced but not in `assets/`.
9. **Case study uses fabricated metrics.** "2.4M events/day", "99.97% uptime · 90d", "−63% reconciliation tickets", "42ms p99" — none from a real shipped system. Risky for fintech interviews. Either reframe as **"Target architecture / design exercise"** with honest benchmark numbers, or scale stats down to what the project actually demonstrated locally.
10. **`<title>` and social metadata empty.** No `<meta name="description">`, no Open Graph (`og:title`, `og:description`, `og:image`), no Twitter card, no favicon link. URL pasted in LinkedIn/Slack unfurls blank.

**Tier 3 — housekeeping**

11. **22 modified CSS files uncommitted at audit time.** Per global commit policy ("only when a phase is fully complete"), fine — but verify nothing's lost work before context resets.

### Replace nav-logo face with a 2-tone SVG — 2026-05-12
The current `assets/New_face_logo.svg` is a vectorized photo (~33 paths, fills from `#010101` to `#FDFDFD`). It works, but it forces the cursor-invert lens to use a CSS filter chain (or plain `invert(1)`) to fake the dark↔light swap, which is approximate and visibly muddy at the edges. A 2-tone replacement (single solid fill on transparent bg) would let us:

- Drop the filter — use `currentColor` like the GitHub icon, with `color: var(--color-accent)` on `.nav-logo-face--invert` for a clean one-line orange recolor (or any colour we want).
- Get crisp invert edges (pure black ↔ pure white, no anti-aliased grays competing with the lens bg).
- Render smaller and sharper at 54×54px — at logo size, photo-tonal range is wasted detail.

How to produce: open `New_face_logo.svg` in Inkscape → Path → Trace Bitmap → "Brightness cutoff" mode, threshold ~0.5 → single-color SVG. Or stylize via an AI tool ("redraw as 2-tone silhouette SVG, solid black fill on transparent bg"). Drop into `assets/`, swap the `src` on both `<img class="nav-logo-face">` and `<img class="nav-logo-face--invert">` in `index.html`, then simplify `nav.css` — remove `filter: invert(1)` from `.nav-logo-face--invert`, remove the `.nav-logo .cursor-mirror-invert { background: transparent }` override (lens can use the default black bg again), and use `currentColor` on the `<path>` fills with `color: var(--color-accent)` on the invert copy.

Trade-off: loses the photographic feel — the logo becomes a stylized glyph. For a nav-corner icon at 54px that's correct (minhpham's wordmark proves it). Only deferred until user produces the 2-tone asset.

### Lenis smooth scroll integration
Implement Lenis smooth scroll with full GSAP ScrollTrigger integration. Goal: scroll with weight and momentum, identical feel to minhpham.design. Key requirements:
- Add Lenis via CDN (no npm)
- Wire Lenis into ScrollTrigger: `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add((time) => lenis.raf(time * 1000))` + `gsap.ticker.lagSmoothing(0)`
- Lenis must initialize before ScrollTrigger pins are registered (skills horizontal pin, parallax, card reveals)
- Lock scroll during preloader (`lenis.stop()`) and release at handoff (`lenis.start()`) — replace current `overflow: hidden` approach
- Test all scroll-linked animations after integration: skills horizontal pin, about/project parallax, timeline/card reveals, nav scrollspy
- **Use Claude Opus 4.7 for this task** (user preference)

## Originality & Copyright

Project is **inspired-by minhpham.design**, not derived from it. Code is independently written (vanilla HTML/CSS/JS + GSAP). Legal exposure is low *if* the rules below are followed. This is engineering guidance, not legal advice.

### What's protectable (and where we stand)

- **Code** — copyrightable as literary work. Independent re-implementation of the same visual effect is **not** infringement. We're clean as long as no HTML/CSS/JS is copy-pasted from minhpham's source.
- **Look & feel / layout / scroll patterns / color philosophy** — **not** meaningfully protected by copyright. "Dark moody site with preloader + horizontal pin + cursor effect + section duality" is a vocabulary, not a work. Trade dress would require distinctiveness + consumer confusion + commercial competition — a personal portfolio doesn't meet that bar.
- **Specific assets** — images, video, audio, fonts, logos, custom illustrations, text content **are** protected. This is where 95% of portfolio copyright trouble comes from.

### Concrete risk points to verify before shipping

1. **`hero-bg.mp4`** — referenced but missing from `assets/`. Must be self-shot, self-rendered, or CC0-sourced. Do **not** reuse minhpham's video file or any clip from his site.
2. **Audio** — if/when audio is added, must not be lifted from minhpham. Use Pixabay, Freesound, or self-recorded.
3. **Verbatim text** — case-study copy, taglines, section headings. Skim minhpham's site against `index.html` for any duplicate phrases. Even one distinctive sentence is a problem.
4. **Fonts (Clash Display, DM Sans, JetBrains Mono)** — licensed for web use via the loaded CDNs. No action needed.
5. **simpleicons** — MIT-licensed; safe to vendor locally (per Pending Work item 2).

### Originality framing for interviews

The real risk is reputational, not legal — an interviewer recognizing minhpham.design and reading our site as derivative. Mitigations:

- Cursor lens reveal (clip-path circle, alternate-content overlay) is **Ayush's original differentiator** — see Design Decisions. minhpham only scales the cursor dot; he has no content reveal. Lean on this when the site comes up.
- Honest framing: *"Inspired by minhpham.design — animations, lens reveal, and content sections built from scratch."* Don't claim it's an independent design; don't hide the inspiration.

## Codebase Risks

- **`main.js` is the fragile centre.** GSAP animations, ScrollTrigger pins, cursor lens reveal, preloader sequencing, and parallax all live here with no module boundaries. Registration order matters — touching one section's ScrollTrigger block can break another's pin timing. Make targeted edits; don't refactor unless the whole file is the task.
- **Lenis integration is load-bearing surgery.** Lenis must initialize before any ScrollTrigger pins are registered. Getting that order wrong silently breaks the skills horizontal pin, about/project parallax, and card reveals. See Pending Work for the full checklist.
- **`index.html` (1,000+ lines) will keep growing.** No build step means no partials. Adding sections makes the file harder to navigate — use section ID comments as landmarks and keep new HTML additions scoped and clearly delimited.
- **`sections.css` (989 lines) looks large but is safe.** It's flat selectors per section, not tangled logic. Low refactor risk.

## Design Decisions

### Site-wide motion contract: continuous, scroll-deterministic motion (2026-05-12)
**Every pixel of user scroll deterministically maps to a visible amount of visual motion.** No threshold-triggered animations, no setTimeout sequencing, no JS scroll-snap (custom `scheduleSnap` patterns). All scroll-linked effects use ScrollTrigger with `scrub: true` (or `scrub: 0.3-0.5` for slight smoothing). Slot-based snapping uses ScrollTrigger's `snap` option, not CSS scroll-snap or custom JS — it composes with Lenis (pending) and respects scroll velocity.

This is the design language of minhpham.design and the locked contract for every animated section. Existing threshold-based or setTimeout-driven motion is technical debt to be refactored as encountered.

Reference: the certificates section refactor (2026-05-12) is the first canonical implementation — see `js/certificates.js` and `css/certificates.css`. It uses one ScrollTrigger with `scrub: true` + `snap: 1/(N-1)`, and an `onUpdate` callback that writes two CSS custom properties (`--pos`, `--exit-t`) per card. CSS turns those properties into transforms. No setTimeouts, no `.exit-down` class, no JS scroll-snap.

### Cursor lens reveal — original design, not a minhpham replication
The hero/about/timeline lens (clip-path circle that expands from the cursor, revealing alternate "honest" text content) is **Ayush's original addition**. minhpham.design uses `js-cursor-extend` — purely scaling the cursor dot up on hover over `hero_content_inner`, with no separate overlay element and no content reveal. minhpham's "duality" is section color theming (`layer__dark` vs warm-cream sections), not cursor-based content switching. Ayush took that section-duality inspiration and built a cursor-reveals-alternate-content layer on top of it. Do not simplify the lens back to a plain cursor scale — it is a deliberate differentiator.

## Debug Pattern — Keyboard Tuning Controls

When a visual property needs precise live tuning (3D rotation, CSS position, opacity, etc.), add a temporary keyboard debug block rather than guessing values and reloading. The pattern:

1. **Add a keydown listener** that mutates the target value in steps and logs the result to console.
2. **Tune in the browser** until it looks right.
3. **Paste the final console values** back to Claude to hardcode and strip the debug code.

### 3D model rotation (controller-model.js)
Change `const baseRotX/Y` → `let`, then add inside the `modelSlots.forEach` closure:
```js
// DEBUG ROT — remove after tuning.
// Slot A: Q/E = rot-x  A/D = rot-y
// Slot B: I/K = rot-x  J/L = rot-y
{
  const label = modelSrc.includes('Mouse') ? 'mouse-rot' : 'ctrl-rot';
  const keys  = modelSrc.includes('Mouse')
    ? { xDec:'q', xInc:'e', yDec:'a', yInc:'d' }
    : { xDec:'i', xInc:'k', yDec:'j', yInc:'l' };
  window.addEventListener('keydown', (e) => {
    const s = 0.05;
    if      (e.key === keys.xDec) baseRotX -= s;
    else if (e.key === keys.xInc) baseRotX += s;
    else if (e.key === keys.yDec) baseRotY -= s;
    else if (e.key === keys.yInc) baseRotY += s;
    else return;
    console.log(`[${label}] rot-x="${baseRotX.toFixed(2)}" rot-y="${baseRotY.toFixed(2)}"`);
  });
}
```
Lock-in: hardcode the logged values into `data-rot-x`/`data-rot-y` on the HTML element, revert `let` → `const`, delete the debug block.

### CSS element position (inline script in index.html)
Add before `</body>`, target elements by selector:
```html
<!-- DEBUG PROPS — remove after tuning
  Left:  [ / ] = top   ; / ' = left-offset
  Right: - / = = top   , / . = right-offset
-->
<script>
(function () {
  var left  = document.querySelector('.wib-prop-left');
  var right = document.querySelector('.wib-prop-right');
  if (!left || !right) return;
  var lTop=0, lLeft=0, rTop=0, rRight=0;
  function apply() {
    left.style.top    = lTop   + 'vh';  left.style.left   = lLeft  + 'vw';
    right.style.top   = rTop   + 'vh';  right.style.right = rRight + 'vw';
    console.log('[prop-pos] left top="'+lTop+'vh" left="'+lLeft+'vw"');
    console.log('[prop-pos] right top="'+rTop+'vh" right="'+rRight+'vw"');
  }
  document.addEventListener('keydown', function(e) {
    var s=1;
    if(e.key==='[') lTop-=s; else if(e.key===']') lTop+=s;
    else if(e.key===';') lLeft-=s; else if(e.key==="'") lLeft+=s;
    else if(e.key==='-') rTop-=s; else if(e.key==='=') rTop+=s;
    else if(e.key===',') rRight-=s; else if(e.key==='.') rRight+=s;
    else return; apply();
  });
})();
</script>
```
Lock-in: write the logged values into the CSS file (e.g. `what-i-build.css`), delete the script block.

### General principle
- Step size: `0.05` for radians (rotation), `1` for vh/vw (layout), `0.01` for opacity/scale.
- Always log so copy-paste to Claude locks it in cleanly.
- Never commit debug blocks — strip before any commit.

## Deferred Work

### Certificates deck — exit animation history (superseded 2026-05-12)
~~Swipe-right was the active implementation.~~ **Replaced** by scroll-progress-driven vertical exit per the site-wide continuous-motion contract (see Design Decisions). Front card now translates down + scales + fades as scroll progress moves through its slot; next card scales up from peek to front simultaneously. No swipe, no setTimeout chain, no `.exit-down` class.

Historical context (preserved for revert): three exit styles were assessed before the refactor.

- **Swipe-right** ❌ *deprecated* — was `translateX(110vw) rotate(8deg)`, 600ms `cubic-bezier(0.4,0,0.6,1)`. Read as "Tinder card" — orthogonal to the site's vertical motion vocabulary. Removed because it violated the continuous-motion contract (threshold-triggered, not scroll-linked).
- **Fold-back (3D)** — `rotateX(-90deg)` with `perspective: 900px` on `.certs-deck-wrap`. Card flips face-down into the stack. Premium feel but `perspective` value is sensitive to card size.
- **Dissolve + bloom** — front card `scale(0.84) blur(6px) opacity(0)`, no viewport exit. Editorial feel. Composes well with scrub-driven scroll.

To revert to swipe-right: see git history before the 2026-05-12 certificates refactor. The motion contract change made revert unattractive — any new exit style should be scrub-driven, not setTimeout-driven.

### Cursor inversion near nav logo + social icons — SHIPPED 2026-05-12
**Status: shipped.** Architecture in `css/nav.css` + `js/cursor-invert.js`:
- z1 `.cursor-mirror` — full-cover `--color-accent` overlay = the LATCH (cream → orange on hover).
- z2 original glyph (face img / svg / "in" text).
- z3 `.cursor-mirror-invert` — full-cover overlay clipped to `circle(14px at --cx --cy)`, contains a recolored duplicate of the glyph.

Socials are clean (single-color glyphs swap with `color: var(--color-accent)`). Logo uses `filter: invert(1)` on a duplicate `<img>` with the lens bg set to transparent — works but is approximate because the source SVG is multi-tone. See "Replace nav-logo face with a 2-tone SVG" under Pending Work for the cleanup that lets the logo use the same `currentColor` pattern as the icons.

JS doesn't drive the visual — it only writes `--cx`/`--cy` on the target on mousemove and toggles `.is-on-cursor-invert-target` on `.site-cursor` to hide the main cursor while inside a target. CSS does the rest via inheritance.

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
