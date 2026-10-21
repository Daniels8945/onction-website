// The API stores and returns timestamps in UTC without a zone marker
// ("2026-11-20T09:00:00"). `new Date()` would read that as the viewer's local
// time, shifting every event by the UTC offset (and again on every save), so
// always parse API timestamps through here.
export function parseUtc(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}

// <input type="datetime-local"> value (viewer's local time) for an API timestamp.
export function toLocalInput(value) {
  const d = parseUtc(value);
  if (!d || Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// A datetime-local value (local time) back to an ISO string for the API.
export function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  const d = parseUtc(value);
  return d ? d.toLocaleDateString(undefined, options) : "";
}

export function formatDateTime(value, options = { dateStyle: "medium", timeStyle: "short" }) {
  const d = parseUtc(value);
  return d ? d.toLocaleString(undefined, options) : "";
}
