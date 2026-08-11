import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function NewsList() {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/news/public`)
      .then((res) => res.json())
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  return (
    <>
      <Header />
      <main className="wrap py-20">
        <p className="eyebrow mb-2">Insights</p>
        <h1 className="mb-10 font-syne text-4xl font-semibold text-ink">Market News</h1>

        {!posts && <p className="text-sm text-slatey">Loading…</p>}
        {posts && posts.length === 0 && <p className="text-sm text-slatey">No news posted yet — check back soon.</p>}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts?.map((post) => (
            <Link key={post.id} to={`/news/${post.slug}`} className="card block">
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
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
