import { useInView } from "./useInView.js";

// Adds .is-in to a wrapper once it scrolls into view, so any descendant
// motion classes (.dr line-draws, .sw word masks, .rv reveals) can key off it.
export default function InView({ as: Tag = "div", className = "", threshold = 0.2, children, ...rest }) {
  const [ref, inView] = useInView({ threshold });
  return (
    <Tag ref={ref} className={`${className} ${inView ? "is-in" : ""}`} {...rest}>
      {children}
    </Tag>
  );
}
