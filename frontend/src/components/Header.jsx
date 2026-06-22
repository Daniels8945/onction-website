import { useState } from "react";
import Logo from "./Logo.jsx";
import { nav, company } from "../data/content.js";
import { Arrow } from "./icons.jsx";

// ─── Inline icon atoms (no external dependency) ──────────────────────────────

// Fluid icon size: compact fixed size on phones (so 4 icons always fit),
// then scales smoothly with viewport width from the sm breakpoint up.
const ICON_SIZE = "h-5 w-5 sm:h-[clamp(24px,2.6vw,34px)] sm:w-[clamp(24px,2.6vw,34px)]";
const ICON_STROKE = "2.1";

function SearchIcon({ className = ICON_SIZE }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function HelpIcon({ className = ICON_SIZE }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function PersonIcon({ className = ICON_SIZE }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="9.5" r="2.5" />
      <path d="M7 20v-1a5 5 0 0 1 10 0v1" />
    </svg>
  );
}

function MenuIcon({ open, className = ICON_SIZE }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
      {open
        ? <path d="M6 6 18 18M18 6 6 18" />
        : <path d="M3 7h18M3 12h18M3 17h18" />}
    </svg>
  );
}

// ─── Reusable icon button for the top-right icon group ───────────────────────
function HeaderIconBtn({ label, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-full items-center px-2 text-[#f8f5ec] transition-colors hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 sm:px-[clamp(1.1rem,2.2vw,2.4rem)]"
    >
      {children}
    </button>
  );
}

// ─── Main Header ─────────────────────────────────────────────────────────────
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {/* ── Top bar — always dark, matching TATA Power's persistent header ── */}
      <header className="fixed inset-x-0 top-0 z-50 bg-navy-950">
        <div className="wrap flex h-[clamp(64px,7.5vw,91px)] items-center justify-between">
          <Logo />

          {/*
            Right icon group — 4 buttons separated by thin vertical lines,
            matching TATA's: Search | Help | Person | Menu
          */}
          <div className="flex h-16F gap-4 items-stretch divide-x divide-white/[0.30]">
            <HeaderIconBtn label="Search">
              <SearchIcon/>
            </HeaderIconBtn>

            <HeaderIconBtn
              label="Help and support"
              onClick={() => { window.location.href = "#enquire"; }}
            >
              <HelpIcon />
            </HeaderIconBtn>

            <HeaderIconBtn label="Accessibility">
              <PersonIcon />
            </HeaderIconBtn>

            <HeaderIconBtn
              label={menuOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MenuIcon open={menuOpen} />
            </HeaderIconBtn>
          </div>
        </div>
      </header>

      {/* ── Navigation drawer overlay ─────────────────────────────────────── */}
      {/*
        Visibility wrapper: keeps the drawer in the DOM so the slide-out
        transition can play, but removes pointer events when closed.
      */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${
          menuOpen ? "visible" : "invisible pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          aria-hidden="true"
          onClick={closeMenu}
          className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drawer — slides in from the right */}
        <div
          className={`absolute right-0 top-0 flex h-full w-[300px] flex-col bg-navy-900 shadow-2xl transition-transform duration-300 ease-in-out sm:w-[340px] ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          {/* Drawer header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-teal-400">
              Navigation
            </p>
            <button
              onClick={closeMenu}
              aria-label="Close navigation"
              className="text-white/50 hover:text-teal-400"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto px-7 py-6" aria-label="Primary">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="group flex items-center justify-between border-b border-white/[0.07] py-4 text-[15px] font-medium text-white/75 transition-colors hover:text-teal-400"
              >
                {item.label}
                <Arrow
                  width={15}
                  height={15}
                  className="text-teal-500 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </a>
            ))}

            <a
              href="#enquire"
              onClick={closeMenu}
              className="btn-primary mt-8 w-full justify-center"
            >
              Enquire now <Arrow width={17} height={17} />
            </a>
          </nav>

          {/* Drawer footer — contact at a glance */}
          <div className="shrink-0 border-t border-white/10 px-7 py-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-teal-400">
              Trading desk
            </p>
            <a
              href={`tel:${company.phoneHref}`}
              className="mt-1.5 block text-sm font-medium text-white/70 hover:text-teal-400"
            >
              {company.phone}
            </a>
            <a
              href={`mailto:${company.email}`}
              className="mt-0.5 block text-sm text-white/50 hover:text-teal-400"
            >
              {company.email}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
