# Design

Visual identity, references, motion and UX rules. Values here match `css/style.css` `:root` tokens — change both together.

## References (provided by Elkan, 2026-11-12)
Four short screen recordings (TikTok, third-party content — **not stored in the repo**, see DECISIONS D-009). Described here so future sessions don't need them:

1. **Intro** (~3.4s): plain off-white screen. Small, bold, black sans-serif "Welcome" blurs in centre, then blurs out. "to my" drops in word by word, then "Portfolio" blurs in in orange-red. Hard cut to black: "Portfolio" turns white with a glow while a blurred orange light streak sweeps horizontally behind it.
2. **Main idea** — a dark, editorial personal site (a video editor's portfolio): near-black background; huge condensed uppercase headlines with a red second line ("THE WORK. THE RECOGNITION."); numbered items in red (01, 02, 03); thin grid lines with "+" crosshair markers; large outlined numbers; a red quote card; an experience timeline with a red vertical rail; closes with "LET'S WORK TOGETHER."
3. **Skills** — an isometric 3D keyboard of chunky, glossy, multi-coloured keycaps, each with a tech logo. Title "SKILLS" + "(hint: press a key)". Pressing a key shows that skill's name in large type with a witty one-liner beside the keyboard. On the site the section is titled "Toolkit." (Elkan, 2026-11-12).

4. **Main idea, motion (60s, same site as #2)** — sent after the first build, which Elkan felt had "not much animation", and re-sent with the clarification that **the cursors are builders "building the portfolio"** (D-017). What happens: a swarm of tiny mouse cursors flies in, turns into "+" crosshairs and drags out blue wireframe boxes (placeholder fills, corner handles, small blue tags) where each element goes; the real content then snaps in and the cursors move on. Every section is built this way as you scroll, with a small bottom status pill ("N agents · layers"). Other motion: a giant red word ("PORTFOLIO") behind the hero subject; headlines rising in; image/rows wiping in; numbered process list with a red rail beside a red quote card; timeline rail filling on scroll; big counters.

5. **Lanyard** — a hero with an ID badge hanging on a printed strap at the side: it drops in, swings, can be dragged and thrown, turns in 3D, and the back shows a QR code. Built as the hero lanyard (D-024–D-026): photo badge, strap "ELKAN TONG ✦ @ELKANTONGG", tap to flip to a LinkedIn QR.

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
- **Builder cursors (D-017)** — `js/builders.js`, canvas overlay (z 115, above the nav, below the intro). No status pill and no scroll cue (removed, D-023):
  - Crew of 10 cursors (6 under 640px, D-020), white with one red lead; idle ones wander at 40% opacity.
  - All movement is a critically damped spring per cursor (stiffness per mode: slow glide when wandering, tight while dragging), so velocity never jumps; arrows lean slightly into their motion.
  - Contact: when the section is ≥45% in view, ~26 extra cursors (14 on phones) stream in and the whole crowd circles in a slowly turning ring (circle beside the title on wide screens, ellipse around the email button below 980px); they leave when you scroll away.
  - Each `.reveal` becomes a job: a free cursor (or a fresh agent) glides there, clicks, drags a frame as a crosshair (0.22–0.55s by size), frame gets handles + role tag (or `data-build`), content reveals after 0.12s (typed text keeps the frame up until it finishes), frame fades (0.55s). A job only snaps in without a cursor when the agent cap is hit for 1.2s or it has already scrolled past; content always appears within 3s of being due.
  - **Everything is built (D-021):** navbar (full-width bar, then logo, each link, contact pill, menu button), hero grid + each "+" marker, hello, each title row, lede, each button, facts strip + each fact, marquee, About tile parts, each project row part (index, name, pitch, date, icon), skill card, sound toggle, keyboard stage (every keycap outlined; keys pop when it's built), each Journey fact and entry part, each contact button, each footer item. List: `PARTS` in `js/main.js`. A part starts once its container's frame is being drawn. Phone menu links are never hidden.
  - **Continuous building (D-021):** a build starts as soon as any pixel is on screen. If no crew cursor is free (or the nearest is >650px away), an extra agent streams in from the nearest side, does the job and leaves (cap 40 on screen, 22 on phones), so scrolling never queues. Cursors latch within 0.55s even while the page moves; small parts drag faster (0.22–0.55s). Parts that already left the screen snap in without a cursor.
  - **One by one, in page order (D-022):** jobs start at most every 0.1s in DOM order; each part only starts drawing once the previous one is half drawn, and is only shown after it. A part whose container is still being framed holds its place in line. So the first screen builds as navbar → @elkantongg → About → Work → Skills → Journey → Contact → grid → markers → Hello → Elkan → Tong → lede → buttons → facts (~4s). When more than 10 parts are due at once (fast scrolling) the gap drops to 0.04s and the strict ordering is relaxed so it keeps up. Parts just below the fold wait; only parts already scrolled past snap in.
  - **Nanobot movement while building (D-031, D-033):** heading to a job a bot darts in short hops with quick overshoot-and-lock springs, a thin blue streak and a fine buzz; drawing and typing stay exact. Arriving, wandering, the hero swarm, the contact ring and leaving keep the original soft glide.
  - Hero: after the intro the crew swarms to centre, then the first screen is built in that sequence. No fixed hero timer any more (`--hd` removed); title rows rise when their frame is done.
  - **Detail pass (D-020, from a close frame-by-frame read of reference 4):** crew of 10 (6 under 640px). Text is **typed into its frame** (`js/typer.js`) with a blue caret while the cursor turns into an I-beam and follows it; the frame stays up until the typing ends, then fades. Typed: labels, ledes, About tiles, Work count + rows, Journey facts + entries, contact lede, hero "Hello" / lede / facts, and a project's write-up when first opened. Headlines keep the word rise. Every drag flashes full-width alignment guides and a live `W × H` size tag. Tags name the role (label, heading, text, project, entry, image, buttons). Rows (projects, timeline entries) are a filled highlight bar with a solid leading edge. Media gets a grey-blue placeholder slab with a centre guide that the content fades in under (About tile art; a project screenshot is built the first time the project is opened).
- **About tiles:** pure-CSS loops that start once the tile is built: code lines typing (Building), a price line drawing with a pulsing last price (Markets), a heartbeat travelling along an ECG line (Training). Static under reduced motion.
- **Marquee:** constant-speed CSS loop (34s), not tied to scroll (D-019).
  - Frame colour `--build` (#4c8dff) is the only blue on the site, used only here.
- **Motion pass (D-015)** — `js/motion.js`:
  - Section `h2.display` + contact title split into words that rise out of masks.
  - `.rail` (journey timeline): red fill + glowing dots driven by scroll. `.scrub` paragraphs (none currently) light up word by word.
  - Hero content drifts down and fades on scroll. (Ghost "Portfolio" word and red full stop removed, D-019.)
  - Work rows wipe in left→right (clip-path); the reveal observer uses threshold 0 because of this.
  - Work (D-028): coverflow of tall cards (≈22vw wide, 1.3:1) in 1400px perspective; side cards turn 58° and dim; 0.7s ease transitions, none while dragging. Detail panel below: number + name + pitch, write-up, facts on a red rail; parts rise in on switch. Order newest first. Each part is built by the crew (D-029); a panel's first link is a filled red pill with a glow and pulse ring. Details open by themselves once the strip is on screen and follow the front card; the crew builds each panel from nothing the first time (D-032).
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
