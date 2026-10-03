import { Link } from "react-router-dom";
import { Arrow } from "../icons.jsx";

// Tata's outlined, uppercase CTA ("EXPLORE MORE →"). On hover a teal fill
// sweeps in from the left behind the label and the arrow nudges forward.
export default function BoxLink({ to, href, children, light = false, className = "", ...rest }) {
  const classes = `group relative inline-flex items-center gap-3 overflow-hidden border px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] transition-colors duration-400 ${
    light ? "border-[#f8f5ec] text-white hover:text-navy-950" : "border-navy-900 text-navy-900 hover:text-navy-950"
  } ${className}`;
  const inner = (
    <>
      <span className="absolute inset-0 origin-left scale-x-0 bg-teal-500 transition-transform duration-500 ease-out-expo group-hover:scale-x-100 group-focus-visible:scale-x-100" aria-hidden="true" />
      <span className="relative">{children}</span>
      <Arrow width={18} height={18} className="nudge relative" />
    </>
  );
  if (href) return <a href={href} className={classes} {...rest}>{inner}</a>;
  return <Link to={to} className={classes} {...rest}>{inner}</Link>;
}
