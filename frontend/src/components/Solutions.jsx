import { solutions } from "../data/content.js";
import SectionHeader from "./SectionHeader.jsx";
import IconBox from "./IconBox.jsx";
import Reveal from "./Reveal.jsx";
import { Arrow, Handshake, Coins, Globe, Exchange, Sun, Gauge, Layers, Chat, Target } from "./icons.jsx";

const icons = [Handshake, Coins, Globe, Exchange, Sun, Gauge, Layers, Chat, Target];

export default function Solutions() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-mist">
      <div className="wrap py-20 sm:py-24">
        <SectionHeader
          eyebrow={solutions.eyebrow}
          heading={solutions.heading}
          intro={solutions.intro}
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.items.map((item, idx) => {
            const Icon = icons[idx % icons.length];
            return (
              <Reveal key={item.title} delay={(idx % 3) * 80}>
                <div className="card group h-full">
                  <IconBox icon={Icon} variant="dark" />
                  <h3 className="mt-5 text-lg font-semibold text-navy-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slatey">{item.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 opacity-0 transition group-hover:opacity-100">
                    Learn more <Arrow width={15} height={15} />
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
