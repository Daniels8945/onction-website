import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InnerHero from "../components/page/InnerHero.jsx";
import Reveal from "../components/Reveal.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import chartImg from "../../assets/maxim-hopman-fiXLQXAhCfk-unsplash.jpg";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function NewsList() {
  const [posts, setPosts] = useState(null);
  usePageMeta("Market news", "Trading updates and announcements from Onction Energy.");

  useEffect(() => {
    fetch(`${API_BASE}/api/news/public`)
      .then((res) => res.json())
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  return (
    <>
      <main>
      <InnerHero crumb="Market news" title="Market news and updates" accent="updates" intro="Trading updates, announcements and perspectives on the West African power market." image={chartImg} compact />
      <section className="wrap py-16 sm:py-20">

        {!posts && <p className="text-sm text-slatey">Loading…</p>}
        {posts && posts.length === 0 && (
          <p className="text-slatey">
            No news posted yet — check back soon, or read our <Link to="/case-studies" className="font-medium text-teal-700 underline underline-offset-4">case studies</Link> in the meantime.
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts?.map((post, i) => (
            <Reveal key={post.id} delay={(i % 3) * 80}>
            <Link to={`/news/${post.slug}`} className="card group block h-full transition hover:border-teal-500/50">
              {post.cover_image_url && (
                <img src={post.cover_image_url} alt="" className="mb-4 aspect-video w-full object-cover" />
              )}
              <p className="eyebrow mb-2">{post.category}</p>
              <h2 className="font-syne text-lg font-semibold text-ink">{post.title}</h2>
              {post.summary && <p className="mt-2 text-sm text-slatey">{post.summary}</p>}
              {post.published_at && (
                <p className="mt-3 text-xs text-slatey/70">{new Date(post.published_at).toLocaleDateString()}</p>
              )}
            </Link>
            </Reveal>
          ))}
        </div>
      </section>
      </main>
    </>
  );
}
