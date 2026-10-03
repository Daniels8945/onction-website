// Fires a pageview beacon to the backend's public /api/analytics/track
// endpoint. Uses sendBeacon where available so it survives the page
// navigating away immediately after (SPA route changes).
import { getSessionId, getUtmParams } from "./session.js";
import { analyticsAllowed } from "./consent.js";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export function trackPageview(path) {
  if (!analyticsAllowed()) return; // nothing is sent until the visitor accepts analytics
  const payload = JSON.stringify({
    path,
    referrer: document.referrer || undefined,
    session_id: getSessionId() || undefined,
    ...getUtmParams(),
  });
  const url = `${API_BASE}/api/analytics/track`;

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(
    () => {}
  );
}
