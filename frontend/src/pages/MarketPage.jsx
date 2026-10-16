import InnerHero from "../components/page/InnerHero.jsx";
import SectionTitle from "../components/page/SectionTitle.jsx";
import PageEnd from "../components/page/PageEnd.jsx";
import BoxLink from "../components/page/BoxLink.jsx";
import Reveal from "../components/Reveal.jsx";
import WappMap, { CORRIDORS } from "../components/story/WappMap.jsx";
import CountUp from "../motion/CountUp.jsx";
import ImageReveal from "../motion/ImageReveal.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { metrics, caseStudies } from "../data/content.js";
import { pageCopy } from "../data/pages.js";
import { Bolt, Globe, Layers, Handshake, Gauge } from "../components/icons.jsx";

import aerialImg from "../../assets/site/aerial-network.jpg";
import damImg from "../../assets/tahamie-farooqui-kMHBf1h4pU8-unsplash.jpg";
import greenImg from "../../assets/site/green-spiral.jpg";

// Market participants, and where Onction sits among them (the last one).
// Words come from data/pages.js; icons stay with the design.
const PARTICIPANT_ICONS = [Bolt, Layers, Gauge, Globe, Handshake];

export default function MarketPage() {
  usePageMeta("Our market — the West African Power Pool", "The 14-nation West African Power Pool, its main interconnection corridors, and where Onction trades.");
  const copy = pageCopy.market;
  const wapp = metrics.find((m) => m.value === "14");
  const crossBorder = caseStudies.filter((c) => /cross-border|banking/i.test(c.category));
  const participants = copy.participantList.map((p, i, all) => ({ ...p, icon: PARTICIPANT_ICONS[i], ours: i === all.length - 1 }));

  return (
    <main>
      <InnerHero
        crumb="Our market"
        title={copy.hero.title}
        accent={copy.hero.accent}
        intro={copy.hero.intro}
        image={copy.hero.image || aerialImg}
      >
        <div className="flex flex-wrap gap-4">
          <BoxLink href="#network" light>Explore the network</BoxLink>
        </div>
      </InnerHero>

      {/* Network map */}
      <section id="network" className="scroll-mt-20 bg-navy-900 text-white">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle light eyebrow={copy.network.eyebrow} title={copy.network.title} accent={copy.network.accent} intro={copy.network.intro} className="mb-12" />
          <WappMap />
        </div>
      </section>

      {/* Numbers */}
      <section className="bg-mist">
        <div className="wrap grid grid-cols-2 gap-x-6 gap-y-10 py-16 sm:py-20 lg:grid-cols-4">
          {[
            { value: wapp?.value || "14", label: wapp?.label || "WAPP member nations" },
            { value: String(CORRIDORS.length), label: "Main interconnection corridors shown above" },
            { value: "2", label: "Onction trading hubs — Lagos & Abuja" },
            { value: "24", suffix: "/7", label: "Trading desk coverage" },
          ].map((m, i) => (
            <Reveal key={m.label} delay={i * 80}>
              <div className="border-l-2 border-teal-500 pl-5">
                <div className="font-outfit text-4xl font-medium text-navy-900 sm:text-5xl">
                  <CountUp value={m.value} />
                  {m.suffix && <span className="text-teal-500">{m.suffix}</span>}
                </div>
                <p className="mt-2 font-syne leading-snug text-[#202020]">{m.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why regional trade */}
      <section id="corridors" className="scroll-mt-20 bg-white">
        <div className="wrap grid gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:items-center">
          <ImageReveal src={damImg} alt="A hydroelectric dam releasing water" className="aspect-[4/3]" from="left" />
          <div>
            <SectionTitle eyebrow={copy.corridors.eyebrow} title={copy.corridors.title} accent={copy.corridors.accent} />
            <ul className="mt-8 space-y-5">
              {copy.reasons.map(({ title: t, body: b }, i) => (
                <Reveal as="li" key={t} delay={i * 90} className="border-l-2 border-teal-500 pl-5">
                  <h3 className="font-semibold text-navy-900">{t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slatey">{b}</p>
                </Reveal>
              ))}
            </ul>
            {crossBorder.length > 0 && (
              <Reveal delay={300} className="mt-10 flex flex-wrap gap-4">
                <BoxLink to={`/case-studies#${crossBorder[0].slug}`}>See it in a case study</BoxLink>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* Participants */}
      <section id="participants" className="scroll-mt-20 bg-mist">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle eyebrow={copy.participants.eyebrow} title={copy.participants.title} accent={copy.participants.accent} intro={copy.participants.intro} />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {participants.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 80}>
                <div className={`relative flex h-full flex-col p-6 ${p.ours ? "bg-navy-900 text-white" : "border border-black/5 bg-white"}`}>
                  <span className={`font-outfit text-xs ${p.ours ? "text-teal-400" : "text-teal-600"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <p.icon width={28} height={28} className={`mt-4 ${p.ours ? "text-teal-400" : "text-teal-600"}`} />
                  <h3 className={`mt-4 font-semibold ${p.ours ? "text-white" : "text-navy-900"}`}>{p.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${p.ours ? "text-white/70" : "text-slatey"}`}>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <PageEnd next={{ ...copy.next, to: "/sustainability", image: greenImg }} />
    </main>
  );
}
