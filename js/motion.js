/* Scroll-driven motion: split headlines, scrubbed paragraph, rails, hero parallax, marquee.
   Everything degrades to static, readable content (no JS / reduced motion). */

const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp01 = (n) => Math.max(0, Math.min(1, n));

/* Wrap each word of an element's text in .w > span, keeping inner elements (accent spans, <br>). */
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const outer = document.createElement("span");
          outer.className = "w";
          const inner = document.createElement("span");
          inner.textContent = part;
          inner.style.setProperty("--wi", String(i++));
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        walk(child);
      }
    });
  };
  walk(el);
  el.classList.add("is-split");
}

/* Paragraph whose words light up one by one as it scrolls through the viewport. */
function splitScrub(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.replaceChildren(...words.flatMap((w, i) => {
    const s = document.createElement("span");
    s.className = "sw";
    s.textContent = w;
    return i < words.length - 1 ? [s, document.createTextNode(" ")] : [s];
  }));
  return $$(".sw", el);
}

export function initMotion(reducedMotion) {
  $$("h2.display.reveal, .contact__title.reveal").forEach(splitWords);

  const scrubs = $$(".scrub").map((el) => ({ el, words: splitScrub(el) }));
  const rails = $$(".rail").map((el) => ({ el, items: $$(":scope > li", el) }));
  const hero = document.querySelector(".hero");
  const heroInner = document.querySelector("[data-hero-exit]");
  const ghost = document.querySelector("[data-speed-x]");
  const ghostSpeed = ghost ? Number(ghost.dataset.speedX) || 0 : 0;
  const still = () => reducedMotion.matches;

  let mx = 0, my = 0; // pointer offset from centre, -1..1 (hero only)

  function update() {
    const vh = window.innerHeight;
    const y = window.scrollY;

    scrubs.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      const p = clamp01((vh * 0.88 - r.top) / (r.height + vh * 0.4));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < lit));
    });

    rails.forEach(({ el, items }) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--tl", clamp01((vh * 0.65 - r.top) / r.height).toFixed(3));
      items.forEach((li) => li.classList.toggle("lit", li.getBoundingClientRect().top < vh * 0.65));
    });

    if (!still() && hero && y < hero.offsetHeight * 1.1) {
      const p = clamp01(y / hero.offsetHeight);
      if (heroInner) {
        heroInner.style.transform = `translate3d(0, ${(y * 0.32).toFixed(1)}px, 0)`;
        heroInner.style.opacity = String(1 - p * 1.1);
      }
      if (ghost) {
        ghost.style.transform = `translate3d(${(y * ghostSpeed + mx * -24).toFixed(1)}px, ${(y * 0.12 + my * -14).toFixed(1)}px, 0)`;
      }
    }
  }

  let ticking = false;
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  if (hero) {
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
      request();
    });
  }
  update();

  /* Marquee: drifts constantly, speeds up with scroll velocity and follows scroll direction. */
  const track = document.querySelector(".marquee__track");
  if (track && !still()) {
    track.classList.add("is-js");
    let x = 0, dir = 1, boost = 0, lastY = window.scrollY, last = performance.now(), running = false;
    const BASE = 55; // px per second
    const frame = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (dy) { dir = dy > 0 ? 1 : -1; boost = Math.min(900, boost + Math.abs(dy) * 6); }
      boost *= 0.92;
      const half = track.scrollWidth / 2;
      x -= (BASE + boost) * dir * dt;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      requestAnimationFrame(frame);
    };
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) { last = performance.now(); lastY = window.scrollY; requestAnimationFrame(frame); }
    }).observe(track.parentElement);
  }
}
