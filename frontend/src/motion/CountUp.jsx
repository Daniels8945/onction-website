import { useEffect, useState } from "react";
import { useInView } from "./useInView.js";
import { isMotionReduced } from "./motionPreference.js";

// Counts from `from` to the numeric `value` once visible (easeOutExpo).
// Non-numeric values render as-is.
export default function CountUp({ value, from = 0, duration = 1400, className = "" }) {
  const target = Number(value);
  const numeric = Number.isFinite(target);
  const [ref, inView] = useInView({ threshold: 0.4 });
  const [shown, setShown] = useState(numeric ? from : value);

  useEffect(() => {
    if (!numeric || !inView) return;
    if (isMotionReduced()) {
      setShown(target);
      return;
    }
    let frame;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setShown(Math.round(from + (target - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, numeric, target, from, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`} aria-label={String(value)}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
