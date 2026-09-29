import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "../../lib/adminApi.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";
import { formatCurrency } from "../../../lib/vendorPlatform.js";

const CATEGORIES = ["IT & Software", "Logistics", "Manufacturing", "Consulting", "Maintenance", "Supply", "Other"];
const EMPTY = { name: "", category: CATEGORIES[0], unit: "", unit_price: "", description: "" };
const inputClass = "w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500";

export default function ServicesPage() {
  const [services, setServices] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function load() {
    adminApi.get("/api/vendor-platform/services").then(setServices).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function startEdit(service) {
    setEditingId(service.id);
    setForm({ name: service.name, category: service.category || CATEGORIES[0], unit: service.unit || "", unit_price: service.unit_price, description: service.description || "" });
    setShowForm(true);
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, unit_price: Number(form.unit_price) || 0 };
    try {
      if (editingId) {
        await adminApi.put(`/api/vendor-platform/services/${editingId}`, payload);
        toast.success("Service updated.");
      } else {
        await adminApi.post("/api/vendor-platform/services", payload);
        toast.success("Service created.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(service) {
    try {
      await adminApi.put(`/api/vendor-platform/services/${service.id}`, { active: !service.active });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(service) {
    const ok = await confirm({ title: `Delete "${service.name}"?`, confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await adminApi.del(`/api/vendor-platform/services/${service.id}`);
      toast.success("Service deleted.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      {confirmDialog}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Services</h1>
          <p className="text-sm text-slatey">The catalogue vendors reference when submitting invoices.</p>
        </div>
        {!showForm && <button onClick={startCreate} className="btn-primary">+ Add service</button>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 max-w-xl space-y-3">
          <input required placeholder="Service name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-3 gap-3">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
              {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <input placeholder="Unit (e.g. per hour)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass} />
            <input type="number" min="0" step="0.01" placeholder="Unit price" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className={inputClass} />
          </div>
          <textarea rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving…" : editingId ? "Save changes" : "Create service"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slatey hover:text-ink">Cancel</button>
          </div>
        </form>
      )}

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!services && !error && <p className="text-sm text-slatey">Loading…</p>}
      {services && services.length === 0 && <div className="card text-sm text-slatey">No services yet.</div>}

      {services && services.length > 0 && (
        <div className="overflow-x-auto border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Unit price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-t border-black/5 hover:bg-mist">
                  <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-slatey">{s.category || "—"}</td>
                  <td className="px-4 py-3 text-slatey">{formatCurrency(s.unit_price)}{s.unit ? ` / ${s.unit}` : ""}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`px-2 py-0.5 text-xs font-medium ${s.active ? "bg-teal-100 text-teal-700" : "bg-black/5 text-slatey"}`}
                    >
                      {s.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => startEdit(s)} className="text-xs font-medium text-teal-600 hover:text-teal-700">Edit</button>
                      <button onClick={() => handleDelete(s)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
                    </div>
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
