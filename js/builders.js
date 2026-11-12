/* Builder cursors: a small crew of cursors that "build" the page (reference video 4).
   Every reveal is a job: a cursor glides to the element, drags a blueprint frame around it
   (crosshair while dragging), the frame snaps handles + a tag, then the content appears.
   Hero: after the intro the crew swarms in, then frames the hero while it rises.
   Contact: a bigger crowd gathers and circles in a slowly turning ring (end of the reference).
   Motion is spring-driven (critically damped), so speed always changes smoothly.
   Canvas only, no dependencies. Off for reduced motion; content never waits on it (3s failsafe). */

const BLUE = "76, 141, 255";
const PAD = 6;
const DRAG = 0.5; // s, frame drag
const HOLD = 0.14; // s, pause on a finished frame before the content appears
const FADE = 0.6; // s, frame fade-out
const MAX_WAIT = 1; // s a job may queue before it is built without a cursor
const HERO_TARGETS = [".hero__hello", ".hero__row:nth-child(1)", ".hero__row:nth-child(2)", ".hero__lede", ".hero__actions", ".hero__meta"];
// spring stiffness per mode (rad/s): low = lazy glide, high = tight follow
const OMEGA = { wait: 4, wander: 1.6, swarm: 4.5, travel: 6.5, drag: 22, hold: 10, idle: 3, orbit: 3.2, leave: 2.4 };

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
  const hud = document.createElement("p");
  hud.className = "build-hud";
  hud.setAttribute("aria-hidden", "true");
  const hudText = document.createElement("span");
  hud.appendChild(hudText);
  document.body.append(canvas, hud);

  const root = document.documentElement;
  const heroEls = HERO_TARGETS.map((s) => document.querySelector(s)).filter(Boolean);
  const contact = document.getElementById("contact");
  const ringAnchor = document.querySelector(".contact__title");
  const ringBtn = document.getElementById("email-link");
  const total = document.querySelectorAll(".reveal").length + heroEls.length;
  let w = 0, h = 0, dpr = 1, raf = 0, now = 0, off = false;
  let built = 0, heroStarted = false, lastBusy = 0, hudLabel = "";
  let ringOn = false, ringSince = 0;
  const jobs = [];
  const crew = []; // permanent builders
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
    const n = w < 640 ? 4 : 6;
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
  const free = (c) => c.mode === "idle" || c.mode === "wander";

  /* ----------------------------------------------------------- jobs */
  function frameOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
  }
  function finish(job) {
    if (job.done) return;
    job.done = true;
    built++;
    if (job.cb) job.cb();
  }
  function snap(job) {
    job.state = "built"; job.p = 1; job.tBuilt = now;
    finish(job);
  }
  function flush() {
    jobs.forEach(finish);
    jobs.length = 0;
  }
  const arm = (job) => setTimeout(() => finish(job), 3000); // content never waits on the animation

  function request(el, cb, notBefore = 0) {
    if (off || document.hidden) { built++; if (cb) cb(); return; }
    const job = { el, cb, state: "queued", tq: now, notBefore, p: 0, done: false, tag: (el.dataset.build || el.tagName).toLowerCase() };
    jobs.push(job);
    if (heroStarted) arm(job); // otherwise armed when the intro hands over
    start();
  }

  function assign() {
    if (!heroStarted) return; // nothing gets built behind the intro
    for (const job of jobs) {
      if (job.state !== "queued" || now < job.notBefore) continue;
      const f = frameOf(job.el);
      let best = null, bestD = Infinity;
      for (const c of crew) {
        if (!free(c) && c.mode !== "orbit") continue;
        const d = Math.hypot(c.x - f.x, c.y - f.y);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (best) {
        job.state = "assigned";
        best.job = job;
        setMode(best, "travel");
      } else if (now - Math.max(job.tq, job.notBefore) > MAX_WAIT) {
        snap(job); // scrolling faster than the crew: snap the frame in
      }
    }
  }

  function heroStart() {
    heroStarted = true;
    jobs.forEach((j) => { j.notBefore = Math.max(j.notBefore, now + 0.7); arm(j); }); // queued during the intro
    crew.forEach((c) => setMode(c, "swarm", w * 0.5 + rand(-70, 70), h * 0.5 + rand(-45, 45)));
    heroEls.forEach((el, i) => request(el, null, now + 0.7 + i * 0.06));
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
      if ((d < 6 && Math.hypot(c.vx, c.vy) < 220) || now - c.t0 > 1.6) {
        setMode(c, "drag"); c.click = now; job.state = "drag"; job.td = now;
      }
    } else if (c.mode === "drag") {
      const f = frameOf(job.el);
      job.p = job.done ? 1 : easeOut(clamp((now - job.td) / DRAG, 0, 1));
      c.tx = f.x + f.w * job.p;
      c.ty = clamp(f.y + f.h * job.p, 8, h - 8);
      if (job.p >= 1) { job.state = "built"; job.tBuilt = now; setMode(c, "hold"); c.click = now; }
    } else if (c.mode === "hold") {
      if (now - job.tBuilt >= HOLD) { finish(job); c.job = null; setMode(c, "idle"); c.next = now + rand(0.3, 1); }
    } else if (c.mode === "swarm") {
      if (now - c.t0 > 0.9) setMode(c, "idle");
    }
    if (free(c)) {
      if (ringOn && now - ringSince > 1.4) setMode(c, "orbit");
      else if (now > c.next) wander(c);
    }
    integrate(c, dt);
    const target = c.mode === "wait" ? 0 : c.mode === "leave" ? 0 : free(c) ? 0.5 : c.mode === "orbit" ? 0.8 : 0.95;
    c.a += (target - c.a) * Math.min(1, dt * 6);
  }

  /* ----------------------------------------------------------- draw */
  function drawFrame(job) {
    const f = frameOf(job.el);
    if (f.y > h + 40 || f.y + f.h < -40) return;
    const fade = job.state === "built" ? clamp(1 - (now - job.tBuilt - HOLD) / FADE, 0, 1) : 1;
    if (fade <= 0) return;
    const fw = f.w * job.p, fh = f.h * job.p;
    const x = Math.round(f.x) + 0.5, y = Math.round(f.y) + 0.5;
    ctx.fillStyle = `rgba(${BLUE}, ${0.07 * fade})`;
    ctx.fillRect(x, y, fw, fh);
    ctx.strokeStyle = `rgba(${BLUE}, ${0.9 * fade})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, fw, fh);
    if (job.state !== "built") return;
    ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
    for (const [hx, hy] of [[x, y], [x + fw, y], [x, y + fh], [x + fw, y + fh]]) {
      ctx.fillRect(hx - 2.5, hy - 2.5, 5, 5);
      ctx.strokeRect(hx - 2.5, hy - 2.5, 5, 5);
    }
    ctx.font = "600 10px Inter, system-ui, sans-serif";
    const tw = ctx.measureText(job.tag).width + 10;
    ctx.fillStyle = `rgba(${BLUE}, ${0.95 * fade})`;
    ctx.fillRect(x - 0.5, y - 17, tw, 14);
    ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
    ctx.fillText(job.tag, x + 4.5, y - 6.5);
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
    if (c.mode === "drag") { // crosshair while drawing the frame
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

  function updateHud() {
    const busy = jobs.some((j) => j.state !== "built");
    if (busy) lastBusy = now;
    const label = built >= total ? `Built · ${total}/${total}` : `Building · ${built}/${total}`;
    if (label !== hudLabel) { hudLabel = label; hudText.textContent = label; }
    hud.classList.toggle("is-on", now - lastBusy < 1.2);
  }

  let last = 0;
  function frame(t) {
    now = t / 1000;
    const dt = Math.min(0.05, last ? now - last : 0.016);
    last = now;
    if (!heroStarted && !root.classList.contains("intro-active")) heroStart();
    assign();
    crew.forEach((c, i) => { c.slot = i; if (c.mode === "orbit") ringTarget(c, i, crew.length + crowd.length); step(c, dt); });
    for (let i = crowd.length - 1; i >= 0; i--) {
      const c = crowd[i];
      if (c.mode === "orbit") ringTarget(c, crew.length + i, crew.length + crowd.length);
      step(c, dt);
      if (c.mode === "leave" && c.a < 0.03) crowd.splice(i, 1);
    }
    for (let i = jobs.length - 1; i >= 0; i--) {
      const j = jobs[i];
      if (j.state === "built" && now - j.tBuilt > HOLD + FADE) jobs.splice(i, 1);
    }
    ctx.clearRect(0, 0, w, h);
    jobs.forEach((j) => { if (j.state === "drag" || j.state === "built") drawFrame(j); });
    crowd.forEach(drawCursor);
    crew.forEach(drawCursor);
    updateHud();
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
    off = true; stop(); flush(); canvas.remove(); hud.remove();
  });
  resize();
  start();
  return request;
}
