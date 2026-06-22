import { useCarousel } from "../hooks/useCarousel.js";
import { heroSlides } from "../data/content.js";
import { Arrow } from "./icons.jsx";

import powerLineImg from "../../assets/fre-sonneveld-q6n8nIrDQHE-unsplash.jpg";
import damImg from "../../assets/tahamie-farooqui-kMHBf1h4pU8-unsplash.jpg";
import solarImg from "../../assets/harisankar-hp6Xj7LyZ1E-unsplash.jpg";
import pipelineImg from "../../assets/wolfgang-weiser-n60sfcqBzE0-unsplash.jpg";

// One background photo per slide, in the same order as heroSlides.
const SLIDE_IMAGES = [powerLineImg, damImg, solarImg, pipelineImg];

// ─── Chevron helper (avoids importing svg separately) ───────────────────────
function Chevron({ dir }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 18 9 12l6-6" : "M9 18 15 12 9 6"} />
    </svg>
  );
}

// ─── Main Hero ───────────────────────────────────────────────────────────────
export default function Hero() {
  const total = heroSlides.length;
  const { index: i, setIndex, prev, next, pauseHandlers } = useCarousel(total, 7000);
  const slide = heroSlides[i];

  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-navy-950 text-white"
      {...pauseHandlers}
    >
      {/* ── Background photo — crossfades between slides ── */}
      <div className="absolute inset-0" aria-hidden="true">
        {SLIDE_IMAGES.map((src, idx) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              idx === i ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {/* Dark overlay: left-to-right for text legibility, top/bottom to blend with header & next section */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/70 to-navy-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-navy-950/40" />
        {/* Brand signature current lines, kept subtle over the photo */}
        <div className="absolute left-0 top-1/3 h-px w-full overflow-hidden">
          <div className="h-px w-1/3 animate-current bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
        </div>
        <div className="absolute left-0 top-2/3 h-px w-full overflow-hidden">
          <div
            className="h-px w-1/4 animate-current bg-gradient-to-r from-transparent via-spark-400/60 to-transparent"
            style={{ animationDelay: "3s" }}
          />
        </div>
      </div>

      <div className="wrap relative pb-16 pt-28 sm:pt-18">
        {/* Breadcrumb — TATA style */}
        <a href="#" className="text-[clamp(14px,1.5vw,14px)] text-[#f8f5ec] font-outfit font-medium tracking-wide">
          <span className="mx-1.5 cursor-pointer font-light">Home</span><span className="mx-1.5">/</span> Bulk Electricity Trading
        </a>

        {/* ── Slide content — left-aligned over the full-bleed photo ── */}
        <div className="flex min-h-[58vh] items-center">
          <div key={i} className="animate-fadeUp max-w-xl">
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-[3.4rem]">
              {slide.title}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-[17px]">
              {slide.body}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href={slide.cta.href} className="btn-primary rounded-none">
                {slide.cta.label} <Arrow width={18} height={18} />
              </a>
              <a href="#enquire" className="btn-ghost rounded-none">
                Talk to our desk
              </a>
            </div>
          </div>
        </div>

        {/* ── Navigation row: counter + dots + square arrows ──
            Mobile: stacked vertically (counter, then dots, then buttons),
            matching the reference. From sm up: spreads out horizontally. */}
        <div className="mt-14 flex flex-col items-start gap-12 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 md:gap-24">
          <div className="flex flex-col gap-8 sm:gap-4">
            <span className="flex items-baseline whitespace-nowrap font-outfit text-lg text-[#f8f5ec]">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="text-3xl"> /  </span>
              <span>{String(total).padStart(2, "0")}</span>
            </span>

            {/* Dot indicators */}
            <div className="flex items-center gap-2">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setIndex(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  aria-current={idx === i}
                >
                  <span
                    className={`block h-1 rounded-full transition-all duration-300 ${
                      idx === i
                        ? "w-8 bg-teal-400"
                        : "w-4 bg-white/20 hover:bg-white/45"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Square prev/next buttons — compact on phones, full size from sm up */}
          <div className="flex gap-2 sm:gap-4">
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-none border border-[#f8f5ec] text-white/60 transition hover:border-teal-400 hover:text-teal-400 sm:h-12 sm:w-12 md:h-14 md:w-14"
            >
              <Chevron dir="left" />
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-none border border-[#f8f5ec] text-white/60 transition hover:border-teal-400 hover:text-teal-400 sm:h-12 sm:w-12 md:h-14 md:w-14"
            >
              <Chevron dir="right" />
            </button>
          </div>
        </div>

        {/* Bottom-right wordmark watermark — TATA reference equivalent.
            Visible on mobile too (just smaller), not hidden below sm. */}
        <div className="pointer-events-none absolute bottom-4 right-0 flex items-center gap-1 pr-[clamp(1.25rem,3vw,4rem)] text-xs uppercase tracking-[0.18em] text-white/40 sm:bottom-6 sm:gap-1.5">
          <span className="font-outfit text-sm font-bold text-[#f8f5ec] sm:text-lg">Onction</span>
          <span className="font-outfit text-sm text-white/70 sm:text-lg">Power Trading</span>
        </div>
      </div>
    </section>
  );
}
