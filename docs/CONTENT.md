# Content

Source of truth for all visible copy. Facts come from **Elkan's résumé (PDF, provided 2026-11-12)**. Anything marked *(Claude wording)* is copywriting written for the draft and **awaits Elkan's review**; it must not add new facts.

## Identity
- **Name:** Elkan Tong Kai En (site uses "Elkan Tong")
- **Location:** Singapore
- **Education:** BSc Information Systems, Singapore Management University, 2025 – present
- **Email:** elkantong@gmail.com (shown on site, obfuscated in HTML)
- **LinkedIn:** https://www.linkedin.com/in/elkan-tong-874542372
- **Phone:** on résumé — OK to show (D-013). Not shown on the site (résumé PDF removed, D-014)
- **Instagram:** @elkantongg → https://www.instagram.com/elkantongg/ (Elkan, 2026-11-12). Shown as the top-left logo
- **GitHub:** `elkantongg`; project repos linked from Work (Elkan, 2026-11-12). Profile link itself not shown
- **Hero:** "Hello, I'm / Elkan Tong" (no full stop, no background word — Elkan, 2026-11-12). Buttons "See the work" · "Get in touch"
- **Lanyard badge** *(Claude wording)*: strap "ELKAN TONG ✦ @ELKANTONGG". Front: "SMU · Information Systems", "@elkantongg", "Full-stack / Builder", photo, "Singapore", "Elkan Tong Kai En", "Portfolio", "2026". Back: "LinkedIn" · "Elkan Tong", "Scan to / Connect", QR code to https://www.linkedin.com/in/elkan-tong-874542372, "linkedin.com/in/elkan-tong", "Elkan Tong", "2026". Tap the badge to flip it
- **Hero line** *(Claude wording)*: "Information Systems student at SMU, building full-stack products that take the friction out of everyday coordination."
- **About (01)**: headline "Curious builder / Disciplined by habit" *(Claude wording, not yet changed by Elkan)*. Lede and tiles are Elkan's wording (2026-11-12): "From software to financial markets, I'm drawn to problems that challenge how I think, pushing me to grow." Tiles: **Building** "Turning ideas into working products, from hackathon prototypes to real-world solutions." · **Markets** "Exploring financial markets through forex trading, analysis, and shared learning." · **Training** "I love to gym. For me, fitness is as much about discipline as it is about growth." Earlier Claude drafts (FX trading team / community of 175, police field instructor / IPPT) were replaced. The section replaced "Not just code. What it fixes.", the process list, quote card and stats strip (Elkan: too lengthy, not relevant).
- **Journey section**: heading "The journey / So far" (no full stops); lede "A mix of Tech, Finance, and Fitness. More to come" (Elkan's wording).
- **Contact**: "Let's work together" (no full stop).
- **Skills → Toolkit** (Elkan, 2026-11-12): label "03 / The toolkit", heading "Toolkit.", subheading "Technologies I've worked with across my projects", nav link "Toolkit" (anchor stays `#skills`). No "(hint: press a key)".

## Featured projects
Order on site: newest first (Elkan, 2026-11-13): 01 ResolveOS · 02 Care+ · 03 Wayfound · 04 Lepak. The table below keeps résumé order.
Screenshots (D-034, landscape 16:10): ResolveOS = negotiation screen from `~/Desktop/Hackathons/ResolveOS_Demo_Final.mp4` at 1:45 (webcam cropped out); Wayfound = disrupted schedule from `Wayfound-Daytona.mp4` at 0:46 (pointer + subtitles removed); Care+ and Lepak = top of Elkan's 2026-11-13 app screenshots → `assets/work/*.jpg`.
Links (from GitHub, 2026-11-12): Lepak live https://lepak-hyperbloom.vercel.app + repo · Wayfound repo only (README demo URL is a temporary Daytona proxy) · ResolveOS live https://resolveos-paypal.onrender.com (from README; timed out when checked, likely a sleeping free instance) + repo.

| # | Project | Context · Date | Stack | Résumé facts |
|---|---|---|---|---|
| 01 | **Lepak** | Hyperbloom Hackathon · Oct 2026 | JavaScript, Python, PostgreSQL, Supabase | Full-stack group planning app removing back-and-forth when organising outings: shared availability, venue voting, automated itineraries. Fuzzy place search over ~19,000 Singapore locations, real-time sync, 55 automated tests. |
| 02 | **Care+** | SMU Web Application 2 project · Aug – Nov 2026 | Vue 3, TypeScript, FastAPI, Supabase | Team of 5. Responsive elderly-care platform centralising appointments, schedules and care responsibilities between families and caregivers. Built accessible senior-facing interfaces; integrated shared calendars with the team's FastAPI backend and Supabase. |
| 03 | **Wayfound** | Daytona Hackathon · Oct 2026 | Vue 3, FastAPI, Neo4j, Daytona, Qwen | AI-powered event recovery platform: identifies sessions affected by venue disruptions and generates feasible reassignment plans. Neo4j models event dependencies; constraint-aware solver minimises venue changes; plans validated against 35 checks with zero unresolved constraints. |
| 04 | **ResolveOS** | PayPal Hackathon · Oct – Nov 2026 | Vue 3, TypeScript, Vite, PayPal Sandbox, HTML/CSS, JavaScript | AI-assisted dispute resolution platform for buyer–merchant payment disputes: structured workflows, settlement recommendations. PayPal Sandbox integration; agentic prioritisation engine weighing financial exposure, dispute stage and pending actions. |

One-line pitches *(Claude wording)*: Lepak "Group outings, minus the group-chat chaos." · Care+ "One home base for family caregiving." · Wayfound "When the venue falls through, the event doesn't." · ResolveOS "Payment disputes, triaged by an agent."

Achievements/awards for these projects: TBD (none on résumé).

## Experience & leadership (timeline, newest first)
- **2025 – Present** — BSc Information Systems, SMU.
- **Jun 2025 & Jun 2026** — Church Camp Commandant: end-to-end programme planning, logistics and resource allocation for camps serving ~300 participants.
- **Independent** — Forex Trading & Community Development: analysed FX markets / developed strategies with a trading team; hosted education sessions for ~15 participants; grew a Telegram community to 175 subscribers.
- **Apr 2023 – Apr 2025** — Field Instructor, Singapore Police Force: led recruit fitness training; previously failing squads reached 100% IPPT pass rate, incl. 20% gold.
- **Feb – Apr 2023** — HR & Admin Part-Timer, Lighthouse Legacy Group (Great Eastern): candidate screening, interview coordination, onboarding.
- **Feb – Mar 2023** — AI Model Curator, Dreamy Paws: personalised AI pet portraits via iterative prompting; analysed outputs to find effective keywords.

## Skills (résumé)
- **Languages:** Python, JavaScript, TypeScript, HTML/CSS, SQL
- **Frameworks:** Vue 3, FastAPI, Bootstrap 5
- **Tools & platforms:** GitHub, PostgreSQL, Supabase, Vercel, SQLite
- **Also used in projects:** Neo4j, Vite (shown as keycaps); Daytona, Qwen, PayPal Sandbox (project tags only)
- **Spoken:** English, Chinese

Keycap one-liners live in `js/main.js` `SKILLS` *(Claude wording, all tied to résumé facts)*. Skills with no project usage on the résumé (Bootstrap 5, SQLite, Vercel) show no "used in" tags.

