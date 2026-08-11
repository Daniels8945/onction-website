import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function NewsDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPost(null);
    setNotFound(false);
    fetch(`${API_BASE}/api/news/public/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setPost)
      .catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    if (post) document.title = `${post.title} — Onction Energy`;
  }, [post]);

  if (notFound) {
    return (
      <>
        <Header />
        <main className="wrap flex min-h-[50vh] flex-col items-center justify-center text-center">
          <p className="eyebrow mb-2">404</p>
          <h1 className="font-syne text-2xl font-semibold text-ink">Post not found</h1>
        </main>
        <Footer />
      </>
    );
  }

  if (!post) return null;

  return (
    <>
      <Header />
      <main className="wrap max-w-3xl py-20">
        <p className="eyebrow mb-2">{post.category}</p>
        <h1 className="font-syne text-3xl font-semibold text-ink md:text-4xl">{post.title}</h1>
        {post.published_at && <p className="mt-3 text-sm text-slatey">{new Date(post.published_at).toLocaleDateString()}</p>}
        {post.cover_image_url && <img src={post.cover_image_url} alt="" className="my-8 w-full" />}
        <div className="space-y-4 text-slatey">
          {post.body.split("\n").filter(Boolean).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
