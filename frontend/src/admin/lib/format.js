// Date helpers shared by the dashboard pages. Kept deliberately small —
// Intl does the heavy lifting.
const DAY_MS = 86400000;

// The API serialises naive UTC datetimes ("2026-09-29T10:00:00") — without a
// zone suffix browsers would read them as local time, so pin them to UTC.
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  return new Date(/T\d{2}:\d{2}/.test(s) && !/(Z|[+-]\d{2}:?\d{2})$/.test(s) ? `${s}Z` : s);
}

export function formatDate(value) {
  if (!value) return "—";
  return parseDate(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  return parseDate(value).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function relativeTime(value) {
  if (!value) return "—";
  const diff = parseDate(value).getTime() - Date.now();
  const abs = Math.abs(diff);
  if (abs < 60000) return "just now";
  if (abs < 3600000) return rtf.format(Math.round(diff / 60000), "minute");
  if (abs < DAY_MS) return rtf.format(Math.round(diff / 3600000), "hour");
  if (abs < 30 * DAY_MS) return rtf.format(Math.round(diff / DAY_MS), "day");
  return formatDate(value);
}

// Date-only fields (due, payment, expiry dates) come from <input type="date">
// and are stored as UTC midnight — read them back as that calendar day,
// whatever the viewer's timezone, or they'd show a day early west of UTC.
function calendarDate(value) {
  const d = parseDate(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function formatDay(value) {
  if (!value) return "—";
  return calendarDate(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// Whole days from today until the calendar date `value` (negative once passed).
export function daysUntil(value) {
  if (!value) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.round((calendarDate(value) - start) / DAY_MS);
}

// Backend stores naive UTC datetimes; date inputs want YYYY-MM-DD.
export function toDateInput(value) {
  return value ? parseDate(value).toISOString().slice(0, 10) : "";
}
