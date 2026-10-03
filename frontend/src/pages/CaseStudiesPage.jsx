import { useState } from "react";
import { Link } from "react-router-dom";
import InnerHero from "../components/page/InnerHero.jsx";
import PageEnd from "../components/page/PageEnd.jsx";
import Reveal from "../components/Reveal.jsx";
import CountUp from "../motion/CountUp.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { caseStudies, solutions } from "../data/content.js";
import { caseStudySolution, slugify } from "../data/site.js";
import { Arrow } from "../components/icons.jsx";

import chartImg from "../../assets/maxim-hopman-fiXLQXAhCfk-unsplash.jpg";
import handshakeImg from "../../assets/cytonn-photography-vWchRczcQwM-unsplash.jpg";

// The headline result of each study, taken from its own text in content.js.
const RESULT = {
  "Renewable Route-to-Market": { value: 50, suffix: " MW", label: "solar project brought to financing" },
  "Cross-border Trading": { value: 1, suffix: "st", label: "privately arranged Ghana–Nigeria bilateral" },
  "Gas-fired Optimisation": { value: 18, prefix: "+", suffix: " pts", label: "improvement in plant load factor" },
  "Banking & Swaps": { value: 2, suffix: " markets", label: "balanced across seasons" },
  "C&I Direct Supply": { value: 22, suffix: "%", label: "saving on energy costs" },
  Advisory: { value: 9, prefix: "<", suffix: " mo", label: "time-to-PPA, down from 18" },
};

const solutionTitle = (slug) => solutions.items.find((s) => slugify(s.title) === slug)?.title;

export default function CaseStudiesPage() {
  usePageMeta("Case studies", "Real transactions across the West African power market: renewables route-to-market, cross-border trading, gas optimisation, swaps, C&I supply and advisory.");
  const categories = ["All", ...new Set(caseStudies.map((c) => c.category))];
  const [filter, setFilter] = useState("All");
  const visible = caseStudies.filter((c) => filter === "All" || c.category === filter);

  return (
    <main>
      <InnerHero crumb="Case studies" title="Trading solutions in action" accent="in action" intro="Real transactions across the West African power market — what the problem was, what we structured, and what changed." image={chartImg} compact />

      <section className="bg-white">
        <div className="wrap py-14 sm:py-16">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter case studies">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={filter === c}
                onClick={() => setFilter(c)}
                className={`border px-4 py-2 text-sm transition-colors duration-400 ${filter === c ? "border-navy-900 bg-navy-900 text-white" : "border-black/15 text-navy-900 hover:border-teal-500 hover:text-teal-700"}`}
              >
                {c}
              </button>
            ))}
          </div>

          <ol className="mt-12 border-t border-black/10">
            {visible.map((c, i) => {
              const r = RESULT[c.category];
              const sol = caseStudySolution[c.category];
              return (
                <li key={c.title} id={slugify(c.title)} className="scroll-mt-28 border-b border-black/10">
                  <Reveal className="grid gap-8 py-12 md:grid-cols-[minmax(220px,300px)_1fr] md:gap-14">
                    <div>
                      {r && (
                        <>
                          <p className="font-display text-5xl font-bold text-navy-900 sm:text-6xl">
                            {r.prefix && <span className="text-teal-500">{r.prefix}</span>}
                            <CountUp value={r.value} />
                            <span className="text-[0.55em] text-teal-500">{r.suffix}</span>
                          </p>
                          <p className="mt-2 max-w-[16rem] text-sm text-slatey">{r.label}</p>
                        </>
                      )}
                    </div>
                    <div>
                      <p className="font-outfit text-xs uppercase tracking-[0.18em] text-teal-700">
                        {String(i + 1).padStart(2, "0")} · {c.category}
                      </p>
                      <h2 className="mt-3 max-w-3xl font-syne text-2xl font-medium leading-snug text-navy-900 sm:text-3xl">{c.title}</h2>
                      <p className="mt-4 max-w-3xl leading-relaxed text-slatey">{c.body}</p>
                      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
                        {sol && (
                          <Link to={`/solutions#${sol}`} className="group inline-flex items-center gap-2 text-sm font-semibold text-navy-900 hover:text-teal-700">
                            Solution: {solutionTitle(sol)} <Arrow width={16} height={16} className="nudge text-teal-600" />
                          </Link>
                        )}
                        <Link to={`/contact?topic=${encodeURIComponent(c.category)}`} className="group inline-flex items-center gap-2 text-sm font-semibold text-navy-900 hover:text-teal-700">
                          Discuss a similar deal <Arrow width={16} height={16} className="nudge text-teal-600" />
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <PageEnd next={{ title: "Partner with Onction", to: "/partners", image: handshakeImg, summary: "Generators, utilities, large consumers and suppliers." }} />
    </main>
  );
}
