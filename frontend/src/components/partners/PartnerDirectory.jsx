import Reveal from "../Reveal.jsx";
import { DraftTag, PlaceholderArt } from "../content/Placeholder.jsx";
import { ECOSYSTEM, RELATIONSHIPS } from "../../data/partners.js";

// Curated directory of the organisations Onction works with, filtered by
// the role picked on the ecosystem map (or the chips here — the two stay in
// sync). Logos sit in identical frames and keep their own proportions; the
// label under each is the accurate relationship, not a blanket "partner".

const roleLabel = (k) => ECOSYSTEM.find((e) => e.key === k)?.label;

function Logo({ org, large = false }) {
  return (
    <div className={`relative grid place-items-center overflow-hidden bg-white ${large ? "aspect-[16/9]" : "aspect-[3/2]"}`}>
      {org.logo ? (
        <img src={org.logo} alt={`${org.name} logo`} loading="lazy" className={`object-contain ${large ? "max-h-20 max-w-[60%]" : "max-h-12 max-w-[70%]"}`} />
      ) : (
        <PlaceholderArt kind="logo" dark={false} />
      )}
    </div>
  );
}

function Name({ org }) {
  return <span className={org.name ? "" : "opacity-60"}>{org.name || "Organisation to be confirmed"}</span>;
}

function Visit({ org }) {
  if (!org.url) return null;
  return (
    <a href={org.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 hover:text-navy-900">
      Website <span aria-hidden="true">↗</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export default function PartnerDirectory({ orgs, active, onSelect }) {
  const counts = Object.fromEntries(ECOSYSTEM.map((e) => [e.key, orgs.filter((o) => o.ecosystem === e.key).length]));
  const shown = active ? orgs.filter((o) => o.ecosystem === active) : orgs;
  const featured = shown.filter((o) => o.highlight);
  const rest = shown.filter((o) => !o.highlight);

  return (
    <>
      <div role="group" aria-label="Filter organisations by market role" className="-mx-[clamp(1.25rem,3vw,4rem)] flex gap-2 overflow-x-auto px-[clamp(1.25rem,3vw,4rem)] pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        <button type="button" aria-pressed={!active} onClick={() => onSelect(null)} className={`shrink-0 border px-4 py-2 font-outfit text-sm transition-colors duration-400 ${!active ? "border-navy-900 bg-navy-900 text-white" : "border-black/15 text-navy-900 hover:border-teal-500"}`}>
          All <span className={`ml-1 text-xs ${!active ? "text-teal-400" : "text-slatey"}`}>{orgs.length}</span>
        </button>
        {ECOSYSTEM.filter((e) => counts[e.key]).map((e) => (
          <button
            key={e.key}
            type="button"
            aria-pressed={active === e.key}
            onClick={() => onSelect(active === e.key ? null : e.key)}
            className={`shrink-0 border px-4 py-2 font-outfit text-sm transition-colors duration-400 ${active === e.key ? "border-navy-900 bg-navy-900 text-white" : "border-black/15 text-navy-900 hover:border-teal-500"}`}
          >
            {e.label} <span className={`ml-1 text-xs ${active === e.key ? "text-teal-400" : "text-slatey"}`}>{counts[e.key]}</span>
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">{shown.length} organisations shown</p>

      {shown.length === 0 ? (
        <div className="mt-8 border border-dashed border-black/15 px-6 py-12 text-center">
          <p className="font-syne text-xl font-medium text-navy-900">No organisations listed for {roleLabel(active)} yet</p>
          <button type="button" onClick={() => onSelect(null)} className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 underline underline-offset-4">
            Show all organisations
          </button>
        </div>
      ) : (
        <div key={active || "all"}>
          {featured.length > 0 && (
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {featured.map((o, i) => (
                <Reveal key={o.id} delay={i * 100}>
                  <article className="grid h-full border border-black/10 transition-colors duration-400 hover:border-teal-500 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                    <div className="border-b border-black/10 sm:border-b-0 sm:border-r">
                      <Logo org={o} large />
                    </div>
                    <div className="flex flex-col p-6">
                      {!o.verified && <DraftTag className="mb-2 self-start" />}
                      <p className="font-outfit text-[11px] uppercase tracking-[0.18em] text-teal-700">{RELATIONSHIPS[o.relationship]}</p>
                      <h3 className="mt-2 font-syne text-xl font-medium leading-snug text-navy-900"><Name org={o} /></h3>
                      <p className="mt-2 text-sm leading-relaxed text-slatey">{o.description || "Approved description of the relationship to be supplied."}</p>
                      <Visit org={o} />
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
          {rest.length > 0 && (
            <ul className="mt-5 grid grid-cols-2 border-l border-t border-black/10 sm:grid-cols-3 lg:grid-cols-4">
              {rest.map((o, i) => (
                <li key={o.id} className="group relative flex flex-col border-b border-r border-black/10 bg-white">
                  <Reveal variant="fade" delay={(i % 4) * 60}>
                    <Logo org={o} />
                    <div className="border-t border-black/5 p-4">
                      {!o.verified && <DraftTag className="mb-2" />}
                      <p className="text-sm font-semibold leading-snug text-navy-900"><Name org={o} /></p>
                      <p className="mt-1 text-xs text-slatey">{RELATIONSHIPS[o.relationship]}</p>
                      {o.description && <p className="mt-2 text-xs leading-relaxed text-slatey">{o.description}</p>}
                      <Visit org={o} />
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
