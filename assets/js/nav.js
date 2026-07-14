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

/* ==========================================================================
   Active nav link = the one pointing at the current page.

   The nav markup is identical on every page (so the copies can't drift), which
   means the active link can't be hardcoded per file — we set it here instead.
   Whichever link resolves to the current document gets aria-current="page".
   Hash links (About me → /#about-me) are skipped: "About me" is a section of
   the homepage, so on the homepage the scroll-spy below owns that state, and on
   other pages it isn't the current page. A case study matches none of the three,
   so nothing is marked — which is correct.
   ========================================================================== */

(function () {
  "use strict";

  var nav = document.getElementById("primary-nav");
  if (!nav) return;

  // Fold "/", "/index.html", "/dir/" and "/dir/index.html" onto one form.
  function normalize(path) {
    return path.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
  }
  var here = normalize(window.location.pathname);

  var links = nav.querySelectorAll("a[href]");
  for (var i = 0; i < links.length; i++) {
    if (!links[i].hash && normalize(links[i].pathname) === here) {
      links[i].setAttribute("aria-current", "page");
    }
  }
})();

/* ==========================================================================
   Nav scroll-spy — active state follows the scroll position, not the click.

   The active indicator keys off aria-current="page". "About me" is a same-page
   anchor (#about-me), so a click alone can't be the source of truth: the user
   can also scroll there directly, or keep scrolling past it into the footer. So
   we let position drive it. While the About me section is sufficiently on
   screen it's active; otherwise Home is — and "otherwise" deliberately covers
   the hero, the project list AND the footer, all of which belong to Home.

   The About section drives it via one IntersectionObserver. A second one
   watches the footer: because this footer is shorter than the viewport, you
   can never scroll the About section fully off screen, so once the footer
   takes over the lower part of the viewport it overrides About back to Home —
   the footer belongs to Home, not to a nav state of its own. Because both read
   live geometry, the result is correct however the user got there — click or
   manual scroll alike.

   Every switch has hysteresis (a gap between its on and off points) so nothing
   can flip back and forth while the user hovers a boundary.
   ========================================================================== */

(function () {
  "use strict";

  var nav = document.getElementById("primary-nav");
  var about = document.getElementById("about-me");
  var footer = document.querySelector(".site-footer");
  if (!nav || !about || !("IntersectionObserver" in window)) return;

  // Find the two links by their resolved target, not a literal href string, so
  // this keeps working whether the nav uses relative (index.html#about-me) or
  // root-absolute (/#about-me) paths — the two can't drift out of sync again.
  // Home = the fragment-less link pointing at this page; About = the #about-me one.
  function trimPath(path) {
    return path.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
  }
  var herePath = trimPath(window.location.pathname);
  var homeLink = null;
  var aboutLink = null;
  var candidates = nav.querySelectorAll("a[href]");
  for (var i = 0; i < candidates.length; i++) {
    var a = candidates[i];
    if (a.hash === "#about-me") aboutLink = a;
    else if (!a.hash && trimPath(a.pathname) === herePath) homeLink = a;
  }
  if (!homeLink || !aboutLink) return;

  // The two independent readings, reconciled by update(): About wins when it's
  // on screen, unless the footer has taken over the bottom — then Home wins.
  var aboutActive = false;
  var footerTakingOver = false;

  function update() {
    var link = aboutActive && !footerTakingOver ? aboutLink : homeLink;
    if (link === homeLink) {
      homeLink.setAttribute("aria-current", "page");
      aboutLink.removeAttribute("aria-current");
    } else {
      aboutLink.setAttribute("aria-current", "page");
      homeLink.removeAttribute("aria-current");
    }
  }

  // Fine-grained thresholds so each observer reports at every 5% of its target
  // crossing the viewport edge — enough resolution to catch the on/off points.
  var thresholds = [];
  for (var t = 0; t <= 1; t += 0.05) thresholds.push(t);

  // How much of the target is on screen, measured as the larger of: fraction of
  // the *target* visible, and fraction of the *viewport* it covers. The second
  // matters for a target taller than the screen, which can never reach a high
  // intersectionRatio — coverage carries it there.
  function screenShare(entry) {
    var vh = (entry.rootBounds && entry.rootBounds.height) || window.innerHeight;
    return Math.max(
      entry.intersectionRatio,
      vh ? entry.intersectionRect.height / vh : 0
    );
  }

  // About: active once half of it shows, stays active until it drops below 40%.
  new IntersectionObserver(function (entries) {
    var share = screenShare(entries[entries.length - 1]);
    if (!aboutActive && share >= 0.5) aboutActive = true;
    else if (aboutActive && share < 0.4) aboutActive = false;
    update();
  }, { threshold: thresholds }).observe(about);

  // Footer: "taken over" once it fills 40% of the viewport, released below 33%.
  // Both points sit in the last sliver of scroll, so the hand-off to Home only
  // happens as the footer genuinely dominates the bottom of the screen.
  new IntersectionObserver(function (entries) {
    var share = screenShare(entries[entries.length - 1]);
    if (!footerTakingOver && share >= 0.4) footerTakingOver = true;
    else if (footerTakingOver && share < 0.33) footerTakingOver = false;
    update();
  }, { threshold: thresholds }).observe(footer);
})();

/* ==========================================================================
   Don't re-navigate to the page you're already on.

   Every same-origin navigation runs the cross-document view transition
   (@view-transition { navigation: auto }). That's what we want between pages,
   but clicking "Home" (or the logo) while already on the home page is a
   same-URL reload: the browser tears the document down and repaints it, and
   for that one frame the view transition cross-fades over the browser's own
   default canvas — which is light. In dark mode that reads as a white
   flash/jitter, even though nothing actually changed.

   There's nothing to navigate to, so we cancel it. The click just brings the
   user to the top of the current page instead — no reload, no transition, no
   flash. Real cross-page links (Visuals, the case studies) resolve to a
   different path and fall straight through untouched.
   ========================================================================== */

(function () {
  "use strict";

  // Fold "/", "/index.html", "/dir/" and "/dir/index.html" onto one form so a
  // link to the current document compares equal however the URL is written.
  function normalize(path) {
    return path.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
  }
  var herePath = normalize(window.location.pathname);
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("click", function (e) {
    // Only a plain left-click can be a navigation we should intercept — leave
    // modifier-clicks (open in new tab), middle-clicks and the like alone.
    if (e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || (a.target && a.target !== "_self")) return;
    if (a.origin !== window.location.origin) return;

    // Same document, no fragment → a bare reload. A fragment link (#about-me)
    // is a same-document scroll, so we leave it to do its native thing.
    if (!a.hash && normalize(a.pathname) === herePath) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    }
  });
})();
