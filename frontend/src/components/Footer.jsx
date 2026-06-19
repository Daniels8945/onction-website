import { company, nav, solutions } from "../data/content.js";
import Logo from "./Logo.jsx";

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

// Minimal inline SVG social icons — no external icon library needed.
function LinkedIn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6ZM2 9h4v12H2zm2-5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
    </svg>
  );
}

function Twitter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 text-white/70">
      <div className="wrap grid gap-10 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        {/* Brand column */}
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
            A NERC-licensed bulk electricity trader providing a reliable route to market for
            clean and conventional power across West Africa.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href="#"
              aria-label="Onction Energy on LinkedIn"
              className="grid h-9 w-9 place-items-center rounded-none bg-white/5 text-white/60 ring-1 ring-white/10 transition hover:bg-teal-500/20 hover:text-teal-400"
            >
              <LinkedIn />
            </a>
            <a
              href="#"
              aria-label="Onction Energy on X / Twitter"
              className="grid h-9 w-9 place-items-center rounded-none bg-white/5 text-white/60 ring-1 ring-white/10 transition hover:bg-teal-500/20 hover:text-teal-400"
            >
              <Twitter />
            </a>
          </div>
        </div>

        {/* Company nav */}
        <FooterCol heading="Company" links={nav} />

        {/* Business solutions */}
        <FooterCol heading="Business Solutions" links={solutionLinks} />

        {/* Resources */}
        <FooterCol heading="Regulatory & Resources" links={resourceLinks} />
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

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col items-center justify-between gap-3 py-6 text-xs text-white/40 sm:flex-row">
          <p>© {year} {company.name}. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-teal-400">Privacy Policy</a>
            <a href="#" className="hover:text-teal-400">Terms &amp; Conditions</a>
            <a href="#" className="hover:text-teal-400">Sitemap</a>
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
      <h4 className="font-syne text-lg font-bold uppercase  text-teal-400">{heading}</h4>
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
