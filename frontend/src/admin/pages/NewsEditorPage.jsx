import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../lib/adminApi.js";

const CATEGORIES = ["Market News", "Company News", "Press"];

export default function NewsEditorPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.get(`/api/news/${id}`).then(setPost).catch((err) => setError(err.message));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await adminApi.put(`/api/news/${id}`, {
        slug: post.slug,
        title: post.title,
        category: post.category,
        summary: post.summary,
        cover_image_url: post.cover_image_url,
        body: post.body,
        status: post.status,
      });
      setPost(updated);
      setStatus("Saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(""), 2500);
    }
  }

  if (error && !post) return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!post) return <p className="text-sm text-slatey">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <Link to="/admin/news" className="mb-4 inline-block text-xs font-medium text-slatey hover:text-ink">
        ← All news
      </Link>

      <div className="card space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slatey">Title</label>
          <input
            value={post.title}
            onChange={(e) => setPost({ ...post, title: e.target.value })}
            className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slatey">URL slug</label>
            <div className="flex items-center border border-black/10 px-3 py-2 text-sm focus-within:border-teal-500">
              <span className="text-slatey">/news/</span>
              <input
                value={post.slug}
                onChange={(e) => setPost({ ...post, slug: e.target.value })}
                className="w-full outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slatey">Category</label>
            <select
              value={post.category}
              onChange={(e) => setPost({ ...post, category: e.target.value })}
              className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slatey">Summary</label>
          <textarea
            rows={2}
            value={post.summary}
            onChange={(e) => setPost({ ...post, summary: e.target.value })}
            className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slatey">Cover image URL</label>
          <input
            value={post.cover_image_url || ""}
            onChange={(e) => setPost({ ...post, cover_image_url: e.target.value })}
            placeholder="Paste a URL from the Media library"
            className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slatey">Body (one paragraph per line)</label>
          <textarea
            rows={10}
            value={post.body}
            onChange={(e) => setPost({ ...post, body: e.target.value })}
            className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slatey">Status</label>
          <select
            value={post.status}
            onChange={(e) => setPost({ ...post, status: e.target.value })}
            className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        {status && <p className="text-sm text-teal-700">{status}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-4">
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          {post.status === "published" && (
            <a href={`/news/${post.slug}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-teal-600 hover:text-teal-700">
              View live ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
