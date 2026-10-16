import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import InnerHero from "../components/page/InnerHero.jsx";
import SectionTitle from "../components/page/SectionTitle.jsx";
import PageEnd from "../components/page/PageEnd.jsx";
import Reveal from "../components/Reveal.jsx";
import Dialog from "../components/content/Dialog.jsx";
import { DraftTag, PlaceholderArt, PreviewNotice } from "../components/content/Placeholder.jsx";
import { useInView } from "../motion/useInView.js";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { visible } from "../lib/contentStatus.js";
import { COMMITTEES, GROUPS, people as allPeople } from "../data/leadership.js";
import { pageCopy } from "../data/pages.js";
import { Arrow, Check } from "../components/icons.jsx";

import heroImg from "../../assets/site/aerial-network.jpg";
import nextImg from "../../assets/site/substation.jpg";

// Leadership & Board. Each tier gets its own treatment so the hierarchy reads
// at a glance: an editorial feature for the Chairman, portrait cards for the
// Board, larger split cards for the executive team and compact rows for the
// functional heads. Every profile opens in a dialog (deep-linkable as
// /leadership#<id>). Content and its verification live in data/leadership.js.

const nameOf = (p) => p.name || "Name to be confirmed";
const lastWord = (t = "") => t.trim().split(/\s+/).pop(); // highlighted in teal, as in the approved design

// Portrait with the site's clip-path "window" reveal; a labelled frame until
// a real photograph is supplied.
function Portrait({ person, className = "", reveal = true, from = "bottom", compact = false }) {
  const [ref, inView] = useInView({ threshold: 0.2 });
  const shown = !reveal || inView;
  return (
    <div ref={ref} className={`relative overflow-hidden bg-navy-900 ${className}`}>
      <div className={`${reveal ? `ir ir-${from}` : ""} ${shown ? "is-in" : ""} absolute inset-0`}>
        {person.portrait ? (
          <img
            src={person.portrait}
            alt={`Portrait of ${nameOf(person)}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
            style={{ objectPosition: person.focus || "50% 25%" }}
          />
        ) : (
          <PlaceholderArt kind="portrait" subject={person.title} compact={compact} />
        )}
      </div>
    </div>
  );
}

function NameBlock({ person, light = false, size = "md", showTitle = true }) {
  const sizes = { lg: "text-4xl sm:text-5xl", md: "text-xl sm:text-[1.4rem]", sm: "text-lg" };
  return (
    <>
      {!person.verified && <DraftTag className="mb-2" />}
      <h3 className={`font-syne font-medium leading-tight ${sizes[size]} ${light ? "text-white" : "text-navy-900"} ${person.name ? "" : "opacity-60"}`}>{nameOf(person)}</h3>
      {showTitle && <p className={`mt-2 font-outfit text-xs font-medium uppercase leading-relaxed tracking-[0.16em] ${light ? "text-teal-400" : "text-teal-700"}`}>{person.title}</p>}
    </>
  );
}

// The card's one control. Its ::after stretches over the whole card, so the
// card is clickable while the heading stays outside the button (valid HTML,
// and screen readers hear "View profile: <name>").
function ViewProfile({ person, onOpen, light = false }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(person.id)}
      aria-label={`View profile: ${nameOf(person)}`}
      className={`mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-teal-500 ${light ? "text-white" : "text-navy-900"}`}
    >
      View profile <Arrow width={15} height={15} className={`nudge ${light ? "text-teal-400" : "text-teal-600"}`} />
    </button>
  );
}

// ── Tiers ────────────────────────────────────────────────────────────────

function Chairman({ person }) {
  const paras = person.bio.length ? person.bio : [];
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
      <div className="relative">
        {/* offset hairline frame behind the portrait */}
        <div className="absolute -bottom-4 -right-4 hidden h-full w-full border border-teal-500/40 sm:block" aria-hidden="true" />
        <Portrait person={person} className="aspect-[4/5]" from="left" />
      </div>
      <div>
        <Reveal variant="fade">
          <p className="eyebrow mb-4">{pageCopy.leadership.groups[0].title}</p>
        </Reveal>
        <Reveal>
          {/* the eyebrow already says it unless the title adds something */}
          <NameBlock person={person} size="lg" showTitle={person.title !== "Chairman of the Board"} />
        </Reveal>
        <Reveal delay={120}>
          <span className="line-draw mt-8 block h-px w-24 bg-teal-500" aria-hidden="true" />
        </Reveal>
        {paras.length ? (
          <div className="mt-8 max-w-2xl space-y-5">
            {paras.map((p, i) => (
              <Reveal key={i} delay={160 + i * 80}>
                <p className="text-[17px] leading-relaxed text-ink/80">{p}</p>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal delay={160}>
            <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-slatey">The Chairman's biography will appear here once approved.</p>
          </Reveal>
        )}
        {person.experience?.length > 0 && (
          <Reveal delay={300}>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {person.experience.map((e) => (
                <li key={e} className="flex gap-3 text-sm leading-snug text-navy-900">
                  <Check width={16} height={16} className="mt-0.5 shrink-0 text-teal-600" /> {e}
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </div>
  );
}

function BoardCard({ person, onOpen, index }) {
  return (
    <Reveal delay={(index % 4) * 80} className="h-full">
      <article id={person.id} className="group relative flex h-full scroll-mt-28 flex-col bg-white transition-shadow duration-400 hover:shadow-[0_18px_40px_rgba(10,31,60,0.12)]">
        <div className="relative">
          <Portrait person={person} className="aspect-[4/5]" />
          <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-teal-500 transition-transform duration-500 ease-out-expo group-hover:scale-x-100 group-focus-visible:scale-x-100" aria-hidden="true" />
        </div>
        <div className="flex flex-1 flex-col p-6">
          <NameBlock person={person} />
          {person.committees?.length > 0 && (
            <p className="mt-3 text-xs leading-relaxed text-slatey">{person.committees.map((c) => COMMITTEES[c]?.name).filter(Boolean).join(" · ")}</p>
          )}
          <span className="mt-auto" />
          <ViewProfile person={person} onOpen={onOpen} />
        </div>
      </article>
    </Reveal>
  );
}

function ExecutiveCard({ person, onOpen, index }) {
  return (
    <Reveal delay={index * 100}>
      <article id={person.id} className="group relative grid scroll-mt-28 border border-white/10 bg-white/[0.03] transition-colors duration-400 hover:border-teal-400/60 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Portrait person={person} className="aspect-[4/5] sm:aspect-auto sm:h-full sm:min-h-[340px]" from="left" />
        <div className="flex flex-col p-7 sm:p-9">
          <NameBlock person={person} light />
          <p className="mt-5 leading-relaxed text-white/70">{person.summary || (person.note ? person.note : "Profile to be supplied.")}</p>
          <span className="mt-auto" />
          <ViewProfile person={person} onOpen={onOpen} light />
        </div>
      </article>
    </Reveal>
  );
}

function ManagementRow({ person, onOpen, index }) {
  return (
    <Reveal delay={(index % 2) * 80}>
      <article id={person.id} className="group relative flex scroll-mt-28 items-center gap-5 border-b border-black/10 py-5">
        <Portrait person={person} className="aspect-square w-20 shrink-0 sm:w-24" reveal={false} compact />
        <div className="min-w-0 flex-1">
          {person.function && <p className="font-outfit text-[11px] uppercase tracking-[0.18em] text-slatey">{person.function}</p>}
          <div className="mt-1">
            <NameBlock person={person} size="sm" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpen(person.id)}
          aria-label={`View profile: ${nameOf(person)}`}
          className="shrink-0 p-2 text-teal-600 outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-teal-500"
        >
          <Arrow width={18} height={18} className="nudge" />
        </button>
      </article>
    </Reveal>
  );
}

// ── Profile dialog ───────────────────────────────────────────────────────

function Profile({ person, group, onClose, onStep, position }) {
  return (
    <article className="relative grid max-h-[100dvh] w-[min(100vw,1040px)] overflow-y-auto bg-white md:max-h-[88vh] md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Portrait person={person} className="aspect-[4/5] md:sticky md:top-0 md:aspect-auto md:h-full md:max-h-[88vh]" reveal={false} />
      <div className="flex flex-col p-7 sm:p-10">
        <p className="eyebrow mb-4">{group.title}</p>
        <NameBlock person={person} size="lg" />
        <div className="mt-8 space-y-4">
          {person.bio.length ? (
            person.bio.map((p, i) => (
              <p key={i} className="leading-relaxed text-ink/80">{p}</p>
            ))
          ) : (
            <p className="leading-relaxed text-slatey">{person.note || "Biography to be supplied."}</p>
          )}
        </div>
        {person.experience?.length > 0 && (
          <>
            <p className="mt-8 font-outfit text-[11px] uppercase tracking-[0.18em] text-slatey">Experience</p>
            <ul className="mt-3 space-y-2.5">
              {person.experience.map((e) => (
                <li key={e} className="flex gap-3 text-sm leading-snug text-navy-900">
                  <Check width={16} height={16} className="mt-0.5 shrink-0 text-teal-600" /> {e}
                </li>
              ))}
            </ul>
          </>
        )}
        {person.committees?.length > 0 && (
          <>
            <p className="mt-8 font-outfit text-[11px] uppercase tracking-[0.18em] text-slatey">Board committees</p>
            <p className="mt-2 text-sm text-navy-900">{person.committees.map((c) => COMMITTEES[c]?.name).filter(Boolean).join(" · ")}</p>
          </>
        )}
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-black/10 pt-6">
          <span className="font-outfit text-xs tabular-nums text-slatey">
            {position.index + 1} / {position.total}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => onStep(-1)} aria-label="Previous profile" className="grid h-11 w-11 place-items-center border border-navy-900/30 text-navy-900 transition-colors hover:border-teal-500 hover:text-teal-700">
              <Arrow width={16} height={16} className="rotate-180" />
            </button>
            <button type="button" onClick={() => onStep(1)} aria-label="Next profile" className="grid h-11 w-11 place-items-center border border-navy-900/30 text-navy-900 transition-colors hover:border-teal-500 hover:text-teal-700">
              <Arrow width={16} height={16} />
            </button>
          </div>
        </div>
      </div>
      <button type="button" onClick={onClose} aria-label="Close profile" className="absolute right-3 top-3 grid h-11 w-11 place-items-center bg-navy-950/80 text-2xl leading-none text-white transition-colors hover:bg-teal-500 hover:text-navy-950 md:bg-white md:text-navy-900">
        ×
      </button>
    </article>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function LeadershipPage() {
  usePageMeta("Leadership & Board", "The Chairman, Board of Directors, executive leadership and senior management of Onction Energy.");
  const people = useMemo(() => visible(allPeople), []);
  const copy = pageCopy.leadership;
  const groups = GROUPS.map((g, i) => ({ ...g, ...copy.groups[i], people: people.filter((p) => p.group === g.key) })).filter((g) => g.people.length);
  const order = groups.flatMap((g) => g.people);
  const [openId, setOpenId] = useState(null);
  const { hash } = useLocation();

  // /leadership#<id> opens that profile (shareable links).
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (order.some((p) => p.id === id)) setOpenId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  const open = order.find((p) => p.id === openId);
  const openGroup = open && groups.find((g) => g.key === open.group);
  const step = (d) => {
    const i = order.findIndex((p) => p.id === openId);
    setOpenId(order[(i + d + order.length) % order.length].id);
  };
  const close = () => {
    setOpenId(null);
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const byKey = Object.fromEntries(groups.map((g) => [g.key, g]));

  return (
    <main>
      <InnerHero
        crumb="Leadership & Board"
        title={copy.hero.title}
        accent={copy.hero.accent}
        intro={copy.hero.intro}
        image={copy.hero.image || heroImg}
        compact
      />

      {/* Tier navigator — the hierarchy, top to bottom */}
      {groups.length > 0 && (
        <nav aria-label="Leadership groups" className="border-b border-black/10 bg-white">
          <div className="wrap">
            <ol className="-mx-[clamp(1.25rem,3vw,4rem)] flex snap-x overflow-x-auto px-[clamp(1.25rem,3vw,4rem)]">
              {groups.map((g, i) => (
                <li key={g.key} className="snap-start">
                  <a href={`#${g.key}`} className="group flex items-baseline gap-3 whitespace-nowrap border-b-2 border-transparent px-1 py-5 pr-8 text-navy-900 transition-colors hover:border-teal-500 sm:pr-12">
                    <span className="font-outfit text-xs tabular-nums text-teal-700">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-outfit text-[15px] font-medium group-hover:text-teal-700">{g.label}</span>
                    <span className="font-outfit text-xs text-slatey">{g.people.length}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
      )}

      {byKey.chairman && (
        <section id="chairman" className="scroll-mt-20 bg-white" aria-label="Chairman of the Board">
          <div className="wrap py-20 sm:py-28">
            {byKey.chairman.people.map((p) => (
              <Chairman key={p.id} person={p} />
            ))}
          </div>
        </section>
      )}

      {byKey.board && (
        <section id="board" className="scroll-mt-20 bg-mist">
          <div className="wrap py-20 sm:py-24">
            <SectionTitle eyebrow="Governance" title={byKey.board.title} accent={lastWord(byKey.board.title)} intro={byKey.board.intro} />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {byKey.board.people.map((p, i) => (
                <BoardCard key={p.id} person={p} index={i} onOpen={setOpenId} />
              ))}
            </div>
            {Object.keys(COMMITTEES).length > 0 && (
              <details className="group mt-12 border-t border-black/10 pt-6">
                <summary className="flex cursor-pointer list-none items-center justify-between font-syne text-xl font-medium text-navy-900">
                  Board committees
                  <span className="text-teal-600 transition-transform duration-400 group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <dl className="mt-6 grid gap-6 md:grid-cols-2">
                  {Object.entries(COMMITTEES).map(([k, c]) => (
                    <div key={k}>
                      <dt className="font-semibold text-navy-900">{c.name}</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-slatey">{c.remit}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </div>
        </section>
      )}

      {byKey.executive && (
        <section id="executive" className="scroll-mt-20 bg-navy-950 text-white">
          <div className="wrap py-20 sm:py-24">
            <SectionTitle light eyebrow="Management" title={byKey.executive.title} accent={lastWord(byKey.executive.title)} intro={byKey.executive.intro} />
            <div className={`mt-12 grid gap-6 ${byKey.executive.people.length > 1 ? "xl:grid-cols-2" : "max-w-4xl"}`}>
              {byKey.executive.people.map((p, i) => (
                <ExecutiveCard key={p.id} person={p} index={i} onOpen={setOpenId} />
              ))}
            </div>
          </div>
        </section>
      )}

      {byKey.management && (
        <section id="management" className="scroll-mt-20 bg-white">
          <div className="wrap grid gap-12 py-20 sm:py-24 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
            <SectionTitle eyebrow="Functional leaders" title={byKey.management.title} accent={lastWord(byKey.management.title)} intro={byKey.management.intro} />
            <div className="grid gap-x-10 border-t border-black/10 md:grid-cols-2">
              {byKey.management.people.map((p, i) => (
                <ManagementRow key={p.id} person={p} index={i} onOpen={setOpenId} />
              ))}
            </div>
          </div>
        </section>
      )}

      {groups.length === 0 && (
        <section className="bg-white">
          <div className="wrap py-24 sm:py-28">
            <Reveal>
              <div className="max-w-2xl border-l-2 border-teal-500 pl-6">
                <p className="eyebrow mb-3">Coming soon</p>
                <p className="font-syne text-2xl font-medium leading-snug text-navy-900 sm:text-3xl">Profiles of our Board and leadership team are being prepared.</p>
                <p className="mt-4 leading-relaxed text-slatey">
                  In the meantime, read <Link to="/about" className="font-semibold text-navy-900 underline decoration-teal-500 underline-offset-4">who we are</Link> or{" "}
                  <Link to="/contact" className="font-semibold text-navy-900 underline decoration-teal-500 underline-offset-4">talk to our desk</Link>.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <Dialog open={!!open} onClose={close} label={open ? `Profile: ${nameOf(open)}` : "Profile"}>
        {open && <Profile person={open} group={openGroup} onClose={close} onStep={step} position={{ index: order.indexOf(open), total: order.length }} />}
      </Dialog>

      <PreviewNotice what="Profiles" />
      <PageEnd next={{ ...copy.next, to: "/about", image: nextImg }} />
    </main>
  );
}
