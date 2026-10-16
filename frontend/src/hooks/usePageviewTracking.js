import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent, trackPageview } from "../lib/trackPageview.js";
import { useConsent } from "../lib/consent.js";

// Fires a pageview beacon on every route change. Mounted once at the app
// root so it covers the landing page and every dynamic page — but not the
// /admin/* dashboard, which isn't public traffic.
export function usePageviewTracking() {
  const location = useLocation();
  const { consent } = useConsent();

  // Re-runs when consent is granted, so the page the visitor accepted on counts.
  useEffect(() => {
    if (location.pathname.startsWith("/admin") || consent !== "granted") return;
    trackPageview(location.pathname);
  }, [location.pathname, consent]);

  // Phone and email links anywhere on the site (the click, not a confirmed call).
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.('a[href^="tel:"], a[href^="mailto:"]');
      if (a) trackEvent("contact_click", { method: a.getAttribute("href").startsWith("tel:") ? "phone" : "email" });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}
