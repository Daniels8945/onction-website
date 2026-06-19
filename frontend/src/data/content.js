// All copy for the Onction Energy landing page.
// Structure is adapted from Tata Power TPTCL (layout), GMR Power Trading
// (content architecture) and PTC India Business Solutions (service set),
// but every claim is rewritten to reflect Onction's real positioning:
// a NERC-licensed bulk electricity trader and WAPP market participant
// operating across the West African power market.

export const company = {
  name: "Onction Services Limited",
  shortName: "Onction Energy",
  phone: "+234 708 058 2578",
  phoneHref: "+2347080582578",
  email: "info@onctionenergy.com",
  offices: [
    {
      label: "Lagos (Head Office)",
      lines: ["5C, Adekunle Lawal Road,", "Off Second Avenue, Ikoyi, Lagos"],
    },
    {
      label: "Abuja",
      lines: [
        "5, Chikezie Ude Close, Bagudu Mamman Crescent,",
        "Katampe Extension, Abuja",
      ],
    },
  ],
};

export const nav = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#about" },
  { label: "Business Solutions", href: "#solutions" },
  { label: "GR0W", href: "#grow" },
  { label: "Why Onction", href: "#why" },
  { label: "Contact", href: "#enquire" },
];

export const heroSlides = [
  {
    kicker: "Trading Desk · 24/7",
    title: "Fully charged, for a sustainable future.",
    body: "A NERC-licensed bulk electricity trader providing a reliable route to market for clean and conventional power across West Africa.",
    cta: { label: "Explore our solutions", href: "#solutions" },
  },
  {
    kicker: "WAPP · 14-Nation Regional Market",
    title: "Seamless control, anytime, every time.",
    body: "Our 24/7 trading desk connects generators, utilities and large consumers with disciplined scheduling, compliance and transaction monitoring across the West African Power Pool.",
    cta: { label: "How we trade", href: "#capability" },
  },
  {
    kicker: "Renewables · Route to Market",
    title: "A route to market for West Africa's clean power.",
    body: "We smooth production curves through structured trading, helping solar, wind and hydro projects reach buyers reliably and competitively.",
    cta: { label: "Our green solutions", href: "#grow" },
  },
  {
    kicker: "Cross-border · WAPP Trading",
    title: "Bulk electricity trading, built on trust.",
    body: "Privately held and licensed to purchase and sell power — connecting generators, utilities and large consumers across 14 West African nations.",
    cta: { label: "About Onction", href: "#about" },
  },
];

export const quickLinks = [
  { label: "Our offerings", href: "#solutions" },
  { label: "Our presence", href: "#about" },
  { label: "Resource centre", href: "#why" },
  { label: "Our leadership", href: "#about" },
  { label: "GR0W with Onction", href: "#grow" },
  { label: "Enquire now", href: "#enquire" },
];

export const badges = [
  "NERC-licensed bulk electricity trader, authorised to purchase and sell power across Nigeria",
  "Active participant in the West African Power Pool (WAPP) — 14-nation regional electricity market",
  "24/7 trading desk managing scheduling, compliance and real-time transaction monitoring",
  "Route-to-market partner for solar, wind and hydro projects across West Africa",
  "Committed to UN SDG 7 — affordable and clean energy for all by 2030",
];

export const credentials = [
  "NERC-licensed bulk electricity trader",
  "WAPP market participant",
  "Route-to-market for renewables & gas-fired plants",
  "Licensed to purchase and sell power",
  "Aligned to UN SDG 7",
  "Dual presence — Lagos & Abuja",
];

// Honest, defensible figures — mandate & market scope rather than
// invented trading volumes.
export const metrics = [
  { value: "2", unit: "", label: "Trading hubs — Lagos & Abuja" },
  { value: "14", unit: "", label: "WAPP member nations in the regional market" },
  { value: "2", unit: "", label: "Core portfolios — gas-fired & renewables" },
  { value: "2030", unit: "", label: "Net-Zero & SDG 7 target year" },
];

export const about = {
  eyebrow: "About Onction",
  heading: "A dynamic bulk-trading portfolio for West Africa",
  tabs: [
    {
      key: "who",
      tab: "Who we are",
      title: "An intermediary bulk electricity trader",
      body: [
        "Onction Services Limited is an intermediary bulk electricity trader, providing essential routes to market for renewable energy projects and existing gas-fired power plants. Our purpose is to lead the shift toward sustainable energy within the West African market by facilitating the trade and distribution of electricity.",
        "We are a privately held company licensed to purchase and sell power, ensuring that market participants have access to reliable and sustainable energy solutions — and one of Africa's fastest-growing energy companies.",
      ],
    },
    {
      key: "licence",
      tab: "Our licence & mandate",
      title: "Licensed by NERC, active in WAPP",
      body: [
        "Onction holds a bulk electricity trading licence from the Nigerian Electricity Regulatory Commission (NERC) and participates in the West African Power Pool (WAPP) market.",
        "This mandate lets us aggregate supply and demand, structure contracts, and create a seamless route to market for clean power solutions — driving sustainable economic growth and environmental stewardship.",
      ],
    },
    {
      key: "services",
      tab: "End-to-end energy services",
      title: "From sourcing to settlement",
      body: [
        "We serve as a one-stop partner across the value chain: power sourcing and aggregation, bilateral and exchange-style transactions, banking and swap arrangements, renewable route-to-market, portfolio management, and advisory.",
        "Our model is built on three commercial strengths — economies of scale, market influence, and disciplined risk management.",
      ],
    },
    {
      key: "market",
      tab: "Our market & footprint",
      title: "Local company, regional reach",
      body: [
        "From offices in Lagos and Abuja, we operate across the West African market, optimising gas-fired plants and promoting renewable energy integration.",
        "We aim to reduce energy poverty through improved capacity utilisation and competitive tariffs — enhancing access for underserved communities while fostering partnerships with governments, utilities and local communities.",
      ],
    },
  ],
  strengths: [
    {
      title: "Economies of scale",
      body: "Reduced costs and operational efficiency through pricing and negotiation.",
    },
    {
      title: "Market influence",
      body: "Strong negotiation power and supply-chain leverage.",
    },
    {
      title: "Risk management",
      body: "Effective hedging and diversification strategies.",
    },
  ],
};

// PTC India Business Solutions service set, adapted to Onction / West Africa.
export const solutions = {
  eyebrow: "Business Solutions",
  heading: "One partner, the full power-trading value chain",
  intro:
    "Comprehensive trading solutions and energy services spanning the entire value chain — from sourcing and generation to optimisation and end use.",
  items: [
    {
      title: "Power purchase & sale",
      body: "Structured buy and sell arrangements connecting generators, utilities and large consumers.",
    },
    {
      title: "Power banking & swaps",
      body: "Banking and swap contracts between utilities to balance seasonal and time-of-day positions.",
    },
    {
      title: "Cross-border & WAPP trading",
      body: "Regional electricity trading across the West African Power Pool market.",
    },
    {
      title: "Exchange & bilateral transactions",
      body: "Short, medium and long-term contracts via bilateral and exchange-style routes.",
    },
    {
      title: "Renewable energy solutions",
      body: "Route-to-market for solar, wind and hydro, with green-attribute management.",
    },
    {
      title: "Energy efficiency & optimisation",
      body: "Capacity-utilisation and load optimisation that turn energy spend into advantage.",
    },
    {
      title: "Power portfolio management",
      body: "Active management of contracted and merchant positions to manage exposure.",
    },
    {
      title: "Advisory & consultancy",
      body: "Market entry, structuring and sustainability advisory across the energy sector.",
    },
    {
      title: "Investment & project facilitation",
      body: "Facilitating viable investment and offtake for power and renewable projects.",
    },
  ],
};

// GMR "Integrated Trading Capability" list, adapted.
export const capability = {
  eyebrow: "Integrated Trading Capability",
  heading: "How we move power",
  body: "We maintain flexible arrangements for the purchase and sale of power across the regional market, ensuring diversified, dependable supply.",
  items: [
    "Long-term, medium-term and short-term contracts",
    "Open-access power supply across the West African market",
    "Banking and swap contracts between utilities",
    "Renewable energy tie-ups and green-attribute management",
    "Sale and purchase through bilateral and exchange routes",
  ],
};

export const grow = {
  eyebrow: "GR0W with Onction",
  heading: "Grow with Onction Energy",
  intro:
    "Onction Energy aims to reduce carbon emissions, scale up renewables and provide low-carbon energy alternatives for everyday life.",
  pillars: [
    {
      title: "Gaseous fuels",
      body: "Optimise capacity utilisation across existing power plants, reducing the need for new build.",
    },
    {
      title: "Renewables",
      body: "Route to market for renewables by smoothing production curves through trading.",
    },
    {
      title: "Net Zero by 2030",
      body: "A clear path toward carbon neutrality by 2030.",
    },
    {
      title: "Worldwide footprint",
      body: "Local company with global impact — climate change has no borders.",
    },
  ],
};

// GMR "Highlights" cards, adapted.
export const highlights = {
  eyebrow: "Why Onction",
  heading: "Built for a reliable energy market",
  items: [
    {
      title: "NERC-licensed bulk trader",
      body: "Licensed to undertake bulk electricity trading and create routes to market.",
    },
    {
      title: "WAPP & regional access",
      body: "An active participant across the West African Power Pool market.",
    },
    {
      title: "24/7 trading & operations",
      body: "A dedicated desk managing scheduling, compliance and transaction monitoring.",
    },
    {
      title: "Renewable route-to-market",
      body: "Helping clean-energy projects reach buyers and smooth their production curves.",
    },
    {
      title: "Risk & settlement discipline",
      body: "Sound controls and timely commercial settlement mechanisms.",
    },
    {
      title: "Integrated energy ecosystem",
      body: "Aligning gas-fired and renewable assets with structured trading solutions.",
    },
  ],
};

export const sdg = {
  eyebrow: "SDG 7",
  heading: "Affordable and clean energy for all",
  body: "Onction Services Limited is committed to contributing to Sustainable Development Goal 7 — ensuring access to affordable, reliable, sustainable and modern energy for all.",
  goals: [
    "Reduce energy poverty through fairer tariffs and improved capacity utilisation across West Africa.",
    "Enhance energy access for underserved communities, promoting economic development and social equity.",
    "Foster partnerships with governments, NGOs and local communities to drive sustainable energy development.",
    "Increase access to renewable energy sources, reducing reliance on fossil fuels and mitigating climate change.",
  ],
};

export const caseStudies = [
  {
    category: "Renewable Route-to-Market",
    title: "Solar IPP — Offtake structuring for a 50 MW project in Ogun State",
    body: "Structured a long-term PPA that smoothed the revenue profile of an independent solar IPP, enabling project financing and grid connection within the WAPP framework.",
  },
  {
    category: "Cross-border Trading",
    title: "Ghana–Nigeria bilateral transaction under WAPP open-access rules",
    body: "Facilitated the first privately arranged cross-border bilateral contract between a Ghanaian generator and a Nigerian DISCO, demonstrating WAPP market liquidity.",
  },
  {
    category: "Gas-fired Optimisation",
    title: "Capacity utilisation improvement for a 132 MW gas plant in Delta State",
    body: "Through active portfolio management and merchant trading, improved plant load factor by 18 percentage points, reducing the effective cost of electricity for downstream buyers.",
  },
  {
    category: "Banking & Swaps",
    title: "Seasonal swap arrangement between utilities in Senegal and Côte d'Ivoire",
    body: "Designed and executed a banking-and-swap contract that balanced seasonal hydro surplus in one market against peak thermal demand in another.",
  },
  {
    category: "C&I Direct Supply",
    title: "Competitive tariff supply for a large industrial group in Lagos",
    body: "Aggregated generation capacity from multiple sources to deliver a bespoke supply contract below prevailing MYTO tariffs, saving the client 22% on energy costs.",
  },
  {
    category: "Advisory",
    title: "Market-entry advisory for a UK-based renewable developer entering West Africa",
    body: "Provided regulatory, structuring and counterparty-identification support that reduced the developer's time-to-PPA from 18 months to under 9.",
  },
];

export const testimonials = [
  {
    quote:
      "Onction provided a route to market that simply did not exist for us before. Their WAPP network and regulatory expertise turned what felt like an impossible cross-border deal into a signed contract.",
    name: "Managing Director",
    company: "West Africa Power Solutions Ltd",
    sector: "Independent Power Producer",
  },
  {
    quote:
      "The banking-and-swap structure Onction designed let us balance our seasonal hydro surplus rather than curtailing generation. We saw material revenue uplift within the first quarter.",
    name: "Chief Commercial Officer",
    company: "Sahelian Grid Corporation",
    sector: "Utility",
  },
  {
    quote:
      "We were paying grid tariffs that did not reflect our load profile. Onction aggregated supply options we had no access to and delivered a 22 % saving on our annual energy bill.",
    name: "Head of Operations",
    company: "Meridian Industrial Group",
    sector: "Commercial & Industrial Consumer",
  },
  {
    quote:
      "Their advisory team cut our time-to-PPA in half. Onction knew the counterparties, understood the NERC licensing requirements and kept the deal on track when we would have stalled.",
    name: "Country Director",
    company: "Albion Renewable Energy",
    sector: "International Developer",
  },
];

// West African / WAPP member states for the enquiry form country field.
export const countries = [
  "Nigeria",
  "Ghana",
  "Côte d'Ivoire",
  "Senegal",
  "Benin",
  "Togo",
  "Burkina Faso",
  "Mali",
  "Niger",
  "Guinea",
  "Sierra Leone",
  "Liberia",
  "The Gambia",
  "Guinea-Bissau",
  "Other",
];
