// Public-site analytics beacons (only after the visitor accepts analytics):
//
//   pageview    one per route change, with a unique event_id so retries
//               can't be counted twice
//   engagement  how long that page was actually visible and in use — time
//               only accrues while the tab is in the foreground and the
//               visitor has interacted in the last minute; sent when they
//               leave the page or hide the tab
//   events      a few real interactions (trackEvent)
//
// Nothing is sent for staff: anyone signed in to the dashboard, or viewing
// a ?preview page, is never counted as a visitor.
import { getSession, getUtmParams, getVisitorId, uuid } from "./session.js";
import { analyticsAllowed } from "./consent.js";
import { showDrafts } from "./contentStatus.js";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const IDLE_MS = 60 * 1000;

function isStaff() {
  try {
    return showDrafts || !!localStorage.getItem("onction_admin_token");
  } catch {
    return showDrafts;
  }
}

function send(path, body) {
  const url = `${API_BASE}/api/analytics/${path}`;
  const payload = JSON.stringify(body);
  if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }))) return;
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
}

function viewportClass() {
  const w = window.innerWidth;
  return w < 640 ? "s" : w < 1024 ? "m" : w < 1440 ? "l" : "xl";
}

// ── engagement clock for the current pageview ────────────────────────────────
const clock = { eventId: null, total: 0, since: null, lastInput: 0, sent: -1 };

function active() {
  return document.visibilityState === "visible" && Date.now() - clock.lastInput < IDLE_MS;
}
function pause() {
  if (clock.since != null) {
    // count up to the moment the visitor went idle, not beyond
    const until = Math.min(Date.now(), clock.lastInput + IDLE_MS);
    clock.total += Math.max(0, until - clock.since);
    clock.since = null;
  }
}
function resume() {
  if (clock.since == null && clock.eventId && active()) clock.since = Date.now();
}
function flush() {
  pause();
  if (clock.eventId && clock.total !== clock.sent) {
    clock.sent = clock.total;
    send("engage", { event_id: clock.eventId, engaged_ms: Math.round(clock.total) });
  }
  resume();
}

let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  const onInput = () => {
    const wasIdle = !active();
    clock.lastInput = Date.now();
    if (wasIdle) resume();
  };
  for (const t of ["pointerdown", "keydown", "scroll", "touchstart", "mousemove", "wheel"]) {
    window.addEventListener(t, onInput, { passive: true, capture: true });
  }
  document.addEventListener("visibilitychange", () => (document.visibilityState === "hidden" ? flush() : resume()));
  window.addEventListener("pagehide", flush);
  // fold idle stretches out of the running total
  setInterval(() => {
    if (clock.since != null && !active()) pause();
  }, 15000);
}

export function trackPageview(path) {
  if (!analyticsAllowed() || isStaff()) return;
  flush(); // close the previous page's engagement
  const { id: session_id } = getSession();
  const event_id = uuid();
  send("track", {
    path,
    event_id,
    session_id: session_id || undefined,
    visitor_id: getVisitorId() || undefined,
    host: window.location.hostname,
    referrer: document.referrer || undefined,
    viewport: viewportClass(),
    ...getUtmParams(),
  });
  listen();
  Object.assign(clock, { eventId: event_id, total: 0, since: null, sent: -1, lastInput: Date.now() });
  resume();
}

const once = new Set();
/** A real interaction. `onceKey` limits it to one per page view. */
export function trackEvent(type, props = {}, onceKey) {
  if (!analyticsAllowed() || isStaff()) return;
  if (onceKey) {
    const k = `${clock.eventId}:${onceKey}`;
    if (once.has(k)) return;
    once.add(k);
  }
  const { id: session_id } = getSession();
  send("event", {
    event_id: uuid(),
    type,
    path: window.location.pathname,
    session_id: session_id || undefined,
    visitor_id: getVisitorId() || undefined,
    host: window.location.hostname,
    props,
  });
}
