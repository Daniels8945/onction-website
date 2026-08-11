import { useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi.js";
import { useAuth } from "../AuthContext.jsx";

export default function TeamPage() {
  const { admin: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", password: "" });
  const [saving, setSaving] = useState(false);

  function loadAdmins() {
    adminApi.get("/api/admin/users").then(setAdmins).catch((err) => setError(err.message));
  }

  useEffect(loadAdmins, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await adminApi.post("/api/admin/users", form);
      setForm({ email: "", full_name: "", password: "" });
      setShowForm(false);
      loadAdmins();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (!confirm("Deactivate this account? They'll no longer be able to sign in.")) return;
    try {
      await adminApi.del(`/api/admin/users/${id}`);
      loadAdmins();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Team</h1>
          <p className="text-sm text-slatey">Who has access to this dashboard.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add team member
          </button>
        )}
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 max-w-md space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <input
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Temporary password (min. 8 characters)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <p className="text-xs text-slatey">Share this password with them directly — there's no invite email yet.</p>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? "Creating…" : "Create account"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slatey hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      )}

      {!admins ? (
        <p className="text-sm text-slatey">Loading…</p>
      ) : (
        <div className="overflow-x-auto border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-t border-black/5">
                  <td className="px-4 py-3 font-medium text-ink">
                    {a.full_name || "—"} {a.id === currentAdmin?.id && <span className="text-xs text-slatey">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-slatey">{a.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium ${
                        a.is_active ? "bg-teal-100 text-teal-700" : "bg-black/5 text-slatey"
                      }`}
                    >
                      {a.is_active ? "active" : "deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.is_active && a.id !== currentAdmin?.id && (
                      <button onClick={() => handleDeactivate(a.id)} className="text-xs font-medium text-red-600 hover:text-red-700">
                        Deactivate
                      </button>
                    )}
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
