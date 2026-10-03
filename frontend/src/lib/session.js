// A per-tab visit identifier, not a tracking cookie: lives in sessionStorage,
// so it disappears when the tab closes — that's what lets the backend group
// pageviews into a "session" and attribute an enquiry/registration back to
// the channel that produced it, without persisting anything long-term.
import { analyticsAllowed } from "./consent.js";

const SESSION_KEY = "onction_sid";

export function getSessionId() {
  if (!analyticsAllowed()) return null; // analytics consent only
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `sid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private-browsing modes etc. can block storage — tracking just becomes
    // best-effort in that case, never a hard failure for the visitor.
    return null;
  }
}

// Reads utm_source/medium/campaign/term/content off the current URL, if
// present. Only meaningful on the landing pageview — later route changes
// within the same session won't carry them, which is fine since only the
// first pageview of a session needs to record them.
export function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}
