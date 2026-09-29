import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "../../lib/adminApi.js";
import { usePromptDialog } from "../../hooks/usePromptDialog.jsx";
import { formatCurrency, statusStyle } from "../../../lib/vendorPlatform.js";

const STATUSES = ["Submitted", "Under Review", "Approved", "Paid", "Rejected"];
const SELECTABLE_STATUSES = ["Submitted", "Under Review", "Approved", "Rejected"];
const inputClass = "w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [paymentDraft, setPaymentDraft] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor_id: "", service_id: "", description: "", amount: "", due_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const { prompt, dialog: promptDialog } = usePromptDialog();

  const vendorName = (id) => vendors.find((v) => v.id === id)?.company_name || `#${id}`;

  function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (vendorFilter) params.set("vendor_id", vendorFilter);
    adminApi.get(`/api/vendor-platform/invoices?${params}`).then(setInvoices).catch((err) => setError(err.message));
  }

  useEffect(load, [statusFilter, vendorFilter]);
  useEffect(() => {
    adminApi.get("/api/vendor-platform/vendors").then(setVendors).catch(() => {});
    adminApi.get("/api/vendor-platform/services").then(setServices).catch(() => {});
  }, []);

  async function handleStatusChange(invoice, newStatus) {
    let reason;
    if (newStatus === "Rejected") {
      reason = await prompt({ title: "Reason for rejection", label: "This will be shown to the vendor" });
      if (!reason) return;
    }
    try {
      await adminApi.put(`/api/vendor-platform/invoices/${invoice.id}/status`, { status: newStatus, reason });
      toast.success(`Invoice ${invoice.invoice_number} is now ${newStatus}.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleRecordPayment(invoice) {
    const draft = paymentDraft[invoice.id] || {};
    if (!draft.payment_date) {
      toast.error("Payment date is required.");
      return;
    }
    try {
      await adminApi.post(`/api/vendor-platform/invoices/${invoice.id}/payment`, {
        payment_date: new Date(draft.payment_date).toISOString(),
        payment_method: draft.payment_method,
        payment_reference: draft.payment_reference,
      });
      toast.success(`Invoice ${invoice.invoice_number} marked paid.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.post("/api/vendor-platform/invoices", {
        vendor_id: Number(form.vendor_id),
        service_id: form.service_id ? Number(form.service_id) : null,
        description: form.description,
        amount: Number(form.amount) || 0,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        notes: form.notes,
        line_items: [],
      });
      toast.success("Invoice created.");
      setShowForm(false);
      setForm({ vendor_id: "", service_id: "", description: "", amount: "", due_date: "", notes: "" });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {promptDialog}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Invoices</h1>
          <p className="text-sm text-slatey">All invoices submitted by, or created on behalf of, vendors.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">{showForm ? "Cancel" : "+ New invoice"}</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 max-w-xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select required value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} className={inputClass}>
              <option value="">Select vendor…</option>
              {vendors.map((v) => (<option key={v.id} value={v.id}>{v.company_name}</option>))}
            </select>
            <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} className={inputClass}>
              <option value="">No service</option>
              {services.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" min="0" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} />
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputClass} />
          </div>
          <textarea rows={2} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Creating…" : "Create invoice"}</button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass + " w-auto"}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className={inputClass + " w-auto"}>
          <option value="">All vendors</option>
          {vendors.map((v) => (<option key={v.id} value={v.id}>{v.company_name}</option>))}
        </select>
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!invoices && !error && <p className="text-sm text-slatey">Loading…</p>}
      {invoices && invoices.length === 0 && <div className="card text-sm text-slatey">No invoices match these filters.</div>}

      {invoices && invoices.length > 0 && (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="border border-black/5 bg-white">
              <button
                onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-mist"
              >
                <div>
                  <p className="font-medium text-ink">{inv.invoice_number} · {vendorName(inv.vendor_id)}</p>
                  <p className="text-xs text-slatey">{inv.description || "—"} · due {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink">{formatCurrency(inv.amount)}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium ${statusStyle(inv.status)}`}>{inv.status}</span>
                </div>
              </button>

              {expandedId === inv.id && (
                <div className="border-t border-black/5 px-4 py-4 text-sm">
                  {inv.line_items.length > 0 && (
                    <table className="mb-4 w-full text-left text-xs">
                      <thead className="text-slatey"><tr><th className="py-1">Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
                      <tbody>
                        {inv.line_items.map((li) => (
                          <tr key={li.id} className="border-t border-black/5">
                            <td className="py-1">{li.description}</td>
                            <td>{li.quantity}</td>
                            <td>{formatCurrency(li.unit_price)}</td>
                            <td>{formatCurrency(li.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {inv.rejection_reason && inv.status === "Rejected" && (
                    <p className="mb-3 text-red-600">Rejection reason: {inv.rejection_reason}</p>
                  )}
                  {inv.payment_date && (
                    <p className="mb-3 text-slatey">Paid {new Date(inv.payment_date).toLocaleDateString()} via {inv.payment_method || "—"} {inv.payment_reference && `(ref: ${inv.payment_reference})`}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slatey">Status:</span>
                    {SELECTABLE_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(inv, s)}
                        disabled={inv.status === s}
                        className={`px-2 py-1 text-xs font-medium ${inv.status === s ? "bg-black/5 text-slatey" : "text-teal-600 hover:text-teal-700"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {inv.status === "Approved" && (
                    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-black/5 pt-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slatey">Payment date</label>
                        <input type="date" onChange={(e) => setPaymentDraft({ ...paymentDraft, [inv.id]: { ...paymentDraft[inv.id], payment_date: e.target.value } })} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slatey">Method</label>
                        <input placeholder="Bank transfer" onChange={(e) => setPaymentDraft({ ...paymentDraft, [inv.id]: { ...paymentDraft[inv.id], payment_method: e.target.value } })} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slatey">Reference</label>
                        <input onChange={(e) => setPaymentDraft({ ...paymentDraft, [inv.id]: { ...paymentDraft[inv.id], payment_reference: e.target.value } })} className={inputClass} />
                      </div>
                      <button onClick={() => handleRecordPayment(inv)} className="btn-primary">Mark paid</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
