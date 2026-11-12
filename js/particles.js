/* Ambient particle field: tiny arrows and plus marks drifting over the page.
   Depth-based scroll parallax, pushed away by the mouse. Canvas only, no dependencies.
   Off for reduced motion; paused while the tab is hidden. */

export function initParticles(reducedMotion) {
  if (reducedMotion.matches) return;
  const canvas = document.createElement("canvas");
  canvas.className = "particles";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const RED = "255, 51, 65";
  const WHITE = "243, 243, 241";
  let w = 0, h = 0, dpr = 1, parts = [];
  let mouseX = -9999, mouseY = -9999;
  let lastScroll = window.scrollY;
  let last = performance.now();
  let raf = 0;

  function make(randomY = true) {
    const z = 0.35 + Math.random() * 0.65; // depth: nearer = bigger, faster, brighter
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : h + 10,
      z,
      vx: (Math.random() - 0.5) * 10,
      vy: -(4 + Math.random() * 10) * z, // slow upward drift
      ox: 0, oy: 0, // displacement from the mouse, eases back to 0
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.8,
      type: Math.random() < 0.6 ? "arrow" : "plus",
      red: Math.random() < 0.3,
      size: (4 + Math.random() * 4) * z,
    };
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round(Math.min(w < 640 ? 26 : 64, (w * h) / 16000));
    while (parts.length < target) parts.push(make());
    parts.length = target;
  }

  function draw(p) {
    const a = 0.22 + p.z * 0.45;
    ctx.save();
    ctx.translate(p.x + p.ox, p.y + p.oy);
    ctx.rotate(p.rot);
    const s = p.size;
    if (p.type === "arrow") {
      ctx.fillStyle = `rgba(${p.red ? RED : WHITE}, ${a})`;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.7, s * 0.8);
      ctx.lineTo(0, s * 0.35);
      ctx.lineTo(-s * 0.7, s * 0.8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = `rgba(${p.red ? RED : WHITE}, ${a * 0.9})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, 0); ctx.lineTo(s * 0.8, 0);
      ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, s * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const dy = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt - dy * p.z * 0.35; // nearer particles move more with scroll
      p.rot += p.vr * dt;

      const dx = p.x + p.ox - mouseX;
      const dyM = p.y + p.oy - mouseY;
      const d2 = dx * dx + dyM * dyM;
      if (d2 < 140 * 140 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / 140) * 90 * dt * 6;
        p.ox += (dx / d) * f;
        p.oy += (dyM / d) * f;
        p.vr += (Math.random() - 0.5) * 0.4;
      }
      p.ox *= 0.94;
      p.oy *= 0.94;
      p.vr = Math.max(-2, Math.min(2, p.vr * 0.995));

      if (p.y < -20) { Object.assign(p, make(false)); }
      else if (p.y > h + 20) { Object.assign(p, make(false)); p.y = -10; }
      if (p.x < -20) p.x = w + 10;
      else if (p.x > w + 20) p.x = -10;
      draw(p);
    }
    raf = requestAnimationFrame(frame);
  }

  const start = () => { if (!raf) { last = performance.now(); lastScroll = window.scrollY; raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", (e) => { mouseX = e.clientX; mouseY = e.clientY; }, { passive: true });
  document.addEventListener("pointerleave", () => { mouseX = mouseY = -9999; });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  reducedMotion.addEventListener("change", (e) => { if (e.matches) { stop(); canvas.remove(); } });
  resize();
  start();
}
