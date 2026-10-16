// Copy for the inner pages — the words only. Each page component reads its
// text from here instead of carrying it inline, so the dashboard can edit it
// (cms/registry.js maps each object to its "page.*" content area; the shape
// matches backend/app/cms_schema.py). Layout, icons, images and links stay in
// the page components.
//
// A hero `intro` left as "" falls back to the shared text noted beside it, so
// editing that shared text still updates the page.

const hero = (title, accent, intro = "", image = "") => ({ title, accent, intro, image });
const sec = (eyebrow, title, accent, intro = "") => ({ eyebrow, title, accent, intro });

export const pageCopy = {
  about: {
    hero: hero("A dynamic bulk-trading portfolio for West Africa", "West Africa"), // intro: About → "Who we are", first paragraph
    next: { title: "Business solutions", summary: "One partner across the full power-trading value chain." },
  },
  leadership: {
    hero: hero(
      "The people guiding Onction",
      "guiding Onction",
      "Onction is governed by its Board of Directors and run by an executive team accountable to it. Meet the people responsible for the company's direction, its trading desk and the systems behind it."
    ),
    groups: [
      { label: "Chairman", title: "Chairman of the Board", intro: "Leads the Board in setting Onction's direction and holding management to account." },
      { label: "Board of Directors", title: "Board of Directors", intro: "Responsible for governance, strategy and oversight of the company's risk and controls." },
      { label: "Executive leadership", title: "Executive leadership", intro: "Runs the business day to day and is accountable to the Board for its performance." },
      { label: "Senior management", title: "Senior management", intro: "The heads of the functions that keep the trading desk, the business and its systems running." },
    ],
    next: { title: "About Onction", summary: "Our licence, our mandate and where we operate." },
  },
  solutions: {
    hero: hero("One partner, the full power-trading value chain", "value chain"), // intro: Business solutions → introduction
    groups: [
      { title: "Power trading", lede: "Buying, selling, banking and moving electricity between the parties who make it and the parties who need it." },
      { title: "Clean energy & efficiency", lede: "A dependable route to market for renewable generation, and tighter utilisation of the plants already running." },
      { title: "Portfolio, advisory & investment", lede: "Managing exposure across positions, and structuring the deals and projects that bring new capacity online." },
    ],
    next: { title: "How we trade", summary: "Follow a megawatt from the plant, through our desk, to the people who need it." },
  },
  "how-we-trade": {
    hero: hero("How we move power across West Africa", "move power"), // intro: Trading capability → text
    steps: [
      { title: "It starts at the plant", body: "Gas-fired power stations and solar, wind and hydro projects generate electricity. We give them a route to market — contracting their output so capacity doesn't sit idle and renewable production reaches buyers." },
      { title: "Our desk matches supply to demand", body: "The trading desk aggregates supply and demand and structures the deal: long, medium or short-term contracts, bilateral or exchange-style, with banking and swap arrangements where positions need balancing." },
      { title: "Scheduled onto the grid, around the clock", body: "Power travels over the transmission network to where it's needed. Our 24/7 desk handles scheduling, regulatory compliance and real-time transaction monitoring so every megawatt is delivered as contracted." },
      { title: "Delivered to the people who need it", body: "Utilities and large commercial and industrial consumers receive dependable supply at competitive tariffs — backed by sound controls and timely commercial settlement." },
      { title: "And across borders", body: "As a participant in the West African Power Pool, we trade across the region's interconnectors — moving surplus to where demand is, and balancing seasonal positions between neighbouring markets." },
    ],
    ways: sec("", "The arrangements behind every trade", "every trade", "Flexible purchase and sale arrangements keep supply diversified and dependable. Each one maps to a service you can engage us for."), // eyebrow: Trading capability → eyebrow
    desk: sec("", "A desk that never closes", "never closes", "Electricity is traded, scheduled and delivered in real time. Our desk is staffed for exactly that."),
    next: { title: "Our market: the West African Power Pool", summary: "Fourteen nations, one regional electricity market." },
  },
  market: {
    hero: hero(
      "One regional market, fourteen nations",
      "fourteen nations",
      "The West African Power Pool (WAPP) is the ECOWAS institution integrating its member states' national power systems into a single regional electricity market. As a WAPP market participant, Onction trades across it."
    ),
    network: sec("The WAPP network", "How the region's grids connect", "connect", "Hover or tap a country to see its corridors. Nigeria — our home market — is where we hold our trading licence."),
    corridors: sec("Cross-border trading", "Why power should cross borders", "cross borders"),
    reasons: [
      { title: "Surplus meets demand", body: "A hydro-rich system in the rainy season can sell to a neighbour running expensive thermal peaking plant." },
      { title: "Seasonal balancing", body: "Banking and swap contracts let utilities exchange power across seasons instead of curtailing generation." },
      { title: "Lower cost, wider access", body: "Better use of existing plants and fairer tariffs are how the region reduces energy poverty." },
    ],
    participants: sec("Market participants", "Who takes part, and where we fit", "where we fit", "Electricity markets work because different parties play different roles. Ours is the connective one."),
    participantList: [
      { title: "Generators", body: "Gas-fired power stations and renewable projects — solar, wind and hydro — that need a buyer for their output." },
      { title: "Transmission operators", body: "The national grids and regional interconnectors that carry bulk power between systems." },
      { title: "Utilities & distribution companies", body: "Buyers who take power off the grid and deliver it to homes and businesses." },
      { title: "Large consumers", body: "Commercial and industrial users whose load justifies bespoke supply arrangements." },
      { title: "Traders — Onction", body: "The intermediary that aggregates supply and demand, structures contracts and manages the risk in between." },
    ],
    next: { title: "Sustainability: GR0W with Onction", summary: "Renewables, efficient gas and a path to Net Zero by 2030." },
  },
  sustainability: {
    hero: hero("A clear path to Net Zero by 2030", "Net Zero"), // intro: GR0W with Onction → introduction
    pillarsIntro: "Four commitments that shape how we trade.",
    path: sec("Net Zero by 2030", "The road from here to 2030", "2030"),
    pathSteps: [
      { when: "Today", title: "Use what's already built", body: "Optimise capacity utilisation across existing gas-fired plants, reducing the need for new build." },
      { when: "Scaling", title: "Give renewables a route to market", body: "Smooth solar, wind and hydro production curves through trading so clean projects reach buyers reliably." },
      { when: "2030", title: "Net Zero", body: "A clear path toward carbon neutrality by 2030, alongside the SDG 7 goals below." },
    ],
    goalsLead: "By 2030, we aim to —",
    next: { title: "Case studies", summary: "Trading solutions in action across the West African power market." },
  },
  "case-studies": {
    hero: hero("Trading solutions in action", "in action", "Real transactions across the West African power market — what the problem was, what we structured, and what changed."),
    next: { title: "Partner with Onction", summary: "Generators, utilities, large consumers and suppliers." },
  },
  partners: {
    hero: hero("Built on trusted partnerships", "partnerships", "We sit between the people who make electricity and the people who need it. Here's what that looks like for each of them."),
    ecosystem: sec(
      "The energy ecosystem",
      "Partnerships that connect the market",
      "connect the market",
      "Electricity only reaches the people who need it when generators, the grid, finance and buyers work together. Onction's desk sits where they meet."
    ),
    directory: sec("Directory", "Organisations across the value chain", "value chain", "Each organisation is listed under the relationship it actually has with Onction."),
    who: sec("Who we work with", "One desk, four kinds of partner", "four kinds"),
    segments: [
      { title: "Generators & IPPs", offer: "A route to market for your output — offtake structuring, bilateral and cross-border sales, and smoother revenue for renewable projects." },
      { title: "Utilities & distribution companies", offer: "Dependable supply, banking and swap arrangements to balance seasonal positions, and access to the wider WAPP market." },
      { title: "Large commercial & industrial users", offer: "Bespoke supply contracts aggregated from multiple sources, priced to your load profile rather than a standard tariff." },
      { title: "Developers & investors", offer: "Market-entry, regulatory and structuring support, counterparty introductions and investment facilitation for new capacity." },
    ],
    workWith: {
      eyebrow: "Work with us",
      title: "Part of West Africa's power market?",
      accent: "power market",
      intro: "Generators looking for a route to market, buyers who need dependable supply, financiers and specialists — if your organisation has a role in the ecosystem above, we'd like to hear from you.",
      cta: "Talk to our desk",
    },
    next: { title: "How we trade", summary: "Follow a megawatt from the plant, through our desk, to the people who need it." },
  },
  contact: {
    hero: hero("Talk to our trading desk", "trading desk", "Tell us about your generation, offtake or trading needs. We'll route you to the right person."),
    routes: [
      { title: "Generation, offtake & trading", body: "Selling power, buying power, or structuring a deal — the form below goes straight to the trading desk.", cta: "Send an enquiry" },
      { title: "Urgent or time-sensitive", body: "The trading desk operates around the clock.", cta: "" },
      { title: "Suppliers & vendors", body: "Invoices, documents and registration are handled in the vendor portal.", cta: "Open the vendor portal" },
    ],
    offices: sec("Our offices", "Lagos and Abuja", "Abuja"),
  },
  media: {
    hero: {
      title: "Our story, in pictures",
      accent: "in pictures",
      intro: "The people, milestones and moments behind Onction's work in West Africa's power market — from the trading desk to the industry events and visits that shape it.",
    },
    next: { title: "Our partners", summary: "The organisations and market roles around Onction." },
  },
  news: { hero: hero("Market news and updates", "updates", "Trading updates, announcements and perspectives on the West African power market.") },
  events: { hero: hero("Where to meet the desk", "the desk", "Briefings, forums and industry events hosted or attended by Onction Energy.") },
};

// Accent only if it really occurs in the title (SplitText highlights by match).
export const pick = (value, fallback) => (value ? value : fallback);
