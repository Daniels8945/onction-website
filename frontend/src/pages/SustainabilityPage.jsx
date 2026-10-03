import InnerHero from "../components/page/InnerHero.jsx";
import SectionTitle from "../components/page/SectionTitle.jsx";
import PageEnd from "../components/page/PageEnd.jsx";
import BoxLink from "../components/page/BoxLink.jsx";
import Reveal from "../components/Reveal.jsx";
import InView from "../motion/InView.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { grow, sdg } from "../data/content.js";
import { Check, Flame, Globe, Leaf, Target } from "../components/icons.jsx";

import solarFieldImg from "../../assets/site/solar-field.jpg";
import pipelineImg from "../../assets/wolfgang-weiser-n60sfcqBzE0-unsplash.jpg";
import windImg from "../../assets/konstantin-dyadyun-5_G1uVw7WRM-unsplash.jpg";
import spiralImg from "../../assets/site/green-spiral.jpg";
import aerialImg from "../../assets/site/aerial-network.jpg";
import growthImg from "../../assets/feey-xDqpTGU5JmQ-unsplash.jpg";

const PILLAR_VISUALS = [
  { icon: Flame, image: pipelineImg },
  { icon: Leaf, image: windImg },
  { icon: Target, image: spiralImg },
  { icon: Globe, image: aerialImg },
];

// The path to 2030, stated only in terms Onction already commits to.
const PATH = [
  { when: "Today", title: "Use what's already built", body: "Optimise capacity utilisation across existing gas-fired plants, reducing the need for new build." },
  { when: "Scaling", title: "Give renewables a route to market", body: "Smooth solar, wind and hydro production curves through trading so clean projects reach buyers reliably." },
  { when: "2030", title: "Net Zero", body: "A clear path toward carbon neutrality by 2030, alongside the SDG 7 goals below." },
];

export default function SustainabilityPage() {
  usePageMeta("Sustainability", "GR0W with Onction: efficient gas, renewable route-to-market, SDG 7 commitments and a path to Net Zero by 2030.");

  return (
    <main>
      <InnerHero crumb="Sustainability" title="A clear path to Net Zero by 2030" accent="Net Zero" intro={grow.intro} image={solarFieldImg}>
        <BoxLink href="#grow" light>GR0W with Onction</BoxLink>
      </InnerHero>

      {/* GR0W pillars — sticky stacking cards */}
      <section id="grow" className="scroll-mt-20 bg-white">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle eyebrow={grow.eyebrow} title={grow.heading} accent="Onction Energy" intro="Four commitments that shape how we trade." />
          <ol className="mt-14">
            {grow.pillars.map((p, i) => {
              const { icon: Icon, image } = PILLAR_VISUALS[i];
              return (
                <li key={p.title} className="stack-card lg:sticky" style={{ top: `${110 + i * 26}px`, zIndex: i + 1 }}>
                  <div className="mb-6 grid overflow-hidden bg-navy-900 text-white shadow-[0_-12px_40px_rgba(6,18,31,0.25)] md:grid-cols-[1.1fr_1fr] lg:min-h-[420px]">
                    <div className="flex flex-col justify-between p-8 sm:p-12">
                      <div className="flex items-center justify-between">
                        <span className="font-outfit text-sm text-teal-400">{String(i + 1).padStart(2, "0")} / {String(grow.pillars.length).padStart(2, "0")}</span>
                        <Icon width={30} height={30} className="text-teal-400" />
                      </div>
                      <div className="mt-10">
                        <h3 className="font-syne text-3xl font-medium sm:text-4xl">{p.title}</h3>
                        <p className="mt-4 max-w-md leading-relaxed text-white/70">{p.body}</p>
                      </div>
                    </div>
                    <div className="relative min-h-[220px] overflow-hidden">
                      <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-navy-900/60 to-transparent" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Path to 2030 */}
      <section id="net-zero" className="scroll-mt-20 bg-mist">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle eyebrow="Net Zero by 2030" title="The road from here to 2030" accent="2030" />
          <InView className="relative mt-14">
            <div className="line-draw absolute left-0 right-0 top-[11px] hidden h-0.5 bg-teal-500 md:block" aria-hidden="true" />
            <ol className="relative grid gap-10 md:grid-cols-3">
              {PATH.map((step, i) => (
                <Reveal as="li" key={step.title} delay={300 + i * 250} className="relative pl-8 md:pl-0">
                  <span className={`absolute left-0 top-1 block h-6 w-6 rounded-full border-4 border-mist md:relative md:top-0 ${i === PATH.length - 1 ? "bg-teal-500 ring-4 ring-teal-500/25" : "bg-navy-900"}`} aria-hidden="true" />
                  <p className="mt-0 font-outfit text-sm uppercase tracking-[0.18em] text-teal-700 md:mt-6">{step.when}</p>
                  <h3 className="mt-2 font-syne text-2xl font-medium text-navy-900">{step.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-slatey">{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </InView>
        </div>
      </section>

      {/* SDG 7 */}
      <section id="sdg7" className="relative isolate scroll-mt-20 overflow-hidden bg-navy-950 text-white">
        <div className="pointer-events-none absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-teal-600/25 blur-[130px]" aria-hidden="true" />
        <div className="wrap relative grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Reveal variant="scale">
              <p className="font-display text-[clamp(7rem,18vw,13rem)] font-bold leading-none text-teal-400">7</p>
            </Reveal>
            <SectionTitle light eyebrow={sdg.eyebrow} title={sdg.heading} accent="clean energy" intro={sdg.body} className="mt-2" />
          </div>
          <div>
            <p className="mb-5 font-outfit text-sm text-teal-200">By 2030, we aim to —</p>
            <ul className="space-y-4">
              {sdg.goals.map((g, i) => (
                <Reveal as="li" key={g} delay={i * 90} variant="right" className="flex items-start gap-3 bg-white/[0.07] p-5 ring-1 ring-white/10">
                  <Check width={20} height={20} className="mt-0.5 shrink-0 text-teal-300" />
                  <span className="text-[15px] leading-snug text-white/90">{g}</span>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={400} className="mt-8">
              <a href="https://sdgs.un.org/goals/goal7" target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 text-sm font-medium text-teal-300 hover:text-teal-200">
                About UN Sustainable Development Goal 7 <span className="nudge" aria-hidden="true">↗</span>
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      <PageEnd next={{ title: "Case studies", to: "/case-studies", image: growthImg, summary: "Trading solutions in action across the West African power market." }} />
    </main>
  );
}
