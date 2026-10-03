import { useEffect, useRef, useState } from "react";
import { isMotionReduced } from "./motionPreference.js";

// Scroll-linked progress for a tall "scene" whose child is position:sticky.
// 0 when the scene's top reaches the top of the viewport, 1 when its bottom
// reaches the bottom. Writes --p onto the element every frame (cheap, no
// React render) and only re-renders when the coarse `step` changes.
export function useScrollProgress({ steps = 1 } = {}) {
  const ref = useRef(null);
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;

    function update() {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : rect.top < 0 ? 1 : 0;
      el.style.setProperty("--p", p.toFixed(4));
      const s = Math.min(steps - 1, Math.floor(p * steps));
      if (s !== stepRef.current) {
        stepRef.current = s;
        setStep(s);
      }
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [steps]);

  return [ref, step, isMotionReduced()];
}
