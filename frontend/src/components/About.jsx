import { useState } from "react";
import { about } from "../data/content.js";
import SectionHeader from "./SectionHeader.jsx";
import Reveal from "./Reveal.jsx";

export default function About() {
  const [active, setActive] = useState(about.tabs[0].key);
  const current = about.tabs.find((t) => t.key === active);

  return (
    <section id="about" className="scroll-mt-20 bg-white">
      <div className="wrap py-20 sm:py-24">
        <SectionHeader heading={about.heading} />

        <div className="mt-12 grid gap-10 lg:grid-cols-[260px_1fr]">
          {/* Tab rail */}
          <Reveal>
            <div
              className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1"
              role="tablist"
              aria-label="About Onction"
            >
              {about.tabs.map((t, idx) => {
                const on = t.key === active;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActive(t.key)}
                    className={`flex shrink-0 items-center gap-3 rounded-none px-4 py-3 text-left text-sm font-medium transition lg:shrink ${
                      on
                        ? "bg-navy-900 text-white"
                        : "text-slatey hover:bg-mist hover:text-navy-900"
                    }`}
                  >
                    {/* <span className={`font-mono text-xs ${on ? "text-teal-400" : "text-teal-600"}`}>
                      0{idx + 1}
                    </span> */}
                    {t.tab}
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Panel */}
          <Reveal key={active}>
            <div
              role="tabpanel"
              className="rounded-none border border-black/5 bg-mist p-8 sm:p-10"
            >
              <h3 className="text-xl font-semibold text-navy-900 sm:text-2xl">
                {current.title}
              </h3>
              <div className="mt-4 space-y-4">
                {current.body.map((p, k) => (
                  <p key={k} className="leading-relaxed text-ink/80">
                    {p}
                  </p>
                ))}
              </div>

              <div className="mt-8 grid gap-4 border-t border-black/5 pt-8 sm:grid-cols-3">
                {about.strengths.map((s) => (
                  <div key={s.title}>
                    <p className="font-syne font-light text-xs uppercase tracking-wide text-teal-600">
                      {s.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-snug text-navy-900">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
