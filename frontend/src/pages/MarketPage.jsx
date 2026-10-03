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
import { slugify } from "../data/site.js";
import { Bolt, Globe, Layers, Handshake, Gauge } from "../components/icons.jsx";

import aerialImg from "../../assets/site/aerial-network.jpg";
import damImg from "../../assets/tahamie-farooqui-kMHBf1h4pU8-unsplash.jpg";
import greenImg from "../../assets/site/green-spiral.jpg";

// Market participants, and where Onction sits among them.
const PARTICIPANTS = [
  { icon: Bolt, title: "Generators", body: "Gas-fired power stations and renewable projects — solar, wind and hydro — that need a buyer for their output." },
  { icon: Layers, title: "Transmission operators", body: "The national grids and regional interconnectors that carry bulk power between systems." },
  { icon: Gauge, title: "Utilities & distribution companies", body: "Buyers who take power off the grid and deliver it to homes and businesses." },
  { icon: Globe, title: "Large consumers", body: "Commercial and industrial users whose load justifies bespoke supply arrangements." },
  { icon: Handshake, title: "Traders — Onction", body: "The intermediary that aggregates supply and demand, structures contracts and manages the risk in between.", ours: true },
];

const crossBorder = caseStudies.filter((c) => /cross-border|banking/i.test(c.category));

export default function MarketPage() {
  usePageMeta("Our market — the West African Power Pool", "The 14-nation West African Power Pool, its main interconnection corridors, and where Onction trades.");
  const wapp = metrics.find((m) => m.value === "14");

  return (
    <main>
      <InnerHero
        crumb="Our market"
        title="One regional market, fourteen nations"
        accent="fourteen nations"
        intro="The West African Power Pool (WAPP) is the ECOWAS institution integrating its member states' national power systems into a single regional electricity market. As a WAPP market participant, Onction trades across it."
        image={aerialImg}
      >
        <div className="flex flex-wrap gap-4">
          <BoxLink href="#network" light>Explore the network</BoxLink>
        </div>
      </InnerHero>

      {/* Network map */}
      <section id="network" className="scroll-mt-20 bg-navy-900 text-white">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle light eyebrow="The WAPP network" title="How the region's grids connect" accent="connect" intro="Hover or tap a country to see its corridors. Nigeria — our home market — is where we hold our trading licence." className="mb-12" />
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
            <SectionTitle eyebrow="Cross-border trading" title="Why power should cross borders" accent="cross borders" />
            <ul className="mt-8 space-y-5">
              {[
                ["Surplus meets demand", "A hydro-rich system in the rainy season can sell to a neighbour running expensive thermal peaking plant."],
                ["Seasonal balancing", "Banking and swap contracts let utilities exchange power across seasons instead of curtailing generation."],
                ["Lower cost, wider access", "Better use of existing plants and fairer tariffs are how the region reduces energy poverty."],
              ].map(([t, b], i) => (
                <Reveal as="li" key={t} delay={i * 90} className="border-l-2 border-teal-500 pl-5">
                  <h3 className="font-semibold text-navy-900">{t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slatey">{b}</p>
                </Reveal>
              ))}
            </ul>
            {crossBorder.length > 0 && (
              <Reveal delay={300} className="mt-10 flex flex-wrap gap-4">
                <BoxLink to={`/case-studies#${slugify(crossBorder[0].title)}`}>See it in a case study</BoxLink>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* Participants */}
      <section id="participants" className="scroll-mt-20 bg-mist">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle eyebrow="Market participants" title="Who takes part, and where we fit" accent="where we fit" intro="Electricity markets work because different parties play different roles. Ours is the connective one." />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PARTICIPANTS.map((p, i) => (
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

      <PageEnd next={{ title: "Sustainability: GR0W with Onction", to: "/sustainability", image: greenImg, summary: "Renewables, efficient gas and a path to Net Zero by 2030." }} />
    </main>
  );
}
