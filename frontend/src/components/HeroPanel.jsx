import { useCarousel } from "../hooks/useCarousel.js";
import { quickLinks, badges } from "../data/content.js";
import { Arrow } from "./icons.jsx";
import { FaArrowRightLong } from "react-icons/fa6";

// Square arrow button reused for badge prev/next — extracted to avoid repetition.
function SquareBtn({ dir, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-12 w-12 place-items-center rounded-none border border-[#f8f5ec] text-teal-400 transition hover:border-teal-400 hover:text-teal-400"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d={dir === "left" ? "M15 18 9 12l6-6" : "M9 18 15 12 9 6"} />
      </svg>
    </button>
  );
}

// Bookmark icon — TATA's "badge of honor" marker.
function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      className="text-teal-400" aria-hidden="true">
      <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// Fixed card width + gap driving the slide offset below — keep these in sync
// with the className widths on the card itself.
const BADGE_CARD_WIDTH = 340;
const BADGE_CARD_GAP = 16;
const BADGE_STEP = BADGE_CARD_WIDTH + BADGE_CARD_GAP;

export default function HeroPanel() {
  // Auto-advance every 5.5 s; the row clips so the next card always peeks in.
  const total = badges.length;
  const { index, prev, next, setIndex, pauseHandlers } = useCarousel(total, 5500);

  return (
    <>
      {/* ── Quick Links | Badges of honor ───────────────────────────────── */}
      {/* overflow-hidden here clips the badge row's right-side bleed at the
          true viewport edge instead of creating a page-wide horizontal scrollbar */}
      <div className="overflow-hidden bg-navy-900" {...pauseHandlers}>
        <div className="wrap">
          <div className="grid grid-cols-1 divide-y divide-[#f8f5ec] md:grid-cols-[5fr_1px_7fr] md:divide-y-0">

            {/* Quick Links — 30% column */}
            <div className="py-10 w-2/4 md:w-auto">
              <h3 className="mb-10  font-normal lg:text-4xl text-[#f8f5ec] font-syne">
                Quick Links
              </h3>

              <div className="grid grid-cols-2 gap-x-6 gap-y-6 mr-12">
                {quickLinks.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    className="flex items-center justify-between text-[clamp(12px,1.5vw,17px)] font-regular text-[#f8f5ec] transition group">

                    {l.label}
                    <FaArrowRightLong className="ml-2 text-[clamp(18px,2.2vw,18px)] text-teal-500 transition-transform duration-300 group-hover:translate-x-3 group-hover:scale-x-150"/>
                  </a>
                ))}
              </div>
            </div>

            {/* Vertical divider (desktop) */}
            <div className="hidden w-px bg-[#f8f5ec] md:block md:my-auto md:h-[90%]" />

            {/* Badges of honor — 70% column. min-w-0 stops the grid track from
                growing to fit the wide card row below (grid items default to
                min-width:auto, which otherwise lets intrinsic content blow
                past the 5fr/7fr ratio and break the layout). */}
            <div className="py-10 md:pl-10 min-w-0">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-outfit text-lg text-[#f8f5ec]">
                  Badge of honor
                </h3>
                <div className="flex gap-4">
                  <SquareBtn dir="left" onClick={prev} label="Previous badge" />
                  <SquareBtn dir="right" onClick={next} label="Next badge" />
                </div>
              </div>

              {/* Clipping viewport — wider than the column so the row visually
                  bleeds past the page's content edge, like it's coming out
                  of the page; the section-level overflow-hidden cuts it at
                  the true viewport edge. */}
              <div className="w-full overflow-x-hidden md:w-[calc(100%+6vw)] lg:w-[calc(100%+12vw)]">
                <div
                  className="flex gap-4 transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${index * BADGE_STEP}px)` }}
                >
                  {badges.map((b, idx) => (
                    <div
                      key={idx}
                      className="flex justify-center w-[340px] shrink-0 rounded-none border border-[#f8f5ec] bg-white/[0.04] p-5 transition hover:border-teal-500/30"
                    >
                      <div className="flex flex-col justify-center">
                          <BookmarkIcon />
                          <p className="mt-3 text-lg text-bold leading-snug text-[#f8f5ec]">{b}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dot indicators for badge carousel */}
              <div className="mt-5 flex gap-1.5">
                {badges.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setIndex(idx)}
                    aria-label={`Badge ${idx + 1}`}
                    aria-current={idx === index}
                  >
                    <span
                      className={`block h-1 rounded-full transition-all duration-300 ${
                        idx === index ? "w-5 bg-teal-400" : "w-2.5 bg-white/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Capability deck CTA band — "Dive into the TPTCL world…" equivalent */}
      <div className="bg-navy-800">
        <div className="py-16 wrap flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-3xl font-medium font-outfit text-[#f8f5ec]">
            Dive into the Onction Energy capability deck
          </p>
          <a
            href="#"
            className="inline-flex shrink-0 items-center gap-2 rounded-none border border-[#f8f5ec] px-5 py-2.5 text-xl font-medium text-white/85 transition hover:border-teal-400 hover:text-teal-400"
          >
            READ MORE <Arrow width={15} height={15} />
          </a>
        </div>
      </div>
    </>
  );
}
