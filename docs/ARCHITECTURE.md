# Architecture

## Stack
- **Static site:** HTML + CSS + vanilla JavaScript (ES modules). No framework, no build step, no package manager (D-002).
- **Runtime dependencies:** Three.js r170 (MIT, `js/vendor/three.module.min.js` + `RoomEnvironment.js` with its import rewritten to the local file; licence in `js/vendor/three.LICENSE`). Libraries are allowed since D-025; vendor them into the repo (no CDN) to keep the CSP and privacy. No third-party network requests (D-003).
- **Assets:** Anton + Inter woff2 (`@fontsource` 5.2.7, OFL); brand icons from Simple Icons v16.30.0 (CC0), compiled to `js/icons.js`.
- **Hosting / deployment:** TBD. **Domain:** TBD. **Analytics:** none (TBD if wanted — must stay privacy-respecting).

## File layout
```
index.html          single page; all sections in order
css/style.css       one stylesheet, sectioned with banner comments (tokens → intro → nav → shared → sections → responsive → reduced motion)
js/boot.js          classic script in <head>: adds .js, decides intro (.no-intro / .intro-active), 4.2s failsafe
js/main.js          module: adds .ready; nav, scroll spy, progress, reveals, counters, contact, toolkit (skills) keyboard, sound
js/motion.js        module: word-split headlines, .scrub paragraphs, .rail fills, hero exit parallax
assets/work/        project screenshots (JPEG, 1280×720, frames from Elkan's demo videos)
js/builders.js      module: builder-cursor overlay; returns request(el, onDone) used by the reveal observer (null for reduced motion)
js/lanyard.js       module: hero ID badge physics + input (Verlet), tap to flip; draws the 2D fallback (DOM card + canvas strap); static for reduced motion
js/lanyard3d.js     module: Three.js renderer for the badge (loaded by lanyard.js; returns null without WebGL)
js/vendor/          self-hosted third-party code (Three.js); do not edit
assets/me/          elkan.jpg (badge photo, 380×440, metadata stripped), linkedin-qr.svg (QR to the LinkedIn profile)
js/typer.js         module: prime(el) hides characters in place, play() types them in and returns { dur, caret }; restores original text nodes when done
js/icons.js         GENERATED — `export const ICONS = { id: svgPathD }`; do not hand-edit except `sql` (custom)
assets/fonts/       anton-400.woff2, inter-var.woff2
docs/               documentation
```

## Conventions
- **CSS:** BEM-ish (`.block__elem`, modifiers as `.btn--red`), state classes `is-*` (`is-active`, `is-open`, `is-down`, `is-scrolled`, `is-done`). Root state classes on `<html>`: `js`, `ready`, `no-intro`, `intro-active`. All colours/fonts/easing via `:root` tokens. Fluid sizing with `clamp()`. Mobile handled with max-width media queries at 980 / 760 / 640px.
- **JS:** small IIFE-style blocks per feature inside `main.js`; `$`/`$$` helpers; `IntersectionObserver` for scroll effects; scroll work batched with `requestAnimationFrame`; listeners `passive` where possible.
- **Progressive enhancement:** content must render without JS. Anything hidden for animation is gated behind `html.js` / `html.ready` so a JS failure never hides content.
- **Content data:** visible copy lives in `index.html`, except skill keycaps (`SKILLS` array in `main.js`). `docs/CONTENT.md` is the source of truth for wording.
- **Adding a skill key:** add the icon path to `icons.js` (from Simple Icons), add an entry to `SKILLS` (`id`, `name`, `c` colour, optional `ink`, `line`, `used`), update the `<noscript>` list and CONTENT.md. Grid is 4 columns (`COLS`).

## Security
- CSP via `<meta>`: `default-src 'self'; script-src 'self'; style-src 'self'` … — **no inline scripts or `style=""` attributes** (style set through CSSOM is fine).
- DOM built with `createElement` / `textContent`; never `innerHTML` with dynamic data.
- External links: `target="_blank" rel="noopener noreferrer"`.
- Email assembled in JS from `data-u` / `data-d` (validated by regex) to reduce scraping; HTML fallback is `name [at] domain`.
- No secrets exist in this project; none may be added.
- **TODO with hosting decision:** real HTTP security headers (CSP incl. `frame-ancestors 'self'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS). The page no longer iframes anything, so `X-Frame-Options: DENY` / `frame-ancestors 'none'` is fine; meta CSP now has `frame-src 'none'`.

## Performance
- Three.js (~690KB minified, ~170KB gzipped) loads with the page for the lanyard; WebGL canvas pixel ratio capped at 1.5, rendering paused when the hero is off screen.
- ~70KB fonts preloaded; images: project screenshots, the badge photo (~20KB) and QR SVG; icons are inline SVG. No embeds. One fixed canvas for the builder cursors (DPR capped at 2, paused when the tab is hidden).
- Animations use `transform`/`opacity`/`filter` only.

## Run locally
`python3 -m http.server 8080` from the repo root (modules don't load from `file://`).
