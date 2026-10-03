import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { pages } from "./data/site.js";
import BlockRenderer from "./blocks/BlockRenderer.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Renders a page created in the dashboard's page builder, at /:slug.
// Only published pages resolve — the backend 404s drafts on purpose.
export default function DynamicPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPage(null);
    setNotFound(false);
    fetch(`${API_BASE}/api/pages/public/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(setPage)
      .catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    if (page) document.title = page.title ? `${page.title} — Onction Energy` : "Onction Energy";
  }, [page]);

  if (notFound) {
    return (
      <>
        <main className="bg-navy-950 text-white">
          <div className="wrap flex min-h-[80vh] flex-col justify-center pb-20 pt-36">
            <p className="font-outfit text-sm tracking-[0.2em] text-teal-400">404</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
              This line isn't <span className="text-teal-400">connected</span>.
            </h1>
            <p className="mt-5 max-w-xl text-white/70">The page you were looking for doesn't exist or has moved. Try one of these instead:</p>
            <ul className="mt-8 grid max-w-3xl gap-x-8 gap-y-3 sm:grid-cols-2">
              {pages.filter((p) => p.to !== "/sitemap").slice(0, 8).map((p) => (
                <li key={p.to}>
                  <Link to={p.to} className="group flex items-center justify-between border-b border-white/15 py-2.5 hover:text-teal-400">
                    {p.title}
                    <span className="nudge text-teal-400" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </>
    );
  }

  if (!page) return null;

  return (
    <>
      {/* Clear the fixed header unless the page opens with a full-bleed hero */}
      <main className={page.blocks[0]?.type === "hero" ? "" : "pt-[clamp(64px,7.5vw,91px)]"}>
        {page.blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </main>
    </>
  );
}
