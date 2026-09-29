import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi } from "../lib/adminApi.js";
import { usePromptDialog } from "../hooks/usePromptDialog.jsx";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function NewsListPage() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    adminApi.get("/api/news").then(setPosts).catch((err) => setError(err.message));
  }, []);

  async function handleCreate() {
    const title = await prompt({
      title: "New post",
      label: "Post title",
      placeholder: 'e.g. "WAPP Market Update — August 2026"',
    });
    if (!title) return;
    try {
      const post = await adminApi.post("/api/news", { slug: slugify(title), title, status: "draft" });
      navigate(`/admin/news/${post.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({ title: "Delete this post?", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await adminApi.del(`/api/news/${id}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Post deleted.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      {promptDialog}
      {confirmDialog}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">News</h1>
          <p className="text-sm text-slatey">Market news, company news, and press updates.</p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          + New post
        </button>
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!posts && !error && <p className="text-sm text-slatey">Loading…</p>}
      {posts && posts.length === 0 && <div className="card text-sm text-slatey">No posts yet.</div>}

      {posts && posts.length > 0 && (
        <div className="overflow-x-auto border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t border-black/5 hover:bg-mist">
                  <td className="px-4 py-3 font-medium text-ink">
                    <Link to={`/admin/news/${p.id}`} className="hover:text-teal-600">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slatey">{p.category}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium ${p.status === "published" ? "bg-teal-100 text-teal-700" : "bg-black/5 text-slatey"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(p.id)} className="text-xs font-medium text-red-600 hover:text-red-700">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
