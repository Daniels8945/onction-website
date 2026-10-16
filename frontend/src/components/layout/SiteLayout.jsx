import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PageErrorBoundary from "./PageErrorBoundary.jsx";
import CookieBanner from "./CookieBanner.jsx";
import Header from "../Header.jsx";
import Footer from "../Footer.jsx";
import PageTransition from "./PageTransition.jsx";
import { useSmoothAnchorScroll } from "../../hooks/useSmoothAnchorScroll.js";
import { cmsState } from "../../cms/load.js";

// Shared frame for every public page: one header (with the mega menu), one
// footer, and the page-transition curtain between them.
export default function SiteLayout() {
  useSmoothAnchorScroll();
  const { pathname } = useLocation();
  return (
    <PageTransition>
      <a id="skip-link" href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-teal-500 focus:px-4 focus:py-2 focus:text-navy-950">
        Skip to content
      </a>
      <Header />
      <div id="main">
        {/* Page chunks load here, so the header and footer never blink out */}
        <Suspense fallback={<div className="min-h-screen bg-navy-950" />}>
          <PageErrorBoundary resetKey={pathname}>
            <Outlet />
          </PageErrorBoundary>
        </Suspense>
      </div>
      <Footer />
      <CookieBanner />
      {cmsState.mode === "preview" && (
        // Staff previewing unpublished dashboard changes — never shown to visitors.
        <div className="fixed left-3 top-[calc(clamp(64px,7.5vw,91px)+0.75rem)] z-30 flex items-center gap-3 border border-spark-400/70 bg-navy-950/95 px-3 py-2 text-xs text-white shadow-lg backdrop-blur" role="status">
          <span className="h-2 w-2 animate-pulseDot rounded-full bg-spark-400" aria-hidden="true" />
          <span>
            <strong className="text-spark-400">Preview</strong> — unpublished changes
          </span>
          <a href={`${window.location.pathname}?preview=off`} className="font-semibold text-teal-400 underline underline-offset-2">
            Exit
          </a>
        </div>
      )}
    </PageTransition>
  );
}
