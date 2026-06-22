import { company, nav, solutions } from "../data/content.js";
import { OnctionMark } from "./Logo.jsx";

const solutionLinks = solutions.items.slice(0, 5).map((s) => ({
  label: s.title,
  href: "#solutions",
}));

const resourceLinks = [
  { label: "NERC licensing portal", href: "#" },
  { label: "WAPP market rules", href: "#" },
  { label: "UN SDG 7", href: "#" },
  { label: "Market updates", href: "#" },
  { label: "Compliance & policies", href: "#" },
];

// ─── Minimal inline SVG social icons — no external icon library needed ──────

function Instagram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Twitter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6ZM2 9h4v12H2zm2-5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
    </svg>
  );
}

function Facebook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 9h3V6h-3c-2 0-3.5 1.5-3.5 3.5V11H8v3h2.5v7h3v-7H16l.5-3h-3v-1.3c0-.6.4-1 1-1Z" />
    </svg>
  );
}

function YouTube() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M22 8.6a3 3 0 0 0-2.1-2.1C18.1 6 12 6 12 6s-6.1 0-7.9.5A3 3 0 0 0 2 8.6 31 31 0 0 0 1.5 12a31 31 0 0 0 .5 3.4 3 3 0 0 0 2.1 2.1C5.9 18 12 18 12 18s6.1 0 7.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22.5 12 31 31 0 0 0 22 8.6ZM10 15V9l5.2 3Z"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// All social platforms shown in the bottom bar — the only place social icons
// appear, as circular outlined buttons (intentionally different from the
// site's sharp-corner convention, matching the reference).
const socialLinks = [
  { label: "Instagram", Icon: Instagram },
  { label: "X / Twitter", Icon: Twitter },
  { label: "LinkedIn", Icon: LinkedIn },
  { label: "Facebook", Icon: Facebook },
  { label: "YouTube", Icon: YouTube },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 text-white/70">
      <div className="wrap py-16">
        {/* Brand block + nav columns sit side by side only above 1200px;
            centered and stacked below that, since medium screens don't
            have room for the side-by-side layout. */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[auto_1fr] wide:gap-20">
          <div className="flex flex-col items-center text-center">
            <a href="#top" aria-label="Onction Energy home" className="flex flex-col items-center gap-2 lg:items-center">
              <OnctionMark size={56} />
              <div className="flex items-center gap-1.5 font-outfit text-xl">
                <span className="font-black tracking-tight text-white">ONCTION</span>
                <span className="font-light text-white">ENERGY</span>
              </div>
            </a>
            {/* <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              A NERC-licensed bulk electricity trader providing a reliable route to market for
              clean and conventional power across West Africa.
            </p> */}
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            <FooterCol heading="Company" links={nav} />
            <FooterCol heading="Business Solutions" links={solutionLinks} />
            <FooterCol heading="Regulatory & Resources" links={resourceLinks} />
          </div>
        </div>
      </div>

      {/* Office addresses */}
      <div className="border-t border-white/10">
        <div className="wrap grid gap-6 py-8 text-xs text-white/45 sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr]">
          {company.offices.map((o) => (
            <div key={o.label}>
              <p className="mb-1 font-outfit uppercase tracking-wide text-teal-400/70">
                {o.label}
              </p>
              {o.lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar — copyright, policy links, and the full social row */}
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col items-center justify-between gap-5 py-6 text-xs text-white/60 lg:flex-row">
          <p className="whitespace-nowrap">© {year} {company.name}. All Rights Reserved</p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="#" className="inline-flex items-center gap-1 hover:text-teal-400">
              Related Websites <ChevronDown />
            </a>
            <a href="#" className="hover:text-teal-400">Sitemap</a>
            <a href="#" className="hover:text-teal-400">Disclaimer</a>
            <a href="#" className="hover:text-teal-400">Policies</a>
          </div>

          <div className="flex items-center gap-3 border-l border-white/15 pl-5">
            {socialLinks.map(({ label, Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={`Onction Energy on ${label}`}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/25 text-white/70 transition hover:border-teal-400 hover:text-teal-400"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// Extracted column to avoid repeating the heading + list pattern three times.
function FooterCol({ heading, links }) {
  return (
    <div>
      <h4 className="font-syne text-lg font-bold uppercase text-teal-400">{heading}</h4>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="transition hover:text-teal-400">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
