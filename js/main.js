import { ICONS } from "./icons.js";
import { initMotion } from "./motion.js";
import { initBuilders } from "./builders.js";
import { initLanyard } from "./lanyard.js";
import { prime } from "./typer.js";

const root = document.documentElement;
root.classList.add("ready");

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const SVG_NS = "http://www.w3.org/2000/svg";

/* ------------------------------------------------------------------ intro */
(function intro() {
  const el = $("#intro");
  if (!el || root.classList.contains("no-intro")) return;
  const finish = () => { // the builder crew starts on the page as soon as the intro hands over
    root.classList.remove("intro-active");
    el.classList.add("is-done");
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); };
  $("#intro-skip").addEventListener("click", finish);
  el.addEventListener("click", finish);
  document.addEventListener("keydown", onKey);
  el.addEventListener("animationend", (e) => { if (e.animationName === "intro-out") finish(); });
})();

/* -------------------------------------------------------------------- nav */
const nav = $("#nav");
const toggle = $("#nav-toggle");
const setMenu = (open) => {
  nav.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
};
toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
$$("#nav-links a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
});
window.matchMedia("(min-width: 761px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

const navLinks = new Map($$("#nav-links a").map((a) => [a.getAttribute("href").slice(1), a]));
const spy = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.remove("is-active"));
    const link = navLinks.get(entry.target.id);
    if (link) link.classList.add("is-active");
  });
}, { rootMargin: "-45% 0px -50% 0px" });
["top", ...navLinks.keys()].forEach((id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

/* ----------------------------------------------------- scroll: progress */
const bar = $("#progress-bar");
let ticking = false;
function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  nav.classList.toggle("is-scrolled", window.scrollY > 10);
  ticking = false;
}
window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });
onScroll();

/* ----------------------------------------------------- reveal + counters */
// A project panel's parts, in build order (built by the crew the first time that project is shown).
const PROJ_PARTS = [".proj__n", ".proj__name", ".proj__pitch", ".proj__when", ".cta", ".proj__text p", ".proj__facts", ".proj__facts li", ".tags li"];
// Everything on the page is built by the cursor crew, down to small parts. Containers listed here
// are built before their parts (builders.js waits for an unbuilt .reveal ancestor).
const PARTS = [
  ".nav", ".nav__logo", ".nav__toggle",
  ".hero__grid", ".hero__grid .cross", ".hero__hello", ".hero__row", ".hero__lede", ".hero__actions .btn",
  ".hero__meta", ".hero__meta li", ".marquee",
  ".like h3", ".like p",
  ".flow__stage", ".flow__cap", ".flow__arrow", ".flow__rail", ".flow__count",
  ".skills__sub", ".skill-card", ".sound", ".kb-stage",
  ".facts > div", ".timeline > li h3", ".timeline > li p",
  ".contact__actions > *", ".footer__inner > *",
];
if (!reducedMotion.matches) {
  if (window.matchMedia("(min-width: 761px)").matches) PARTS.push(".nav__links > li"); // phone menu links stay instant
  $$(PARTS.join(", ")).forEach((el) => el.classList.add("reveal"));
}
$$(".reveal").forEach((el) => {
  const siblings = $$(":scope > .reveal", el.parentElement);
  const i = siblings.indexOf(el);
  if (i > 0) el.style.setProperty("--rd", `${Math.min(i, 6) * 0.07}s`);
});
const fmt = new Intl.NumberFormat("en-US");
function countUp(dd) {
  const target = Number(dd.dataset.count);
  const prefix = dd.dataset.prefix || "";
  if (!Number.isFinite(target) || reducedMotion.matches) return;
  const start = performance.now();
  const dur = 1400;
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    dd.textContent = prefix + fmt.format(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
// Text the builders type into its frame instead of fading in (reference video 4).
const TYPED = [
  ".nav__logo", ".nav__links > li", ".btn", ".hero__hello", ".hero__lede", ".hero__meta li",
  ".label", ".about__lede", ".like h3", ".like p", ".work__count",
  ".flow__cap", ".flow__count", ".proj__n", ".proj__name", ".proj__pitch", ".proj__when",
  ".proj__text p", ".proj__facts li", ".proj .tags li",
  ".skills__sub", ".skill-card", ".sound", ".resume__lede", ".facts > div", ".timeline > li h3", ".timeline > li p",
  ".contact__lede", ".footer__inner > *",
].join(", ");
function reveal(el, typed = false) {
  if (el.matches(".kb-stage")) $("#keyboard").classList.add("in"); // keycaps pop up once the stage is built
  if (el.matches(".flow__cap") && build) { // a card's picture is only built once its name + pitch are up
    const img = el.parentElement.querySelector("img.reveal:not(.in)");
    if (img) build(img, () => reveal(img));
  }
  const typer = typed && el.matches(TYPED) ? prime(el) : null; // hide characters before the element shows
  if (typer) el.classList.add("is-typed"); // shows at once: the typing is the entrance
  el.classList.add("in");
  const dd = el.querySelector("dd[data-count]");
  if (dd) countUp(dd);
  return typer ? typer.play() : null;
}
const build = initBuilders(reducedMotion); // cursor crew frames each element before it appears
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    revealer.unobserve(el);
    if (!build) { reveal(el); return; }
    build(el, () => { el.style.setProperty("--rd", "0s"); return reveal(el, true); });
  });
}, { threshold: 0 }); // building starts the moment any pixel is on screen
initMotion(reducedMotion); // splits headlines into words before they're observed
initLanyard(reducedMotion); // ID badge that drops into the hero
$$(".reveal").forEach((el) => revealer.observe(el));

/* ------------------------------------------------------- work coverflow */
// Project cards packed in perspective (Elkan's motion.dev reference): the selected card faces front,
// the others fold away on each side. Drag/swipe with momentum, wheel sideways, arrow keys or click.
(function coverflow() {
  const flow = $("#flow");
  if (!flow) return;
  const stage = $(".flow__stage", flow);
  const cards = $$(".flow__card", flow);
  const btns = cards.map((c) => $(".flow__btn", c));
  const projs = $$(".proj");
  const count = $(".flow__count b", flow);
  const rail = $(".flow__rail", flow);
  const [prev, next] = $$(".flow__arrow", flow);
  const n = cards.length;
  let active = -1, pos = 0, spread = 1, dragged = false;
  root.classList.add("flow-on");

  const cw = () => cards[0].offsetWidth;
  function place(p) {
    const w = cw();
    cards.forEach((card, i) => {
      const d = i - p, ad = Math.abs(d), s = Math.sign(d);
      const near = Math.min(ad, 1), far = Math.max(ad - 1, 0);
      const x = s * (near * w * 0.6 + far * w * 0.17) * spread; // landscape cards: tighter fold
      const z = -(near * 170 + far * 46);
      const rot = -s * near * 58 * spread;
      card.style.transform = `translateX(${x.toFixed(1)}px) translateZ(${z.toFixed(1)}px) rotateY(${rot.toFixed(2)}deg)`;
      card.style.zIndex = String(100 - Math.round(ad * 10));
      btns[i].style.setProperty("--shade", (Math.min(0.6, near * 0.32 + far * 0.1) * spread).toFixed(3));
    });
  }
  const timers = new Map();
  const later = (el, fn, ms) => { clearTimeout(timers.get(el)); timers.set(el, setTimeout(fn, ms)); };
  // The front card's details open by themselves once the strip has been scrolled into view, and follow
  // the strip as you swipe, drag, click or use the arrows. The first time a project is shown, the crew
  // frames the panel and then builds every part of it from nothing; later visits just rise in.
  const detail = $(".flow__detail");
  let open = -1, seen = false;
  const partsOf = (pr) => $$(PROJ_PARTS.join(", "), pr);
  if (build) { // hidden from the start (set after the reveal observer, so only the crew shows them)
    $$(".flow__btn img", flow).forEach((img) => img.classList.add("reveal")); // built right after its caption
    detail.classList.add("reveal");
    projs.forEach((pr) => partsOf(pr).forEach((el) => el.classList.add("reveal")));
  }
  function select(i, focus = false) {
    i = Math.max(0, Math.min(n - 1, i));
    active = i; pos = i;
    cards.forEach((c, k) => {
      c.classList.toggle("is-active", k === i);
      btns[k].setAttribute("aria-current", k === i ? "true" : "false");
    });
    place(pos);
    count.textContent = String(i + 1).padStart(2, "0");
    rail.style.setProperty("--p", String(i));
    prev.disabled = i === 0;
    next.disabled = i === n - 1;
    if (focus) btns[i].focus({ preventScroll: true });
    if (seen) show(i);
  }
  // Order (D-036): the card strip is built first (each caption, then its picture, then the controls).
  // Only after that does the details panel unfold, and its parts are built once you've scrolled to it.
  let cardsDone = !build, panelInView = false;
  function show(i) {
    if (i === open) return;
    projs.forEach((pr, k) => { if (k !== i) { clearTimeout(timers.get(pr)); pr.classList.remove("is-active", "is-entering"); } });
    clearTimeout(timers.get(projs[i]));
    open = i;
    projs[i].classList.add("is-active");
    sync(true);
  }
  function sync(switched = false) {
    if (open < 0 || !cardsDone) return; // the details wait for the cards
    detail.classList.add("is-open");
    const pr = projs[open];
    if (!build || pr.dataset.built) { // already built: a switch just rises in
      if (switched && pr.dataset.built) { pr.classList.add("is-entering"); later(pr, () => pr.classList.remove("is-entering"), 900); }
      pr.dataset.built = "1";
      return;
    }
    if (!panelInView) return; // built when you get there
    if (!detail.dataset.built) { // the panel outline goes up first
      detail.dataset.built = "1";
      build(detail, () => reveal(detail));
    }
    pr.dataset.built = "1"; // first visit: every part is built by the crew, in page order
    partsOf(pr).forEach((el) => build(el, () => reveal(el, true)));
  }
  if (!cardsDone) { // done when every strip part on screen (captions, pictures, arrows, rail, counter) is shown
    const onScreenX = (el) => { const r = el.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth; };
    const wait = setInterval(() => {
      if (!seen || $$(".reveal", flow).some((el) => !el.classList.contains("in") && onScreenX(el))) return;
      clearInterval(wait);
      cardsDone = true;
      sync();
    }, 150);
  }
  // "At the project": you've scrolled past the cards, i.e. the arrows bar is in the top 45% of the screen.
  // (Measured on the bar, not the panel, because the panel moves as it unfolds.)
  const bar = $(".flow__bar", flow);
  let checking = false;
  const check = () => {
    checking = false;
    const was = panelInView;
    panelInView = bar.getBoundingClientRect().bottom < innerHeight * 0.45;
    if (panelInView && !was) sync();
  };
  const onScroll = () => { if (!checking) { checking = true; requestAnimationFrame(check); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  check();
  new IntersectionObserver(([e], io) => { // the front project is picked once the strip is on screen
    if (!e.isIntersecting) return;
    io.disconnect();
    seen = true;
    show(active);
  }, { threshold: 0.35 }).observe(stage);

  select(0);

  btns.forEach((b, i) => b.addEventListener("click", (e) => {
    if (dragged) { e.preventDefault(); return; }
    select(i);
  }));
  prev.addEventListener("click", () => select(active - 1));
  next.addEventListener("click", () => select(active + 1));
  flow.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    select(active + (e.key === "ArrowRight" ? 1 : -1), e.target.matches(".flow__btn"));
  });

  // drag / swipe: the strip follows the pointer, then lands on the nearest card (thrown with momentum)
  let startX = 0, startPos = 0, lastX = 0, lastT = 0, vel = 0, id = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    id = e.pointerId; startX = lastX = e.clientX; startPos = pos; lastT = performance.now(); vel = 0; dragged = false;
  });
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - startX;
    if (!dragged && Math.abs(dx) < 6) return;
    if (!dragged) { dragged = true; stage.setPointerCapture(id); stage.classList.add("is-dragging"); }
    const now = performance.now();
    vel = 0.75 * vel + 0.25 * ((e.clientX - lastX) / Math.max(1, now - lastT));
    lastX = e.clientX; lastT = now;
    let p = startPos - dx / (cw() * 0.55);
    if (p < 0) p *= 0.35;
    else if (p > n - 1) p = n - 1 + (p - (n - 1)) * 0.35; // rubber band at the ends
    pos = p;
    place(pos);
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    if (!dragged) return;
    stage.classList.toggle("is-dragging", false);
    const throwBy = Math.max(-1, Math.min(1, -vel * 0.8)); // a flick moves at most one card further
    select(Math.round(pos + throwBy));
    setTimeout(() => { dragged = false; }, 0); // swallow the click that ends a drag
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);

  // trackpad / shift-wheel sideways steps one card at a time
  let acc = 0, lock = 0;
  stage.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (performance.now() < lock) return;
    acc += e.deltaX;
    if (Math.abs(acc) > 40) { select(active + Math.sign(acc)); acc = 0; lock = performance.now() + 380; }
  }, { passive: false });

  window.addEventListener("resize", () => place(pos), { passive: true });
})();

/* -------------------------------------------------------------- contact */
(function contact() {
  const link = $("#email-link");
  const text = $("#email-text");
  const copyBtn = $("#copy-email");
  const toast = $("#toast");
  const user = link.dataset.u;
  const domain = link.dataset.d;
  if (!/^[a-z0-9._-]+$/i.test(user) || !/^[a-z0-9.-]+$/i.test(domain)) return;
  const address = `${user}@${domain}`;
  link.href = `mailto:${address}`;
  text.textContent = address;
  copyBtn.hidden = false;

  let toastTimer;
  const say = (msg) => {
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.textContent = ""; copyBtn.classList.remove("is-done"); }, 2600);
  };
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(address);
      copyBtn.classList.add("is-done");
      say("Email copied to clipboard.");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = address;
      ta.setAttribute("readonly", "");
      ta.className = "sr-only";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
      copyBtn.classList.toggle("is-done", ok);
      say(ok ? "Email copied to clipboard." : `Copy this: ${address}`);
    }
  });
})();

/* ------------------------------------------------------- skills keyboard */
const SKILLS = [
  { id: "javascript", name: "JavaScript", c: "#ff7a1a", line: "The glue behind Lepak and ResolveOS. Turns static pages into things that react.", used: ["Lepak", "ResolveOS"] },
  { id: "typescript", name: "TypeScript", c: "#2f74c0", line: "JavaScript with a seatbelt. Catches the bug before the demo does.", used: ["Care+", "ResolveOS"] },
  { id: "html5", name: "HTML5", c: "#e5402a", line: "Semantic, accessible markup, like the senior-friendly screens in Care+.", used: ["Care+", "ResolveOS"] },
  { id: "css", name: "CSS", c: "#6d3fd9", line: "Where 'it works' becomes 'it feels right'. This keyboard is pure CSS 3D.", used: ["This site", "ResolveOS"] },
  { id: "python", name: "Python", c: "#f2c230", ink: "#1b1b1f", line: "Backend brains: fuzzy search across ~19,000 Singapore places for Lepak.", used: ["Lepak"] },
  { id: "sql", name: "SQL", c: "#24242b", line: "Asking databases the right questions, joins and all.", used: ["Lepak", "Care+"] },
  { id: "vuedotjs", name: "Vue 3", c: "#2fa865", line: "My go-to frontend. Care+, Wayfound and ResolveOS all run on it.", used: ["Care+", "Wayfound", "ResolveOS"] },
  { id: "fastapi", name: "FastAPI", c: "#129e8f", line: "Fast APIs, as promised. The backend behind Care+ and Wayfound.", used: ["Care+", "Wayfound"] },
  { id: "bootstrap", name: "Bootstrap 5", c: "#7a4fc4", line: "Responsive layouts at speed, for when the deadline was yesterday.", used: [] },
  { id: "postgresql", name: "PostgreSQL", c: "#2a9fd6", line: "Relational and reliable. Where Lepak's plans, votes and places live.", used: ["Lepak"] },
  { id: "supabase", name: "Supabase", c: "#1d2621", ink: "#3ecf8e", line: "Postgres, auth and realtime in one: live sync in Lepak, shared calendars in Care+.", used: ["Lepak", "Care+"] },
  { id: "sqlite", name: "SQLite", c: "#f08a24", line: "Small, local, zero config. The database that just works.", used: [] },
  { id: "github", name: "GitHub", c: "#2b2b31", line: "Branches, pull requests and reviews: how a 5-person team ships Care+.", used: ["Every project"] },
  { id: "neo4j", name: "Neo4j", c: "#1f9d55", line: "Graphs for Wayfound, so one venue change doesn't silently break ten sessions.", used: ["Wayfound"] },
  { id: "vite", name: "Vite", c: "#d7263d", line: "Instant dev server, instant feedback. ResolveOS was built on it.", used: ["ResolveOS"] },
  { id: "vercel", name: "Vercel", c: "#ececec", ink: "#000", line: "Push to deploy. From laptop to live link before the judges arrive.", used: [] },
];
const COLS = 4;
const LAYERS = 12;

(function keyboard() {
  const board = $("#keyboard");
  if (!board) return;
  const card = $("#skill-card");
  const nameEl = $("#skill-name");
  const lineEl = $("#skill-line");
  const usedEl = $("#skill-used");
  const soundBtn = $("#sound-toggle");
  const keys = [];
  let active = -1;
  let userTouched = false;

  SKILLS.forEach((skill, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "key";
    btn.setAttribute("aria-label", skill.name);
    btn.setAttribute("aria-pressed", "false");
    btn.tabIndex = i === 0 ? 0 : -1;
    btn.style.setProperty("--c", skill.c);
    btn.style.setProperty("--ki", String((i % COLS) + Math.floor(i / COLS)));
    if (skill.ink) btn.style.setProperty("--ink", skill.ink);

    // stacked layers give the keycap real, rounded depth
    for (let l = 0; l < LAYERS; l++) {
      const layer = document.createElement("span");
      layer.className = "key__l";
      layer.setAttribute("aria-hidden", "true");
      const t = l / (LAYERS - 1);
      layer.style.setProperty("--z", `calc(var(--h) * ${(-0.8 + t * 1.72).toFixed(3)})`);
      // sides stay full, then round in towards the top like a sculpted keycap
      layer.style.setProperty("--s", (1 - 0.1 * Math.pow(t, 2.2)).toFixed(3));
      btn.appendChild(layer);
    }
    const top = document.createElement("span");
    top.className = "key__top";
    top.setAttribute("aria-hidden", "true");
    top.style.setProperty("--z", "calc(var(--h) * 1)");
    top.style.setProperty("--s", "0.88");
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[skill.id] || "");
    svg.appendChild(path);
    top.appendChild(svg);
    btn.appendChild(top);

    btn.addEventListener("click", () => { userTouched = true; press(i); });
    btn.addEventListener("keydown", (e) => onArrow(e, i));
    board.appendChild(btn);
    keys.push(btn);
  });

  function press(i) {
    const k = keys[i];
    k.classList.add("is-down");
    setTimeout(() => k.classList.remove("is-down"), 130);
    playClick();
    select(i);
  }

  function select(i) {
    if (i === active) return;
    if (active >= 0) {
      keys[active].classList.remove("is-active");
      keys[active].setAttribute("aria-pressed", "false");
    }
    active = i;
    const skill = SKILLS[i];
    keys[i].classList.add("is-active");
    keys[i].setAttribute("aria-pressed", "true");
    keys.forEach((k, j) => { k.tabIndex = j === i ? 0 : -1; });

    nameEl.textContent = skill.name;
    lineEl.textContent = skill.line;
    usedEl.replaceChildren(...skill.used.map((u) => {
      const li = document.createElement("li");
      li.textContent = u;
      return li;
    }));
    card.classList.remove("swap");
    void card.offsetWidth; // restart the swap animation
    card.classList.add("swap");
  }

  function onArrow(e, i) {
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS, Home: -i, End: keys.length - 1 - i };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = i + moves[e.key];
    if (next < 0 || next >= keys.length) return;
    keys.forEach((k, j) => { k.tabIndex = j === next ? 0 : -1; });
    keys[next].focus();
  }

  // Typing on a physical keyboard presses a matching keycap (by first letter, cycling).
  let skillsInView = false;
  new IntersectionObserver(([entry]) => {
    skillsInView = entry.isIntersecting;
    if (skillsInView && !build) board.classList.add("in"); // with builders, the stage's build triggers it
    if (skillsInView && !userTouched && active < 0) {
      setTimeout(() => { if (!userTouched && active < 0) press(SKILLS.findIndex((s) => s.id === "vuedotjs")); }, 700);
    }
  }, { threshold: 0.35 }).observe(board);

  const isEditable = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  document.addEventListener("keydown", (e) => {
    if (!skillsInView || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isEditable(e.target) || e.key.length !== 1 || e.key === " ") return;
    if (root.classList.contains("intro-active")) return;
    const ch = e.key.toLowerCase();
    if (!/[a-z0-9]/.test(ch)) return;
    userTouched = true;
    const matches = SKILLS.map((s, i) => (s.name.toLowerCase().startsWith(ch) ? i : -1)).filter((i) => i >= 0);
    let i;
    if (matches.length) {
      const pos = matches.indexOf(active);
      i = matches[(pos + 1) % matches.length];
    } else {
      do { i = Math.floor(Math.random() * keys.length); } while (i === active && keys.length > 1);
    }
    press(i);
  });

  /* optional key sounds, synthesised (no audio files) and off by default */
  let audio = null;
  let soundOn = false;
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    soundBtn.textContent = `Key sounds: ${soundOn ? "on" : "off"}`;
    if (soundOn && !audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audio = new Ctx();
    }
    if (audio && audio.state === "suspended") audio.resume();
    if (soundOn) playClick();
  });
  /* Mechanical keycap: a crisp switch click, the plastic "clack" of the cap bottoming out,
     a short body resonance, then a softer release click. Built from filtered noise bursts. */
  let noiseBuf = null;
  function burst(t, { type, freq, q = 1, gain, dur }) {
    const src = audio.createBufferSource();
    src.buffer = noiseBuf;
    const f = audio.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(audio.destination);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.01);
  }
  function playClick() {
    if (!soundOn || !audio) return;
    if (!noiseBuf) {
      noiseBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let n = 0; n < d.length; n++) d[n] = Math.random() * 2 - 1;
    }
    const t = audio.currentTime + 0.005;
    const v = 0.85 + Math.random() * 0.3; // no two presses identical
    burst(t, { type: "highpass", freq: 4800, q: 0.7, gain: 0.32 * v, dur: 0.012 });          // switch click
    burst(t + 0.006, { type: "bandpass", freq: 1900 * v, q: 6, gain: 0.5 * v, dur: 0.035 });   // keycap clack
    burst(t + 0.006, { type: "lowpass", freq: 480, q: 1.4, gain: 0.55 * v, dur: 0.05 });       // board thock
    burst(t + 0.09, { type: "bandpass", freq: 2600 * v, q: 4, gain: 0.16 * v, dur: 0.02 });    // release
  }
})();
