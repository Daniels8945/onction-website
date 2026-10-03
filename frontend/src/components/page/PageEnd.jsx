import { Link } from "react-router-dom";
import { company } from "../../data/content.js";
import { Arrow, Phone } from "../icons.jsx";
import Reveal from "../Reveal.jsx";
import BoxLink from "./BoxLink.jsx";

// Closing band on every inner page: talk to the desk, or carry on to the
// next part of the story — so no page is a dead end.
export default function PageEnd({ next }) {
  return (
    <section className="bg-navy-900 text-white">
      <div className="wrap">
        <div className="grid gap-px bg-white/10 lg:grid-cols-2">
        <Reveal className="bg-navy-900 py-14 pr-6 lg:py-20">
          <p className="eyebrow-light mb-3">Talk to our desk</p>
          <h2 className="max-w-md font-syne text-3xl font-medium leading-tight sm:text-4xl">Want to partner to build a sustainable energy sector?</h2>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <BoxLink to="/contact" light>Enquire now</BoxLink>
            <a href={`tel:${company.phoneHref}`} className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-teal-400">
              <Phone width={16} height={16} className="text-teal-400" /> {company.phone}
            </a>
          </div>
        </Reveal>
        {next && (
          <Reveal delay={120} className="bg-navy-900">
            <Link to={next.to} className="group relative flex h-full min-h-[240px] flex-col justify-between overflow-hidden py-14 lg:py-20 lg:pl-12">
              {next.image && (
                <img src={next.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition duration-700 ease-out-expo group-hover:scale-100 group-hover:opacity-25" />
              )}
              <span className="relative eyebrow-light">Next</span>
              <span className="relative mt-4 flex items-end justify-between gap-6">
                <span className="font-syne text-3xl font-medium leading-tight transition-colors duration-400 group-hover:text-teal-400 sm:text-4xl">{next.title}</span>
                <span className="grid h-14 w-14 shrink-0 place-items-center border border-[#f8f5ec] transition-colors duration-400 group-hover:border-teal-400 group-hover:bg-teal-500 group-hover:text-navy-950">
                  <Arrow width={22} height={22} className="nudge" />
                </span>
              </span>
              {next.summary && <span className="relative mt-3 max-w-md text-sm text-white/60">{next.summary}</span>}
            </Link>
          </Reveal>
        )}
        </div>
      </div>
    </section>
  );
}
