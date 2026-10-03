import { useInView } from "./useInView.js";

// Image uncovered by a clip-path wipe while it settles from a slight zoom —
// the "window opening onto the scene" reveal used for editorial imagery.
// The observer watches the outer box: Chrome counts a target's own clip-path
// when computing intersection, so a fully clipped element would never
// register as visible.
export default function ImageReveal({ src, alt = "", className = "", imgClassName = "", from = "bottom", delay = 0, eager = false }) {
  const [ref, inView] = useInView({ threshold: 0.2 });
  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className={`ir ir-${from} ${inView ? "is-in" : ""} absolute inset-0 overflow-hidden`} style={{ "--d": `${delay}ms` }}>
        <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className={`h-full w-full object-cover ${imgClassName}`} />
      </div>
    </div>
  );
}
