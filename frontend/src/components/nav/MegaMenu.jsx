import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { menu, vendorPortalUrl } from "../../data/site.js";
import { company } from "../../data/content.js";
import MenuIllustration from "./illustrations.jsx";
import { Arrow, Phone } from "../icons.jsx";

// Full-screen navigation modelled on Tata Power's: the section list on the
// left, a grid of illustrated tiles for the active section on the right, and
// a utility bar along the bottom. Desktop switches sections on hover (with a
// short intent delay so sweeping the pointer across doesn't flicker);
// touch/narrow screens get an accordion instead.
//
// Motion: the panel drops in as a clip-path curtain, section rows slide in
// staggered, and the tiles re-stagger (with their line illustrations
// drawing) every time the active section changes.

function hrefFor(item) {
  return item.href === "vendor-portal" ? vendorPortalUrl() : item.href;
}

function ItemLink({ item, className, children, onNavigate, ...rest }) {
  if (item.external || item.href) {
    return (
      <a href={hrefFor(item)} className={className} onClick={onNavigate} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={item.to} className={className} onClick={onNavigate} {...rest}>
      {children}
    </Link>
  );
}

// Mounts hidden, then flips to .shown a frame later so the stagger and the
// illustration line-draw actually transition (and replay per section).
function Tile({ index, children }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(f);
  }, []);
  return (
    <li className={`mega-tile ${shown ? "shown is-in" : ""}`} style={{ "--d": `${80 + index * 70}ms` }}>
      {children}
    </li>
  );
}

function sectionForPath(pathname) {
  const idx = menu.findIndex((s) => s.items.some((i) => i.to && i.to.split("#")[0] === pathname && pathname !== "/"));
  return idx >= 0 ? idx : 0;
}

export default function MegaMenu({ open, onClose, top }) {
  const location = useLocation();
  const [active, setActive] = useState(() => sectionForPath(location.pathname));
  const [expanded, setExpanded] = useState(null); // mobile accordion
  const hoverTimer = useRef(null);
  const panelRef = useRef(null);

  // Each time the menu opens, start on the section for the current page.
  useEffect(() => {
    if (open) {
      const idx = sectionForPath(location.pathname);
      setActive(idx);
      setExpanded(idx);
      requestAnimationFrame(() => panelRef.current?.querySelector("[data-menu-first]")?.focus({ preventScroll: true }));
    }
  }, [open, location.pathname]);

  // React 18 doesn't forward `inert`; set it directly so a closed menu is
  // removed from the tab order and the accessibility tree.
  useEffect(() => {
    if (panelRef.current) panelRef.current.inert = !open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Keep Tab cycling between the header bar and the menu while it's open.
    function onKey(e) {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab") return;
      const scope = [document.querySelector("header"), panelRef.current];
      const focusables = scope.flatMap((root) =>
        root ? [...root.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')] : []
      ).filter((el) => el.offsetParent !== null && !el.closest("[aria-hidden='true']") && el.tabIndex !== -1);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!focusables.includes(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  function hoverSection(idx) {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setActive(idx), 110);
  }

  const section = menu[active];
  const isCurrent = (item) => item.to && item.to === location.pathname + location.hash;

  return (
    <div
      id="site-menu"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      aria-hidden={!open}
      style={{ top }}
      className={`mega fixed inset-x-0 bottom-0 z-40 overflow-y-auto bg-navy-950 text-white ${open ? "mega-open" : ""}`}
    >
      {/* Soft energy-grid texture behind the menu */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "28px 28px" }} />

      <div className="wrap relative flex min-h-full flex-col py-8 lg:py-10">
        {/* ── Desktop: section list + tiles ── */}
        <div className="hidden flex-1 gap-8 lg:grid lg:grid-cols-[minmax(280px,380px)_1fr] xl:gap-10">
          <nav aria-label="Sections" onMouseLeave={() => clearTimeout(hoverTimer.current)}>
            <ul>
              {menu.map((s, idx) => {
                const on = idx === active;
                return (
                  <li key={s.key} className="mega-row" style={{ "--i": idx }}>
                    <button
                      type="button"
                      data-menu-first={idx === 0 ? "" : undefined}
                      onMouseEnter={() => hoverSection(idx)}
                      onFocus={() => setActive(idx)}
                      onClick={() => setActive(idx)}
                      aria-expanded={on}
                      className={`group flex w-full items-center justify-between border-b border-white/10 px-2 py-[1.05rem] text-left font-outfit text-xl transition-colors duration-300 xl:text-[1.35rem] ${
                        on ? "bg-teal-500/15 text-teal-400" : "text-white/85 hover:text-white"
                      }`}
                    >
                      {s.label}
                      <Arrow
                        width={22}
                        height={22}
                        className={`transition-all duration-400 ${on ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"}`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div key={section.key} className="min-w-0">
            <p className="mega-blurb mb-5 max-w-xl text-sm leading-relaxed text-white/55">{section.blurb}</p>
            <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
              {section.items.map((item, i) => (
                <Tile key={`${open}-${item.label}`} index={i}>
                  <ItemLink
                    item={item}
                    onNavigate={onClose}
                    aria-current={isCurrent(item) ? "page" : undefined}
                    className={`group relative flex aspect-[4/3] flex-col justify-between overflow-hidden border bg-white/[0.03] p-5 transition-colors duration-400 hover:border-teal-400/60 hover:bg-teal-500/[0.07] focus-visible:border-teal-400 focus-visible:outline-none ${
                      isCurrent(item) ? "border-teal-400/60" : "border-white/10"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3 text-lg leading-snug text-white">
                      {item.label}
                      {item.external ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 shrink-0 text-teal-400" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                      ) : (
                        <Arrow width={18} height={18} className="nudge mt-1 shrink-0 text-teal-400" />
                      )}
                    </span>
                    <MenuIllustration name={item.illus} className="h-auto w-[62%] self-start text-teal-500/70 transition-colors duration-400 group-hover:text-teal-400" />
                    {item.external && <span className="sr-only">(opens the vendor portal)</span>}
                  </ItemLink>
                </Tile>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Mobile / tablet: accordion ── */}
        <nav className="flex-1 lg:hidden" aria-label="Sections">
          <ul>
            {menu.map((s, idx) => {
              const on = expanded === idx;
              return (
                <li key={s.key} className="mega-row border-b border-white/10" style={{ "--i": idx }}>
                  <button
                    type="button"
                    data-menu-first={idx === 0 ? "" : undefined}
                    onClick={() => setExpanded(on ? null : idx)}
                    aria-expanded={on}
                    className={`flex w-full items-center justify-between py-4 text-left font-outfit text-lg ${on ? "text-teal-400" : "text-white/90"}`}
                  >
                    {s.label}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-400 ${on ? "rotate-45" : ""}`} aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.65,0,0.35,1)] ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <ul className="overflow-hidden">
                      {s.items.map((item) => (
                        <li key={item.label}>
                          <ItemLink
                            item={item}
                            onNavigate={onClose}
                            tabIndex={on ? 0 : -1}
                            className="group flex items-center justify-between py-3 pl-4 text-[15px] text-white/70 hover:text-teal-400"
                          >
                            {item.label}
                            <Arrow width={16} height={16} className="nudge text-teal-500" />
                          </ItemLink>
                        </li>
                      ))}
                      <li className="h-3" />
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link to="/contact" onClick={onClose} className="btn-primary mt-8 w-full rounded-none">
            Enquire now <Arrow width={17} height={17} />
          </Link>
        </nav>

        {/* ── Utility bar ── */}
        <div className="mega-foot mt-8 flex flex-col gap-4 border-t border-white/15 pt-5 text-xs uppercase tracking-[0.14em] text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <a href={`tel:${company.phoneHref}`} className="inline-flex items-center gap-2 hover:text-teal-400">
              <Phone width={15} height={15} className="text-teal-400" /> Trading desk {company.phone}
            </a>
            <a href="https://nerc.gov.ng/" target="_blank" rel="noreferrer" className="hover:text-teal-400">NERC ↗</a>
            <a href="https://www.ecowapp.org/" target="_blank" rel="noreferrer" className="hover:text-teal-400">WAPP ↗</a>
          </div>
          <Link to="/contact" onClick={onClose} className="group inline-flex items-center gap-2 text-white hover:text-teal-400">
            Contact us <Arrow width={15} height={15} className="nudge text-teal-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
