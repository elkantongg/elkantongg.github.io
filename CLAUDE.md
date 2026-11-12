# CLAUDE.md — Elkan Tong · Portfolio

Personal developer portfolio for **Elkan Tong Kai En**, BSc Information Systems student at Singapore Management University (2025 – present), Singapore.

- **Purpose:** show who Elkan is, what they build, and how to reach them; host the résumé.
- **Positioning:** a full-stack builder who finds real-world friction and ships the fix (tagline: *"Not just code. What it fixes."*).
- **Audience:** TBD (recruiters / clients / hackathon teams — not yet confirmed).
- **Repo:** https://github.com/elkantongg/portfolio (public, branch `main`).

## Session start routine
1. Read this file.
2. Identify the task; read **only** the docs it needs (table below).
3. Check the current code before proposing changes.
4. Continue from the latest state in `docs/STATUS.md`.
5. Docs are authoritative unless they conflict with the code or the user's latest instruction — then **flag the discrepancy**, don't silently pick one.

## Where things live

| Doc | Contains | Read when | Update when |
|---|---|---|---|
| `docs/STATUS.md` | Feature states, known issues, next priorities | Almost every task | After any meaningful milestone |
| `docs/DESIGN.md` | Visual identity, references, type, colour, motion, UX/a11y rules | Any visual/UX/animation work | Visual direction or UX principles change |
| `docs/ARCHITECTURE.md` | Stack, file layout, conventions, security, performance, deploy | Any code change | Stack or structure changes |
| `docs/CONTENT.md` | Projects, experience, skills copy (source of truth) | Editing any visible text | Portfolio content changes |
| `docs/DECISIONS.md` | Decision log incl. rejected approaches | Before reversing or revisiting a choice | A decision is confirmed, revised or rejected |
| `README.md` | Human-facing overview, run locally | Rarely | Run/deploy steps change |

Update this file only when project-wide rules or the doc map change.

## Rules
- **Git:** never commit, push, merge, rebase, reset, delete branches or run destructive commands without explicit approval. Never overwrite work without checking impact.
- **Secrets & privacy:** never commit keys, credentials or secrets. Personal details on the résumé are approved for public display (D-013); anything not on the résumé needs Elkan's OK first.
- **Scope:** don't implement features unless asked; no unrelated changes; explain the approach before significant architecture/design changes.
- **Content:** never invent facts, metrics or links. Unknown → `TBD`.
- **Status honesty:** use planned / in progress / implemented / verified. "Verified" means actually checked in a browser (state how).
- **Quality bar:** premium, non-template design; consistent tokens; purposeful motion; responsive (desktop/tablet/mobile); accessible; fast; no unnecessary dependencies.
- **Efficiency:** concise replies, targeted edits, selective file reads, no restating completed work. Never at the cost of correctness, security or design quality.
