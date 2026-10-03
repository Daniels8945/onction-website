import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTransition } from "../layout/PageTransition.jsx";
import { menu, pages, quickSearch, solutionGroups, slugify } from "../../data/site.js";
import { caseStudies } from "../../data/content.js";
import { Arrow } from "../icons.jsx";

// Tata-style search: a bar that drops under the header with "Quick Search"
// chips, extended with live results over everything the site knows about
// (pages, menu destinations, solutions and case studies).
function buildIndex() {
  const seen = new Set();
  const out = [];
  const add = (entry) => {
    if (seen.has(entry.to)) return;
    seen.add(entry.to);
    out.push(entry);
  };
  pages.forEach((p) => add({ title: p.title, to: p.to, kind: "Page", text: p.summary }));
  solutionGroups.forEach((g) =>
    g.items.forEach((s) => add({ title: s.title, to: `/solutions#${s.slug}`, kind: "Solution", text: s.body }))
  );
  caseStudies.forEach((c) => add({ title: c.title, to: `/case-studies#${slugify(c.title)}`, kind: "Case study", text: `${c.category} ${c.body}` }));
  menu.forEach((s) => s.items.forEach((i) => i.to && add({ title: i.label, to: i.to, kind: s.label, text: s.blurb })));
  return out;
}

export default function SearchOverlay({ open, onClose, top }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const { go } = usePageTransition();
  const index = useMemo(buildIndex, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index
      .map((e) => {
        const title = e.title.toLowerCase();
        const hay = `${title} ${e.text.toLowerCase()}`;
        if (!terms.every((t) => hay.includes(t))) return null;
        return { ...e, score: terms.reduce((s, t) => s + (title.includes(t) ? 3 : 1), 0) };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);
  }, [query, index]);

  function submit(e) {
    e.preventDefault();
    if (results[0]) {
      onClose();
      go(results[0].to);
    }
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transition-[visibility] ${open ? "visible" : "invisible delay-500"}`}
      style={{ top }}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-navy-950/60 backdrop-blur-sm transition-opacity duration-400 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the site"
        className={`relative border-b border-white/10 bg-navy-900 shadow-2xl transition-all duration-500 ease-out-expo ${open ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"}`}
      >
        <div className="wrap py-6 sm:py-8">
          <form onSubmit={submit} className="flex items-center gap-3 border-b-2 border-teal-500 pb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-teal-400" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              tabIndex={open ? 0 : -1}
              placeholder="Search solutions, markets, case studies…"
              aria-label="Search"
              className="w-full bg-transparent font-outfit text-xl text-white outline-none placeholder:text-white/35 sm:text-2xl"
            />
            <button type="button" onClick={onClose} tabIndex={open ? 0 : -1} className="shrink-0 text-xs uppercase tracking-[0.14em] text-white/60 hover:text-teal-400">
              Close
            </button>
          </form>

          {query.trim() ? (
            <div className="mt-5" aria-live="polite">
              {results.length === 0 ? (
                <p className="text-sm text-white/60">
                  No matches for “{query}”. Try “WAPP”, “renewables” or “banking”, or{" "}
                  <Link to="/contact" onClick={onClose} className="text-teal-400 underline underline-offset-4">ask the trading desk</Link>.
                </p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {results.map((r) => (
                    <li key={r.to}>
                      <Link to={r.to} onClick={onClose} className="group flex items-center justify-between gap-4 py-3">
                        <span className="min-w-0">
                          <span className="block text-[11px] uppercase tracking-[0.16em] text-teal-400/80">{r.kind}</span>
                          <span className="block truncate text-base text-white group-hover:text-teal-400">{r.title}</span>
                        </span>
                        <Arrow width={18} height={18} className="nudge shrink-0 text-teal-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="mt-5">
              <p className="mb-3 text-sm font-medium text-teal-400">Quick search</p>
              <div className="flex flex-wrap gap-2.5">
                {quickSearch.map((q) => (
                  <Link
                    key={q.to}
                    to={q.to}
                    onClick={onClose}
                    tabIndex={open ? 0 : -1}
                    className="group inline-flex items-center gap-2 rounded-full bg-teal-500/15 px-4 py-2 text-sm text-white ring-1 ring-teal-500/30 transition hover:bg-teal-500 hover:text-navy-950"
                  >
                    {q.label}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="transition-transform duration-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
