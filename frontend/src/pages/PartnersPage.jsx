import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import InnerHero from "../components/page/InnerHero.jsx";
import SectionTitle from "../components/page/SectionTitle.jsx";
import PageEnd from "../components/page/PageEnd.jsx";
import BoxLink from "../components/page/BoxLink.jsx";
import Marquee from "../components/page/Marquee.jsx";
import Reveal from "../components/Reveal.jsx";
import Testimonials from "../components/Testimonials.jsx";
import ImageReveal from "../motion/ImageReveal.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { credentials, testimonials } from "../data/content.js";
import { vendorPortalUrl } from "../data/site.js";
import { pageCopy } from "../data/pages.js";
import { Arrow } from "../components/icons.jsx";
import EcosystemMap from "../components/partners/EcosystemMap.jsx";
import PartnerDirectory from "../components/partners/PartnerDirectory.jsx";
import { PreviewNotice } from "../components/content/Placeholder.jsx";
import { visible } from "../lib/contentStatus.js";
import { ECOSYSTEM, ORGANISATIONS } from "../data/partners.js";

import handshakeImg from "../../assets/cytonn-photography-vWchRczcQwM-unsplash.jpg";
import substationImg from "../../assets/site/substation.jpg";
import pylonsImg from "../../assets/fre-sonneveld-q6n8nIrDQHE-unsplash.jpg";

// Partner segments line up with the sectors in our testimonials, so each one
// can point to what a partner of that kind actually said. Titles and offers
// are page copy (data/pages.js); sectors and links are structural.
const SEGMENT_LINKS = [
  { sector: "Independent Power Producer", links: [["Renewable solutions", "/solutions#renewable-energy-solutions"], ["Power purchase & sale", "/solutions#power-purchase-and-sale"]] },
  { sector: "Utility", links: [["Banking & swaps", "/solutions#power-banking-and-swaps"], ["Cross-border trading", "/solutions#cross-border-and-wapp-trading"]] },
  { sector: "Commercial & Industrial Consumer", links: [["Energy efficiency", "/solutions#energy-efficiency-and-optimisation"], ["Portfolio management", "/solutions#power-portfolio-management"]] },
  { sector: "International Developer", links: [["Advisory", "/solutions#advisory-and-consultancy"], ["Investment facilitation", "/solutions#investment-and-project-facilitation"]] },
];

export default function PartnersPage() {
  usePageMeta("Partners", "How generators, utilities, large consumers, developers and suppliers work with Onction Energy.");
  const portal = vendorPortalUrl();
  const copy = pageCopy.partners;
  const SEGMENTS = copy.segments.map((s, i) => ({ ...s, ...SEGMENT_LINKS[i] }));
  // The role picked on the ecosystem map also filters the directory.
  const [role, setRole] = useState(null);
  const orgs = useMemo(() => visible(ORGANISATIONS), []);
  const counts = Object.fromEntries(ECOSYSTEM.map((e) => [e.key, orgs.filter((o) => o.ecosystem === e.key).length]));

  return (
    <main>
      <InnerHero crumb="Business associates" title={copy.hero.title} accent={copy.hero.accent} intro={copy.hero.intro} image={copy.hero.image || handshakeImg}>
        <div className="flex flex-wrap gap-4">
          <BoxLink href="#who" light>Who we work with</BoxLink>
        </div>
      </InnerHero>

      <Marquee items={credentials} speed={55} />

      {/* The market around Onction — roles, not claimed agreements */}
      <section id="ecosystem" className="scroll-mt-20 overflow-hidden bg-navy-950 text-white">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle light eyebrow={copy.ecosystem.eyebrow} title={copy.ecosystem.title} accent={copy.ecosystem.accent} intro={copy.ecosystem.intro} />
          <div className="mt-12">
            <EcosystemMap active={role} onSelect={setRole} counts={counts} />
          </div>
        </div>
      </section>

      {orgs.length > 0 && (
        <section id="directory" className="scroll-mt-20 bg-mist">
          <div className="wrap py-20 sm:py-24">
            <SectionTitle eyebrow={copy.directory.eyebrow} title={copy.directory.title} accent={copy.directory.accent} intro={copy.directory.intro} />
            <div className="mt-10">
              <PartnerDirectory orgs={orgs} active={role} onSelect={setRole} />
            </div>
          </div>
        </section>
      )}

      <section id="who" className="scroll-mt-20 bg-white">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle eyebrow={copy.who.eyebrow} title={copy.who.title} accent={copy.who.accent} />
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {SEGMENTS.map((s, i) => {
              const quote = testimonials.find((t) => t.sector === s.sector);
              return (
                <Reveal key={s.title} delay={(i % 2) * 100}>
                  <article className="group flex h-full flex-col border border-black/10 p-7 transition-colors duration-400 hover:border-teal-500 sm:p-9">
                    <p className="font-outfit text-sm text-teal-600">{String(i + 1).padStart(2, "0")}</p>
                    <h3 className="mt-3 font-syne text-2xl font-medium text-navy-900">{s.title}</h3>
                    <p className="mt-3 leading-relaxed text-slatey">{s.offer}</p>
                    {quote && (
                      <blockquote className="mt-6 border-l-2 border-teal-500 pl-4 text-sm italic leading-relaxed text-navy-900/80">
                        “{quote.quote.split(". ")[0]}.”
                        <footer className="mt-2 not-italic text-xs text-slatey">— {quote.name}, {quote.company}</footer>
                      </blockquote>
                    )}
                    <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-6">
                      {s.links.map(([label, to]) => (
                        <Link key={to} to={to} className="group/l inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:text-teal-700">
                          {label} <Arrow width={15} height={15} className="text-teal-600 transition-transform duration-400 group-hover/l:translate-x-1.5" />
                        </Link>
                      ))}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <div id="testimonials" className="scroll-mt-20">
        <Testimonials />
      </div>

      {/* Suppliers → vendor portal */}
      <section id="vendors" className="scroll-mt-20 bg-navy-950 text-white">
        <div className="wrap grid gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:items-center">
          <ImageReveal src={substationImg} alt="Electrical substation equipment" className="aspect-[16/10]" from="left" />
          <div>
            <SectionTitle light eyebrow="Suppliers & vendors" title="Supplying Onction? Use the vendor portal" accent="vendor portal" intro="Register your company, upload compliance documents, submit invoices and track their status — all in one place." />
            <Reveal delay={250} className="mt-8 flex flex-wrap gap-4">
              <BoxLink href={`${portal}/register`} light>Register as a vendor</BoxLink>
              <a href={`${portal}/login`} className="group inline-flex items-center gap-2 px-2 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white hover:text-teal-400">
                Vendor sign in <Arrow width={16} height={16} className="nudge text-teal-400" />
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* For prospective partners */}
      <section className="bg-white">
        <div className="wrap grid gap-8 border-t border-black/10 py-16 sm:py-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <SectionTitle eyebrow={copy.workWith.eyebrow} title={copy.workWith.title} accent={copy.workWith.accent} intro={copy.workWith.intro} />
          <Reveal delay={200} className="flex flex-wrap gap-4 lg:justify-end">
            <BoxLink to="/contact">{copy.workWith.cta}</BoxLink>
          </Reveal>
        </div>
      </section>

      <PreviewNotice what="Organisations" />
      <PageEnd next={{ ...copy.next, to: "/how-we-trade", image: pylonsImg }} />
    </main>
  );
}
