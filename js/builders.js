/* Builder cursors: a small crew of cursors that "build" the page (reference video 4).
   Every reveal is a job: a cursor glides to the element, drags a blueprint frame around it
   (crosshair while dragging), the frame snaps handles + a tag, then the content appears.
   Everything is a job, navbar and decor included; a part waits for its unbuilt container.
   Building never queues: when no crew cursor is free (or the nearest is far), an extra agent streams
   in from the nearest side and leaves when done, so scrolling is built continuously. Anything that
   has already left the screen is snapped in without a cursor.
   Hero: after the intro the crew swarms in, then the whole first screen is built part by part.
   Contact: a bigger crowd condenses into a turning 3D globe, like the new element taking shape in
   Iron Man 2: a round lattice of cursors (depth-shaded, linked by a geodesic mesh of struts, a soft rim
   light) glowing a dim hologram blue. The red lead cursor is the nucleus at the centre. Every cursor that
   is free joins: crew and crowd always get a seat (a stray agent gives its seat up, or one is added), so no cursor is left wandering. Narrow screens keep a flat ring around the email button.
   Two kinds of motion (D-033). While building, a bot moves like a nanobot (D-031): it darts to the part in
   short straight hops with small course corrections, on stiff, slightly under-damped springs (quick
   overshoot, then lock on), leaves a thin blue streak on the dash and buzzes while it holds; drawing the
   frame and typing stay exact. Otherwise (arriving, wandering, swarming, the contact ring, leaving) it glides
   on the original soft, critically damped springs and wanders the whole screen at an easy pace.
   Text is typed into its frame (typer.js) while the cursor, now an I-beam, follows the caret; the frame
   stays up until the typing ends. Rows get a highlight bar, media gets a placeholder slab the content
   fades in under, and every drag flashes alignment guides + a live size tag.
   Canvas only, no dependencies. Off for reduced motion; content never waits on it (3s failsafe). */

const BLUE = "76, 141, 255";
const CYAN = "45, 125, 255"; // hologram glow of the contact globe (kept dim: a glow, not a light)
const PAD = 6;
const HOLD = 0.12; // s, pause on a finished frame before the content appears
const FADE = 0.55; // s, frame fade-out
const MAX_WAIT = 1.2; // s a job may queue (only when the agent cap is hit) before it snaps in
const GAP = 0.1; // s between two jobs starting: the page is built one part at a time, quickly
const GAP_BUSY = 0.04; // ...and faster when a backlog builds up while scrolling
const FAR = 650; // px: a free crew cursor further than this loses the job to a fresh agent
const ROWS = ".timeline > li, .nav"; // drawn as a highlight bar sweeping across
const SLABS = ".like__art"; // placeholder slabs inside a frame (an <img> job is its own slab)
const SUBS = ".key"; // small parts outlined inside a frame (keycaps)
const TAGS = [ // frame tag per element role, most specific first
  [".nav", "navbar"], [".nav__logo", "logo"], [".nav__links > li", "link"], [".nav__toggle", "menu"],
  [".hero__grid", "grid"], [".cross", "marker"], [".marquee", "marquee"],
  [".label", "label"], ["h1 *, h2, .hero__row", "heading"], ["h3", "title"],
  [".timeline__when, .proj__when", "date"], [".flow__stage", "gallery"], [".flow__cap", "caption"],
  [".flow__arrow, .cta", "button"], [".flow__rail", "progress"], [".flow__count", "counter"], [".proj__n", "index"],
  [".proj__facts li", "fact"], [".proj__facts", "facts"], [".flow__detail", "panel"], [".tags li", "tag"], [".timeline > li", "entry"], [".btn, .sound", "button"], [".kb-stage", "keyboard"],
  [".skill-card", "card"], ["img", "image"], [".facts > div", "fact"], [".hero__meta li", "fact"],
  [".footer__inner > *", "footer"], ["p, ul", "text"],
];
// spring stiffness per mode (rad/s) and damping ratio (<1 overshoots a little, 1 = no overshoot)
// building modes (travel, drag, hold, type) are nanobot-stiff; the rest keep the original lazy glide
const OMEGA = { wait: 4, wander: 1.6, swarm: 5, travel: 30, drag: 30, hold: 20, type: 26, idle: 3, orbit: 4.5, leave: 2.2 };
const ZETA = { travel: 0.58, drag: 0.9, hold: 0.75 }; // damping ratio; anything not listed is critically damped (1)
const HOPS = { travel: [0.4, 0.6, 0] }; // darting hops while heading to a job: share of the way (min, max), max pause between hops
const JITTER = { hold: 4 }; // hover noise while holding a finished frame (px-ish)
const BUILDING = new Set(["travel", "drag", "hold", "type"]);
const randn = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2; // cheap ~normal noise

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function initBuilders(reducedMotion) {
  if (reducedMotion.matches) return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  canvas.className = "builders";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);

  const root = document.documentElement;
  const contact = document.getElementById("contact");
  const ringAnchor = document.querySelector(".contact__title");
  const ringBtn = document.getElementById("email-link");
  const ringLede = document.querySelector(".contact__lede");
  const ringActions = document.querySelector(".contact__actions");
  const cap = () => (w < 640 ? 22 : 40); // most cursors on screen at once
  let w = 0, h = 0, dpr = 1, raf = 0, now = 0, off = false;
  let built = 0, heroStarted = false, lastStart = -9, lastJob = null;
  let ringOn = false, ringSince = 0, ringSession = 0;
  const jobs = [];
  const crew = []; // permanent builders
  const temps = []; // agents spawned on demand; they leave when their job is done
  const crowd = []; // extra cursors that only come for the contact ring

  /* ----------------------------------------------------------- cursors */
  function edgePoint(m = 30) {
    const side = Math.floor(Math.random() * 4);
    return side === 0 ? { x: -m, y: rand(0, h) } : side === 1 ? { x: w + m, y: rand(0, h) }
      : side === 2 ? { x: rand(0, w), y: -m } : { x: rand(0, w), y: h + m };
  }
  function cursor(red = false) {
    const p = edgePoint();
    return {
      x: p.x, y: p.y, vx: 0, vy: 0, tx: p.x, ty: p.y, a: 0, mode: "wait", job: null, t0: 0, next: 0, click: -9, red, slot: 0, r: 1,
      hx: p.x, hy: p.y, hopT: 0, pause: 0, nx: 0, ny: 0, trail: [],
    };
  }
  function makeCrew() {
    const n = w < 640 ? 6 : 10;
    while (crew.length < n) crew.push(cursor(crew.length === 0));
    crew.length = n;
  }
  function setMode(c, mode, tx, ty) {
    if (c.mode === "orbit" && mode !== "orbit" && c.gslot != null) { slots[c.gslot] = null; c.gslot = null; } // free its globe slot
    c.mode = mode; c.t0 = now;
    if (tx !== undefined) { c.tx = tx; c.ty = ty; }
  }
  function wander(c) {
    setMode(c, "wander", rand(w * 0.08, w * 0.92), rand(h * 0.14, h * 0.86));
    c.next = now + rand(2.5, 5);
  }
  function release(c) { c.job = null; setMode(c, "idle"); c.next = now + (c.temp ? 0.45 : rand(0.3, 1)); }
  function leave(c) { setMode(c, "leave", c.x > w / 2 ? w + 40 : -40, c.y + rand(-60, 60)); }
  function spawn(f) { // a new agent streams in from the nearest side, level with the job
    const c = cursor();
    c.x = c.tx = f.x + f.w / 2 < w / 2 ? -24 : w + 24;
    c.y = c.ty = clamp(f.y + rand(-140, 140), -20, h + 20);
    c.temp = true;
    temps.push(c);
    return c;
  }
  const free = (c) => c.mode === "idle" || c.mode === "wander";

  /* ----------------------------------------------------------- jobs */
  function frameOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
  }
  function finish(job) {
    if (job.done) return;
    job.done = true;
    job.tShow = now;
    built++;
    const r = job.cb ? job.cb() : null; // { dur, caret } when the content types itself in
    if (r) { job.extra = r.dur || 0; job.caret = r.caret || null; }
  }
  function tagOf(el) {
    if (el.dataset.build) return el.dataset.build;
    const hit = TAGS.find(([sel]) => el.matches(sel));
    return hit ? hit[1] : el.tagName.toLowerCase();
  }
  const onScreen = (f) => f.y + f.h > 0 && f.y < h && f.x + f.w > 0 && f.x < w;
  const jobOf = new WeakMap();
  const blocked = (job) => { // parts wait until their container's frame is being drawn
    const p = job.el.parentElement;
    const anc = p && p.closest(".reveal:not(.in)");
    if (!anc) return false;
    const aj = jobOf.get(anc);
    if (!aj) return "skip"; // container not requested (e.g. off screen): don't hold the line
    return aj.state === "queued" || aj.state === "assigned" ? "wait" : false;
  };
  function snap(job) {
    job.state = "built"; job.p = job.px = job.py = 1; job.tBuilt = now;
    finish(job);
  }
  function flush() {
    jobs.forEach(finish);
    jobs.length = 0;
  }
  // content never waits on the animation: at most 3s after it was due
  const arm = (job) => setTimeout(() => finish(job), 3000 + Math.max(0, job.notBefore - now) * 1000);

  function request(el, cb, notBefore = 0) {
    if (off || document.hidden) { built++; if (cb) cb(); return; }
    const job = {
      el, cb, state: "queued", tq: now, notBefore, p: 0, px: 0, py: 0, done: false, tShow: 0, extra: 0, caret: null,
      tag: tagOf(el), row: el.matches(ROWS),
      slabs: el.matches("img") ? [el] : Array.from(el.querySelectorAll(SLABS)),
      subs: Array.from(el.querySelectorAll(SUBS)), drag: 0.4,
    };
    jobs.push(job);
    jobOf.set(el, job);
    if (heroStarted) arm(job); // otherwise armed when the intro hands over
    start();
  }

  function assign() {
    if (!heroStarted) return; // nothing gets built behind the intro
    let active = crew.length + temps.length;
    let backlog = 0;
    for (const job of jobs) if (job.state === "queued" && now >= job.notBefore) backlog++; // due now, not just queued
    const gap = backlog > 10 ? GAP_BUSY : GAP;
    for (const job of jobs) { // jobs are in page order
      if (job.state !== "queued" || now < job.notBefore) continue;
      const b = blocked(job);
      if (b) { job.tq = now; if (b === "wait") break; continue; } // a part keeps its place in line
      if (now - lastStart < gap) break; // one at a time...
      if (gap === GAP && lastJob && lastJob.state === "assigned" && !lastJob.done) break; // ...in order: wait until the last one is being drawn
      const f0 = frameOf(job.el);
      if (f0.y + f0.h < 0) { snap(job); continue; } // already scrolled past: nobody would see it built
      if (!onScreen(f0)) continue; // just below the fold: built when it scrolls in
      const f = f0;
      let best = null, bestD = Infinity;
      for (const c of crew.concat(temps)) {
        if (!free(c) && !(c.mode === "orbit" && !c.temp)) continue;
        const d = Math.hypot(c.x - f.x, c.y - f.y);
        if (d < bestD) { bestD = d; best = c; }
      }
      if ((!best || bestD > FAR) && active < cap()) { best = spawn(f); active++; }
      if (best) {
        job.state = "assigned";
        best.job = job;
        job.prev = gap === GAP ? lastJob : null; // in order: drawn after, and shown after, the previous part
        setMode(best, "travel");
        lastStart = now; lastJob = job;
      } else if (now - Math.max(job.tq, job.notBefore) > MAX_WAIT) {
        snap(job); // agent cap reached: snap the frame in
      }
    }
  }

  function heroStart() {
    heroStarted = true;
    // everything queued behind the intro (the whole first screen) is released in a quick cascade
    jobs.forEach((j, i) => { j.notBefore = Math.max(j.notBefore, now + 0.55 + Math.min(i, 40) * GAP); j.tq = now; arm(j); });
    crew.forEach((c) => setMode(c, "swarm", w * 0.5 + rand(-70, 70), h * 0.5 + rand(-45, 45)));
  }

  /* ----------------------------------------------------------- contact globe */
  // Wide screens: a 3D globe in the empty space beside the title. Narrow: a flat ellipse around the email button.
  const TILT = 0.42; // view tilt (rad) so the poles read as 3D
  const FOCAL = 9; // perspective strength (in globe radii)
  let geo = null; // this frame's globe geometry, for the lattice draw
  let lattice = null; // cached Fibonacci sphere { n, pts, links }
  // Globe slots are set when the contact section opens (crew + crowd), so the lattice doesn't re-form
  // while cursors stream in or leave for a job: each joiner takes the free slot nearest to it
  // (a slot is only added if a crew/crowd cursor can't get one any other way, see seat()).
  let slots = [];
  const freeSlot = () => slots.indexOf(null) >= 0;
  // seats are counted for crew + crowd; stray agents only borrow spare ones and give them back on demand
  const bumpable = () => temps.find((t) => t.mode === "orbit" && t.gslot != null);
  function claimSlot(c, g) {
    let best = -1, bestD = Infinity;
    const pts = sphereOf(slots.length).pts;
    slots.forEach((o, i) => {
      if (o) return;
      const q = slotPos(g, pts[i]);
      const d = (q.x - c.x) ** 2 + (q.y - c.y) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0) { slots[best] = c; c.gslot = best; }
  }
  // Every crew/crowd cursor on screen must end up on the globe: take a free seat, else bump a stray
  // agent (it flies off), else add a seat (the lattice glides into its new shape).
  let reshuffle = -9;
  function seat(c, g) {
    claimSlot(c, g);
    if (c.gslot != null || c.temp) return;
    const t = bumpable();
    if (t) leave(t); else { slots.push(null); reshuffle = now; }
    claimSlot(c, g);
  }
  const sprite = document.createElement("canvas"); // soft cyan glow dot, drawn additively under each node
  sprite.width = sprite.height = 64;
  {
    const sg = sprite.getContext("2d"), gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${CYAN}, 0.95)`); gr.addColorStop(0.22, `rgba(${CYAN}, 0.36)`); gr.addColorStop(1, `rgba(${CYAN}, 0)`);
    sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
  }
  function glowSprite(stops) { // radial glow baked into a canvas once
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const g = cv.getContext("2d"), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, a]) => gr.addColorStop(o, `rgba(${CYAN}, ${a})`));
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return cv;
  }
  const coreSprite = glowSprite([[0, 0.17], [0.55, 0.04], [1, 0]]);
  // rim light: a soft blue edge makes the sphere read round
  const rimSprite = glowSprite([[0, 0], [0.5, 0.04], [0.68, 0.17], [0.82, 0.04], [1, 0]]);
  const redSprite = document.createElement("canvas"); // the nucleus glows red
  redSprite.width = redSprite.height = 64;
  {
    const sg = redSprite.getContext("2d"), gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255, 51, 65, 0.7)"); gr.addColorStop(0.25, "rgba(255, 51, 65, 0.22)"); gr.addColorStop(1, "rgba(255, 51, 65, 0)");
    sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
  }
  function sphereOf(n) {
    if (lattice && lattice.n === n) return lattice;
    const pts = [], ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), t = i * ga;
      pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    const seen = new Set(), links = [];
    pts.forEach((p, i) => { // each node strut-linked to its 5 nearest: a triangulated, geodesic mesh
      pts.map((q, j) => [j, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2])
        .filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 5)
        .forEach(([j]) => { const k = Math.min(i, j) * 1000 + Math.max(i, j); if (!seen.has(k)) { seen.add(k); links.push([i, j]); } });
    });
    return (lattice = { n, pts, links });
  }
  function ringCentre() {
    if (w >= 980 || !ringBtn) {
      // measure the words themselves (title, lede, buttons), not their full-width blocks
      let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
      const add = (q) => { if (!q.width) return; l = Math.min(l, q.left); r = Math.max(r, q.right); t = Math.min(t, q.top); b = Math.max(b, q.bottom); };
      if (ringAnchor) {
        const range = document.createRange();
        [ringAnchor, ringLede].forEach((el) => { if (el) { range.selectNodeContents(el); add(range.getBoundingClientRect()); } });
        if (ringActions) [...ringActions.children].forEach((el) => add(el.getBoundingClientRect()));
      }
      if (r < l) { l = 0; r = w * 0.5; t = b = h / 2; }
      const R = Math.min(215, w * 0.145);
      // right of the longest line, centred on the text block and lifted a little
      return { globe: true, x: clamp(r + R + 115, w * 0.5, w - R - 30), y: (t + b) / 2 - (b - t) * 0.07, r: R };
    }
    const b = ringBtn.getBoundingClientRect();
    return { globe: false, x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2, rx: b.width / 2 + 10, ry: b.height / 2 + 26 };
  }
  function setRing(on) {
    if (on === ringOn) return;
    ringOn = on; ringSince = now;
    const session = ++ringSession;
    if (on) {
      const n = w < 640 ? 14 : w < 980 ? 26 : 58;
      slots = new Array(crew.length - (w >= 980 || !ringBtn ? 1 : 0) + n).fill(null); // on the globe the red lead is the nucleus, not a slot
      for (let i = 0; i < n; i++) {
        const c = cursor();
        c.r = rand(0.9, 1.1);
        crowd.push(c);
        setTimeout(() => { if (ringOn && session === ringSession) setMode(c, "orbit"); }, 600 + i * 40); // stream in, one after another (a stale timer from an earlier visit does nothing)
      }
    } else {
      crowd.forEach((c) => { const p = edgePoint(60); setMode(c, "leave", p.x, p.y); });
      slots = [];
      crew.forEach((c) => { if (c.mode === "orbit") wander(c); });
      temps.forEach((c) => { if (c.mode === "orbit") leave(c); });
    }
  }
  function ringTarget(c) {
    const g = geo || (geo = ringCentre());
    const i = c.gslot, n = slots.length;
    c.gi = -1; c.depth = 0.8; c.sc = 1;
    if (!g.globe) {
      const ang = (i / n) * Math.PI * 2 + (now - ringSince) * 0.55;
      const k = c.r * (1 + 0.04 * Math.sin(now * 2 + i));
      c.tx = g.x + Math.cos(ang) * g.rx * k;
      c.ty = g.y + Math.sin(ang) * g.ry * k;
      return;
    }
    const q = slotPos(g, sphereOf(n).pts[i]);
    c.gi = i; c.depth = q.d;
    c.sc = 0.6 + 0.55 * c.depth;
    c.tx = q.x - BODY[0] * c.sc; c.ty = q.y - BODY[1] * c.sc; // the arrow's body, not its tip, sits on the node
  }
  function globeRadius(g) { // the element condenses outward from a tight core, then breathes
    return g.r * (0.3 + 0.7 * easeOut(clamp((now - ringSince) / 2.4, 0, 1))) * (1 + 0.025 * Math.sin(now * 1.7));
  }
  function slotPos(g, [px, py, pz]) {
    const yaw = (now - ringSince) * 0.42, cy = Math.cos(yaw), sy = Math.sin(yaw);
    return project(g, px * cy + pz * sy, py, -px * sy + pz * cy);
  }
  const ARROW = (g) => {
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(0, 16); g.lineTo(4.3, 12.3); g.lineTo(7, 18.2);
    g.lineTo(9.6, 17.1); g.lineTo(6.9, 11.2); g.lineTo(12, 11.2); g.closePath();
  };
  const SPR = 3, PADS = 16; // sprite resolution (crisp up to ~1.3x on 2x screens) and glow margin
  function arrowSprite(fill, glowCol, blur) { // drawn once; the blur is baked in
    const cv = document.createElement("canvas");
    cv.width = (12 + PADS * 2) * SPR; cv.height = (18.2 + PADS * 2) * SPR;
    const g = cv.getContext("2d");
    g.scale(SPR, SPR); g.translate(PADS, PADS);
    ARROW(g);
    g.shadowColor = glowCol; g.shadowBlur = blur * SPR; g.fillStyle = fill; g.fill(); g.fill();
    g.shadowBlur = 0; g.strokeStyle = "rgba(0, 0, 0, 0.55)"; g.lineWidth = 1; g.stroke();
    return cv;
  }
  const blueArrow = arrowSprite("#a9caff", `rgba(${CYAN}, 1)`, 11);
  const redArrow = arrowSprite("#ff3341", "rgba(255, 51, 65, 0.9)", 14);
  const BODY = [4, 8]; // centre of the arrow's body, relative to its tip (unscaled px)
  const node = (c) => [c.x + BODY[0] * (c.sc || 1), c.y + BODY[1] * (c.sc || 1)];
  function nucleusTarget(c) { // dead centre, slightly larger, breathing
    c.gi = -1; c.depth = 0.5; c.sc = 1.25 + 0.06 * Math.sin(now * 2.4);
    c.tx = geo.x - BODY[0] * c.sc; c.ty = geo.y - BODY[1] * c.sc;
  }
  function project(g, x, y, z) { // view tilt + perspective; d = 0 far side, 1 near side
    const y2 = y * Math.cos(TILT) - z * Math.sin(TILT), z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
    const p = FOCAL / (FOCAL - z2);
    return { x: g.x + x * g.R * p, y: g.y + y2 * g.R * p, d: clamp((z2 + 1) / 2, 0, 1) };
  }
  function drawGlobe(all) { // hologram: core glow, rim light, glowing struts, a glow dot under every node
    if (!ringOn || !geo || !geo.globe || !geo.R) return;
    const age = now - ringSince, fade = clamp((age - 1.2) / 1.4, 0, 1);
    if (!fade) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flick = 1 + 0.08 * Math.sin(now * 3.1) + 0.04 * Math.sin(now * 7.3); // faint energy flicker
    // core glow + rim light, pre-rendered once and scaled; the flicker only touches the core
    const S = geo.R * 1.5;
    ctx.globalAlpha = fade; ctx.drawImage(rimSprite, geo.x - S, geo.y - S, S * 2, S * 2);
    ctx.globalAlpha = fade * flick; ctx.drawImage(coreSprite, geo.x - S, geo.y - S, S * 2, S * 2);
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";
    const nodes = [];
    all.forEach((c) => { if (c.mode === "orbit" && c.gi >= 0 && now - c.t0 > 1.2) nodes[c.gi] = c; });
    if (lattice) { // struts batched into a few brightness buckets: ~12 strokes a frame instead of hundreds
      const NB = 6, buckets = Array.from({ length: NB }, () => []);
      lattice.links.forEach(([i, j]) => {
        const A = nodes[i], B = nodes[j];
        if (!A || !B) return;
        const k = Math.min(A.a, B.a) * (0.07 + 0.42 * ((A.depth + B.depth) / 2) ** 2);
        buckets[Math.min(NB - 1, Math.floor((k / 0.49) * NB))].push(A, B);
      });
      buckets.forEach((list, bi) => {
        if (!list.length) return;
        const k = fade * ((bi + 0.5) / NB) * 0.49;
        for (const [wid, mul] of [[3, 0.18], [1, 1]]) { // wide faint bloom pass, then the thin bright core
          ctx.beginPath();
          for (let q = 0; q < list.length; q += 2) { const a = node(list[q]), b = node(list[q + 1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
          ctx.strokeStyle = `rgba(${CYAN}, ${k * mul})`; ctx.lineWidth = wid; ctx.stroke();
        }
      });
    }
    all.forEach((c) => {
      if (c.mode !== "orbit" || c.a < 0.05) return;
      const r = (c.nucleus ? 34 : 12 + 22 * (c.depth ?? 0.8)) * (c.nucleus ? 1 + 0.12 * Math.sin(now * 2.4) : 1);
      ctx.globalAlpha = c.nucleus ? fade * c.a * 0.9 : fade * c.a * (0.35 + 0.65 * (c.depth ?? 0.8));
      const [nx, ny] = node(c);
      ctx.drawImage(c.nucleus ? redSprite : sprite, nx - r, ny - r, r * 2, r * 2); // centred on the arrow body, not its tip
    });
    ctx.restore();
  }

  /* ----------------------------------------------------------- tick */
  // Hop planner: instead of one long glide, a bot darts to an intermediate point part of the way there,
  // slightly off the straight line, then corrects course; close to the target it locks on exactly.
  function hop(c) {
    const cfg = HOPS[c.mode];
    const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
    if (!cfg || d < 44) { c.hx = c.tx; c.hy = c.ty; return; }
    if (now < c.pause) return;
    const reached = Math.hypot(c.hx - c.x, c.hy - c.y) < 10;
    if (!reached && now < c.hopT) return;
    if (reached && cfg[2] && c.pause < c.hopT) { c.pause = now + rand(0.02, cfg[2]); c.hopT = c.pause; return; } // tiny scan pause
    const L = clamp(d * rand(cfg[0], cfg[1]), 40, 240);
    const ux = dx / d, uy = dy / d, side = rand(-0.28, 0.28) * L;
    c.hx = c.x + ux * L - uy * side;
    c.hy = c.y + uy * L + ux * side;
    c.hopT = now + 0.32;
  }
  function integrate(c, dt) {
    const om = OMEGA[c.mode] || 4, z = ZETA[c.mode] ?? 1;
    hop(c);
    // hover noise (Ornstein-Uhlenbeck): a restless drift of a few px that never fully settles
    const sig = JITTER[c.mode] || 0;
    c.nx += -6 * c.nx * dt + sig * Math.sqrt(dt) * randn();
    c.ny += -6 * c.ny * dt + sig * Math.sqrt(dt) * randn();
    if (!sig) { c.nx *= 0.8; c.ny *= 0.8; }
    const gx = c.hx + c.nx, gy = c.hy + c.ny;
    const steps = Math.ceil(dt / (1 / 120));
    const s = dt / steps;
    for (let i = 0; i < steps; i++) { // spring per mode: nanobot-stiff while building, soft glide otherwise
      c.vx += (om * om * (gx - c.x) - 2 * z * om * c.vx) * s;
      c.vy += (om * om * (gy - c.y) - 2 * z * om * c.vy) * s;
      c.x += c.vx * s;
      c.y += c.vy * s;
    }
    c.trail.push(c.x, c.y);
    if (c.trail.length > 16) c.trail.splice(0, 2);
  }

  // The frame's moving corner is wherever the cursor tip is (it never runs ahead of it, never shrinks).
  // An axis whose end is off screen (cursor clamped to the edge) keeps to the eased schedule instead.
  function pull(c, job) {
    const f = frameOf(job.el);
    if (job.done) job.px = job.py = 1;
    else {
      const pt = easeOut(clamp((now - job.td) / job.drag, 0, 1));
      const yOff = f.y + f.h > h - 8 || f.y < 8;
      job.px = Math.max(job.px, clamp((c.x - f.x) / Math.max(1, f.w), 0, 1));
      job.py = yOff ? Math.max(job.py, pt) : Math.max(job.py, clamp((c.y - f.y) / Math.max(1, f.h), 0, 1));
      // the spring settles asymptotically: once the cursor is within 1.5px of the far corner, it's there
      // (or soon after, if the page scrolling under it keeps the corner moving)
      const there = (1 - job.px) * f.w < 1.5 && (yOff || (1 - job.py) * f.h < 1.5);
      if (pt >= 1 && (there || now - job.td > job.drag + 0.35)) job.px = job.py = 1;
    }
    job.p = Math.min(job.px, job.py);
    if (job.p >= 1) { job.state = "built"; job.tBuilt = now; setMode(c, "hold"); c.click = now; }
  }
  function step(c, dt) {
    const job = c.job;
    if (c.mode === "travel") {
      const f = frameOf(job.el);
      c.tx = f.x; c.ty = f.y;
      const d = Math.hypot(c.x - f.x, c.y - f.y);
      const prevReady = !job.prev || job.prev.done || job.prev.p >= 0.5;
      if (prevReady && (d < 16 || now - c.t0 > 0.55)) { // latch on even if the page is scrolling under it
        setMode(c, "drag"); c.click = now; job.state = "drag"; job.td = now;
        job.drag = 0.22 + 0.33 * clamp(Math.sqrt(f.w * f.h) / 420, 0, 1); // small parts are quick
      }
    } else if (c.mode === "drag") {
      const f = frameOf(job.el);
      // the eased path only steers the cursor; the frame itself is sized from the cursor (after integrate)
      const pt = job.done ? 1 : easeOut(clamp((now - job.td) / job.drag, 0, 1));
      c.tx = f.x + f.w * pt;
      c.ty = clamp(f.y + f.h * pt, 8, h - 8);
    } else if (c.mode === "hold") {
      if (now - job.tBuilt >= HOLD && (!job.prev || job.prev.done)) {
        finish(job);
        if (job.caret && now < job.tShow + job.extra) setMode(c, "type"); else release(c);
      }
    } else if (c.mode === "type") { // I-beam rides along with the text caret
      if (!job.caret.isConnected || now > job.tShow + job.extra - 0.2) release(c);
      else {
        const r = job.caret.getBoundingClientRect();
        c.tx = r.right + 3; c.ty = r.top + r.height / 2 - 7;
      }
    } else if (c.mode === "swarm") {
      if (now - c.t0 > 0.6) setMode(c, "idle");
    }
    if (free(c)) {
      if (ringOn && now - ringSince > 1.4 && (!c.temp || freeSlot())) setMode(c, "orbit"); // everyone free joins the globe
      else if (c.temp) { if (now > c.next) leave(c); }
      else if (now > c.next) wander(c);
    }
    integrate(c, dt);
    if (c.mode === "drag") pull(c, job);
    if (c.mode === "orbit") { // once arrived, lock onto the moving globe node so the shape stays crisp
      const k = clamp((now - c.t0 - 1.1) / 1.3, 0, 1) * clamp((now - reshuffle) / 1.1, 0.06, 1); // glide if a seat was added
      c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k;
      c.vx *= 1 - k; c.vy *= 1 - k;
    }
    const target = c.mode === "wait" ? 0 : c.mode === "leave" ? 0 : free(c) ? (c.temp ? 0.7 : 0.4)
      : c.mode === "orbit" ? (c.nucleus ? 1 : 0.22 + 0.73 * (c.depth ?? 0.8)) : 0.95;
    c.a += (target - c.a) * Math.min(1, dt * 6);
  }

  /* ----------------------------------------------------------- draw */
  function tag(text, x, y, alpha, small = false) {
    ctx.font = small ? "600 9px Inter, system-ui, sans-serif" : "600 10px Inter, system-ui, sans-serif";
    const tw = ctx.measureText(text).width + (small ? 8 : 10);
    const th = small ? 13 : 14;
    ctx.fillStyle = `rgba(${BLUE}, ${0.95 * alpha})`;
    ctx.fillRect(x, y, tw, th);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillText(text, x + (small ? 4 : 5), y + th - (small ? 3.5 : 3.5));
    return tw;
  }

  function drawSlab(el, grow, alpha) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const sw = r.width * grow, sh = r.height * grow;
    const x = Math.round(r.left) + 0.5, y = Math.round(r.top) + 0.5;
    const g = ctx.createLinearGradient(x, y, x + sw, y + sh);
    g.addColorStop(0, `rgba(118, 138, 170, ${0.92 * alpha})`);
    g.addColorStop(1, `rgba(70, 86, 116, ${0.92 * alpha})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, sw, sh);
    ctx.strokeStyle = `rgba(${BLUE}, ${0.9 * alpha})`;
    ctx.strokeRect(x, y, sw, sh);
    if (grow < 1) return;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * alpha})`; // centre guide, like a fresh image frame
    ctx.beginPath();
    ctx.moveTo(x + sw / 2, y); ctx.lineTo(x + sw / 2, y + sh);
    ctx.stroke();
  }

  function drawFrame(job) {
    const f = frameOf(job.el);
    if (f.y > h + 40 || f.y + f.h < -40) return;
    const fade = job.done ? clamp(1 - (now - job.tShow - job.extra) / FADE, 0, 1) : 1;
    if (fade <= 0) return;
    const dragging = job.state === "drag";
    const fw = f.w * job.px, fh = f.h * job.py; // corner = cursor tip while dragging
    const x = Math.round(f.x) + 0.5, y = Math.round(f.y) + 0.5;
    ctx.lineWidth = 1;
    if (dragging) { // alignment guides flash while the frame is drawn
      ctx.strokeStyle = `rgba(${BLUE}, 0.22)`;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.moveTo(0, y + fh); ctx.lineTo(w, y + fh);
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(${BLUE}, ${(job.row ? 0.16 : 0.07) * fade})`;
    ctx.fillRect(x, y, fw, fh);
    if (job.row) { // highlight bar: a solid leading edge sweeping across the row
      ctx.fillStyle = `rgba(${BLUE}, ${0.9 * fade})`;
      ctx.fillRect(x, y + fh - 2, fw, 2);
    }
    // slabs grow in with the frame and fade last, so content appears to fade in under them
    const slabFade = job.done ? clamp(1 - (now - job.tShow) / (FADE + 0.25), 0, 1) : 1;
    job.slabs.forEach((el) => drawSlab(el, dragging ? job.p : 1, slabFade));
    if (job.subs.length) { // every small part gets its own outline
      ctx.strokeStyle = `rgba(${BLUE}, ${0.6 * slabFade * job.p})`;
      job.subs.forEach((el) => {
        const r = el.getBoundingClientRect();
        ctx.strokeRect(Math.round(r.left) + 0.5, Math.round(r.top) + 0.5, r.width, r.height);
      });
    }
    ctx.strokeStyle = `rgba(${BLUE}, ${0.9 * fade})`;
    ctx.strokeRect(x, y, fw, fh);
    if (fw > 70) tag(`${Math.round(fw)} × ${Math.round(fh)}`, x + fw / 2 - 26, y + fh + 4, fade * (dragging ? 1 : 0.85), true);
    if (dragging) return;
    ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
    ctx.strokeStyle = `rgba(${BLUE}, ${0.9 * fade})`;
    for (const [hx, hy] of [[x, y], [x + fw, y], [x, y + fh], [x + fw, y + fh]]) {
      ctx.fillRect(hx - 2.5, hy - 2.5, 5, 5);
      ctx.strokeRect(hx - 2.5, hy - 2.5, 5, 5);
    }
    tag(job.tag, x - 0.5, y - 17, fade);
  }

  function drawTrail(c) { // thin streak behind a fast dash, fading towards the tail
    const t = c.trail, n = t.length / 2;
    const speed = Math.hypot(c.vx, c.vy);
    if (c.a < 0.05 || n < 3 || speed < 260 || c.mode !== "travel") return; // only the dash to a job streaks
    const k = clamp((speed - 260) / 900, 0, 1) * c.a;
    ctx.lineCap = "round";
    for (let i = 1; i < n; i++) {
      ctx.strokeStyle = `rgba(${BLUE}, ${(i / n) * 0.55 * k})`;
      ctx.lineWidth = 0.6 + (i / n) * 1.2;
      ctx.beginPath();
      ctx.moveTo(t[(i - 1) * 2], t[(i - 1) * 2 + 1]);
      ctx.lineTo(t[i * 2], t[i * 2 + 1]);
      ctx.stroke();
    }
  }

  function drawCursor(c) {
    if (c.a < 0.02) return;
    if (c.mode === "orbit" && geo && geo.globe) { // globe node: one cached, pre-glowed sprite
      const sc = c.sc || 1, spr = c.red ? redArrow : blueArrow;
      ctx.globalAlpha = c.a;
      ctx.drawImage(spr, c.x - PADS * sc, c.y - PADS * sc, (spr.width / SPR) * sc, (spr.height / SPR) * sc);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.save();
    const buzz = c.mode === "travel" || c.mode === "hold" ? 0.35 : 0; // nanobot buzz only while on a job
    ctx.translate(c.x + rand(-buzz, buzz), c.y + rand(-buzz, buzz));
    const pulse = now - c.click;
    if (pulse < 0.35) {
      ctx.strokeStyle = `rgba(${BLUE}, ${(1 - pulse / 0.35) * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 3 + pulse * 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (c.mode === "type") { // I-beam text cursor
      ctx.globalAlpha = c.a;
      ctx.lineCap = "round";
      for (const [style, lw] of [["rgba(0, 0, 0, 0.6)", 3.2], ["#f3f3f1", 1.4]]) {
        ctx.strokeStyle = style;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(-3.5, 0); ctx.quadraticCurveTo(0, 0, 0, 2.5); ctx.quadraticCurveTo(0, 0, 3.5, 0);
        ctx.moveTo(0, 2.5); ctx.lineTo(0, 11.5);
        ctx.moveTo(-3.5, 14); ctx.quadraticCurveTo(0, 14, 0, 11.5); ctx.quadraticCurveTo(0, 14, 3.5, 14);
        ctx.stroke();
      }
    } else if (c.mode === "drag") { // crosshair while drawing the frame
      ctx.strokeStyle = `rgba(255, 255, 255, ${c.a})`;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(0, -7); ctx.lineTo(0, 7);
      ctx.stroke();
    } else {
      // lean slightly into the direction of travel
      ctx.rotate(clamp(c.vx / (BUILDING.has(c.mode) ? 5000 : 4000), -0.25, 0.25));
      if (c.mode === "orbit" && c.sc) ctx.scale(c.sc, c.sc); // nearer globe nodes are bigger
      ctx.globalAlpha = c.a;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, 16); ctx.lineTo(4.3, 12.3); ctx.lineTo(7, 18.2);
      ctx.lineTo(9.6, 17.1); ctx.lineTo(6.9, 11.2); ctx.lineTo(12, 11.2); ctx.closePath();
      ctx.fillStyle = c.red ? "#ff3341" : "#f3f3f1";
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  let last = 0;
  function frame(t) {
    now = t / 1000;
    const dt = Math.min(0.05, last ? now - last : 0.016);
    last = now;
    if (!heroStarted && !root.classList.contains("intro-active")) heroStart();
    assign();
    geo = ringOn ? ringCentre() : null;
    // on the globe the red lead is the nucleus, not a lattice node
    if (geo) geo.R = geo.globe ? globeRadius(geo) : 0;
    crew.concat(crowd, temps).forEach((c) => {
      c.nucleus = !!(c.red && c.mode === "orbit" && geo && geo.globe);
      if (c.mode !== "orbit") return;
      if (c.nucleus) { if (c.gslot != null) { slots[c.gslot] = null; c.gslot = null; } nucleusTarget(c); return; }
      if (c.gslot == null) seat(c, geo);
      if (c.gslot == null) { leave(c); return; } // only a stray agent can miss out, and it flies off
      ringTarget(c);
    });
    crew.forEach((c, i) => { c.slot = i; step(c, dt); });
    for (let i = temps.length - 1; i >= 0; i--) {
      const c = temps[i];
      step(c, dt);
      if (c.mode === "leave" && c.a < 0.03) temps.splice(i, 1);
    }
    for (let i = crowd.length - 1; i >= 0; i--) {
      const c = crowd[i];
      step(c, dt);
      if (c.mode === "leave" && c.a < 0.03) crowd.splice(i, 1);
    }
    for (let i = jobs.length - 1; i >= 0; i--) {
      const j = jobs[i];
      if (j.done && j.state === "built" && now - j.tShow - j.extra > FADE + 0.3) jobs.splice(i, 1);
    }
    ctx.clearRect(0, 0, w, h);
    jobs.forEach((j) => { if (j.state === "drag" || j.state === "built") drawFrame(j); });
    crowd.forEach(drawTrail); temps.forEach(drawTrail); crew.forEach(drawTrail);
    const all = [...crowd, ...temps, ...crew];
    drawGlobe(all);
    // globe nodes back to front, everything else on top (stable sort keeps the old order)
    all.sort((a, b) => (a.mode === "orbit" ? a.depth ?? 1 : 2) - (b.mode === "orbit" ? b.depth ?? 1 : 2)).forEach(drawCursor);
    raf = requestAnimationFrame(frame);
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeCrew();
  }
  function start() { if (!raf && !off && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  if (contact) {
    new IntersectionObserver(([e]) => setRing(e.isIntersecting && heroStarted), { threshold: 0.45 }).observe(contact);
  }
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stop(); flush(); } else start();
  });
  reducedMotion.addEventListener("change", (e) => {
    if (!e.matches) return;
    off = true; stop(); flush(); canvas.remove();
  });
  resize();
  start();
  return request;
}
