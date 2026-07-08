/* ==========================================================================
   Mobile navigation.

   Below 48rem the primary nav collapses behind a hamburger. The open/close
   animation lives entirely in CSS (grid-template-rows 0fr→1fr); this script
   only owns the state:

   - data-nav-open on <header>, which every CSS rule keys off,
   - aria-expanded + a state-dependent aria-label on the button.

   It closes on Escape, on following a link, on a click outside the header, and
   when the viewport grows past the breakpoint (otherwise the flag would linger
   and re-open the panel on the way back down).

   The button is a real <button>, so space/enter and focus come for free.
   ========================================================================== */

(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (!header || !toggle || !nav) return;

  // Must match the CSS breakpoint. Anything wider and the panel doesn't exist.
  var desktop = window.matchMedia("(min-width: 48rem)");

  function isOpen() {
    return header.getAttribute("data-nav-open") === "true";
  }

  function setOpen(open) {
    header.setAttribute("data-nav-open", open ? "true" : "false");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  setOpen(false);

  toggle.addEventListener("click", function () {
    setOpen(!isOpen());
  });

  // Escape closes and returns focus to the button that opened it.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Following a link closes the panel. On this site "About me" is a same-page
  // anchor, so nothing would otherwise dismiss it.
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });

  // A click anywhere outside the header dismisses it.
  document.addEventListener("click", function (e) {
    if (isOpen() && !header.contains(e.target)) setOpen(false);
  });

  // Crossing up into the desktop layout clears the flag, so the panel isn't
  // already open when the user comes back down. Belt and braces: the matchMedia
  // change event is the right tool, but a plain resize listener is the one that
  // definitely fires everywhere (and under emulated viewports). Guarded on
  // isOpen(), so the common case is a single boolean read.
  function closeIfDesktop() {
    if (desktop.matches && isOpen()) setOpen(false);
  }
  if (desktop.addEventListener) {
    desktop.addEventListener("change", closeIfDesktop);
  } else if (desktop.addListener) {
    desktop.addListener(closeIfDesktop); // older Safari
  }

  // Debounced with a timer rather than requestAnimationFrame: rAF is paused in
  // background tabs, so a resize there would never be reconciled.
  var resizeTimer;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(closeIfDesktop, 100);
  });
})();
