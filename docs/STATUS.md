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
| Builder cursors (D-017; crew, pill and timing since changed by D-020–D-023) | verified | 2026-11-12, headless Chrome (playwright-core + installed Google Chrome) at 1280×800 and 390×844, 61fps: frame sequences checked for hero (4.1–6.6s) and Work section; no console errors; no horizontal scroll. Built-in browser pane was throttled to 2fps (hidden), so not used for timing. `js/particles.js` deleted (commit 14b9661). Not tested: Safari/Firefox, real phones |
| Scroll cue + agents pill removed (D-023) | verified | 2026-11-12, headless Chrome 1280×800: neither element exists, cursors still build, scroll test clean, no errors |
| Sequential build order (D-022) + typer start fix | verified | 2026-11-12, headless Chrome 1280×800: logged finish times on load = navbar 5.87s, @elkantongg 6.19, About 6.58, Work 6.82, Skills 6.92, Journey/Contact 7.08, grid, 6 markers, Hello, Elkan, Tong, lede, buttons, facts by ~10s. Scroll test (desktop + 390×844) still keeps up; no errors; no hidden characters left. Fixed: a typer could crash when the frame timestamp preceded its start, leaving text hidden |
| Build everything + continuous building while scrolling (D-021) | verified (approved by Elkan) | 2026-11-12, headless Chrome at 1280×800 and 390×844 with continuous wheel scrolling (~780px/s): agents rise 10→25 on demand, nothing on screen left waiting once scrolling settles, navbar parts each framed, phone menu links visible, reduced motion shows everything with no canvas; no console errors, no horizontal scroll. Not tested: Safari/Firefox, real phones, trackpad momentum |
| Builder detail pass (D-020): typed text + I-beam, 10-agent crew, guides, size/role tags, row bars, media slabs, project body build on open | verified (approved by Elkan) | 2026-11-12, headless Chrome (playwright-core + installed Google Chrome) at 1280×800 and 390×844: frame captures of hero, About, Work, project open and Journey; no console errors, no horizontal scroll, no leftover `.ch`/caret/wrapper nodes after typing. Not tested: Safari/Firefox, real phones, screen readers during typing |
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
- Skipping the intro left the hero blank for ~2s (fixed then by fast-forwarding; `--hd` and that code are gone since D-021, the hero is build-driven).
- "Portfolio" was off-centre in the intro's final frame.
- Missing `favicon.svg`.
- Reduced-motion marquee would have shown duplicated text.

## Next priorities
0. Next feature (builder passes D-020–D-023 approved and pushed in 1d89e29).
1. Elkan to review the About copy (headline + personality lines are Claude drafts) and listen to the new keycap sound.
2. Test in Safari and Firefox, and on a real phone.
3. Answer open questions; choose hosting; add security headers; deploy.

## Open questions (need Elkan)
- Audience / positioning (recruiters? clients? hackathon teams?)
- Hosting platform and domain
- Project links (repos / demos) for Lepak, Care+, Wayfound, ResolveOS; show GitHub profile?
- Approve or edit the *(Claude wording)* copy
