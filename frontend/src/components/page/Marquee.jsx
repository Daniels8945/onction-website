import { Check } from "../icons.jsx";

// Continuously scrolling strip (Tata's scroll-left bands). The list is
// rendered twice so the loop is seamless; hovering pauses it, and the
// duplicate copy is hidden from assistive tech.
export default function Marquee({ items, dark = true, speed = 40 }) {
  const row = (hidden) => (
    <ul className="flex shrink-0 items-center gap-12 pr-12" aria-hidden={hidden || undefined}>
      {items.map((c) => (
        <li key={c} className={`flex items-center gap-2.5 whitespace-nowrap font-outfit text-base ${dark ? "text-white/85" : "text-navy-900"}`}>
          <Check width={18} height={18} className={dark ? "text-teal-400" : "text-teal-600"} />
          {c}
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`group overflow-hidden py-6 ${dark ? "bg-navy-900" : "bg-mist"}`}>
      <div className="marquee flex w-max group-hover:[animation-play-state:paused]" style={{ animationDuration: `${speed}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
