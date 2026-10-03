import { useSearchParams } from "react-router-dom";
import InnerHero from "../components/page/InnerHero.jsx";
import SectionTitle from "../components/page/SectionTitle.jsx";
import Reveal from "../components/Reveal.jsx";
import Enquiry from "../components/Enquiry.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { company } from "../data/content.js";
import { vendorPortalUrl } from "../data/site.js";
import { Arrow, Mail, Phone, Pin } from "../components/icons.jsx";

import pylonsImg from "../../assets/fre-sonneveld-q6n8nIrDQHE-unsplash.jpg";

// Routes each kind of visitor to the right channel before the form.
const ROUTES = [
  { title: "Generation, offtake & trading", body: "Selling power, buying power, or structuring a deal — the form below goes straight to the trading desk.", href: "#enquire", cta: "Send an enquiry" },
  { title: "Urgent or time-sensitive", body: "The trading desk operates around the clock.", href: `tel:${company.phoneHref}`, cta: company.phone },
  { title: "Suppliers & vendors", body: "Invoices, documents and registration are handled in the vendor portal.", href: "vendor-portal", cta: "Open the vendor portal" },
];

const mapsUrl = (lines) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lines.join(" "))}`;

export default function ContactPage() {
  usePageMeta("Contact", "Enquire with Onction Energy's trading desk in Lagos or Abuja.");
  const [params] = useSearchParams();
  const topic = params.get("topic") || undefined;

  return (
    <main>
      <InnerHero crumb="Contact" title="Talk to our trading desk" accent="trading desk" intro="Tell us about your generation, offtake or trading needs. We'll route you to the right person." image={pylonsImg} compact />

      <section className="bg-mist">
        <div className="wrap grid gap-4 py-12 md:grid-cols-3">
          {ROUTES.map((r, i) => (
            <Reveal key={r.title} delay={i * 80}>
              <a
                href={r.href === "vendor-portal" ? vendorPortalUrl() : r.href}
                className="group flex h-full flex-col border border-black/5 bg-white p-6 transition-colors duration-400 hover:border-teal-500"
              >
                <h2 className="font-semibold text-navy-900">{r.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slatey">{r.body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
                  {r.cta} <Arrow width={16} height={16} className="nudge" />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      <Enquiry topic={topic} />

      <section id="offices" className="scroll-mt-20 bg-navy-950 text-white">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle light eyebrow="Our offices" title="Lagos and Abuja" accent="Abuja" />
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {company.offices.map((o, i) => (
              <Reveal key={o.label} delay={i * 100} className="border border-white/10 bg-white/[0.04] p-8">
                <Pin width={26} height={26} className="text-teal-400" />
                <h3 className="mt-5 font-outfit text-sm uppercase tracking-[0.18em] text-teal-400">{o.label}</h3>
                <address className="mt-2 not-italic leading-relaxed text-white/85">
                  {o.lines.map((l) => <span key={l} className="block">{l}</span>)}
                </address>
                <a href={mapsUrl(o.lines)} target="_blank" rel="noreferrer" className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-teal-400">
                  Get directions <span className="nudge" aria-hidden="true">↗</span>
                </a>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-8 text-sm">
            <a href={`tel:${company.phoneHref}`} className="inline-flex items-center gap-2 text-white/80 hover:text-teal-400">
              <Phone width={18} height={18} className="text-teal-400" /> {company.phone}
            </a>
            <a href={`mailto:${company.email}`} className="inline-flex items-center gap-2 text-white/80 hover:text-teal-400">
              <Mail width={18} height={18} className="text-teal-400" /> {company.email}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
