import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageview } from "../lib/trackPageview.js";

// Fires a pageview beacon on every route change. Mounted once at the app
// root so it covers the landing page and every dynamic page — but not the
// /admin/* dashboard, which isn't public traffic.
export function usePageviewTracking() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return;
    trackPageview(location.pathname);
  }, [location.pathname]);
}
