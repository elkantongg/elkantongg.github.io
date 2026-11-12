# Status

States: **planned** → **in progress** → **implemented** (code exists, not checked in a browser) → **verified** (checked in a browser; note how/where).

_Last updated: 2026-11-12_

## Features
Verified 2026-11-12 in the Claude desktop app's built-in browser (Chromium) at desktop 1024×600, tablet 768×1024 and mobile 375×812. No console errors; every request goes to the site itself (no third-party calls); no horizontal scroll at any tested width.

| Feature | State | Notes |
|---|---|---|
| Documentation system (CLAUDE.md + docs/) | implemented | |
| Intro sequence (Welcome → to my → Portfolio → streak) | verified | Plays on every load (D-016): checked on reload with #idea in the same tab, intro ran and released after ~4s. Frames checked, incl. the 3.0s/3.2s black streak frame (paused via Web Animations API); "Portfolio" ends exactly centred |
| Refresh replays from the top (D-018) | verified | 2026-11-12, headless Chrome 1280×800: reload from 4874px → scrollY 0, intro plays, 0 elements pre-built, hero rebuilt by the crew; reload on `/#work` → top, hash dropped; fresh `/#work` visit lands on Work with nothing built until the intro ends. No errors |
| Intro skip (button) | verified | Hero entrance starts immediately after skip; scroll unlocks |
| Nav (fixed, scroll spy, mobile menu) + progress bar | verified | Active link follows sections; mobile menu opens, is opaque, closes on link tap and jumps to section |
| Feedback round (D-019): @elkantongg logo, hero cleanup, About tiles, project shots + links, keycap sound, no hint / full stops, constant marquee, spring cursors, contact ring | verified (sound not heard) | 2026-11-12, headless Chrome at 1280×800, 820×1180, 390×844: no console errors or failed requests, no horizontal scroll, marquee ~33–45px/s regardless of scroll, ring visible at all three sizes, Lepak screenshot loads when expanded. Fixed while checking: work rows never revealed (clip-path → zero-area target never hit the 12% threshold). Keycap sound is untested by ear |
| Hero | verified | Desktop, mobile. Content parallaxes/fades out on scroll. No ghost word or full stop since D-019 |
| Builder cursors (D-017): crew frames every reveal, hero swarm + build, "Building n/42" pill | verified | 2026-11-12, headless Chrome (playwright-core + installed Google Chrome) at 1280×800 and 390×844, 61fps: frame sequences checked for hero (4.1–6.6s) and Work section; no console errors; no horizontal scroll. Built-in browser pane was throttled to 2fps (hidden), so not used for timing. `js/particles.js` is now unused; delete it. Not tested: Safari/Firefox, real phones |
| Motion pass (D-015, trimmed in D-019): word-split headlines, rails, row wipes | verified | 2026-11-12, built-in browser at 800×600 and 375×812: no console errors, no horizontal scroll. Not tested: performance on low-end phones, Safari |
| "Built at" marquee | verified | Desktop only |
| 01 About section (headline, lede, 3 animated tiles) | verified | Replaced the Idea section (D-019). Copy awaiting Elkan's review |
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
0. Elkan to review the About copy (headline + personality lines are Claude drafts) and listen to the new keycap sound.
1. Test in Safari and Firefox, and on a real phone.
2. Answer open questions; choose hosting; add security headers; deploy.

## Open questions (need Elkan)
- Audience / positioning (recruiters? clients? hackathon teams?)
- Hosting platform and domain
- Project links (repos / demos) for Lepak, Care+, Wayfound, ResolveOS; show GitHub profile?
- Approve or edit the *(Claude wording)* copy
