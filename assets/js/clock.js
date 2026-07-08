/* ==========================================================================
   Footer clock — the visitor's own local time, next to the copyright line.

   The "Leeds, UK" label is fixed in the markup; this only renders the time, so
   a visitor in another timezone sees their clock, not ours. Same as the
   reference site.

   Notes:
   - Milliseconds tick at 100ms. Tabular figures (in CSS) keep the digits from
     shifting the layout as they change.
   - Under prefers-reduced-motion the ms are dropped and it ticks once a second,
     so there's no rapidly-churning text.
   - The timer stops while the tab is hidden — no work in a background tab —
     and repaints immediately on return so it never shows a stale time.
   ========================================================================== */

(function () {
  "use strict";

  var el = document.querySelector(".footer__time");
  if (!el) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var INTERVAL = reduced ? 1000 : 100;

  function pad(n, width) {
    var s = String(n);
    while (s.length < width) s = "0" + s;
    return s;
  }

  function render() {
    var d = new Date();
    var t =
      pad(d.getHours(), 2) + ":" +
      pad(d.getMinutes(), 2) + ":" +
      pad(d.getSeconds(), 2);
    if (!reduced) t += "." + pad(d.getMilliseconds(), 3);
    // Only touch the DOM when the string actually changes.
    if (el.textContent !== t) el.textContent = t;
  }

  var timer = null;

  function start() {
    if (timer !== null) return;
    render();
    timer = window.setInterval(render, INTERVAL);
  }

  function stop() {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  window.addEventListener("pagehide", stop);

  start();
})();
