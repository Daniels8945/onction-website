import { useState, useEffect, useCallback } from "react";
import { isMotionReduced } from "../motion/motionPreference.js";

// Shared carousel state used by Hero, CaseStudies and Testimonials.
// autoMs = 0 disables auto-advance.
// pauseOnHover: stop while a mouse pointer is over the carousel. The hero turns
// this off — it fills the first screen, so the pointer is nearly always on it
// and it would never advance. Manual navigation restarts the timer either way,
// so a slide the visitor picked doesn't jump away a moment later. Keyboard
// focus inside the carousel always pauses it (WCAG 2.2.2).
export function useCarousel(count, autoMs = 0, { pauseOnHover = true } = {}) {
  const [index, setIndexRaw] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [restart, setRestart] = useState(0);
  const paused = focused || (pauseOnHover && hovered);

  useEffect(() => {
    if (!autoMs || paused) return;
    if (isMotionReduced()) return;
    const t = setInterval(() => setIndexRaw((v) => (v + 1) % count), autoMs);
    return () => clearInterval(t);
  }, [paused, count, autoMs, restart]);

  const manual = useCallback((update) => {
    setIndexRaw(update);
    setRestart((r) => r + 1);
  }, []);

  return {
    index,
    setIndex: (i) => manual(i),
    prev: () => manual((v) => (v - 1 + count) % count),
    next: () => manual((v) => (v + 1) % count),
    // Spread onto the carousel container. Pointer events rather than mouse
    // events: a tap fires a compatibility mouseenter with no mouseleave, so on
    // phones one tap on a dot or arrow used to stop auto-advance for good.
    pauseHandlers: {
      onPointerEnter: (e) => e.pointerType === "mouse" && setHovered(true),
      onPointerLeave: (e) => e.pointerType === "mouse" && setHovered(false),
      onFocus: (e) => e.target.matches?.(":focus-visible") && setFocused(true),
      onBlur: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      },
    },
  };
}
