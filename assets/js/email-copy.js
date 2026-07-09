/* ==========================================================================
   Copy-email button.

   Hovering flips the address to "Click to copy to clipboard" (pure CSS).
   Clicking copies the address and flips to "Copied to clipboard" for a couple
   of seconds, then reverts. The confirmation is also written to an aria-live
   region, so screen readers hear it rather than only seeing a visual swap —
   the flip panes themselves are aria-hidden.

   If the Clipboard API is unavailable or the write fails, we fall back to
   opening a mailto:, so the button is never a dead end.
   ========================================================================== */

(function () {
  "use strict";

  var btn = document.querySelector(".email-copy");
  if (!btn) return;

  var email = btn.getAttribute("data-email");
  var back = btn.querySelector(".email-copy__back");
  var status = document.querySelector("[data-copy-status]");
  var HOVER_TEXT = back.textContent;
  var revertTimer = null;

  function copied() {
    back.textContent = "Copied to clipboard";
    btn.setAttribute("data-copied", "true"); // holds the flip open
    if (status) status.textContent = "Copied to clipboard";

    window.clearTimeout(revertTimer);
    revertTimer = window.setTimeout(function () {
      btn.removeAttribute("data-copied");
      back.textContent = HOVER_TEXT;
      if (status) status.textContent = "";
    }, 2000);
  }

  btn.addEventListener("click", function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(copied, function () {
        window.location.href = "mailto:" + email;
      });
    } else {
      window.location.href = "mailto:" + email;
    }
  });
})();
