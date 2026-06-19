import { useState, useEffect } from "react";

// Shared carousel state used by Hero, CaseStudies and Testimonials.
// autoMs = 0 disables auto-advance.
export function useCarousel(count, autoMs = 0) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!autoMs || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((v) => (v + 1) % count), autoMs);
    return () => clearInterval(t);
  }, [paused, count, autoMs]);

  return {
    index,
    setIndex,
    prev: () => setIndex((v) => (v - 1 + count) % count),
    next: () => setIndex((v) => (v + 1) % count),
    // Spread onto the carousel container to pause auto-advance on hover.
    pauseHandlers: {
      onMouseEnter: () => setPaused(true),
      onMouseLeave: () => setPaused(false),
    },
  };
}
