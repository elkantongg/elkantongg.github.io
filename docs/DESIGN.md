# Design

Visual identity, references, motion and UX rules. Values here match `css/style.css` `:root` tokens — change both together.

## References (provided by Elkan, 2026-11-12)
Four short screen recordings (TikTok, third-party content — **not stored in the repo**, see DECISIONS D-009). Described here so future sessions don't need them:

1. **Intro** (~3.4s): plain off-white screen. Small, bold, black sans-serif "Welcome" blurs in centre, then blurs out. "to my" drops in word by word, then "Portfolio" blurs in in orange-red. Hard cut to black: "Portfolio" turns white with a glow while a blurred orange light streak sweeps horizontally behind it.
2. **Main idea** — a dark, editorial personal site (a video editor's portfolio): near-black background; huge condensed uppercase headlines with a red second line ("THE WORK. THE RECOGNITION."); numbered items in red (01, 02, 03); thin grid lines with "+" crosshair markers; large outlined numbers; a red quote card; an experience timeline with a red vertical rail; closes with "LET'S WORK TOGETHER."
3. **Skills** — an isometric 3D keyboard of chunky, glossy, multi-coloured keycaps, each with a tech logo. Title "SKILLS" + "(hint: press a key)". Pressing a key shows that skill's name in large type with a witty one-liner beside the keyboard.

4. **Main idea, motion (60s, same site as #2)** — sent after the first build, which Elkan felt had "not much animation", and re-sent with the clarification that **the cursors are builders "building the portfolio"** (D-017). What happens: a swarm of tiny mouse cursors flies in, turns into "+" crosshairs and drags out blue wireframe boxes (placeholder fills, corner handles, small blue tags) where each element goes; the real content then snaps in and the cursors move on. Every section is built this way as you scroll, with a small bottom status pill ("N agents · layers"). Other motion: a giant red word ("PORTFOLIO") behind the hero subject; headlines rising in; image/rows wiping in; numbered process list with a red rail beside a red quote card; timeline rail filling on scroll; big counters.

Elkan's mapping: video 1 → Intro, videos 2 + 4 → main idea/overall style **and its level of motion**, video 3 → Skills (explicitly liked). Résumé section dropped (D-014).

## Identity
- **Mood:** dark, cinematic, editorial, confident. Premium — never a generic template.
- **Theme:** dark only (`color-scheme: dark`). Light mode: not planned (TBD if requested).

### Colour tokens
| Token | Value | Use |
|---|---|---|
| `--bg` / `--bg-2` / `--bg-3` | `#0a0a0c` / `#111115` / `#18181d` | Page / alternate sections / raised |
| `--line` / `--line-2` | white 9% / 16% | Hairlines, borders |
| `--text` / `--muted` | `#f3f3f1` / `#9b9ba6` | Body / secondary |
| `--red` / `--red-deep` | `#ff3341` / `#c4121f` | Single accent: emphasis, CTAs, numbering, rails |
| `--orange` | `#ff5a1f` | Intro only ("Portfolio" + light streak) |

Rule: red is the **only** accent on the main site. Keycap colours are the one multi-colour exception (per-skill, defined in `js/main.js` `SKILLS`).

### Typography
- **Display:** Anton (condensed, uppercase) — headlines, numbers, keycap skill names. Line-height ~0.86–0.95.
- **Body/UI:** Inter variable. Labels: 0.72–0.78rem, uppercase, letter-spacing 0.14–0.2em, weight 600.
- Self-hosted woff2 only (DECISIONS D-003). Fluid sizes via `clamp()`.

### Recurring motifs
- Section label: `NN / The thing` with a short red bar before it.
- Two-line display headings, second line red ("The work. / The builds.").
- Grid + crosshair "+" decor (hero); builder cursors framing content site-wide.
- Red rail timeline with scroll-linked fill.

## Motion
- Easing: `--ease: cubic-bezier(0.22, 1, 0.36, 1)`. Durations 0.2–1s; intro ~4s total.
- Purposeful only: entrance reveals, hover feedback, keycap press, counters, marquee.
- **Builder cursors (D-017)** — `js/builders.js`, canvas overlay (z 90, under nav) + `.build-hud` pill:
  - Crew of 6 cursors (4 under 640px), white with one red lead; idle ones wander at 50% opacity.
  - All movement is a critically damped spring per cursor (stiffness per mode: slow glide when wandering, tight while dragging), so velocity never jumps; arrows lean slightly into their motion.
  - Contact: when the section is ≥45% in view, ~26 extra cursors (14 on phones) stream in and the whole crowd circles in a slowly turning ring (circle beside the title on wide screens, ellipse around the email button below 980px); they leave when you scroll away.
  - Each `.reveal` becomes a job: nearest free cursor glides there, clicks, drags a frame as a crosshair (0.5s), frame gets handles + tag (tag name or `data-build`), content reveals after 0.14s, frame fades (0.6s). Jobs waiting >1s snap in without a cursor; content always appears within 3s.
  - Hero: after the intro the crew swarms to centre, then frames the 6 hero blocks while they rise (`--hd` 5.4s).
- **About tiles:** pure-CSS loops that start once the tile is built: code lines typing (Building), a price line drawing with a pulsing last price (Markets), a heartbeat travelling along an ECG line (Training). Static under reduced motion.
- **Marquee:** constant-speed CSS loop (34s), not tied to scroll (D-019).
  - Frame colour `--build` (#4c8dff) is the only blue on the site, used only here.
- **Motion pass (D-015)** — `js/motion.js`:
  - Section `h2.display` + contact title split into words that rise out of masks.
  - `.rail` (journey timeline): red fill + glowing dots driven by scroll. `.scrub` paragraphs (none currently) light up word by word.
  - Hero content drifts down and fades on scroll. (Ghost "Portfolio" word and red full stop removed, D-019.)
  - Work rows wipe in left→right (clip-path); the reveal observer uses threshold 0 because of this.
  - Keyboard: taller (`--h` 0.34k), rounder (36% radius), 12 layers, specular highlight; keys pop up in a wave on entry; hovered/active keys rise.
- **Intro:** plays on **every page load, including refresh and deep links** (Elkan, D-016); skippable (button, click, Esc/Enter/Space); skipped only on reduced motion. Never blocks the page (CSS timeline + JS failsafe, D-004).
- **Reduced motion:** all animation/transition effectively disabled.

## UX & accessibility principles
- Semantic landmarks, one `h1`, skip link, visible focus (`:focus-visible` red outline).
- Everything usable without JS: content visible, intro absent, nav links shown, skills listed in `<noscript>`.
- Skills keyboard: real `<button>`s with `aria-pressed`, roving tabindex + arrow keys, live-region card; physical typing presses keys by first letter only while the section is in view and never while typing in a field.
- Sound: off by default, opt-in toggle.
- Touch targets ≥ 44px. No horizontal scroll at any width.
- Breakpoints: 980px (stack columns), 760px (mobile nav), 640px (phone layout).
