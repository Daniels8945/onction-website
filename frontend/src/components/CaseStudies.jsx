import { useCarousel } from "../hooks/useCarousel.js";
import { caseStudies } from "../data/content.js";
import SectionHeader from "./SectionHeader.jsx";
import CarouselControls from "./CarouselControls.jsx";
import Reveal from "./Reveal.jsx";
import { Arrow } from "./icons.jsx";

// Shows 3 cards on desktop (wrapping), 1 on mobile. Prev/Next step by 1.
export default function CaseStudies() {
  const total = caseStudies.length;
  const { index, setIndex, prev, next, pauseHandlers } = useCarousel(total, 0);

  // Build the 3 visible indices for desktop, wrapping around.
  const visible = [0, 1, 2].map((offset) => (index + offset) % total);

  return (
    <section className="scroll-mt-20 bg-navy-950 text-white" {...pauseHandlers}>
      <div className="wrap py-20 sm:py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Case studies"
            heading="Trading solutions in action"
            intro="Real transactions across the West African power market."
            light
          />
          <Reveal delay={80} className="shrink-0">
            <CarouselControls
              total={total}
              current={index}
              onPrev={prev}
              onNext={next}
              onChange={setIndex}
              light
            />
          </Reveal>
        </div>

        {/* Desktop: 3-up sliding window */}
        <div className="mt-12 hidden gap-5 lg:grid lg:grid-cols-3">
          {visible.map((idx, slot) => (
            <Reveal key={`${index}-${slot}`} delay={slot * 80}>
              <CaseCard study={caseStudies[idx]} />
            </Reveal>
          ))}
        </div>

        {/* Mobile: single card */}
        <div className="mt-10 lg:hidden">
          <Reveal key={index}>
            <CaseCard study={caseStudies[index]} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function CaseCard({ study }) {
  return (
    <article className="flex h-full flex-col rounded-none border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition hover:border-teal-500/40 hover:bg-white/[0.07]">
      <p className="font-outfit text-xs uppercase tracking-[0.18em] text-teal-400">
        {study.category}
      </p>
      <h3 className="mt-3 flex-1 text-base font-semibold leading-snug text-white sm:text-[17px]">
        {study.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-white/65">{study.body}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-teal-400">
        Read more <Arrow width={14} height={14} />
      </span>
    </article>
  );
}
