# Decisions

Status: **confirmed** (by Elkan) · **accepted** (implemented in an approved draft, not individually discussed) · **provisional** (safe default pending Elkan) · **rejected**.
Append new entries; when revising, mark the old one *superseded by D-0xx* rather than deleting it.

| ID | Date | Decision | Status | Rationale | Rejected alternatives |
|---|---|---|---|---|---|
| D-001 | 2026-11-12 | Page order built around Elkan's four parts: **Intro → Main idea → Skills → Résumé**. Draft also adds Hero, Work and Contact sections. | 4 parts confirmed; extra sections accepted | Elkan's brief; Work/Contact needed to show projects and convert visitors | — |
| D-002 | 2026-11-12 | Plain static HTML/CSS/vanilla JS, no framework or build step | accepted | Single page, zero dependencies, fastest load, smallest attack surface, deploys anywhere | Vue/React/Next (not ruled out — revisit if multi-page or CMS needed) |
| D-003 | 2026-11-12 | Self-host fonts and icons; no runtime third-party requests | accepted | Privacy (no visitor data to CDNs), strict CSP, speed | Google Fonts CDN, icon CDNs/libraries |
| D-004 | 2026-11-12 | Intro is a pure-CSS timeline with a JS failsafe; once per session; skippable; off for reduced motion / deep links | accepted | Page can never get stuck behind the intro; repeat visitors aren't slowed | JS-only timeline; playing on every visit |
| D-005 | 2026-11-12 | Skills keyboard built in CSS 3D (stacked layers per keycap) | accepted | Matches reference look without a heavy dependency; real buttons stay accessible | Three.js / Spline / WebGL; static image |
| D-006 | 2026-11-12 | Strict CSP: no inline scripts or style attributes; DOM via `textContent`/`createElement` | accepted | XSS hardening ("no security issues" requirement) | Inline `<script>`/`style=""`; `innerHTML` |
| D-007 | 2026-11-12 | Phone number never shown on the site. Résumé PDF (contains phone) is git-ignored in the public repo | superseded by D-013 | Public repo + public site would expose the phone number to scrapers | Committing the current PDF as-is |
| D-008 | 2026-11-12 | Email assembled by JS from data attributes; HTML fallback "name [at] domain" | accepted | Reduces spam scraping while staying usable | Plain `mailto:` in HTML; contact form (needs a backend) |
| D-009 | 2026-11-12 | Reference videos are not committed; described in DESIGN.md | accepted | Third-party TikTok content; keeps repo light | Committing the videos |
| D-010 | 2026-11-12 | Dark theme only | accepted | Matches the reference aesthetic | Light/dark toggle (TBD if requested) |
| D-011 | 2026-11-12 | Key sounds synthesised with Web Audio, **off by default** | accepted | Fun but never surprising; no audio files | Sound on by default; audio file assets |
| D-012 | 2026-11-12 | Docs: CLAUDE.md + README + 5 docs (DESIGN, ARCHITECTURE, CONTENT, STATUS, DECISIONS) | confirmed | Minimal context per session; VISION folded into CLAUDE.md, PROJECTS+PROGRESS renamed CONTENT/STATUS with wider scope | Separate VISION.md / PROJECTS.md / PROGRESS.md |
| D-013 | 2026-11-12 | Everything on the résumé (incl. phone number) is OK to show publicly. Résumé PDF is committed and served as-is. The site's HTML still lists only email + LinkedIn as contact options | confirmed | Elkan: "whatever is on the resume, is okay to show" | Redacted PDF; git-ignoring the PDF (D-007) |
