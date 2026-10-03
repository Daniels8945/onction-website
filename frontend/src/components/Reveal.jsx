import { useInView } from "../motion/useInView.js";

// Scroll reveal used across the site. Part of the motion system in
// src/motion (tokens.js explains the easing/duration choices); the CSS lives
// in index.css under "Motion system". Reduced motion shows content at once.
//   variant: "up" (default) | "fade" | "left" | "right" | "scale"
export default function Reveal({ children, delay = 0, className = "", as: Tag = "div", variant = "up" }) {
  const [ref, inView] = useInView();

  return (
    <Tag ref={ref} className={`rv rv-${variant} ${inView ? "is-in" : ""} ${className}`} style={{ "--d": `${delay}ms` }}>
      {children}
    </Tag>
  );
}
