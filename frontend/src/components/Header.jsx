import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePageTransition } from "./layout/PageTransition.jsx";
import { isAutoScrolling } from "../motion/tokens.js";
import Logo from "./Logo.jsx";
import MegaMenu from "./nav/MegaMenu.jsx";
import SearchOverlay from "./nav/SearchOverlay.jsx";
import AccessibilityPanel from "./nav/AccessibilityPanel.jsx";

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

// Three bars that fold into a close "×" (see .burger in index.css).
function MenuIcon({ open, className = ICON_SIZE }) {
  return (
    <svg className={`burger ${className}`} data-open={open} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
      <line className="b1" x1="3" y1="7" x2="21" y2="7" />
      <line className="b2" x1="3" y1="12" x2="21" y2="12" />
      <line className="b3" x1="3" y1="17" x2="21" y2="17" />
    </svg>
  );
}

// ─── Reusable icon button for the top-right icon group ───────────────────────
function HeaderIconBtn({ label, onClick, children, ...rest }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      {...rest}
      className="flex h-full items-center px-2 text-[#f8f5ec] transition-colors hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 sm:px-[clamp(1.1rem,2.2vw,2.4rem)]"
    >
      {children}
    </button>
  );
}

// ─── Main Header ─────────────────────────────────────────────────────────────
// The top bar is the approved design (Tata's persistent dark bar with
// Search | Help | Accessibility | Menu). Behaviour added around it:
//   • compacts once the page scrolls, hides while reading down the page and
//     slides back on any upward scroll (never while a panel is open)
//   • Search → SearchOverlay, Help → /contact, Accessibility →
//     AccessibilityPanel, Menu → the full-screen MegaMenu
export default function Header() {
  const [panel, setPanel] = useState(null); // null | "menu" | "search" | "a11y"
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [barHeight, setBarHeight] = useState(91);
  const barRef = useRef(null);
  const location = useLocation();
  const { go } = usePageTransition();

  const close = useCallback(() => setPanel(null), []);
  const toggle = (name) => setPanel((p) => (p === name ? null : name));

  // While the menu or search covers the page, take the page out of the tab
  // order / accessibility tree; hand focus back to the opener on close.
  const openerRef = useRef(null);
  useEffect(() => {
    const covering = panel === "menu" || panel === "search";
    ["main", "site-footer", "skip-link"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.inert = covering;
    });
    if (panel) {
      openerRef.current = document.activeElement;
    } else if (openerRef.current?.isConnected) {
      openerRef.current.focus({ preventScroll: true });
      openerRef.current = null;
    }
  }, [panel]);

  // Any navigation closes whatever is open.
  useEffect(() => setPanel(null), [location.pathname, location.hash]);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    function update() {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 24);
      if (isAutoScrolling()) {
        setHidden(false);
        lastY = y;
      } else if (Math.abs(y - lastY) > 6) {
        setHidden(y > lastY && y > 480);
        lastY = y;
      }
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Overlays sit directly under the bar, so track its live height.
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBarHeight(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pinned = panel !== null;

  return (
    <>
      {/* ── Top bar — always dark, matching TATA Power's persistent header ── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 bg-navy-950 transition-[transform,box-shadow] duration-500 ease-in-out-quart ${
          hidden && !pinned ? "-translate-y-full" : "translate-y-0"
        } ${scrolled && !pinned ? "shadow-[0_8px_30px_rgba(6,18,31,0.35)]" : ""}`}
      >
        <div
          ref={barRef}
          className={`wrap relative flex items-center justify-between transition-[height] duration-500 ease-in-out-quart ${
            scrolled && !pinned ? "h-16 sm:h-[70px]" : "h-[clamp(64px,7.5vw,91px)]"
          }`}
        >
          <Logo />

          {/*
            Right icon group — 4 buttons separated by thin vertical lines,
            matching TATA's: Search | Help | Person | Menu
          */}
          <div className="flex h-16F gap-4 items-stretch divide-x divide-white/[0.30]">
            <HeaderIconBtn label="Search" aria-expanded={panel === "search"} onClick={() => toggle("search")}>
              <SearchIcon/>
            </HeaderIconBtn>

            <HeaderIconBtn
              label="Help and support"
              onClick={() => go("/contact")}
            >
              <HelpIcon />
            </HeaderIconBtn>

            <HeaderIconBtn label="Accessibility" data-a11y-toggle aria-expanded={panel === "a11y"} onClick={() => toggle("a11y")}>
              <PersonIcon />
            </HeaderIconBtn>

            <HeaderIconBtn
              label={panel === "menu" ? "Close navigation" : "Open navigation"}
              aria-expanded={panel === "menu"}
              aria-controls="site-menu"
              onClick={() => toggle("menu")}
            >
              <MenuIcon open={panel === "menu"} />
            </HeaderIconBtn>
          </div>

          <AccessibilityPanel open={panel === "a11y"} onClose={close} anchorRight="clamp(1.25rem,3vw,4rem)" />
        </div>
      </header>

      <SearchOverlay open={panel === "search"} onClose={close} top={barHeight} />
      <MegaMenu open={panel === "menu"} onClose={close} top={barHeight} />
    </>
  );
}
