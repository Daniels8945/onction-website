// Reusable icon container used across Solutions, Grow, and Highlights.
// variant: "dark" | "light" | "ghost"
// size:    "md" (default, h-11 w-11) | "lg" (h-12 w-12)
const variants = {
  dark: "bg-navy-900 text-teal-400 group-hover:bg-teal-500 group-hover:text-navy-950",
  light: "bg-teal-500/10 text-teal-600",
  ghost: "bg-white/5 text-teal-400 ring-1 ring-white/10",
};

export default function IconBox({ icon: Icon, variant = "dark", size = "md", className = "" }) {
  const dim = size === "lg" ? "h-12 w-12" : "h-11 w-11";
  const iconPx = size === "lg" ? 24 : 22;

  return (
    <span
      className={`grid shrink-0 ${dim} place-items-center rounded-xl transition ${variants[variant]} ${className}`}
    >
      <Icon width={iconPx} height={iconPx} />
    </span>
  );
}
