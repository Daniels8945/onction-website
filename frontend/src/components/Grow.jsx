import { grow } from "../data/content.js";
import SectionHeader from "./SectionHeader.jsx";
import IconBox from "./IconBox.jsx";
import Reveal from "./Reveal.jsx";
import { Flame, Leaf, Target, Globe } from "./icons.jsx";

const pillarIcons = [Flame, Leaf, Target, Globe];

export default function Grow() {
  return (
    <section id="grow" className="scroll-mt-20 bg-white">
      <div className="wrap py-20 sm:py-24">
        <SectionHeader eyebrow={grow.eyebrow} heading={grow.heading} intro={grow.intro} />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {grow.pillars.map((p, idx) => {
            const Icon = pillarIcons[idx % pillarIcons.length];
            return (
              <Reveal key={p.title} delay={idx * 80}>
                <div className="group h-full overflow-hidden rounded-2xl bg-navy-900 p-6 text-white transition hover:bg-navy-800">
                  <IconBox icon={Icon} variant="ghost" size="lg" />
                  <h3 className="mt-5 text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{p.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
