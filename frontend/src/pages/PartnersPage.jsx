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
import { Arrow } from "../components/icons.jsx";

import handshakeImg from "../../assets/cytonn-photography-vWchRczcQwM-unsplash.jpg";
import substationImg from "../../assets/site/substation.jpg";
import pylonsImg from "../../assets/fre-sonneveld-q6n8nIrDQHE-unsplash.jpg";

// Partner segments line up with the sectors in our testimonials, so each one
// can point to what a partner of that kind actually said.
const SEGMENTS = [
  {
    sector: "Independent Power Producer",
    title: "Generators & IPPs",
    offer: "A route to market for your output — offtake structuring, bilateral and cross-border sales, and smoother revenue for renewable projects.",
    links: [["Renewable solutions", "/solutions#renewable-energy-solutions"], ["Power purchase & sale", "/solutions#power-purchase-and-sale"]],
  },
  {
    sector: "Utility",
    title: "Utilities & distribution companies",
    offer: "Dependable supply, banking and swap arrangements to balance seasonal positions, and access to the wider WAPP market.",
    links: [["Banking & swaps", "/solutions#power-banking-and-swaps"], ["Cross-border trading", "/solutions#cross-border-and-wapp-trading"]],
  },
  {
    sector: "Commercial & Industrial Consumer",
    title: "Large commercial & industrial users",
    offer: "Bespoke supply contracts aggregated from multiple sources, priced to your load profile rather than a standard tariff.",
    links: [["Energy efficiency", "/solutions#energy-efficiency-and-optimisation"], ["Portfolio management", "/solutions#power-portfolio-management"]],
  },
  {
    sector: "International Developer",
    title: "Developers & investors",
    offer: "Market-entry, regulatory and structuring support, counterparty introductions and investment facilitation for new capacity.",
    links: [["Advisory", "/solutions#advisory-and-consultancy"], ["Investment facilitation", "/solutions#investment-and-project-facilitation"]],
  },
];

export default function PartnersPage() {
  usePageMeta("Partners", "How generators, utilities, large consumers, developers and suppliers work with Onction Energy.");
  const portal = vendorPortalUrl();

  return (
    <main>
      <InnerHero crumb="Business associates" title="Built on trusted partnerships" accent="partnerships" intro="We sit between the people who make electricity and the people who need it. Here's what that looks like for each of them." image={handshakeImg}>
        <div className="flex flex-wrap gap-4">
          <BoxLink href="#who" light>Who we work with</BoxLink>
        </div>
      </InnerHero>

      <Marquee items={credentials} speed={55} />

      <section id="who" className="scroll-mt-20 bg-white">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle eyebrow="Who we work with" title="One desk, four kinds of partner" accent="four kinds" />
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

      <PageEnd next={{ title: "How we trade", to: "/how-we-trade", image: pylonsImg, summary: "Follow a megawatt from the plant, through our desk, to the people who need it." }} />
    </main>
  );
}
