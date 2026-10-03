import { useEffect } from "react";
import { markAutoScroll } from "../motion/tokens.js";

// Mobile Safari (and several Android webviews) have long ignored CSS
// `scroll-behavior: smooth` for in-page "#id" anchor jumps — a known WebKit
// gap that only shows up on phones, since desktop browsers honor the CSS
// fine. This intercepts clicks on same-page anchor links and scrolls via
// Element.scrollIntoView, which mobile Safari does support with a smooth
// behavior, and which still respects each section's scroll-margin-top
// (the scroll-mt-* classes already used to clear the fixed header).
export function useSmoothAnchorScroll() {
  useEffect(() => {
    function onClick(e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const id = link.getAttribute("href").slice(1);
      if (!id) return; // bare "#" placeholder links — leave default behavior

      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      markAutoScroll();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", `#${id}`);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}
