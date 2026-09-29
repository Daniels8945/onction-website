import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { vendorApi } from "../lib/vendorApi.js";
import { useVendorAuth } from "../VendorAuthContext.jsx";
import { useConfirmDialog } from "../../admin/hooks/useConfirmDialog.jsx";
import { formatCurrency, statusStyle } from "../../lib/vendorPlatform.js";
import { downloadInvoicePdf } from "../../lib/invoicePdf.js";

const EDITABLE_STATUSES = ["Submitted"];
const DELETABLE_STATUSES = ["Submitted", "Rejected"];
const inputClass = "w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500";
const EMPTY_FORM = { service_id: "", description: "", amount: "", due_date: "", notes: "", line_items: [] };

export default function VendorInvoicesPage() {
  const { vendor } = useVendorAuth();
  const [invoices, setInvoices] = useState(null);
  const [services, setServices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function load() {
    vendorApi.get("/api/vendor-platform/invoices").then(setInvoices).catch((err) => toast.error(err.message));
  }

  useEffect(load, []);
  useEffect(() => {
    vendorApi.get("/api/vendor-platform/services").then(setServices).catch(() => {});
    vendorApi.get("/api/vendor-platform/settings").then(setSettings).catch(() => {});
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(inv) {
    setEditingId(inv.id);
    setForm({
      service_id: inv.service_id || "",
      description: inv.description || "",
      amount: inv.amount,
      due_date: inv.due_date ? inv.due_date.slice(0, 10) : "",
      notes: inv.notes || "",
      line_items: inv.line_items.map((li) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price })),
    });
    setShowForm(true);
  }

  function addLineItem() {
    setForm((f) => ({ ...f, line_items: [...f.line_items, { description: "", quantity: 1, unit_price: 0 }] }));
  }

  function updateLineItem(index, field, value) {
    setForm((f) => ({ ...f, line_items: f.line_items.map((li, i) => (i === index ? { ...li, [field]: value } : li)) }));
  }

  function removeLineItem(index) {
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      service_id: form.service_id ? Number(form.service_id) : null,
      description: form.description,
      amount: Number(form.amount) || 0,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      notes: form.notes,
      line_items: form.line_items.map((li) => ({ ...li, quantity: Number(li.quantity) || 1, unit_price: Number(li.unit_price) || 0 })),
    };
    try {
      if (editingId) {
        await vendorApi.put(`/api/vendor-platform/invoices/${editingId}`, payload);
        toast.success("Invoice updated.");
      } else {
        await vendorApi.post("/api/vendor-platform/invoices", payload);
        toast.success("Invoice submitted.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(inv) {
    const ok = await confirm({ title: `Delete invoice ${inv.invoice_number}?`, confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await vendorApi.del(`/api/vendor-platform/invoices/${inv.id}`);
      toast.success("Invoice deleted.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (vendor?.status !== "Approved") {
    return (
      <div>
        <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Invoices</h1>
        <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You can submit invoices once your account is approved.
        </div>
      </div>
    );
  }

  return (
    <div>
      {confirmDialog}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Invoices</h1>
          <p className="text-sm text-slatey">Submit and track invoices to Onction.</p>
        </div>
        <button onClick={() => (showForm ? setShowForm(false) : startCreate())} className="btn-primary">
          {showForm ? "Cancel" : "+ New invoice"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} className={inputClass}>
              <option value="">No service</option>
              {services.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputClass} />
          </div>
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          <input required type="number" min="0" step="0.01" placeholder="Total amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-slatey">Line items (optional)</p>
              <button type="button" onClick={addLineItem} className="text-xs font-medium text-teal-600 hover:text-teal-700">+ Add line</button>
            </div>
            {form.line_items.map((li, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_80px_120px_auto] gap-2">
                <input placeholder="Description" value={li.description} onChange={(e) => updateLineItem(i, "description", e.target.value)} className={inputClass} />
                <input type="number" min="0" step="1" placeholder="Qty" value={li.quantity} onChange={(e) => updateLineItem(i, "quantity", e.target.value)} className={inputClass} />
                <input type="number" min="0" step="0.01" placeholder="Unit price" value={li.unit_price} onChange={(e) => updateLineItem(i, "unit_price", e.target.value)} className={inputClass} />
                <button type="button" onClick={() => removeLineItem(i)} className="text-xs text-red-600 hover:text-red-700">✕</button>
              </div>
            ))}
          </div>

          <textarea rows={2} placeholder="Notes for the reviewer" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? "Saving…" : editingId ? "Save changes" : "Submit invoice"}
          </button>
        </form>
      )}

      {!invoices && <p className="text-sm text-slatey">Loading…</p>}
      {invoices && invoices.length === 0 && <div className="card text-sm text-slatey">No invoices yet.</div>}

      {invoices && invoices.length > 0 && (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="border border-black/5 bg-white">
              <button
                onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-mist"
              >
                <div>
                  <p className="font-medium text-ink">{inv.invoice_number}</p>
                  <p className="text-xs text-slatey">{inv.description || "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink">{formatCurrency(inv.amount, settings?.currency)}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium ${statusStyle(inv.status)}`}>{inv.status}</span>
                </div>
              </button>
              {expandedId === inv.id && (
                <div className="border-t border-black/5 px-4 py-4 text-sm">
                  {inv.rejection_reason && inv.status === "Rejected" && <p className="mb-3 text-red-600">Reason: {inv.rejection_reason}</p>}
                  {inv.payment_date && <p className="mb-3 text-slatey">Paid {new Date(inv.payment_date).toLocaleDateString()}</p>}
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => downloadInvoicePdf(inv, { vendorName: vendor.company_name, currency: settings?.currency })} className="text-xs font-medium text-teal-600 hover:text-teal-700">
                      Download PDF
                    </button>
                    {EDITABLE_STATUSES.includes(inv.status) && (
                      <button onClick={() => startEdit(inv)} className="text-xs font-medium text-teal-600 hover:text-teal-700">Edit</button>
                    )}
                    {DELETABLE_STATUSES.includes(inv.status) && (
                      <button onClick={() => handleDelete(inv)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
