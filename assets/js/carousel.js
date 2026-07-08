/* ==========================================================================
   Continuous, seamless image carousels.

   Each project's image row (a `.carousel`) scrolls slowly and continuously
   through all its images and loops forever with no visible seam.

   How the seamless loop works:
   - We append clone "sets" of the images after the originals.
   - We advance scrollLeft a little each frame.
   - The moment we've scrolled exactly one set's width, we subtract that same
     width from scrollLeft. Because the following set is pixel-identical, that
     jump is invisible — so it reads as one uninterrupted lap, over and over.

   Behaviour:
   - Auto-scrolls by default (slow, ambient).
   - Pauses completely while the user is actively pressing/holding (mouse or
     touch, via pointer events); resumes the instant they release.
   - Fully disabled under prefers-reduced-motion — the row is then just a
     normal, user-scrollable strip.
   ========================================================================== */

(function () {
  "use strict";

  var SPEED = 40; // pixels per second — slow and ambient, not a slideshow

  // Respect reduced motion: no auto-scroll at all. The CSS leaves the row as
  // a normal horizontally-scrollable strip the user controls themselves.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var carousels = document.querySelectorAll(".carousel");

  carousels.forEach(function (carousel) {
    var originals = Array.prototype.slice.call(carousel.children);
    var setCount = originals.length;
    if (setCount < 2) return; // nothing meaningful to loop

    // Take over scrolling. Hiding native overflow stops manual scrolling from
    // fighting the animation; scrollLeft is still settable programmatically.
    carousel.style.overflowX = "hidden";

    // Append one more copy of every slide (a "set") to the end of the row.
    function appendCloneSet() {
      originals.forEach(function (slide) {
        var clone = slide.cloneNode(true);
        clone.setAttribute("aria-hidden", "true"); // don't repeat for screen readers
        // Clones are shown as the loop advances — load them eagerly (they hit
        // the same cached URLs as the originals) to avoid a blank on the lap.
        var imgs = clone.querySelectorAll("img");
        for (var i = 0; i < imgs.length; i++) imgs[i].loading = "eager";
        carousel.appendChild(clone);
      });
    }

    // The seamless loop distance = left offset of the first cloned slide.
    // Using the clone's offset means the gap between sets is included, so the
    // maths stays exact whatever the flex gap is.
    function loopDistance() {
      return carousel.children[setCount].offsetLeft;
    }

    // Guarantee there's always at least a full set of images beyond the
    // viewport to scroll into, so a lap never runs out of content mid-way
    // (matters when a project has few images on a wide screen).
    function fill() {
      appendCloneSet();
      while (carousel.scrollWidth < loopDistance() + carousel.clientWidth + 8) {
        appendCloneSet();
      }
    }
    fill();

    var loopWidth = loopDistance();
    var paused = false;
    var lastTime = null;
    var rafId;

    function tick(now) {
      if (lastTime === null) lastTime = now;
      var dt = (now - lastTime) / 1000;
      lastTime = now; // advance every frame, so resuming never jumps

      if (!paused) {
        carousel.scrollLeft += SPEED * dt;
        if (carousel.scrollLeft >= loopWidth) {
          carousel.scrollLeft -= loopWidth; // seamless wrap
        }
      }
      rafId = window.requestAnimationFrame(tick);
    }
    rafId = window.requestAnimationFrame(tick);

    // Pause while actively pressing/holding; resume on release. Pointer events
    // cover both click-and-hold (mouse) and tap-and-hold (touch). We listen
    // for release on window so a release outside the element still resumes.
    carousel.addEventListener("pointerdown", function () { paused = true; });
    window.addEventListener("pointerup", function () { paused = false; });
    window.addEventListener("pointercancel", function () { paused = false; });

    // Keep the loop distance correct across layout changes (e.g. crossing the
    // mobile breakpoint, where tile width switches to 84vw).
    var resizeTimer;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        while (carousel.scrollWidth < loopDistance() + carousel.clientWidth + 8) {
          appendCloneSet();
        }
        loopWidth = loopDistance();
        if (carousel.scrollLeft >= loopWidth) {
          carousel.scrollLeft = carousel.scrollLeft % loopWidth;
        }
      }, 150);
    });

    window.addEventListener("pagehide", function () {
      window.cancelAnimationFrame(rafId);
    });
  });
})();
