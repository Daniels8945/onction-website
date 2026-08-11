import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi } from "../lib/adminApi.js";

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PagesListPage() {
  const [pages, setPages] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  function loadPages() {
    adminApi
      .get("/api/pages")
      .then(setPages)
      .catch((err) => setError(err.message));
  }

  useEffect(loadPages, []);

  async function handleCreate() {
    const title = prompt("Page title (e.g. \"Our Services\")");
    if (!title) return;
    setCreating(true);
    setError("");
    try {
      const page = await adminApi.post("/api/pages", { slug: slugify(title), title, status: "draft" });
      navigate(`/admin/pages/${page.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this page and all its content? This can't be undone.")) return;
    try {
      await adminApi.del(`/api/pages/${id}`);
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Pages</h1>
          <p className="text-sm text-slatey">Build and publish pages beyond the landing page.</p>
        </div>
        <button onClick={handleCreate} disabled={creating} className="btn-primary disabled:opacity-60">
          {creating ? "Creating…" : "New page"}
        </button>
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!pages && !error && <p className="text-sm text-slatey">Loading…</p>}
      {pages && pages.length === 0 && <div className="card text-sm text-slatey">No pages yet — create your first one.</div>}

      {pages && pages.length > 0 && (
        <div className="overflow-x-auto border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-t border-black/5 hover:bg-mist">
                  <td className="px-4 py-3 font-medium text-ink">
                    <Link to={`/admin/pages/${p.id}`} className="hover:text-teal-600">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slatey">/{p.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium ${
                        p.status === "published" ? "bg-teal-100 text-teal-700" : "bg-black/5 text-slatey"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slatey">{new Date(p.updated_at).toLocaleDateString()}</td>
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
