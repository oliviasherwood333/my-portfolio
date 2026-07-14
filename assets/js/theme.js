/* ==========================================================================
   Light/dark theme toggle wiring.

   The pre-paint snippet in <head> has already applied any saved choice to
   <html data-theme>. This script:
   - keeps the switch's aria-checked + aria-label in sync with the *effective*
     theme (explicit choice, or the OS preference when none is set),
   - flips and persists the theme on click,
   - adds a short transition class so the change cross-fades (reduced-motion
     users get an instant change via the CSS reduced-motion rule),
   - follows live OS changes while the user hasn't made an explicit choice.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;

  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  // The theme actually showing right now: an explicit data-theme wins,
  // otherwise we're following the OS.
  function effectiveTheme() {
    var attr = root.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") return attr;
    return darkQuery.matches ? "dark" : "light";
  }

  // Reflect current state on the switch (knob position is driven off
  // aria-checked in CSS; the label flips to describe the *action*).
  function syncSwitch() {
    var isDark = effectiveTheme() === "dark";
    toggle.setAttribute("aria-checked", isDark ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  // The switch ships "off" in the HTML and we correct it here — a step after the
  // page has already painted. In dark mode that flip would otherwise run the
  // knob's slide (and the track's colour fade) on every load and every
  // navigation, so the switch appears to animate itself. Suppress transitions
  // for just this first sync, then re-enable them a frame later so genuine
  // clicks still animate.
  root.classList.add("theme-booting");
  syncSwitch();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      root.classList.remove("theme-booting");
    });
  });

  // Briefly enable the cross-fade only around the switch itself.
  var transitionTimer;
  function withTransition(fn) {
    root.classList.add("theme-transition");
    fn();
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(function () {
      root.classList.remove("theme-transition");
    }, 350);
  }

  toggle.addEventListener("click", function () {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    withTransition(function () {
      root.setAttribute("data-theme", next);
      syncSwitch();
    });
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
  });

  // If the user hasn't chosen explicitly, follow live OS preference changes.
  function onSystemChange() {
    var stored = null;
    try {
      stored = localStorage.getItem("theme");
    } catch (e) {}
    if (stored !== "dark" && stored !== "light") syncSwitch();
  }
  if (darkQuery.addEventListener) {
    darkQuery.addEventListener("change", onSystemChange);
  } else if (darkQuery.addListener) {
    darkQuery.addListener(onSystemChange); // older Safari
  }
})();
