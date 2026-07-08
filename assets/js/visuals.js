/* ==========================================================================
   Visuals page — shuffle the mosaic on every load.

   Tile sizes belong to the layout, not to the images. The <li> tiles keep
   their fixed order and their large/wide/small classes — that sequence is what
   makes a 4-column grid tile with no holes — and only the <img> nodes move
   between them. So the mosaic rhythm is identical every visit; only which
   image lands in which slot changes.

   Why the shuffle is partitioned by shape, not global:

   The images come in two aspect ratios. Six are panoramic (2.12:1, three phone
   screens side by side); twelve are near-square (1.05:1, a single card). The
   tiles match: wide tiles are 2:1, large and small tiles are 1:1. Because tiles
   use object-fit:cover, dropping a panoramic into a square tile would crop away
   more than half of it — two of the three phones would simply vanish. So
   panoramics shuffle among the wide slots, squares among the square slots.
   Within the squares, whether one becomes a 2x2 or a 1x1 is decided purely by
   which slot it lands in, so the size assignment is genuinely reshuffled too.

   This script must run *during parsing*, before the browser resolves lazy
   loading and before first paint. Hence it sits inline after the </ul> rather
   than being deferred: a deferred script could let the original order paint
   first, and would let lazy-loading decisions be made against the wrong slots.
   ========================================================================== */

(function () {
  "use strict";

  var grid = document.querySelector(".visuals__grid");
  if (!grid) return;

  var tiles = Array.prototype.slice.call(grid.children);
  if (tiles.length < 2) return;

  // Eager-load whatever ends up in the first row-and-a-bit. Everything else is
  // lazy. This is keyed to slot position, so it stays correct after shuffling.
  var EAGER_SLOTS = 4;

  // A tile is "wide" if its 2:1 span class says so; everything else is square.
  function isWideTile(tile) {
    return tile.classList.contains("visuals__tile--w");
  }

  // Classify by the image's own intrinsic dimensions rather than trusting a
  // filename or the tile it happens to start in.
  function isWideImage(img) {
    var w = parseFloat(img.getAttribute("width"));
    var h = parseFloat(img.getAttribute("height"));
    return w && h && w / h > 1.5;
  }

  function shuffle(arr) {
    // Fisher-Yates, walking backwards. Every permutation equally likely.
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  var wideImgs = [];
  var squareImgs = [];
  var ok = true;

  tiles.forEach(function (tile) {
    var img = tile.querySelector("img");
    if (!img) { ok = false; return; }
    (isWideImage(img) ? wideImgs : squareImgs).push(img);
  });

  var wideSlots = tiles.filter(isWideTile).length;
  var squareSlots = tiles.length - wideSlots;

  // If the counts ever drift out of step (an image added without a matching
  // slot, say), leave the hand-authored order alone rather than render a
  // mangled grid.
  if (!ok || wideImgs.length !== wideSlots || squareImgs.length !== squareSlots) {
    return;
  }

  shuffle(wideImgs);
  shuffle(squareImgs);

  var w = 0;
  var s = 0;

  tiles.forEach(function (tile, index) {
    var img = isWideTile(tile) ? wideImgs[w++] : squareImgs[s++];

    // Loading hints follow the slot, not the image. Set before the image is
    // laid out, so the browser's lazy-loading decision uses the final position.
    if (index < EAGER_SLOTS) {
      img.setAttribute("loading", "eager");
      img.setAttribute("fetchpriority", "high");
    } else {
      img.setAttribute("loading", "lazy");
      img.removeAttribute("fetchpriority");
    }

    // Only re-parent when the image isn't already where it belongs, so we don't
    // needlessly detach nodes the browser has already begun decoding.
    if (img.parentNode !== tile) {
      tile.appendChild(img);
    }
  });
})();
