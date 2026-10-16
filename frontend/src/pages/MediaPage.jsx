import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MediaHero from "../components/media/MediaHero.jsx";
import MediaVisual, { PlayBadge, formatDate } from "../components/media/MediaVisual.jsx";
import Lightbox from "../components/media/Lightbox.jsx";
import SectionTitle from "../components/page/SectionTitle.jsx";
import PageEnd from "../components/page/PageEnd.jsx";
import Reveal from "../components/Reveal.jsx";
import InView from "../motion/InView.jsx";
import { DraftTag, PreviewNotice } from "../components/content/Placeholder.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { showDrafts, visible } from "../lib/contentStatus.js";
import { CATEGORIES, gallery as allGallery, milestones as allMilestones, stories as allStories } from "../data/media.js";
import { Arrow } from "../components/icons.jsx";
import { pageCopy } from "../data/pages.js";

import nextImg from "../../assets/site/aerial-network.jpg";

// Media & Gallery, after the editorial structure of Tata Power's News & Media
// page — an art-directed opening, a lead story with supporting stories,
// the newsroom, then a browsable library — retold in Onction's own visual
// language. Content and its verification live in data/media.js; newsroom
// posts and events come from the admin dashboard, not a second copy here.

const API_BASE = import.meta.env.VITE_API_BASE || "";
const catLabel = (k) => CATEGORIES.find((c) => c.key === k)?.label;

function Meta({ item, light = false }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-outfit text-[11px] uppercase tracking-[0.18em] ${light ? "text-teal-400" : "text-teal-700"}`}>
      {!item.verified && <DraftTag />}
      {catLabel(item.category) && <span>{catLabel(item.category)}</span>}
      {formatDate(item.date) && <span className={light ? "text-white/50" : "text-slatey"}>{formatDate(item.date)}</span>}
    </p>
  );
}

// ── Featured stories: one lead, up to two beside it ─────────────────────────
function StoryLink({ story, onOpen, className, children }) {
  if (story.to) {
    return (
      <Link to={story.to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => onOpen(story.id)} className={`text-left ${className}`}>
      {children}
    </button>
  );
}

function Featured({ stories, onOpen }) {
  const [lead, ...rest] = stories;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
      <Reveal>
        <StoryLink story={lead} onOpen={onOpen} className="group block outline-none ring-teal-500 ring-offset-4 focus-visible:ring-2">
          <div className="relative aspect-[16/10] overflow-hidden">
            <MediaVisual item={{ ...lead, type: "photo" }} />
            <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-teal-500 transition-transform duration-500 ease-out-expo group-hover:scale-x-100" aria-hidden="true" />
          </div>
          <div className="mt-6">
            <Meta item={lead} />
            <h3 className="mt-3 max-w-2xl font-syne text-2xl font-medium leading-tight text-navy-900 transition-colors group-hover:text-teal-700 sm:text-[2rem]">{lead.title}</h3>
            {lead.dek && <p className="mt-3 max-w-2xl leading-relaxed text-slatey">{lead.dek}</p>}
          </div>
        </StoryLink>
      </Reveal>
      {rest.length > 0 && (
        <div className="grid content-start gap-8">
          {rest.slice(0, 2).map((s, i) => (
            <Reveal key={s.id} delay={120 + i * 100}>
              <StoryLink story={s} onOpen={onOpen} className="group grid w-full grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5 outline-none ring-teal-500 ring-offset-4 focus-visible:ring-2 lg:grid-cols-1">
                <div className="relative aspect-[4/3] overflow-hidden lg:aspect-[16/9]">
                  <MediaVisual item={{ ...s, type: "photo" }} />
                </div>
                <div>
                  <Meta item={s} />
                  <h3 className="mt-2 font-syne text-lg font-medium leading-snug text-navy-900 transition-colors group-hover:text-teal-700 sm:text-xl">{s.title}</h3>
                  {s.dek && <p className="mt-2 hidden text-sm leading-relaxed text-slatey sm:block">{s.dek}</p>}
                </div>
              </StoryLink>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Milestones: a line that draws through the years ────────────────────────
function Milestones({ items }) {
  return (
    <InView className="relative" threshold={0.15}>
      <div className="-mx-[clamp(1.25rem,3vw,4rem)] overflow-x-auto px-[clamp(1.25rem,3vw,4rem)] pb-4">
        <ol className="relative flex min-w-max snap-x snap-mandatory gap-0">
          <span className="line-draw absolute left-0 right-0 top-[3.35rem] h-px bg-teal-500/60" aria-hidden="true" />
          {items.map((m, i) => (
            <li key={m.id} className="relative w-[78vw] max-w-[320px] shrink-0 snap-start pr-10 sm:w-[300px]">
              <Reveal delay={300 + i * 140}>
                <p className="font-syne text-4xl font-medium text-white">{m.year}</p>
                <span className="relative z-10 mt-3 block h-3 w-3 rounded-full border-2 border-teal-400 bg-navy-950" aria-hidden="true" />
                {!m.verified && <DraftTag className="mt-5" />}
                <h3 className="mt-3 font-syne text-lg font-medium leading-snug text-white">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{m.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </InView>
  );
}

// ── Newsroom: published posts and events from the dashboard ────────────────
function useNewsroom() {
  const [data, setData] = useState({ posts: null, events: null });
  useEffect(() => {
    const get = (path) => fetch(`${API_BASE}/api/${path}`).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    Promise.all([get("news/public"), get("events/public")]).then(([posts, events]) => setData({ posts, events }));
  }, []);
  return data;
}

function Newsroom({ posts, events }) {
  const upcoming = events.filter((e) => new Date(e.ends_at || e.starts_at) >= new Date()).slice(0, 2);
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div>
        <p className="font-outfit text-[11px] uppercase tracking-[0.18em] text-slatey">Latest news</p>
        {posts.length ? (
          <ul className="mt-4 border-t border-black/10">
            {posts.slice(0, 4).map((p) => (
              <li key={p.id} className="border-b border-black/10">
                <Link to={`/news/${p.slug}`} className="group grid gap-1 py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
                  <span className="font-outfit text-xs text-slatey">{formatDate(p.published_at, { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span>
                    <span className="font-outfit text-[11px] uppercase tracking-[0.18em] text-teal-700">{p.category}</span>
                    <span className="mt-1 block font-syne text-lg font-medium leading-snug text-navy-900 group-hover:text-teal-700">{p.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-t border-black/10 pt-5 text-slatey">No news published yet.</p>
        )}
        <Link to="/news" className="group mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-navy-900">
          All news <Arrow width={15} height={15} className="nudge text-teal-600" />
        </Link>
      </div>
      <div>
        <p className="font-outfit text-[11px] uppercase tracking-[0.18em] text-slatey">Upcoming events</p>
        {upcoming.length ? (
          <div className="mt-4 grid gap-4">
            {upcoming.map((e) => (
              <Link key={e.id} to={`/events/${e.slug}`} className="group flex gap-5 border border-black/10 p-5 transition-colors hover:border-teal-500">
                <span className="flex w-14 shrink-0 flex-col items-center border-r border-black/10 pr-5 text-center">
                  <span className="font-syne text-2xl font-medium text-navy-900">{new Date(e.starts_at).getDate()}</span>
                  <span className="font-outfit text-[11px] uppercase tracking-[0.14em] text-teal-700">{new Date(e.starts_at).toLocaleDateString("en-GB", { month: "short" })}</span>
                </span>
                <span>
                  <span className="font-syne text-lg font-medium leading-snug text-navy-900 group-hover:text-teal-700">{e.title}</span>
                  {e.location && <span className="mt-1 block text-sm text-slatey">{e.location}</span>}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 border-t border-black/10 pt-5 text-slatey">No upcoming events right now.</p>
        )}
        <Link to="/events" className="group mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-navy-900">
          All events <Arrow width={15} height={15} className="nudge text-teal-600" />
        </Link>
      </div>
    </div>
  );
}

// ── Gallery library ─────────────────────────────────────────────────────────
const SHAPE = { wide: "col-span-2", tall: "row-span-2", normal: "" };

function Gallery({ items, onOpen }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const counts = useMemo(() => {
    const c = { all: items.length, photo: 0, video: 0 };
    items.forEach((i) => {
      c[i.type] += 1;
      c[i.category] = (c[i.category] || 0) + 1;
    });
    return c;
  }, [items]);
  const filters = [
    { key: "all", label: "All" },
    ...(counts.photo && counts.video ? [{ key: "photo", label: "Photos" }, { key: "video", label: "Videos" }] : []),
    ...CATEGORIES.filter((c) => counts[c.key]),
  ];
  const q = query.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (filter === "all" || i.type === filter || i.category === filter) &&
      (!q || [i.title, i.caption, catLabel(i.category)].some((t) => t?.toLowerCase().includes(q)))
  );

  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div role="group" aria-label="Filter the gallery" className="-mx-[clamp(1.25rem,3vw,4rem)] flex gap-2 overflow-x-auto px-[clamp(1.25rem,3vw,4rem)] pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 border px-4 py-2 font-outfit text-sm transition-colors duration-400 ${
                filter === f.key ? "border-navy-900 bg-navy-900 text-white" : "border-black/15 text-navy-900 hover:border-teal-500"
              }`}
            >
              {f.label} <span className={`ml-1 text-xs ${filter === f.key ? "text-teal-400" : "text-slatey"}`}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
        {items.length > 12 && (
          <label className="relative block lg:w-72">
            <span className="sr-only">Search the gallery</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the gallery"
              className="w-full border border-black/15 bg-white px-4 py-2.5 text-sm text-navy-900 outline-none placeholder:text-slatey focus:border-teal-500"
            />
          </label>
        )}
      </div>

      <p className="sr-only" aria-live="polite">{shown.length} items shown</p>
      {shown.length ? (
        <ul className="mt-8 grid grid-flow-row-dense auto-rows-[170px] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:gap-4 lg:grid-cols-4 lg:auto-rows-[220px]">
          {shown.map((item, i) => (
            <li key={item.id} className={SHAPE[item.shape || "normal"]}>
              <button
                type="button"
                onClick={() => onOpen(item.id, shown)}
                className="group relative block h-full w-full overflow-hidden bg-navy-900 text-left outline-none ring-teal-500 ring-offset-2 focus-visible:ring-2"
                aria-label={`${item.type === "video" ? "Play video" : "View photo"}: ${item.title}`}
              >
                <MediaVisual item={item} eager={i < 4} />
                {item.type === "video" && <PlayBadge duration={item.duration} />}
                {!item.verified && <DraftTag className="absolute right-3 top-3" />}
                {(item.src || item.poster || item.youtube) && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-navy-950/90 to-transparent p-4 pt-10 opacity-0 transition duration-400 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
                    <span className="block font-outfit text-[10px] uppercase tracking-[0.18em] text-teal-400">{catLabel(item.category)}</span>
                    <span className="mt-1 block text-sm font-medium leading-snug text-white">{item.title}</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 border border-dashed border-black/15 px-6 py-14 text-center">
          <p className="font-syne text-xl font-medium text-navy-900">Nothing matches that</p>
          <p className="mt-2 text-sm text-slatey">Try another category, or clear the search.</p>
          <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 underline underline-offset-4">
            Show everything
          </button>
        </div>
      )}
    </>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function MediaPage() {
  usePageMeta("Media & gallery", "Photographs, videos and milestones from Onction Energy — the people and moments behind our work in West Africa's power market.");
  const stories = useMemo(() => visible(allStories), []);
  const milestones = useMemo(() => visible(allMilestones), []);
  const gallery = useMemo(() => visible(allGallery), []);
  const { posts, events } = useNewsroom();

  // One viewer for everything: stories open as single items, gallery tiles
  // open within whatever the gallery is currently filtered to.
  const [viewer, setViewer] = useState({ items: [], index: null });
  const openGallery = (id, list = gallery) => setViewer({ items: list, index: list.findIndex((i) => i.id === id) });
  const openStory = (id) => {
    const s = stories.find((x) => x.id === id);
    setViewer({ items: [{ ...s, type: "photo", src: s.image, caption: s.dek }], index: 0 });
  };

  const heroItems = [...stories.map((s) => ({ ...s, type: "photo", src: s.image, kind: "story" })), ...gallery.filter((g) => g.type === "photo")].slice(0, 4);
  const openHero = (id) => (stories.some((s) => s.id === id) ? openStory(id) : openGallery(id));
  const newsroomReady = posts && events;
  const hasNewsroom = newsroomReady && (posts.length || events.length || showDrafts);
  const nothing = !stories.length && !milestones.length && !gallery.length && newsroomReady && !posts.length && !events.length;

  return (
    <main>
      <MediaHero items={heroItems} onOpen={openHero} />

      {stories.length > 0 && (
        <section id="featured" className="scroll-mt-20 bg-white">
          <div className="wrap py-20 sm:py-24">
            <SectionTitle eyebrow="Featured stories" title="Moments that shaped Onction" accent="shaped Onction" />
            <div className="mt-12">
              <Featured stories={stories} onOpen={openStory} />
            </div>
          </div>
        </section>
      )}

      {milestones.length > 0 && (
        <section id="milestones" className="scroll-mt-20 overflow-hidden bg-navy-950 text-white">
          <div className="wrap py-20 sm:py-24">
            <SectionTitle light eyebrow="Milestones" title="The journey so far" accent="so far" />
            <div className="mt-12">
              <Milestones items={milestones} />
            </div>
          </div>
        </section>
      )}

      {hasNewsroom ? (
        <section id="newsroom" className="scroll-mt-20 bg-mist">
          <div className="wrap py-20 sm:py-24">
            <SectionTitle eyebrow="Newsroom" title="From the newsroom" accent="newsroom" intro="Announcements, market updates and events, as published by the Onction team." />
            <div className="mt-12">
              <Newsroom posts={posts} events={events} />
            </div>
          </div>
        </section>
      ) : null}

      <section id="gallery" className="scroll-mt-20 bg-white">
        <div className="wrap py-20 sm:py-24">
          <SectionTitle eyebrow="Gallery" title="Photographs and films" accent="and films" intro={gallery.length ? "Browse by theme, or open any item to view it full screen." : undefined} />
          <div className="mt-10">
            {gallery.length ? (
              <Gallery items={gallery} onOpen={openGallery} />
            ) : (
              <div className="max-w-2xl border-l-2 border-teal-500 pl-6">
                <p className="font-syne text-2xl font-medium leading-snug text-navy-900">Our gallery is being curated.</p>
                <p className="mt-3 leading-relaxed text-slatey">
                  Photographs and films from Onction's events, visits and milestones will appear here.{" "}
                  {nothing ? (
                    <>Meanwhile, see our <Link to="/case-studies" className="font-semibold text-navy-900 underline decoration-teal-500 underline-offset-4">case studies</Link>.</>
                  ) : null}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Lightbox items={viewer.items} index={viewer.index} onIndex={(index) => setViewer((v) => ({ ...v, index }))} onClose={() => setViewer({ items: [], index: null })} />
      <PreviewNotice what="Stories, milestones and gallery items" />
      <PageEnd next={{ ...pageCopy.media.next, to: "/partners", image: nextImg }} />
    </main>
  );
}
