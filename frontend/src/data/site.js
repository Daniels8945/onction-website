// Site structure for the public website — the single source for the mega
// menu, search index, footer and sitemap. Modelled on Tata Power's
// information architecture (Who we are / What we do / … / Business
// Associates) but cut down to what Onction actually is: a privately held,
// NERC-licensed bulk electricity trader in the WAPP market. There is no
// investor hub (private company) and no leadership/careers section, because
// there is no real content for them yet — better absent than invented.
import { solutions } from "./content.js";

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The vendor portal lives on its own subdomain (see main.jsx / Caddyfile).
export function vendorPortalUrl() {
  if (typeof window === "undefined") return "https://vendors.onctionenergy.com";
  const { protocol, hostname, port } = window.location;
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return "https://vendors.onctionenergy.com";
  return `${protocol}//vendors.${hostname.replace(/^www\./, "")}${port ? `:${port}` : ""}`;
}

// Solutions grouped the way a buyer thinks about them. Indices refer to
// solutions.items in content.js so copy stays in one place.
export const solutionGroups = [
  {
    key: "trading",
    title: "Power trading",
    lede: "Buying, selling, banking and moving electricity between the parties who make it and the parties who need it.",
    items: [0, 1, 2, 3],
  },
  {
    key: "clean-energy",
    title: "Clean energy & efficiency",
    lede: "A dependable route to market for renewable generation, and tighter utilisation of the plants already running.",
    items: [4, 5],
  },
  {
    key: "advisory",
    title: "Portfolio, advisory & investment",
    lede: "Managing exposure across positions, and structuring the deals and projects that bring new capacity online.",
    items: [6, 7, 8],
  },
].map((g) => ({ ...g, items: g.items.map((i) => ({ ...solutions.items[i], slug: slugify(solutions.items[i].title) })) }));

// Mega-menu sections. `illus` picks a line illustration in MegaMenu.jsx.
export const menu = [
  {
    key: "who",
    label: "Who we are",
    blurb: "A NERC-licensed bulk electricity trader connecting West Africa's generators and buyers.",
    items: [
      { label: "Our story", to: "/about", illus: "story" },
      { label: "Licence & mandate", to: "/about#licence", illus: "licence" },
      { label: "Our presence", to: "/about#presence", illus: "presence" },
      { label: "Why Onction", to: "/about#why", illus: "why" },
    ],
  },
  {
    key: "what",
    label: "What we do",
    blurb: "Trading, clean-energy route-to-market and advisory across the full power value chain.",
    items: [
      { label: "Business solutions", to: "/solutions", illus: "solutions" },
      { label: "Power trading", to: "/solutions#trading", illus: "trading" },
      { label: "Renewables route-to-market", to: "/solutions#clean-energy", illus: "renewables" },
      { label: "Portfolio & advisory", to: "/solutions#advisory", illus: "advisory" },
      { label: "How we trade", to: "/how-we-trade", illus: "flow" },
      { label: "Case studies", to: "/case-studies", illus: "cases" },
    ],
  },
  {
    key: "market",
    label: "Our market",
    blurb: "The West African Power Pool: fourteen nations, one regional electricity market.",
    items: [
      { label: "West African Power Pool", to: "/market", illus: "map" },
      { label: "Cross-border corridors", to: "/market#corridors", illus: "corridors" },
      { label: "Who takes part", to: "/market#participants", illus: "participants" },
    ],
  },
  {
    key: "sustainability",
    label: "Sustainability",
    blurb: "GR0W with Onction — renewables, efficient gas and a clear path to Net Zero.",
    items: [
      { label: "GR0W with Onction", to: "/sustainability", illus: "grow" },
      { label: "SDG 7 commitments", to: "/sustainability#sdg7", illus: "sdg" },
      { label: "Net Zero by 2030", to: "/sustainability#net-zero", illus: "netzero" },
    ],
  },
  {
    key: "news",
    label: "News and Media",
    blurb: "Market updates, announcements and upcoming events.",
    items: [
      { label: "Market news", to: "/news", illus: "news" },
      { label: "Events", to: "/events", illus: "events" },
      { label: "Case studies", to: "/case-studies", illus: "cases" },
    ],
  },
  {
    key: "partners",
    label: "Business Associates",
    blurb: "Generators, utilities, large consumers and suppliers we work alongside.",
    items: [
      { label: "Partner with us", to: "/partners", illus: "partners" },
      { label: "What partners say", to: "/partners#testimonials", illus: "quote" },
      { label: "Vendor portal", href: "vendor-portal", illus: "portal", external: true },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    blurb: "Talk to the trading desk in Lagos or Abuja.",
    items: [
      { label: "Enquire now", to: "/contact", illus: "enquire" },
      { label: "Our offices", to: "/contact#offices", illus: "presence" },
    ],
  },
];

// Pages that exist, for search and the sitemap.
export const pages = [
  { title: "Home", to: "/", summary: "Bulk electricity trading for West Africa." },
  { title: "About Onction", to: "/about", summary: "Who we are, our NERC licence and WAPP mandate, and where we operate." },
  { title: "Business solutions", to: "/solutions", summary: "Power trading, renewables route-to-market, portfolio management and advisory." },
  { title: "How we trade", to: "/how-we-trade", summary: "How electricity moves from generators through our desk to buyers." },
  { title: "Our market — WAPP", to: "/market", summary: "The 14-nation West African Power Pool and its cross-border corridors." },
  { title: "Sustainability", to: "/sustainability", summary: "GR0W with Onction, SDG 7 and our Net Zero by 2030 path." },
  { title: "Case studies", to: "/case-studies", summary: "Trading solutions in action across the West African power market." },
  { title: "Partners", to: "/partners", summary: "Who we work with and how to partner with Onction." },
  { title: "Market news", to: "/news", summary: "Trading updates and announcements." },
  { title: "Events", to: "/events", summary: "Upcoming Onction events." },
  { title: "Contact", to: "/contact", summary: "Enquire with the trading desk in Lagos or Abuja." },
  { title: "Sitemap", to: "/sitemap", summary: "Every page on the Onction website." },
  { title: "Cookies & storage", to: "/cookies", summary: "What the site stores on your device, and why." },
];

// Quick-search chips (Tata's "Quick Search" row).
export const quickSearch = [
  { label: "Business solutions", to: "/solutions" },
  { label: "WAPP market", to: "/market" },
  { label: "How we trade", to: "/how-we-trade" },
  { label: "Case studies", to: "/case-studies" },
  { label: "Market news", to: "/news" },
  { label: "Contact the desk", to: "/contact" },
];

// Which solution each case study demonstrates (by case-study category).
export const caseStudySolution = {
  "Renewable Route-to-Market": "renewable-energy-solutions",
  "Cross-border Trading": "cross-border-and-wapp-trading",
  "Gas-fired Optimisation": "energy-efficiency-and-optimisation",
  "Banking & Swaps": "power-banking-and-swaps",
  "C&I Direct Supply": "power-purchase-and-sale",
  Advisory: "advisory-and-consultancy",
};
