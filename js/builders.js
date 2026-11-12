/* Builder cursors: a small crew of cursors that "build" the page (reference video 4).
   Every reveal is a job: a cursor glides to the element, drags a blueprint frame around it
   (crosshair while dragging), the frame snaps handles + a tag, then the content appears.
   Everything is a job, navbar and decor included; a part waits for its unbuilt container.
   Building never queues: when no crew cursor is free (or the nearest is far), an extra agent streams
   in from the nearest side and leaves when done, so scrolling is built continuously. Anything that
   has already left the screen is snapped in without a cursor.
   Hero: after the intro the crew swarms in, then the whole first screen is built part by part.
   Contact: a bigger crowd gathers and circles in a slowly turning ring (end of the reference).
   Motion is spring-driven (critically damped), so speed always changes smoothly.
   Text is typed into its frame (typer.js) while the cursor, now an I-beam, follows the caret; the frame
   stays up until the typing ends. Rows get a highlight bar, media gets a placeholder slab the content
   fades in under, and every drag flashes alignment guides + a live size tag.
   Canvas only, no dependencies. Off for reduced motion; content never waits on it (3s failsafe). */

const BLUE = "76, 141, 255";
const PAD = 6;
const HOLD = 0.12; // s, pause on a finished frame before the content appears
const FADE = 0.55; // s, frame fade-out
const MAX_WAIT = 1.2; // s a job may queue (only when the agent cap is hit) before it snaps in
const GAP = 0.1; // s between two jobs starting: the page is built one part at a time, quickly
const GAP_BUSY = 0.04; // ...and faster when a backlog builds up while scrolling
const FAR = 650; // px: a free crew cursor further than this loses the job to a fresh agent
const ROWS = ".project, .timeline > li, .nav"; // drawn as a highlight bar sweeping across
const SLABS = ".like__art"; // placeholder slabs inside a frame (an <img> job is its own slab)
const SUBS = ".key"; // small parts outlined inside a frame (keycaps)
const TAGS = [ // frame tag per element role, most specific first
  [".nav", "navbar"], [".nav__logo", "logo"], [".nav__links > li", "link"], [".nav__toggle", "menu"],
  [".hero__grid", "grid"], [".cross", "marker"], [".marquee", "marquee"],
  [".label", "label"], ["h1 *, h2, .hero__row", "heading"], ["h3, .project__name", "title"],
  [".project__n", "index"], [".project__when, .timeline__when", "date"], [".project__plus", "icon"],
  [".project", "project"], [".timeline > li", "entry"], [".btn, .sound", "button"], [".kb-stage", "keyboard"],
  [".skill-card", "card"], ["img", "image"], [".facts > div", "fact"], [".hero__meta li", "fact"],
  [".footer__inner > *", "footer"], ["p, ul", "text"],
];
// spring stiffness per mode (rad/s): low = lazy glide, high = tight follow
const OMEGA = { wait: 4, wander: 1.6, swarm: 5, travel: 12, drag: 26, hold: 10, type: 18, idle: 3, orbit: 3.2, leave: 2.2 };

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
  const cap = () => (w < 640 ? 22 : 40); // most cursors on screen at once
  let w = 0, h = 0, dpr = 1, raf = 0, now = 0, off = false;
  let built = 0, heroStarted = false, lastStart = -9, lastJob = null;
  let ringOn = false, ringSince = 0;
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
    return { x: p.x, y: p.y, vx: 0, vy: 0, tx: p.x, ty: p.y, a: 0, mode: "wait", job: null, t0: 0, next: 0, click: -9, red, slot: 0, r: 1 };
  }
  function makeCrew() {
    const n = w < 640 ? 6 : 10;
    while (crew.length < n) crew.push(cursor(crew.length === 0));
    crew.length = n;
  }
  function setMode(c, mode, tx, ty) {
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
    job.state = "built"; job.p = 1; job.tBuilt = now;
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
      el, cb, state: "queued", tq: now, notBefore, p: 0, done: false, tShow: 0, extra: 0, caret: null,
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

  /* ----------------------------------------------------------- contact ring */
  // Wide screens: a circle in the empty space beside the title. Narrow: an ellipse around the email button.
  function ringCentre() {
    if (w >= 980 || !ringBtn) {
      const r = ringAnchor ? ringAnchor.getBoundingClientRect() : { left: 0, right: w, top: h / 2, bottom: h / 2 };
      const R = Math.min(150, w * 0.1);
      return { x: Math.min(w - R - 40, Math.max(r.right + R + 40, w * 0.78)), y: (r.top + r.bottom) / 2, rx: R, ry: R };
    }
    const b = ringBtn.getBoundingClientRect();
    return { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2, rx: b.width / 2 + 10, ry: b.height / 2 + 26 };
  }
  function setRing(on) {
    if (on === ringOn) return;
    ringOn = on; ringSince = now;
    if (on) {
      const n = w < 640 ? 14 : 26;
      for (let i = 0; i < n; i++) {
        const c = cursor();
        c.r = rand(0.9, 1.1);
        crowd.push(c);
        setTimeout(() => { if (ringOn) setMode(c, "orbit"); }, 600 + i * 45); // stream in, one after another
      }
    } else {
      crowd.forEach((c) => { const p = edgePoint(60); setMode(c, "leave", p.x, p.y); });
      crew.forEach((c) => { if (c.mode === "orbit") wander(c); });
    }
  }
  function ringTarget(c, i, n) {
    const { x, y, rx, ry } = ringCentre();
    const ang = (i / n) * Math.PI * 2 + (now - ringSince) * 0.55;
    const k = c.r * (1 + 0.04 * Math.sin(now * 2 + i));
    c.tx = x + Math.cos(ang) * rx * k;
    c.ty = y + Math.sin(ang) * ry * k;
  }

  /* ----------------------------------------------------------- tick */
  function integrate(c, dt) {
    const om = OMEGA[c.mode] || 4;
    const steps = Math.ceil(dt / (1 / 120));
    const s = dt / steps;
    for (let i = 0; i < steps; i++) { // critically damped spring: smooth start, smooth stop
      c.vx += (om * om * (c.tx - c.x) - 2 * om * c.vx) * s;
      c.vy += (om * om * (c.ty - c.y) - 2 * om * c.vy) * s;
      c.x += c.vx * s;
      c.y += c.vy * s;
    }
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
      job.p = job.done ? 1 : easeOut(clamp((now - job.td) / job.drag, 0, 1));
      c.tx = f.x + f.w * job.p;
      c.ty = clamp(f.y + f.h * job.p, 8, h - 8);
      if (job.p >= 1) { job.state = "built"; job.tBuilt = now; setMode(c, "hold"); c.click = now; }
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
      if (c.temp) { if (now > c.next) leave(c); }
      else if (ringOn && now - ringSince > 1.4) setMode(c, "orbit");
      else if (now > c.next) wander(c);
    }
    integrate(c, dt);
    const target = c.mode === "wait" ? 0 : c.mode === "leave" ? 0 : free(c) ? (c.temp ? 0.7 : 0.4) : c.mode === "orbit" ? 0.8 : 0.95;
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
    const fw = f.w * job.p, fh = f.h * job.p;
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

  function drawCursor(c) {
    if (c.a < 0.02) return;
    ctx.save();
    ctx.translate(c.x, c.y);
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
      ctx.rotate(clamp(c.vx / 4000, -0.25, 0.25));
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
    crew.forEach((c, i) => { c.slot = i; if (c.mode === "orbit") ringTarget(c, i, crew.length + crowd.length); step(c, dt); });
    for (let i = temps.length - 1; i >= 0; i--) {
      const c = temps[i];
      step(c, dt);
      if (c.mode === "leave" && c.a < 0.03) temps.splice(i, 1);
    }
    for (let i = crowd.length - 1; i >= 0; i--) {
      const c = crowd[i];
      if (c.mode === "orbit") ringTarget(c, crew.length + i, crew.length + crowd.length);
      step(c, dt);
      if (c.mode === "leave" && c.a < 0.03) crowd.splice(i, 1);
    }
    for (let i = jobs.length - 1; i >= 0; i--) {
      const j = jobs[i];
      if (j.done && j.state === "built" && now - j.tShow - j.extra > FADE + 0.3) jobs.splice(i, 1);
    }
    ctx.clearRect(0, 0, w, h);
    jobs.forEach((j) => { if (j.state === "drag" || j.state === "built") drawFrame(j); });
    crowd.forEach(drawCursor);
    temps.forEach(drawCursor);
    crew.forEach(drawCursor);
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
