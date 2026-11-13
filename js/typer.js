/* Typewriter reveal (reference video 4: text is typed into its blue frame, caret and all).
   prime(el) hides every character up front (layout unchanged, so the frame already has the final size);
   play() types them in and returns { dur, caret } so the builder cursor can follow the caret.
   When done, the original text nodes are put back (clean DOM for screen readers, copy/paste, kerning). */

const SKIP = ".like__art, svg, .caret";
const TAIL = 0.35; // s the caret blinks after the last character

export function prime(el) {
  if (el._typer) return el._typer;
  const wraps = [];
  const chars = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const skip = n.parentElement.closest(SKIP);
      return skip && el.contains(skip) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const wrap = document.createElement("span");
    wrap.className = "tw";
    // Whitespace stays plain text so lines break exactly as in the final layout.
    node.nodeValue.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { wrap.appendChild(document.createTextNode(part)); return; }
      Array.from(part).forEach((ch) => {
        const s = document.createElement("span");
        s.className = "ch";
        s.textContent = ch;
        wrap.appendChild(s);
        chars.push(s);
      });
    });
    node.replaceWith(wrap);
    wraps.push([wrap, node]);
  });

  let played = null;
  const restore = () => {
    wraps.forEach(([wrap, node]) => wrap.replaceWith(node));
    delete el._typer;
  };

  el._typer = {
    play() {
      if (played) return played;
      const n = chars.length;
      if (!n) { restore(); played = { dur: 0, caret: null }; return played; }
      const cps = Math.max(42, n / 1.05); // short labels type at a natural pace, long text caps at ~1s
      const dur = n / cps;
      const caret = document.createElement("span");
      caret.className = "caret";
      caret.setAttribute("aria-hidden", "true");
      chars[0].before(caret);
      const t0 = performance.now();
      let shown = 0;
      const tick = (t) => {
        // rAF timestamps can be slightly earlier than t0, so never go below the first character
        const k = Math.min(n, Math.max(1, Math.floor(((t - t0) / 1000) * cps) + 1));
        for (; shown < k; shown++) chars[shown].classList.add("on");
        chars[k - 1].after(caret);
        if (k < n) { requestAnimationFrame(tick); return; }
        caret.classList.add("is-idle");
        setTimeout(() => { caret.remove(); restore(); }, TAIL * 1000);
      };
      requestAnimationFrame(tick);
      played = { dur: dur + TAIL, caret };
      return played;
    },
  };
  return el._typer;
}
