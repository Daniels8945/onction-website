// Prev / dot-nav / next controls shared by CaseStudies and Testimonials.
// light=true styles for dark backgrounds.
export default function CarouselControls({
  total,
  current,
  onPrev,
  onNext,
  onChange,
  light = false,
}) {
  const chevron = (d) => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d === "left" ? "M15 18 9 12l6-6" : "M9 18 15 12 9 6"} />
    </svg>
  );

  const btnBase =
    "grid h-9 w-9 place-items-center rounded-full border transition";
  const btnStyle = light
    ? "border-white/25 text-white/80 hover:border-teal-400 hover:text-teal-400"
    : "border-black/10 text-navy-900 hover:border-teal-500 hover:text-teal-500";

  const dotActive = light ? "bg-teal-400" : "bg-teal-500";
  const dotIdle = light
    ? "bg-white/25 hover:bg-white/50"
    : "bg-navy-200 hover:bg-navy-400";

  return (
    <div className="flex items-center gap-4">
      <button onClick={onPrev} aria-label="Previous" className={`${btnBase} ${btnStyle}`}>
        {chevron("left")}
      </button>

      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            aria-label={`Go to item ${i + 1}`}
            aria-current={i === current}
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                i === current ? `w-6 ${dotActive}` : `w-3 ${dotIdle}`
              }`}
            />
          </button>
        ))}
      </div>

      <button onClick={onNext} aria-label="Next" className={`${btnBase} ${btnStyle}`}>
        {chevron("right")}
      </button>
    </div>
  );
}
