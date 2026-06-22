import { useCarousel } from "../hooks/useCarousel.js";
import { testimonials } from "../data/content.js";
import SectionHeader from "./SectionHeader.jsx";
import CarouselControls from "./CarouselControls.jsx";
import Reveal from "./Reveal.jsx";

export default function Testimonials() {
  const total = testimonials.length;
  const { index, setIndex, prev, next, pauseHandlers } = useCarousel(total, 7000);
  const t = testimonials[index];

  return (
    <section className="scroll-mt-20 bg-white" {...pauseHandlers}>
      <div className="wrap py-20 sm:py-24">
        <SectionHeader eyebrow="Testimonials" heading="What our partners say" />

        <Reveal key={index} className="mt-12">
          <blockquote className="rounded-none border border-black/5 bg-mist p-8 sm:p-10 lg:p-12">
            {/* Large decorative quote mark */}
            <svg
              className="mb-5 text-teal-500/30"
              width="48"
              height="36"
              viewBox="0 0 48 36"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M0 36V22.5C0 10.1 7.5 2.4 22.5 0l2.3 4.1C16 5.8 11.5 10.2 10.5 17H18V36H0Zm26 0V22.5C26 10.1 33.5 2.4 48.5 0l2.3 4.1C42 5.8 37.5 10.2 36.5 17H44V36H26Z" />
            </svg>

            <p className="text-lg leading-relaxed text-navy-900 sm:text-xl lg:text-2xl lg:leading-relaxed">
              "{t.quote}"
            </p>

            <footer className="mt-8 flex items-center gap-4">
              {/* Avatar placeholder — initials */}
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy-900 font-heading text-sm font-bold text-teal-400">
                {t.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")}
              </span>
              <div>
                <p className="font-semibold text-navy-900">{t.name}</p>
                <p className="text-sm text-slatey">
                  {t.company} · {t.sector}
                </p>
              </div>
            </footer>
          </blockquote>
        </Reveal>

        {/* Counter + prev/next/dots — sits below the quote */}
        <Reveal delay={80} className="mt-8 flex items-center justify-end gap-5">
          {/* <span className="flex items-baseline whitespace-nowrap font-outfit text-xs text-slatey">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span className="text-xl"> / </span>
            <span>{String(total).padStart(2, "0")}</span>
          </span> */}

          <CarouselControls
            total={total}
            current={index}
            onPrev={prev}
            onNext={next}
            onChange={setIndex}
          />
        </Reveal>
      </div>
    </section>
  );
}
