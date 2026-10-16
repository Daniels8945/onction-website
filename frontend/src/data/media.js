// Media & Gallery — content for /media.
//
// NOTHING BELOW IS VERIFIED YET. The repository has no Onction photographs or
// videos (the site's imagery is licensed stock), so every story, milestone
// and gallery item here is a development placeholder describing the kind of
// real media the page is designed for. Placeholders render as labelled
// frames, never as stock photos, and only in development or preview (see
// lib/contentStatus.js).
//
// Publishing real media:
//   1. Put photos in assets/media/ (JPEG/WebP, long edge ~2000px) and import
//      them here. Videos: a short MP4 in assets/media/ (with a poster image),
//      or a YouTube ID for longer films.
//   2. Fill in the entry from the approved caption, then set verified: true.
//
// Newsroom articles and events are not duplicated here: the page also shows
// the latest published posts and events from the admin dashboard.

// Gallery categories. A category appears as a filter only when it has items.
export const CATEGORIES = [
  { key: "milestones", label: "Milestones" },
  { key: "leadership", label: "Leadership engagements" },
  { key: "industry", label: "Industry & events" },
  { key: "stakeholders", label: "Stakeholder visits" },
  { key: "sites", label: "Site & infrastructure visits" },
  { key: "team", label: "Our people" },
  { key: "community", label: "Community" },
];

// Featured stories: the first is the lead story; up to two more sit beside it.
//   { id, title, dek, date: "2026-03-14", category, image, to?, galleryIds?, verified }
export const stories = [
  {
    id: "story-lead",
    title: "Lead story — headline to be supplied",
    dek: "A significant company moment: for example a licence milestone, a first cross-border transaction or a signing ceremony.",
    date: null,
    category: "milestones",
    image: null,
    subject: "Lead photograph: the defining image of the moment",
    verified: false,
  },
  {
    id: "story-2",
    title: "Second story — headline to be supplied",
    dek: "An industry conference, panel or forum Onction took part in.",
    date: null,
    category: "industry",
    image: null,
    subject: "Onction speaker on stage, or the delegation at the venue",
    verified: false,
  },
  {
    id: "story-3",
    title: "Third story — headline to be supplied",
    dek: "A stakeholder visit or partner engagement, where it can be disclosed.",
    date: null,
    category: "stakeholders",
    image: null,
    subject: "Visiting delegation with the Onction team",
    verified: false,
  },
];

// Company milestones, oldest first.  { id, year, title, body, verified }
export const milestones = [
  { id: "m-1", year: "Year", title: "Milestone to be supplied", body: "For example: incorporation, or the NERC bulk-trading licence being granted.", verified: false },
  { id: "m-2", year: "Year", title: "Milestone to be supplied", body: "For example: first bilateral transaction, or joining the WAPP market.", verified: false },
  { id: "m-3", year: "Year", title: "Milestone to be supplied", body: "For example: opening the Abuja office.", verified: false },
  { id: "m-4", year: "Year", title: "Milestone to be supplied", body: "For example: a first renewable route-to-market contract.", verified: false },
];

// Gallery library.
//   photo: { id, type: "photo", src, alt, title, caption, date, category, verified }
//   video: { id, type: "video", src | youtube, poster, title, caption, date, category, duration, verified }
const ph = (id, category, subject, extra = {}) => ({
  id,
  type: "photo",
  src: null,
  alt: "",
  title: subject,
  caption: "",
  date: null,
  category,
  subject,
  verified: false,
  ...extra,
});

export const gallery = [
  ph("g-1", "milestones", "Licence or certificate presentation"),
  ph("g-2", "industry", "Conference panel with an Onction speaker", { shape: "wide" }),
  ph("g-3", "team", "Trading desk at work, Lagos", { shape: "tall" }),
  ph("g-4", "leadership", "Leadership meeting with a stakeholder"),
  ph("g-5", "sites", "Visit to a generating station", { shape: "wide" }),
  ph("g-6", "stakeholders", "Delegation visit to the Abuja office"),
  ph("g-7", "team", "Team outing or company retreat", { shape: "tall" }),
  ph("g-8", "industry", "Exhibition stand"),
  ph("g-9", "community", "Community or social-impact activity"),
  ph("g-10", "leadership", "Corporate film or interview", { type: "video", duration: "—", shape: "wide" }),
  ph("g-11", "sites", "Substation or transmission site visit"),
  ph("g-12", "milestones", "Signing ceremony", { type: "video", duration: "—" }),
];
