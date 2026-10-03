import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { DUR, markAutoScroll } from "../../motion/tokens.js";
import { isMotionReduced } from "../../motion/motionPreference.js";
import { OnctionMark } from "../Logo.jsx";
import { prefetchPage } from "../../pages/registry.js";

// Page-to-page transition for the public site. A navy curtain carrying the
// brand's "current" line covers the page (320ms), the route swaps while it's
// covered, then it lifts off the top (460ms) as the new page's reveals begin.
// Short enough that navigating never feels gated behind an animation.
//
// It intercepts ordinary in-app link clicks, so plain <a> and <Link> both
// get it. Back/forward, same-page hash jumps, new tabs, the admin area and
// reduced-motion visitors skip it. Scroll is reset on new pages, restored
// on back/forward, and hash targets are scrolled to once they mount.
const TransitionContext = createContext({ go: () => {} });
export const usePageTransition = () => useContext(TransitionContext);

const scrollPositions = new Map();

function scrollToHash(hash) {
  const id = decodeURIComponent(hash.slice(1));
  let tries = 0;
  (function attempt() {
    const el = document.getElementById(id);
    if (el) {
      markAutoScroll();
      el.scrollIntoView({ behavior: isMotionReduced() ? "auto" : "smooth", block: "start" });
    } else if (tries++ < 40) {
      requestAnimationFrame(attempt);
    }
  })();
}

export default function PageTransition({ children }) {
  const [phase, setPhase] = useState("idle"); // idle | cover | reveal
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const busy = useRef(false);
  const lastKey = useRef(location.key);

  const go = useCallback(
    (to) => {
      const url = new URL(to, window.location.href);
      const samePage = url.pathname === window.location.pathname;
      if (busy.current) return;
      if (samePage || isMotionReduced()) {
        navigate(url.pathname + url.search + url.hash);
        return;
      }
      busy.current = true;
      setPhase("cover");
      // Hold the cover until both the animation and the next page's code are
      // ready (capped, so a slow network never traps the visitor).
      const ready = Promise.race([prefetchPage(url.pathname), new Promise((r) => setTimeout(r, 2500))]);
      Promise.all([ready, new Promise((r) => setTimeout(r, DUR.curtainIn))]).then(() => {
        // Stagger the incoming page's reveals so they play as the curtain lifts.
        document.documentElement.style.setProperty("--enter", "260ms");
        navigate(url.pathname + url.search + url.hash);
        setPhase("reveal");
        setTimeout(() => {
          setPhase("idle");
          busy.current = false;
          document.documentElement.style.removeProperty("--enter");
        }, DUR.curtainOut + 60);
      });
    },
    [navigate]
  );

  // Intercept in-app link clicks (capture phase, before React Router's Link).
  useEffect(() => {
    function onClick(e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest("a[href]");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/admin")) return;
      if (url.pathname === window.location.pathname) return; // same page (hash jumps handled elsewhere)
      e.preventDefault();
      go(url.pathname + url.search + url.hash);
    }
    // Warm the next page's chunk as soon as the pointer heads for its link.
    function onOver(e) {
      const a = e.target.closest?.("a[href]");
      if (!a) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin === window.location.origin) prefetchPage(url.pathname);
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onOver, { passive: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onOver);
    };
  }, [go]);

  // Remember where each history entry was scrolled to.
  useEffect(() => {
    const key = location.key;
    function save() {
      scrollPositions.set(key, window.scrollY);
    }
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      save();
      window.removeEventListener("scroll", save);
    };
  }, [location.key]);

  useLayoutEffect(() => {
    if (lastKey.current === location.key) return;
    lastKey.current = location.key;
    if (navType === "POP" && scrollPositions.has(location.key)) {
      const y = scrollPositions.get(location.key);
      markAutoScroll(600);
      requestAnimationFrame(() => window.scrollTo(0, y));
    } else if (location.hash) {
      scrollToHash(location.hash);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location, navType]);

  // First load straight onto a hash (e.g. a shared /solutions#… link).
  useEffect(() => {
    if (location.hash) scrollToHash(location.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TransitionContext.Provider value={{ go }}>
      {children}
      <div className={`curtain curtain-${phase}`} aria-hidden="true">
        <div className="absolute left-0 top-1/2 h-px w-full overflow-hidden">
          <div className="h-px w-1/3 animate-current bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2 opacity-90">
            <OnctionMark size={34} />
            <span className="font-outfit text-[11px] tracking-[0.3em] text-white/70">
              <span className="font-black text-white">ONCTION</span> ENERGY
            </span>
          </div>
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
