/* Scroll-driven motion: split headlines, scrubbed paragraphs, rails, hero exit parallax.
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
  const still = () => reducedMotion.matches;

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
    }
  }

  let ticking = false;
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  update();
  // Marquee: constant-speed CSS animation (style.css), not tied to scroll.
}
