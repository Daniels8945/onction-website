import { Link } from "react-router-dom";
import InnerHero from "../components/page/InnerHero.jsx";
import SectionTitle from "../components/page/SectionTitle.jsx";
import PageEnd from "../components/page/PageEnd.jsx";
import ImageReveal from "../motion/ImageReveal.jsx";
import SplitText from "../motion/SplitText.jsx";
import Reveal from "../components/Reveal.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { caseStudies, solutions } from "../data/content.js";
import { caseStudySolution, slugify, solutionGroups } from "../data/site.js";
import { SOLUTION_IMAGES } from "../data/solutionImages.js";
import { Arrow } from "../components/icons.jsx";

import stationImg from "../../assets/newpowa-wbWDnQ-1Ui0-unsplash.jpg";
import pylonsImg from "../../assets/fre-sonneveld-q6n8nIrDQHE-unsplash.jpg";

const imageFor = (title) => SOLUTION_IMAGES[solutions.items.findIndex((s) => s.title === title)];
const caseFor = (slug) => caseStudies.find((c) => caseStudySolution[c.category] === slug);

function SolutionItem({ item, index }) {
  const study = caseFor(item.slug);
  return (
    <article id={item.slug} className="scroll-mt-28 border-t border-black/10 py-12 first:border-0 first:pt-0">
      <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
        <ImageReveal src={imageFor(item.title)} alt="" className="aspect-[4/3]" from={index % 2 ? "right" : "left"} />
        <div>
          <p className="font-outfit text-sm text-teal-600">{String(index + 1).padStart(2, "0")}</p>
          <SplitText as="h3" text={item.title} className="mt-2 font-syne text-2xl font-medium leading-tight text-navy-900 sm:text-3xl" />
          <Reveal delay={150}>
            <p className="mt-4 leading-relaxed text-slatey">{item.body}</p>
          </Reveal>
          {study && (
            <Reveal delay={220}>
              <Link to={`/case-studies#${slugify(study.title)}`} className="group mt-6 block border-l-2 border-teal-500 bg-mist px-5 py-4 transition-colors duration-400 hover:bg-teal-50">
                <span className="block text-[11px] uppercase tracking-[0.16em] text-teal-700">In practice · {study.category}</span>
                <span className="mt-1 flex items-start justify-between gap-4 text-sm font-medium text-navy-900">
                  {study.title}
                  <Arrow width={16} height={16} className="nudge mt-0.5 shrink-0 text-teal-600" />
                </span>
              </Link>
            </Reveal>
          )}
          <Reveal delay={280}>
            <Link to={`/contact?topic=${encodeURIComponent(item.title)}`} className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-navy-900 hover:text-teal-700">
              Discuss with the desk <Arrow width={16} height={16} className="nudge text-teal-600" />
            </Link>
          </Reveal>
        </div>
      </div>
    </article>
  );
}

export default function SolutionsPage() {
  usePageMeta("Business solutions", "Power purchase and sale, banking and swaps, cross-border WAPP trading, renewable route-to-market, portfolio management and advisory.");
  let running = 0;

  return (
    <main>
      <InnerHero crumb="Business solutions" title={solutions.heading} accent="value chain" intro={solutions.intro} image={stationImg}>
        <div className="flex flex-wrap gap-3">
          {solutionGroups.map((g) => (
            <a key={g.key} href={`#${g.key}`} className="group inline-flex items-center gap-2 border border-white/30 px-4 py-2 text-sm text-white transition-colors duration-400 hover:border-teal-400 hover:text-teal-400">
              {g.title}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform duration-400 group-hover:translate-y-0.5" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
            </a>
          ))}
        </div>
      </InnerHero>

      {solutionGroups.map((g, gi) => {
        const start = running;
        running += g.items.length;
        return (
          <section key={g.key} id={g.key} className={`scroll-mt-20 ${gi % 2 ? "bg-mist" : "bg-white"}`}>
            <div className="wrap grid gap-10 py-20 sm:py-24 lg:grid-cols-[minmax(260px,360px)_1fr] lg:gap-16">
              <div>
                <div className="lg:sticky lg:top-28">
                  <SectionTitle eyebrow={`${String(gi + 1).padStart(2, "0")} — Solutions`} title={g.title} intro={g.lede} />
                  <Reveal delay={200}>
                    <ul className="mt-8 hidden space-y-2 text-sm lg:block">
                      {g.items.map((it) => (
                        <li key={it.slug}>
                          <a href={`#${it.slug}`} className="group inline-flex items-center gap-2 text-slatey hover:text-teal-700">
                            <span className="h-px w-4 bg-teal-500 transition-all duration-400 group-hover:w-7" aria-hidden="true" />
                            {it.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                </div>
              </div>
              <div className="min-w-0">
                {g.items.map((item, i) => (
                  <SolutionItem key={item.slug} item={item} index={start + i} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <PageEnd next={{ title: "How we trade", to: "/how-we-trade", image: pylonsImg, summary: "Follow a megawatt from the plant, through our desk, to the people who need it." }} />
    </main>
  );
}
