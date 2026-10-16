// Draft vs verified content for the leadership, media and partner pages.
//
// Every entry in data/leadership.js, data/media.js and data/partners.js
// carries `verified: true` once the company has confirmed it (names, titles,
// photos, relationships). Unverified entries are development placeholders:
// they let the finished layouts be reviewed, but are never shown to the
// public. They appear only in development or in "preview" — open any page
// with ?preview once (it sticks for the browser tab, ?preview=off ends it).
const KEY = "onction:content-preview";

function readPreview() {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("preview");
    if (q === "off") sessionStorage.removeItem(KEY);
    else if (q !== null) sessionStorage.setItem(KEY, "1");
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return new URLSearchParams(window.location.search).has("preview");
  }
}

export const showDrafts = import.meta.env.DEV || readPreview();

/** Entries the current visitor may see. */
export function visible(items) {
  return showDrafts ? items : items.filter((i) => i.verified);
}

/** True when a page has anything verified to show (drives navigation links). */
export function hasPublished(items) {
  return items.some((i) => i.verified);
}
