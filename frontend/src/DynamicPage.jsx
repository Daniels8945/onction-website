import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
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
        <Header />
        <main className="wrap flex min-h-[50vh] flex-col items-center justify-center text-center">
          <p className="eyebrow mb-2">404</p>
          <h1 className="font-syne text-2xl font-semibold text-ink">Page not found</h1>
        </main>
        <Footer />
      </>
    );
  }

  if (!page) return null;

  return (
    <>
      <Header />
      <main>
        {page.blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </main>
      <Footer />
    </>
  );
}
