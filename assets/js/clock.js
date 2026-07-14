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

   Relocation: on wide screens the whole clock moves up beside the logo in the
   header; below that it drops back to the footer. It is one DOM node moved
   between two homes — never duplicated — so a single interval keeps ticking it
   and a screen reader can only ever find one. See the bottom of the file.
   ========================================================================== */

(function () {
  "use strict";

  var el = document.querySelector(".footer__time");
  if (!el) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 40ms ≈ 25 updates/sec — fast enough that the milliseconds read as a live,
  // continuous stream. 100ms looked like it was barely moving. Each tick reads
  // new Date() fresh, so the display can't drift from real time.
  var INTERVAL = reduced ? 1000 : 40;

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

  /* ----------------------------------------------------------------------
     Move the single clock between the header (wide) and the footer (narrow).

     We move the .footer__clock element itself rather than cloning it, so the
     interval above — which holds a reference to the one .footer__time inside
     it — keeps updating it wherever it lives. No second node, no second
     timer, nothing for a screen reader to announce twice.
     ---------------------------------------------------------------------- */
  var clock = el.closest(".footer__clock");
  var logo = document.querySelector(".site-logo");
  if (clock && logo) {
    // Remember the footer position exactly, so we can put it back where it was.
    var footerHome = clock.parentNode;
    var footerAnchor = clock.nextSibling;

    // The header slot is created once, lazily, and sits just after the logo.
    var navSlot = null;
    var current = null; // "nav" | "footer" — guards against needless DOM moves

    function toNav() {
      if (current === "nav") return;
      if (!navSlot) {
        navSlot = document.createElement("div");
        navSlot.className = "site-header__clock";
        logo.insertAdjacentElement("afterend", navSlot);
      }
      navSlot.appendChild(clock);
      current = "nav";
    }
    function toFooter() {
      if (current === "footer") return;
      if (footerAnchor && footerAnchor.parentNode === footerHome) {
        footerHome.insertBefore(clock, footerAnchor);
      } else {
        footerHome.appendChild(clock);
      }
      current = "footer";
    }

    // Breakpoint set from measuring the header: below ~64rem the name, links,
    // toggle and clock start to crowd, so the clock drops to the footer.
    var wide = window.matchMedia("(min-width: 64rem)");
    function place() { wide.matches ? toNav() : toFooter(); }
    place();

    // matchMedia's change event is the right signal, but a debounced resize
    // listener is the one that fires reliably everywhere (and under emulated
    // viewports). The current-state guard makes both cheap and idempotent.
    if (wide.addEventListener) wide.addEventListener("change", place);
    else if (wide.addListener) wide.addListener(place); // older Safari
    var resizeTimer;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(place, 100);
    });
  }
})();
