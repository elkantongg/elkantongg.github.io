/* Runs before first paint: decides whether the intro plays (every page load, except reduced motion).
   Kept tiny and dependency-free so the page can never get stuck behind the intro. */
(function () {
  var root = document.documentElement;
  root.classList.add("js");

  var skip = false;
  try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) skip = true; } catch (e) {}

  if (skip) {
    root.classList.add("no-intro");
    return;
  }

  root.classList.add("intro-active");

  // Failsafe: the CSS timeline ends at ~4.05s; always release the page shortly after.
  window.setTimeout(function () {
    root.classList.remove("intro-active");
    var intro = document.getElementById("intro");
    if (intro) intro.classList.add("is-done");
  }, 4200);
})();
