# Design

Visual identity, references, motion and UX rules. Values here match `css/style.css` `:root` tokens — change both together.

## References (provided by Elkan, 2026-11-12)
Three short screen recordings (TikTok, third-party content — **not stored in the repo**, see DECISIONS D-009). Described here so future sessions don't need them:

1. **Intro** (~3.4s): plain off-white screen. Small, bold, black sans-serif "Welcome" blurs in centre, then blurs out. "to my" drops in word by word, then "Portfolio" blurs in in orange-red. Hard cut to black: "Portfolio" turns white with a glow while a blurred orange light streak sweeps horizontally behind it.
2. **Main idea** — a dark, editorial personal site (a video editor's portfolio): near-black background; huge condensed uppercase headlines with a red second line ("THE WORK. THE RECOGNITION."); numbered items in red (01, 02, 03); thin grid lines with "+" crosshair markers; large outlined numbers; a red quote card; an experience timeline with a red vertical rail; closes with "LET'S WORK TOGETHER."
3. **Skills** — an isometric 3D keyboard of chunky, glossy, multi-coloured keycaps, each with a tech logo. Title "SKILLS" + "(hint: press a key)". Pressing a key shows that skill's name in large type with a witty one-liner beside the keyboard.

Elkan's mapping: video 1 → Intro, video 2 → main idea/overall style, video 3 → Skills (explicitly liked), plus a Résumé section.

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
- Grid + crosshair "+" decor (hero only).
- Red rail timeline with scroll-linked fill.

## Motion
- Easing: `--ease: cubic-bezier(0.22, 1, 0.36, 1)`. Durations 0.2–1s; intro ~4s total.
- Purposeful only: entrance reveals, hover feedback, keycap press, counters, marquee.
- **Intro:** plays once per browser session; skippable (button, click, Esc/Enter/Space); skipped on reduced motion or when arriving with a `#hash`. Never blocks the page (CSS timeline + JS failsafe, D-004).
- **Reduced motion:** all animation/transition effectively disabled.

## UX & accessibility principles
- Semantic landmarks, one `h1`, skip link, visible focus (`:focus-visible` red outline).
- Everything usable without JS: content visible, intro absent, nav links shown, skills listed in `<noscript>`.
- Skills keyboard: real `<button>`s with `aria-pressed`, roving tabindex + arrow keys, live-region card; physical typing presses keys by first letter only while the section is in view and never while typing in a field.
- Sound: off by default, opt-in toggle.
- Touch targets ≥ 44px. No horizontal scroll at any width.
- Breakpoints: 980px (stack columns), 760px (mobile nav), 640px (phone layout).
