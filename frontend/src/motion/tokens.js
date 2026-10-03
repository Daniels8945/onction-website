// Onction motion system — one vocabulary for every animated thing on the
// public site. Adapted from Tata Power's interaction language (0.4s UI
// transitions, staggered tile reveals, arrow nudges, line-art energy
// illustrations) and pushed further with masked text and clip-path reveals.
//
//   EASE.out    long, decelerating settle — content entering the viewport
//   EASE.inOut  symmetric — things that open/close or cover/uncover (menus,
//               page curtain), so both directions feel equally weighted
//   DUR.ui      Tata's 0.4s for hovers, toggles and menu items
//   DUR.reveal  scroll reveals; long enough to read as intentional
//   STAGGER     gap between siblings in a sequence
export const EASE = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
};

export const DUR = {
  micro: 200,
  ui: 400,
  reveal: 900,
  curtainIn: 320,
  curtainOut: 460,
};

export const STAGGER = 70;

// Programmatic scrolls (hash jumps, back/forward restore) mark themselves so
// the header doesn't mistake them for the visitor reading down the page.
export function markAutoScroll(ms = 1400) {
  window.__onctionAutoScrollUntil = Date.now() + ms;
}
export function isAutoScrolling() {
  return Date.now() < (window.__onctionAutoScrollUntil || 0);
}
