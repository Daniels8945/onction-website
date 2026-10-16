// Leadership & Board — content for /leadership.
//
// NOTHING BELOW IS VERIFIED YET. Every entry is a development placeholder
// (`verified: false`): the role slots come from the website brief, but no
// names, titles, biographies or portraits have been supplied. Placeholders
// are only visible in development or preview (see lib/contentStatus.js); the
// public page shows a section only once it has verified people in it.
//
// To publish a person, fill in their details, add the portrait and set
// `verified: true`:
//
//   {
//     id: "jane-doe",                    // unique, used in the URL hash
//     group: "board",                    // chairman | board | executive | management
//     name: "Jane Doe",                  // exactly as approved
//     title: "Independent Non-Executive Director",   // official designation
//     function: "Finance",               // management only: department heading
//     portrait: janeImg,                 // import from assets/leadership/ (4:5, ≥ 1000px tall)
//     focus: "50% 30%",                  // optional object-position for cropping
//     summary: "One sentence for cards.",
//     bio: ["Paragraph one.", "Paragraph two."],
//     experience: ["Former …", "Board member, …"],   // optional highlights
//     committees: ["audit"],             // optional, keys from COMMITTEES
//     verified: true,
//   }
//
// Before publishing the executive section, confirm whether Managing Director
// and Chief Executive Officer are one role or two — use a single entry with
// the combined title if one person holds both.

export const GROUPS = [
  {
    key: "chairman",
    label: "Chairman",
    title: "Chairman of the Board",
    intro: "Leads the Board in setting Onction's direction and holding management to account.",
  },
  {
    key: "board",
    label: "Board of Directors",
    title: "Board of Directors",
    intro: "Responsible for governance, strategy and oversight of the company's risk and controls.",
  },
  {
    key: "executive",
    label: "Executive leadership",
    title: "Executive leadership",
    intro: "Runs the business day to day and is accountable to the Board for its performance.",
  },
  {
    key: "management",
    label: "Senior management",
    title: "Senior management",
    intro: "The heads of the functions that keep the trading desk, the business and its systems running.",
  },
];

// Board committees, shown only if at least one verified director lists them.
export const COMMITTEES = {
  // audit: { name: "Audit & Risk Committee", remit: "…" },
};

const slot = (id, group, title, extra = {}) => ({
  id,
  group,
  name: null,
  title,
  portrait: null,
  summary: "",
  bio: [],
  verified: false,
  ...extra,
});

export const people = [
  slot("the-chairman", "chairman", "Chairman of the Board"),
  slot("director-1", "board", "Director — designation to be confirmed"),
  slot("director-2", "board", "Director — designation to be confirmed"),
  slot("director-3", "board", "Director — designation to be confirmed"),
  slot("director-4", "board", "Director — designation to be confirmed"),
  slot("managing-director", "executive", "Managing Director / Chief Executive Officer", {
    note: "Confirm whether these are one role or two before publishing.",
  }),
  slot("head-finance", "management", "Head of Finance", { function: "Finance" }),
  slot("head-business-development", "management", "Head of Business Development", { function: "Business Development" }),
  slot("head-it", "management", "Head of Information Technology", { function: "Information Technology" }),
];
