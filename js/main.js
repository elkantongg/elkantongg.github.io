import { ICONS } from "./icons.js";

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
  const INTRO_MS = 3700; // matches --hd in style.css
  const finish = () => {
    // Browsers don't re-time running animations when --hd changes, so fast-forward
    // the hero entrance past the intro's delay (keeps the per-element stagger).
    const hero = $(".hero");
    document.getAnimations().forEach((a) => {
      const target = a.effect && a.effect.target;
      if (target && hero.contains(target) && /^(rise|fade-up)$/.test(a.animationName) && a.currentTime < INTRO_MS) {
        a.currentTime = INTRO_MS;
      }
    });
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

/* ------------------------------------------- scroll: progress + timeline */
const bar = $("#progress-bar");
const timeline = $(".timeline");
let ticking = false;
function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  nav.classList.toggle("is-scrolled", window.scrollY > 10);
  if (timeline) {
    const r = timeline.getBoundingClientRect();
    const p = (window.innerHeight * 0.65 - r.top) / r.height;
    timeline.style.setProperty("--tl", Math.max(0, Math.min(1, p)).toFixed(3));
  }
  ticking = false;
}
window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });
onScroll();

/* ----------------------------------------------------- reveal + counters */
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
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("in");
    const dd = entry.target.querySelector("dd[data-count]");
    if (dd) countUp(dd);
    revealer.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
$$(".reveal").forEach((el) => revealer.observe(el));

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
    toastTimer = setTimeout(() => { toast.textContent = ""; }, 2600);
  };
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(address);
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
const LAYERS = 8;

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
    if (skill.ink) btn.style.setProperty("--ink", skill.ink);

    // stacked layers give the keycap real, rounded depth
    for (let l = 0; l < LAYERS; l++) {
      const layer = document.createElement("span");
      layer.className = "key__l";
      layer.setAttribute("aria-hidden", "true");
      const t = l / (LAYERS - 1);
      layer.style.setProperty("--z", `calc(var(--h) * ${(-0.8 + t * 1.75).toFixed(3)})`);
      layer.style.setProperty("--s", (1 - t * 0.08).toFixed(3));
      btn.appendChild(layer);
    }
    const top = document.createElement("span");
    top.className = "key__top";
    top.setAttribute("aria-hidden", "true");
    top.style.setProperty("--z", "calc(var(--h) * 1)");
    top.style.setProperty("--s", "0.9");
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
  function playClick() {
    if (!soundOn || !audio) return;
    const t = audio.currentTime;
    const len = Math.floor(audio.sampleRate * 0.035);
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let n = 0; n < len; n++) data[n] = (Math.random() * 2 - 1) * Math.pow(1 - n / len, 4);
    const noise = audio.createBufferSource();
    noise.buffer = buf;
    const bp = audio.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400 + Math.random() * 600;
    bp.Q.value = 1.2;
    const g = audio.createGain();
    g.gain.value = 0.35;
    noise.connect(bp).connect(g).connect(audio.destination);
    const osc = audio.createOscillator();
    const og = audio.createGain();
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);
    og.gain.setValueAtTime(0.18, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(og).connect(audio.destination);
    noise.start(t);
    osc.start(t);
    osc.stop(t + 0.08);
  }
})();
