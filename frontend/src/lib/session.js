// Anonymous analytics identifiers — created only after the visitor accepts
// analytics, and deleted if they later decline (consent.js).
//
//   visitor id  a random UUID kept in localStorage, so a returning browser
//               can be recognised. Not a fingerprint: nothing about the
//               device is used, and the server stores only a salted hash.
//   session id  a random UUID for one visit; a new one starts after 30
//               minutes without activity (shared by the site's open tabs).
import { analyticsAllowed } from "./consent.js";

const VISITOR_KEY = "onction_vid";
const SESSION_KEY = "onction_session";
const LEGACY_SESSION_KEY = "onction_sid";
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getVisitorId() {
  if (!analyticsAllowed()) return null;
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null; // storage blocked: tracking becomes best-effort, never an error
  }
}

/** The current visit's id. `touch` (default) counts as activity. Returns
 *  { id, isNew } so the caller knows when a visit has just started. */
export function getSession({ touch = true } = {}) {
  if (!analyticsAllowed()) return { id: null, isNew: false };
  try {
    const now = Date.now();
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (raw?.id && now - raw.last < SESSION_TIMEOUT_MS) {
      if (touch) localStorage.setItem(SESSION_KEY, JSON.stringify({ id: raw.id, last: now }));
      return { id: raw.id, isNew: false };
    }
    const id = uuid();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, last: now }));
    return { id, isNew: true };
  } catch {
    return { id: null, isNew: false };
  }
}

export function getSessionId() {
  return getSession({ touch: false }).id;
}

export function clearAnalyticsIds() {
  try {
    localStorage.removeItem(VISITOR_KEY);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
}

// utm_source/medium/campaign/term/content from the current URL. Sent with
// every pageview; the server attributes a visit by its first pageview only,
// so later pages can't overwrite where the visit came from.
export function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 200);
  }
  return utm;
}
