// Partner ecosystem — content for the ecosystem map and directory on /partners.
//
// ECOSYSTEM describes the roles in an electricity market and where Onction,
// as a bulk trader, sits among them. It is a description of the market, not a
// list of agreements: it names no organisation and claims no partnership.
//
// ORGANISATIONS is the directory. NOTHING IN IT IS VERIFIED YET: the entries
// are development placeholders, shown only in development or preview (see
// lib/contentStatus.js). Publish an organisation only once the relationship
// and the permission to name it are confirmed:
//
//   {
//     id: "acme-genco",
//     name: "Acme Generation Ltd",          // exactly as the organisation styles it
//     logo: acmeLogo,                        // import from assets/partners/ (SVG or transparent PNG)
//     ecosystem: "generation",               // a key from ECOSYSTEM
//     relationship: "generation",            // a key from RELATIONSHIPS — the accurate one
//     description: "One factual sentence about the relationship, approved by both sides.",
//     url: "https://…",                      // optional, only if approved
//     highlight: false,                      // true = featured editorial card (use sparingly)
//     verified: true,
//   }
//
// Never publish contract terms, volumes or prices, and don't call an
// organisation a partner unless that is what the relationship is.

// How a relationship is labelled. Pick the one that is accurate.
export const RELATIONSHIPS = {
  strategic: "Strategic partner",
  generation: "Generation company",
  distribution: "Distribution company",
  finance: "Financial institution",
  customer: "Customer / offtaker",
  technology: "Technology or service provider",
  stakeholder: "Industry stakeholder",
};

// The market around Onction, clockwise from supply to demand. `side` places
// the node on the map; `flow` is the direction energy or value moves relative
// to Onction ("in", "out" or "both").
export const ECOSYSTEM = [
  {
    key: "generation",
    label: "Generation",
    side: "supply",
    flow: "in",
    role: "Gas-fired, hydro, solar and wind generators produce the power.",
    onction: "Onction contracts generators' output and gives them a route to market — including renewable projects that need a dependable offtaker.",
  },
  {
    key: "infrastructure",
    label: "Market infrastructure",
    side: "supply",
    flow: "both",
    role: "Transmission, system operation and market settlement move power across the grid and keep trades accountable.",
    onction: "Onction schedules its trades onto the grid and settles them through the market's rules, around the clock.",
  },
  {
    key: "finance",
    label: "Finance",
    side: "supply",
    flow: "both",
    role: "Banks and financial institutions provide the credit, guarantees and payment security that power transactions rely on.",
    onction: "Sound financial arrangements let Onction stand between buyers and sellers and settle on time.",
  },
  {
    key: "distribution",
    label: "Distribution",
    side: "demand",
    flow: "out",
    role: "Distribution companies deliver electricity to homes and businesses in their franchise areas.",
    onction: "Onction supplies distribution companies and helps them balance seasonal positions through banking and swaps.",
  },
  {
    key: "customers",
    label: "Commercial & industrial customers",
    side: "demand",
    flow: "out",
    role: "Large commercial and industrial users need dependable supply priced to their load.",
    onction: "Onction aggregates supply into contracts shaped to each customer's demand.",
  },
  {
    key: "collaboration",
    label: "Technology & strategic collaboration",
    side: "demand",
    flow: "both",
    role: "Technology providers, advisers and strategic collaborators strengthen how the market works.",
    onction: "Onction works with specialists in systems, data and advisory to run its desk and develop new capacity.",
  },
];

const slot = (id, ecosystem, relationship) => ({
  id,
  name: null,
  logo: null,
  ecosystem,
  relationship,
  description: "",
  url: null,
  highlight: false,
  verified: false,
});

export const ORGANISATIONS = [
  { ...slot("org-gen-1", "generation", "generation"), highlight: true },
  slot("org-gen-2", "generation", "generation"),
  slot("org-gen-3", "generation", "generation"),
  slot("org-infra-1", "infrastructure", "stakeholder"),
  slot("org-infra-2", "infrastructure", "stakeholder"),
  slot("org-fin-1", "finance", "finance"),
  slot("org-fin-2", "finance", "finance"),
  slot("org-dist-1", "distribution", "distribution"),
  slot("org-dist-2", "distribution", "distribution"),
  { ...slot("org-cust-1", "customers", "customer"), highlight: true },
  slot("org-cust-2", "customers", "customer"),
  slot("org-tech-1", "collaboration", "technology"),
  slot("org-tech-2", "collaboration", "strategic"),
];
