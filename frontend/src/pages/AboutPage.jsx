import InnerHero from "../components/page/InnerHero.jsx";
import SectionRail from "../components/page/SectionRail.jsx";
import PageEnd from "../components/page/PageEnd.jsx";
import BoxLink from "../components/page/BoxLink.jsx";
import Marquee from "../components/page/Marquee.jsx";
import SplitText from "../motion/SplitText.jsx";
import ImageReveal from "../motion/ImageReveal.jsx";
import Reveal from "../components/Reveal.jsx";
import IconBox from "../components/IconBox.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { about, company, credentials, highlights } from "../data/content.js";
import { Bolt, Check, Gauge, Globe, Layers, Pin, Sun, Target } from "../components/icons.jsx";

import substationImg from "../../assets/site/substation.jpg";
import powerStationImg from "../../assets/newpowa-wbWDnQ-1Ui0-unsplash.jpg";
import tradingImg from "../../assets/maxim-hopman-fiXLQXAhCfk-unsplash.jpg";

// Long-form "Who we are" page in the pattern of Tata Power's story pages: a
// sticky Sections rail on the left, chapters on the right. The chapters are
// the four About tabs from the landing page, told in full.
const tab = (key) => about.tabs.find((t) => t.key === key);
const SECTIONS = [
  { id: "story", label: "Who we are" },
  { id: "licence", label: "Licence & mandate" },
  { id: "services", label: "End-to-end services" },
  { id: "presence", label: "Our presence" },
  { id: "why", label: "Why Onction" },
];
const hlIcons = [Bolt, Globe, Gauge, Sun, Layers, Target];

function Chapter({ id, eyebrow, title, accent, children }) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-black/10 py-16 first:pt-0 last:border-0 sm:py-20">
      <Reveal variant="fade">
        <p className="eyebrow mb-3">{eyebrow}</p>
      </Reveal>
      <SplitText text={title} accent={accent} className="max-w-3xl font-syne text-3xl font-medium leading-[1.12] text-navy-900 sm:text-[2.6rem]" />
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Paragraphs({ items }) {
  return (
    <div className="max-w-3xl space-y-5">
      {items.map((p, i) => (
        <Reveal key={i} delay={i * 80}>
          <p className="text-[17px] leading-relaxed text-ink/80">{p}</p>
        </Reveal>
      ))}
    </div>
  );
}

export default function AboutPage() {
  usePageMeta("About us", "Onction Services Limited is a NERC-licensed bulk electricity trader and WAPP market participant, headquartered in Lagos with an office in Abuja.");

  return (
    <main>
      <InnerHero crumb="About us" title={about.heading} accent="West Africa" intro={tab("who").body[0]} image={substationImg}>
        <BoxLink href="#story" light>Read our story</BoxLink>
      </InnerHero>

      <Marquee items={credentials} />

      <div className="bg-white">
        <div className="wrap grid gap-12 py-20 sm:py-24 lg:grid-cols-[260px_1fr] xl:gap-20">
          <aside>
            <SectionRail sections={SECTIONS} />
          </aside>

          <div className="min-w-0">
            <Chapter id="story" eyebrow="Who we are" title={tab("who").title} accent="bulk electricity trader">
              <Paragraphs items={tab("who").body} />
              <ImageReveal src={powerStationImg} alt="A power station at dusk" className="mt-10 aspect-[16/8]" />
            </Chapter>

            <Chapter id="licence" eyebrow="Licence & mandate" title={tab("licence").title} accent="active in WAPP">
              <Paragraphs items={tab("licence").body} />
              <ul className="mt-10 grid gap-3 sm:grid-cols-2">
                {credentials.map((c, i) => (
                  <Reveal as="li" key={c} delay={i * 60} className="flex items-start gap-3 border border-black/5 bg-mist p-4">
                    <Check width={18} height={18} className="mt-0.5 shrink-0 text-teal-600" />
                    <span className="text-sm text-navy-900">{c}</span>
                  </Reveal>
                ))}
              </ul>
              <Reveal className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <a href="https://nerc.gov.ng/" target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 font-medium text-teal-700 hover:text-teal-600">
                  Nigerian Electricity Regulatory Commission <span className="nudge" aria-hidden="true">↗</span>
                </a>
                <a href="https://www.ecowapp.org/" target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 font-medium text-teal-700 hover:text-teal-600">
                  West African Power Pool <span className="nudge" aria-hidden="true">↗</span>
                </a>
              </Reveal>
            </Chapter>

            <Chapter id="services" eyebrow="End-to-end energy services" title={tab("services").title} accent="settlement">
              <Paragraphs items={tab("services").body} />
              <div className="mt-10 grid gap-px bg-black/10 sm:grid-cols-3">
                {about.strengths.map((s, i) => (
                  <Reveal key={s.title} delay={i * 90} className="bg-white p-6">
                    <p className="font-outfit text-4xl font-medium text-teal-500">{String(i + 1).padStart(2, "0")}</p>
                    <h3 className="mt-4 font-semibold text-navy-900">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slatey">{s.body}</p>
                  </Reveal>
                ))}
              </div>
              <Reveal className="mt-10">
                <BoxLink to="/solutions">Explore our solutions</BoxLink>
              </Reveal>
            </Chapter>

            <Chapter id="presence" eyebrow="Our market & footprint" title={tab("market").title} accent="regional reach">
              <Paragraphs items={tab("market").body} />
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {company.offices.map((o, i) => (
                  <Reveal key={o.label} delay={i * 100} className="relative overflow-hidden bg-navy-900 p-6 text-white">
                    <Pin width={24} height={24} className="text-teal-400" />
                    <p className="mt-4 font-outfit text-xs uppercase tracking-[0.18em] text-teal-400">{o.label}</p>
                    {o.lines.map((l) => (
                      <p key={l} className="mt-1 text-white/85">{l}</p>
                    ))}
                  </Reveal>
                ))}
              </div>
              <Reveal className="mt-10">
                <BoxLink to="/market">See the WAPP network</BoxLink>
              </Reveal>
            </Chapter>

            <Chapter id="why" eyebrow={highlights.eyebrow} title={highlights.heading} accent="reliable energy market">
              <div className="grid gap-4 sm:grid-cols-2">
                {highlights.items.map((item, idx) => {
                  const Icon = hlIcons[idx % hlIcons.length];
                  return (
                    <Reveal key={item.title} delay={(idx % 2) * 90}>
                      <div className="flex h-full gap-4 border border-black/5 bg-mist p-6">
                        <IconBox icon={Icon} variant="light" />
                        <div>
                          <h3 className="font-semibold text-navy-900">{item.title}</h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-slatey">{item.body}</p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </Chapter>
          </div>
        </div>
      </div>

      <PageEnd next={{ title: "Business solutions", to: "/solutions", image: tradingImg, summary: "One partner across the full power-trading value chain." }} />
    </main>
  );
}
