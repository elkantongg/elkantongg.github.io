/* Lanyard: an ID badge on a strap that drops into the hero's empty right side (reference: Elkan's lanyard video).
   - Physics: a tiny Verlet sim. The badge is a rigid two-point body (clasp pivot P + centre C) hanging on an
     elastic tether from an anchor above the viewport, so it falls, bounces, swings and can be dragged and thrown.
     A yaw spring turns the card in 3D (showing its back) when it moves fast; it always settles face-forward.
   - Strap: Verlet rope from the anchor to P.
   - Drawing: js/lanyard3d.js (Three.js) when WebGL is available; otherwise the DOM badge + a 2D canvas strap.
     The DOM badge always follows the card (invisible in 3D) so it stays the hit target and the accessible element.
   - Tap the badge to flip it: the back carries a LinkedIn QR code.
   - Reduced motion: hangs still, no drop, no dragging. */

const root = document.documentElement;
const TEXT = "ELKAN TONG  ✦  @ELKANTONGG  ✦  ";
const N = 16;            // strap nodes
const G = 2600;          // gravity, px/s²
const H = 1 / 120;       // physics step
const K = 2600;          // tether stiffness
const MAX_V = 4200;      // px/s cap when thrown

export function initLanyard(reducedMotion) {
  const layer = document.getElementById("lanyard");
  const hero = document.getElementById("top");
  if (!layer || !hero) return;
  const canvas = layer.querySelector(".lanyard__strap");
  const ctx = canvas.getContext("2d");
  const badge = layer.querySelector(".badge");
  const body = badge.querySelector(".badge__body");
  const faces = Array.from(badge.querySelectorAll(".badge__face"));
  const still = reducedMotion.matches;

  const A = { x: 0, y: -40 };                       // anchor (above the top edge, behind the nav)
  const P = { x: 0, y: 0, px: 0, py: 0 };           // clasp pivot = top centre of the badge
  const C = { x: 0, y: 0, px: 0, py: 0 };           // badge centre
  const rope = Array.from({ length: N + 1 }, () => ({ x: 0, y: 0, px: 0, py: 0 }));
  let L = 200, seg = 12, cardLen = 200, bw = 200, sw = 22, W = 0, Hc = 0, dpr = 1;
  let yaw = 0, yawV = 0, pitch = 0, t = 0, acc = 0, face = 0; // face: 0 front, π back
  let gl = null; // 3D renderer once loaded
  let drag = null, live = false, placed = false;

  const set = (p, x, y) => { p.x = p.px = x; p.y = p.py = y; };
  const rot = (phi, x, y) => { const c = Math.cos(phi), s = Math.sin(phi); return [x * c - y * s, x * s + y * c]; };
  const angle = () => Math.atan2(-(C.x - P.x), C.y - P.y); // 0 = hanging straight down, clockwise positive

  /* ------------------------------------------------------------ layout */
  function measure() {
    const vw = root.clientWidth, vh = window.innerHeight;
    layer.style.removeProperty("--bw");
    const size = () => {
      bw = badge.offsetWidth;
      cardLen = body.offsetTop + body.offsetHeight / 2;
      sw = Math.max(14, bw * 0.105);
      return badge.offsetHeight;
    };
    let bh = size();

    // centre the badge in the blank space right of the name; on narrow screens tuck it top right
    const wrap = hero.querySelector(".wrap").getBoundingClientRect();
    const right = Math.max(...Array.from(hero.querySelectorAll(".hero__row > span")).map((s) => s.getBoundingClientRect().right));
    let ax = Math.min(right + (wrap.right - right) * 0.62, wrap.right - bw / 2); // a little right of centre
    const roomy = ax - bw / 2 > right + 16 && vw > 760;
    if (!roomy) ax = vw - bw / 2 - Math.max(12, vw * 0.04);
    let restTop = roomy ? Math.max(88, vh * 0.42 - bh / 2) : vw > 760 ? 96 : 92;

    // at rest it must not cover the hero buttons: hang above them, shrinking the badge if the screen is short
    const top = layer.getBoundingClientRect().top;
    const act = hero.querySelector(".hero__actions").getBoundingClientRect();
    if (ax + bw / 2 > act.left && ax - bw / 2 < act.right) {
      const floor = act.top - top - 24;
      if (restTop + bh > floor) restTop = Math.max(80, floor - bh);
      if (restTop + bh > floor) {
        layer.style.setProperty("--bw", `${Math.max(150, Math.floor(bw * (floor - restTop) / bh))}px`);
        bh = size();
        if (!roomy) ax = vw - bw / 2 - Math.max(12, vw * 0.04);
      }
    }

    const dx = ax - A.x, dy = 0;
    A.x = ax;
    const newL = restTop - A.y;
    if (placed) [P, C, ...rope].forEach((p) => { p.x += dx; p.px += dx; p.y += dy; p.py += dy; });
    L = newL;
    seg = L / N;

    W = vw; Hc = Math.round(hero.offsetHeight + vh * 0.6);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (gl) gl.resize(W, Hc, dpr);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hc * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${Hc}px`;
    layer.style.height = `${Hc}px`;
  }

  function rest() {
    set(P, A.x, A.y + L);
    set(C, A.x, P.y + cardLen);
    rope.forEach((p, i) => set(p, A.x, A.y + (L * i) / N));
    yaw = yawV = pitch = 0;
  }

  // start hidden above the viewport, a little to the right, already spinning: it falls, the strap catches it
  function dropStart() {
    const sx = A.x + bw * 0.55, sy = A.y - cardLen * 1.5;
    set(P, sx, sy);
    set(C, sx + cardLen * 0.35, sy + cardLen * 0.94);
    rope.forEach((p, i) => set(p, A.x + ((sx - A.x) * i) / N, A.y + ((sy - A.y) * i) / N - Math.sin((Math.PI * i) / N) * 40));
    yaw = 0; yawV = 7;
  }

  /* ----------------------------------------------------------- physics */
  function verlet(p, damp, ax, ay, h) {
    const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
    p.px = p.x; p.py = p.y;
    p.x += vx + ax * h * h; p.y += vy + ay * h * h;
  }

  function step(h) {
    t += h;
    let vxC = 0, vyC = 0;
    if (drag) {
      vxC = drag.vx; vyC = drag.vy;
    } else {
      // gentle idle sway, like air moving the card
      const wind = Math.sin(t * 0.8) * 22 + Math.sin(t * 2.3 + 1) * 9;
      verlet(P, 0.997, 0, G, h);
      verlet(C, 0.997, wind, G, h);

      // elastic tether: the strap pulls the clasp back once it is longer than its length
      const dx = P.x - A.x, dy = P.y - A.y, d = Math.hypot(dx, dy) || 1;
      if (d > L) {
        const ux = dx / d, uy = dy / d;
        const vr = ((P.x - P.px) * ux + (P.y - P.py) * uy) / h; // outward speed
        const a = Math.min(K * (d - L) + Math.max(0, vr) * 38, 90000);
        P.x -= ux * a * h * h; P.y -= uy * a * h * h;
      }
      // rigid card: keep clasp and centre at a fixed distance (centre is heavier)
      for (let k = 0; k < 2; k++) {
        const ex = C.x - P.x, ey = C.y - P.y, e = Math.hypot(ex, ey) || 1;
        const diff = (e - cardLen) / e;
        P.x += ex * diff * 0.74; P.y += ey * diff * 0.74;
        C.x -= ex * diff * 0.26; C.y -= ey * diff * 0.26;
      }
      vxC = (C.x - C.px) / h; vyC = (C.y - C.py) / h;
      const sp = Math.hypot(vxC, vyC);
      if (sp > MAX_V) {
        const f = MAX_V / sp;
        [P, C].forEach((p) => { p.px = p.x - (p.x - p.px) * f; p.py = p.y - (p.y - p.py) * f; });
      }
    }

    // 3D turn: sideways speed twists the card; a spring brings the front back
    const yawA = -15 * Math.sin(yaw - face) - 1.5 * yawV + 0.0035 * vxC + 0.0000024 * vxC * Math.abs(vxC);
    yawV += yawA * h; yaw += yawV * h;
    if (yaw > Math.PI) yaw -= 2 * Math.PI; else if (yaw < -Math.PI) yaw += 2 * Math.PI;
    const pt = Math.max(-0.5, Math.min(0.5, -vyC * 0.00045));
    pitch += (pt - pitch) * Math.min(1, h * 7);

    // strap: Verlet rope, anchor and clasp pinned; segments can go slack but not longer than their length
    set(rope[0], A.x, A.y);
    rope[N].px = rope[N].x; rope[N].py = rope[N].y; rope[N].x = P.x; rope[N].y = P.y;
    for (let i = 1; i < N; i++) verlet(rope[i], 0.985, 0, G * 0.6, h);
    for (let it = 0; it < 8; it++) {
      for (let i = 0; i < N; i++) {
        const a = rope[i], b = rope[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        if (d <= seg) continue;
        const diff = (d - seg) / d;
        const wa = i === 0 ? 0 : 1, wb = i + 1 === N ? 0 : 1;
        if (!wa && !wb) continue;
        const s = diff / (wa + wb);
        a.x += dx * s * wa; a.y += dy * s * wa;
        b.x -= dx * s * wb; b.y -= dy * s * wb;
      }
    }
  }

  /* -------------------------------------------------------------- drag */
  function toLayer(e) {
    const r = layer.getBoundingClientRect();
    return [e.clientX - r.left, Math.max(-200, Math.min(Hc - 40, e.clientY - r.top))];
  }

  function dragFrame(dt) {
    const [mx, my] = drag.target;
    const vx = (mx - drag.mx) / dt, vy = (my - drag.my) / dt;
    const ax = Math.max(-60000, Math.min(60000, (vx - drag.vx) / dt));
    const ay = Math.max(-60000, Math.min(60000, (vy - drag.vy) / dt));
    drag.vx += (vx - drag.vx) * 0.5; drag.vy += (vy - drag.vy) * 0.5;
    drag.mx = mx; drag.my = my;

    // the card swings like a pendulum about the point being held, pushed by the pointer's acceleration
    const phi = angle();
    const [rx, ry] = rot(phi, -drag.lx, cardLen - drag.ly); // held point → centre
    const gx = -ax * 0.35, gy = G - ay * 0.35;
    let torque = (rx * gy - ry * gx) / Math.max(rx * rx + ry * ry, 60 * 60);
    // the stretched strap pulls the clasp too
    const [qx, qy] = rot(phi, -drag.lx, -drag.ly); // held point → clasp
    const px = mx + qx, py = my + qy, d = Math.hypot(px - A.x, py - A.y) || 1;
    if (d > L) {
      const f = Math.min(K * (d - L), 20000) * 0.25;
      const fx = ((A.x - px) / d) * f, fy = ((A.y - py) / d) * f;
      torque += (qx * fy - qy * fx) / Math.max(qx * qx + qy * qy, 60 * 60);
    }
    drag.w = (drag.w + torque * dt) * Math.pow(0.9, dt * 60);
    const nphi = phi + drag.w * dt;

    const [hx, hy] = rot(nphi, drag.lx, drag.ly);
    const [cx, cy] = rot(nphi, 0, cardLen);
    drag.prev = [P.x, P.y, C.x, C.y, dt];
    P.px = P.x; P.py = P.y; C.px = C.x; C.py = C.y;
    P.x = mx - hx; P.y = my - hy;
    C.x = P.x + cx; C.y = P.y + cy;
  }

  function onDown(e) {
    if (!live || drag || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    badge.setPointerCapture(e.pointerId);
    const [mx, my] = toLayer(e);
    const [lx, ly] = rot(-angle(), mx - P.x, my - P.y);
    drag = { id: e.pointerId, lx, ly, mx, my, target: [mx, my], vx: 0, vy: 0, w: 0, prev: null, x0: mx, y0: my, t0: performance.now(), far: false };
    badge.classList.add("is-dragging");
    wake();
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.target = toLayer(e);
    if (Math.hypot(drag.target[0] - drag.x0, drag.target[1] - drag.y0) > 6) drag.far = true;
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    // hand the held motion over to the simulation: velocity from the last frame, per physics step
    if (drag.prev) {
      const [ppx, ppy, cpx, cpy, dt] = drag.prev;
      const k = H / dt;
      P.px = P.x - (P.x - ppx) * k; P.py = P.y - (P.y - ppy) * k;
      C.px = C.x - (C.x - cpx) * k; C.py = C.y - (C.y - cpy) * k;
    }
    // a tap (no real drag) flips the card over
    if (e.type === "pointerup" && !drag.far && performance.now() - drag.t0 < 350) {
      face = face ? 0 : Math.PI;
      yawV += 9 * (face ? 1 : -1);
    }
    drag = null;
    badge.classList.remove("is-dragging");
  }

  /* ------------------------------------------------------------ render */
  function smooth() {
    const out = [];
    for (let i = 0; i < N; i++) {
      const p0 = rope[Math.max(0, i - 1)], p1 = rope[i], p2 = rope[i + 1], p3 = rope[Math.min(N, i + 2)];
      for (let s = 0; s < 4; s++) {
        const u = s / 4, u2 = u * u, u3 = u2 * u;
        out.push({
          x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
          y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
        });
      }
    }
    out.push({ x: rope[N].x, y: rope[N].y });
    return out;
  }

  function drawStrap() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hc);
    const pts = smooth();
    const n = pts.length;
    // the bottom of the strap turns with the card (twist), the top stays flat
    const twist = 0.22 + 0.78 * Math.abs(Math.cos(yaw));
    const wAt = (i) => {
      const u = i / (n - 1), k = Math.max(0, Math.min(1, (u - 0.55) / 0.45));
      return sw * (1 - (1 - twist) * k * k * (3 - 2 * k));
    };
    const L1 = [], R1 = [], tang = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      tang.push([tx, ty]);
      const w = wAt(i) / 2;
      L1.push([pts[i].x - ty * w, pts[i].y + tx * w]);
      R1.push([pts[i].x + ty * w, pts[i].y - tx * w]);
    }
    ctx.beginPath();
    L1.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R1[i][0], R1[i][1]);
    ctx.closePath();
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)"; ctx.shadowBlur = 18; ctx.shadowOffsetX = 6; ctx.shadowOffsetY = 12;
    ctx.fillStyle = "#16161a";
    ctx.fill();
    ctx.restore();
    // woven edge stitching
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    [0.36, -0.36].forEach((f) => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const [tx, ty] = tang[i], w = wAt(i) * f;
        const x = p.x - ty * w, y = p.y + tx * w;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    });

    // printed text, reading up the strap from the clasp
    const fs = sw * 0.46;
    ctx.font = `700 ${fs}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const total = cum[n - 1];
    let s = total - fs * 1.6, ci = 0, j = n - 1;
    while (s > 0) {
      const ch = TEXT[ci % TEXT.length]; ci++;
      const adv = ch === " " ? fs * 0.42 : ctx.measureText(ch).width + fs * 0.16;
      const sm = s - adv / 2;
      while (j > 0 && cum[j - 1] > sm) j--;
      if (j <= 0) break;
      const a = pts[j - 1], b = pts[j], u = (sm - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1);
      const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
      if (ch !== " " && y > -fs) {
        const [tx, ty] = tang[j];
        const sq = wAt(j) / sw;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(-ty, -tx)); // baseline runs up the strap
        ctx.scale(1, sq);
        ctx.fillStyle = ch === "✦" ? "#ff3341" : "rgba(240, 240, 238, 0.9)";
        ctx.fillText(ch, 0, 0);
      }
      s -= adv;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function render() {
    const phi = angle();
    badge.style.transform =
      `translate3d(${(P.x - bw / 2).toFixed(2)}px, ${P.y.toFixed(2)}px, 0) perspective(1100px) ` +
      `rotateZ(${phi.toFixed(4)}rad) rotateY(${yaw.toFixed(4)}rad) rotateX(${pitch.toFixed(4)}rad)`;
    const sx = 50 - (yaw / Math.PI) * 120 - phi * 60;
    const dk = (1 - Math.abs(Math.cos(yaw))) * 0.4;
    if (gl) {
      gl.render({ P, C, phi, yaw, pitch, pts: smooth() });
      return;
    }
    faces.forEach((f) => { f.style.setProperty("--sx", `${sx.toFixed(1)}%`); f.style.setProperty("--dk", dk.toFixed(3)); });
    drawStrap();
  }

  /* -------------------------------------------------------------- loop */
  let raf = 0, last = 0, onScreen = true;
  function frame(now) {
    raf = 0;
    if (!onScreen || document.hidden) { last = 0; return; }
    const dt = Math.min(1 / 30, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    if (drag) dragFrame(dt);
    acc += dt;
    while (acc >= H) { step(H); acc -= H; }
    render();
    raf = requestAnimationFrame(frame);
  }
  function wake() { if (live && !still && !raf) { last = 0; raf = requestAnimationFrame(frame); } }

  // 3D renderer: loaded straight away (the intro gives it time); the 2D badge is used if it fails or is slow
  const dims = () => ({ bw, bodyTop: body.offsetTop, bodyH: body.offsetHeight, sw });
  const gl3d = import("./lanyard3d.js")
    .then((m) => m.createLanyard3D(layer, dims))
    .then((r) => {
      if (!r) return;
      gl = r;
      layer.insertBefore(r.canvas, badge);
      layer.classList.add("is-3d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      measure();
      if (live) render();
    })
    .catch(() => {});

  measure();
  if (still) {
    rest(); placed = true; live = true;
    layer.classList.add("is-live", "is-still");
    render();
    const redo = () => { measure(); rest(); render(); };
    window.addEventListener("resize", redo, { passive: true });
    if (document.fonts) document.fonts.ready.then(redo);
    return;
  }
  dropStart(); placed = true;

  badge.addEventListener("pointerdown", onDown);
  badge.addEventListener("pointermove", onMove);
  badge.addEventListener("pointerup", onUp);
  badge.addEventListener("pointercancel", onUp);
  badge.addEventListener("lostpointercapture", onUp);
  badge.addEventListener("dragstart", (e) => e.preventDefault());
  window.addEventListener("resize", () => { measure(); if (live) render(); }, { passive: true });
  if (document.fonts) document.fonts.ready.then(() => measure()); // the name's width decides where the badge hangs
  document.addEventListener("visibilitychange", wake);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; wake(); }, { rootMargin: "200px 0px" }).observe(hero);

  let went = false;
  const go = () => { if (went) return; went = true; live = true; layer.classList.add("is-live"); wake(); };
  const goWhenReady = () => { gl3d.then(go); setTimeout(go, 2500); };
  // drop in as the intro hands the page over
  if (root.classList.contains("intro-active")) {
    const mo = new MutationObserver(() => {
      if (root.classList.contains("intro-active")) return;
      mo.disconnect();
      setTimeout(goWhenReady, 450);
    });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
  } else {
    setTimeout(goWhenReady, 450);
  }
}
