import { Link } from "react-router-dom";
import InnerHero from "../components/page/InnerHero.jsx";
import Reveal from "../components/Reveal.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { menu, pages, vendorPortalUrl } from "../data/site.js";

export default function SitemapPage() {
  usePageMeta("Sitemap", "Every page on the Onction Energy website.");
  return (
    <main>
      <InnerHero crumb="Sitemap" title="Every page, in one place" accent="one place" compact />
      <section className="bg-white">
        <div className="wrap grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4 sm:py-20">
          {menu.map((s, i) => (
            <Reveal key={s.key} delay={(i % 4) * 70}>
              <h2 className="font-syne text-lg font-semibold text-navy-900">{s.label}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {s.items.map((it) => (
                  <li key={it.label}>
                    {it.to ? (
                      <Link to={it.to} className="text-slatey hover:text-teal-700">{it.label}</Link>
                    ) : (
                      <a href={vendorPortalUrl()} className="text-slatey hover:text-teal-700">{it.label} ↗</a>
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
          <Reveal>
            <h2 className="font-syne text-lg font-semibold text-navy-900">All pages</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {pages.map((p) => (
                <li key={p.to}><Link to={p.to} className="text-slatey hover:text-teal-700">{p.title}</Link></li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
