import { useEffect, useRef } from "react";
import { isMotionReduced } from "./motionPreference.js";

// Drifts its content against the scroll by `speed` × distance from the
// viewport centre. Desktop + fine pointers only: on phones parallax costs
// battery and reads as jank, so it simply renders static there.
export default function Parallax({ speed = 0.12, className = "", children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || isMotionReduced() || !window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches) return;
    let frame = 0;
    function update() {
      frame = 0;
      const rect = el.parentElement.getBoundingClientRect();
      const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-offset * speed).toFixed(1)}px, 0)`;
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      el.style.transform = "";
    };
  }, [speed]);

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
