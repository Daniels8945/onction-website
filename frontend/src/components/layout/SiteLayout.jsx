import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PageErrorBoundary from "./PageErrorBoundary.jsx";
import CookieBanner from "./CookieBanner.jsx";
import Header from "../Header.jsx";
import Footer from "../Footer.jsx";
import PageTransition from "./PageTransition.jsx";
import { useSmoothAnchorScroll } from "../../hooks/useSmoothAnchorScroll.js";

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
    </PageTransition>
  );
}
