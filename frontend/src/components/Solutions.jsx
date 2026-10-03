import { solutions } from "../data/content.js";
import SectionHeader from "./SectionHeader.jsx";
import Reveal from "./Reveal.jsx";
import { Link } from "react-router-dom";
import { Arrow } from "./icons.jsx";

import { SOLUTION_IMAGES } from "../data/solutionImages.js";
import { slugify } from "../data/site.js";

export default function Solutions() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-mist">
      <div className="wrap py-20 sm:py-24">
        <SectionHeader heading={solutions.heading} intro={solutions.intro} />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.items.map((item, idx) => (
            <Reveal key={item.title} delay={(idx % 3) * 80}>
              <Link to={`/solutions#${slugify(item.title)}`} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              <article className="group flex h-full flex-col overflow-hidden rounded-none border border-black/5 bg-white shadow-[0_1px_2px_rgba(10,31,60,0.04)] transition hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(10,31,60,0.10)]">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={SOLUTION_IMAGES[idx]}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold text-navy-900">{item.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slatey">{item.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-teal-600">
                    Learn more <Arrow width={14} height={14} className="nudge" />
                  </span>
                </div>
              </article>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
