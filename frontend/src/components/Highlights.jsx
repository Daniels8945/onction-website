import { highlights } from "../data/content.js";
import SectionHeader from "./SectionHeader.jsx";
import IconBox from "./IconBox.jsx";
import Reveal from "./Reveal.jsx";
import { Bolt, Globe, Gauge, Sun, Layers, Target } from "./icons.jsx";

const hlIcons = [Bolt, Globe, Gauge, Sun, Layers, Target];

export default function Highlights() {
  return (
    <section id="why" className="scroll-mt-20 bg-mist">
      <div className="wrap py-20 sm:py-24">
        <SectionHeader eyebrow={highlights.eyebrow} heading={highlights.heading} />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.items.map((item, idx) => {
            const Icon = hlIcons[idx % hlIcons.length];
            return (
              <Reveal key={item.title} delay={(idx % 3) * 80}>
                <div className="flex h-full gap-4 rounded-none border border-black/5 bg-white p-6">
                  <IconBox icon={Icon} variant="light" />
                  <div>
                    <h3 className="text-base font-semibold text-navy-900">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slatey">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
