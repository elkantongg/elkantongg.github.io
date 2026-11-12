# Status

States: **planned** → **in progress** → **implemented** (code exists, not checked in a browser) → **verified** (checked in a browser; note how/where).

_Last updated: 2026-11-12_

## Features
Verified 2026-11-12 in the Claude desktop app's built-in browser (Chromium) at desktop 1024×600, tablet 768×1024 and mobile 375×812. No console errors; every request goes to the site itself (no third-party calls); no horizontal scroll at any tested width.

| Feature | State | Notes |
|---|---|---|
| Documentation system (CLAUDE.md + docs/) | implemented | |
| Intro sequence (Welcome → to my → Portfolio → streak) | verified | Plays on every load (D-016): checked on reload with #idea in the same tab, intro ran and released after ~4s. Frames checked, incl. the 3.0s/3.2s black streak frame (paused via Web Animations API); "Portfolio" ends exactly centred |
| Intro skip (button) | verified | Hero entrance starts immediately after skip; scroll unlocks |
| Nav (fixed, scroll spy, mobile menu) + progress bar | verified | Active link follows sections; mobile menu opens, is opaque, closes on link tap and jumps to section |
| Hero | verified | Desktop, mobile. Red "Portfolio" ghost word (scroll + mouse parallax), content parallaxes/fades out on scroll |
| Motion pass (D-015): particles, word-split headlines, scrubbed lede, rails, row wipes, scroll-reactive marquee | verified | 2026-11-12, built-in browser at 800×600 and 375×812: no console errors, no horizontal scroll. Not tested: performance on low-end phones, Safari |
| "Built at" marquee | verified | Desktop only |
| 01 Idea section (headline, scrubbed lede, process rail + sticky quote card, stats) | verified | Lede words light up on scroll; rail and dots fill; quote card sticky on desktop |
| 02 Work section (4 expandable projects) | verified | Expand works; mobile meta reads "Hyperbloom Hackathon · Oct 2026" |
| 03 Skills 3D keyboard | verified | Keycaps taller, rounder, glossy; keys pop up in a wave on entry; active key stays raised (2026-11-12 feedback). Renders on desktop/tablet/mobile; auto-demo selects Vue 3; typing "p" → Python, again → PostgreSQL; click selects. Sound toggle not tested (audio can't be checked here) |
| 04 Journey (facts + experience timeline with scroll-filled rail) | verified | Résumé PDF removed from the site and the repo (D-014); still in git history (commit 09f5576). Nav link renamed "Journey" (#journey) |
| Contact (email, copy, LinkedIn) + footer | verified | `mailto:` assembled correctly; copy button shown. Clipboard copy itself not tested |
| Favicon | implemented | `favicon.svg` added; not visually checked |
| Security headers / hosting config | planned | Blocked on hosting decision |
| SEO extras (og:image, canonical URL, sitemap, robots) | planned | Needs domain |

## Known issues
- Not tested: Safari/Firefox (CSS 3D keyboard, `::details-content` animation), real touch devices, `prefers-reduced-motion`, no-JS fallback, keyboard-only navigation, screen readers.
- Copy marked *(Claude wording)* in CONTENT.md not yet reviewed by Elkan.
- Testing tip: Python's `http.server` lets the browser cache files; force-reload after edits or you'll test stale CSS/JS.

## Fixed during verification (2026-11-12)
- Mobile menu button sat mid-header instead of right (flex order).
- Mobile menu panel was see-through.
- Project context and date ran together on mobile ("HackathonOct 2026").
- Skipping the intro left the hero blank for ~2s (changing `--hd` doesn't re-time running animations; now fast-forwarded via Web Animations API).
- "Portfolio" was off-centre in the intro's final frame.
- Missing `favicon.svg`.
- Reduced-motion marquee would have shown duplicated text.

## Next priorities
0. Elkan to review the new motion pass against the reference video.
1. Test in Safari and Firefox, and on a real phone.
2. Answer open questions; choose hosting; add security headers; deploy.

## Open questions (need Elkan)
- Audience / positioning (recruiters? clients? hackathon teams?)
- Hosting platform and domain
- Project links (repos / demos) for Lepak, Care+, Wayfound, ResolveOS; show GitHub profile?
- Approve or edit the *(Claude wording)* copy
