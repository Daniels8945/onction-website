import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi } from "../../lib/adminApi.js";
import { usePromptDialog } from "../../hooks/usePromptDialog.jsx";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";
import { formatCurrency, statusStyle } from "../../../lib/vendorPlatform.js";

const TABS = ["Overview", "Invoices", "Documents", "Notes"];
const STATUSES = ["Pending Review", "Approved", "Rejected", "Inactive"];
const inputClass = "w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slatey">{label}</label>
      {children}
    </div>
  );
}

export default function VendorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Overview");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [notes, setNotes] = useState(null);
  const [noteText, setNoteText] = useState("");
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function loadVendor() {
    adminApi.get(`/api/vendor-platform/vendors/${id}`).then((v) => { setVendor(v); setForm(v); }).catch((err) => setError(err.message));
  }

  useEffect(loadVendor, [id]);
  useEffect(() => {
    if (tab === "Invoices" && !invoices) {
      adminApi.get(`/api/vendor-platform/invoices?vendor_id=${id}`).then(setInvoices).catch(() => {});
    }
    if (tab === "Documents" && !documents) {
      adminApi.get(`/api/vendor-platform/documents?vendor_id=${id}`).then(setDocuments).catch(() => {});
    }
    if (tab === "Notes" && !notes) {
      adminApi.get(`/api/vendor-platform/vendors/${id}/notes`).then(setNotes).catch(() => {});
    }
  }, [tab, id]);

  async function handleStatusChange(newStatus) {
    let rejection_reason;
    if (newStatus === "Rejected") {
      rejection_reason = await prompt({ title: "Reason for rejection", label: "This will be shown to the vendor" });
      if (!rejection_reason) return;
    }
    try {
      const updated = await adminApi.put(`/api/vendor-platform/vendors/${id}/status`, { status: newStatus, rejection_reason });
      setVendor(updated);
      setForm(updated);
      toast.success(`Status changed to ${newStatus}.`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await adminApi.put(`/api/vendor-platform/vendors/${id}`, {
        company_name: form.company_name,
        business_type: form.business_type,
        products_services: form.products_services,
        website: form.website,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        street_address: form.street_address,
        city: form.city,
        region: form.region,
        postal_code: form.postal_code,
        country: form.country,
      });
      setVendor(updated);
      setForm(updated);
      setEditing(false);
      toast.success("Saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${vendor.company_name}?`,
      message: "This permanently removes the vendor and all their invoices, documents, and notes.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/vendor-platform/vendors/${id}`);
      toast.success("Vendor deleted.");
      navigate("/admin/vendors");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDocumentStatus(doc, newStatus) {
    let rejection_reason;
    if (newStatus === "Rejected") {
      rejection_reason = await prompt({ title: "Reason for rejection", label: "This will be shown to the vendor" });
      if (!rejection_reason) return;
    }
    try {
      await adminApi.put(`/api/vendor-platform/documents/${doc.id}/status`, { status: newStatus, rejection_reason });
      adminApi.get(`/api/vendor-platform/documents?vendor_id=${id}`).then(setDocuments);
      toast.success(`Document ${newStatus.toLowerCase()}.`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await adminApi.post(`/api/vendor-platform/vendors/${id}/notes`, { note: noteText.trim() });
      setNoteText("");
      adminApi.get(`/api/vendor-platform/vendors/${id}/notes`).then(setNotes);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      await adminApi.del(`/api/vendor-platform/vendors/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (error && !vendor) return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!vendor) return <p className="text-sm text-slatey">Loading…</p>;

  return (
    <div>
      {promptDialog}
      {confirmDialog}
      <Link to="/admin/vendors" className="mb-4 inline-block text-xs font-medium text-slatey hover:text-ink">← All vendors</Link>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">{vendor.company_name}</h1>
          <p className="text-sm text-slatey">{vendor.vendor_code}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={vendor.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`border-0 px-3 py-1.5 text-xs font-medium outline-none ${statusStyle(vendor.status)}`}
          >
            {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <button onClick={handleDelete} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-black/10">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${tab === t ? "border-b-2 border-teal-500 text-ink" : "text-slatey hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="card max-w-2xl space-y-4">
          {vendor.rejection_reason && vendor.status === "Rejected" && (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Rejection reason: {vendor.rejection_reason}</div>
          )}
          <div className="flex items-center justify-between">
            <p className="eyebrow">Details</p>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-xs font-medium text-teal-600 hover:text-teal-700">Edit</button>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => { setEditing(false); setForm(vendor); }} className="text-xs text-slatey hover:text-ink">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="text-xs font-medium text-teal-600 hover:text-teal-700 disabled:opacity-60">
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-slatey">Business type</dt><dd className="text-ink">{vendor.business_type || "—"}</dd></div>
              <div><dt className="text-xs text-slatey">Website</dt><dd className="text-ink">{vendor.website || "—"}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-slatey">Products / services</dt><dd className="text-ink">{vendor.products_services || "—"}</dd></div>
              <div><dt className="text-xs text-slatey">Contact</dt><dd className="text-ink">{[vendor.first_name, vendor.last_name].filter(Boolean).join(" ") || "—"}</dd></div>
              <div><dt className="text-xs text-slatey">Email</dt><dd className="text-ink">{vendor.email || "—"}</dd></div>
              <div><dt className="text-xs text-slatey">Phone</dt><dd className="text-ink">{vendor.phone || "—"}</dd></div>
              <div><dt className="text-xs text-slatey">Password set</dt><dd className="text-ink">{vendor.has_password ? "Yes" : "No"}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-slatey">Address</dt>
                <dd className="text-ink">{[vendor.street_address, vendor.city, vendor.region, vendor.postal_code, vendor.country].filter(Boolean).join(", ") || "—"}</dd>
              </div>
              <div><dt className="text-xs text-slatey">Registered</dt><dd className="text-ink">{vendor.self_registered ? "Self-registered" : "Added by admin"}</dd></div>
              <div><dt className="text-xs text-slatey">Submitted</dt><dd className="text-ink">{new Date(vendor.submitted_at).toLocaleDateString()}</dd></div>
            </dl>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company name"><input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className={inputClass} /></Field>
                <Field label="Business type">
                  <select value={form.business_type || ""} onChange={(e) => setForm({ ...form, business_type: e.target.value })} className={inputClass}>
                    <option value="">—</option>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Service Provider">Service Provider</option>
                  </select>
                </Field>
              </div>
              <Field label="Products / services"><textarea rows={2} value={form.products_services || ""} onChange={(e) => setForm({ ...form, products_services: e.target.value })} className={inputClass} /></Field>
              <Field label="Website"><input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputClass} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name"><input value={form.first_name || ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputClass} /></Field>
                <Field label="Last name"><input value={form.last_name || ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} /></Field>
                <Field label="Email"><input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></Field>
                <Field label="Phone"><input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></Field>
              </div>
              <Field label="Street address"><input value={form.street_address || ""} onChange={(e) => setForm({ ...form, street_address: e.target.value })} className={inputClass} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="City"><input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} /></Field>
                <Field label="Region"><input value={form.region || ""} onChange={(e) => setForm({ ...form, region: e.target.value })} className={inputClass} /></Field>
                <Field label="Postal code"><input value={form.postal_code || ""} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className={inputClass} /></Field>
              </div>
              <Field label="Country"><input value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClass} /></Field>
            </div>
          )}
        </div>
      )}

      {tab === "Invoices" && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <p className="eyebrow">Invoices</p>
            <Link to="/admin/invoices" className="text-xs font-medium text-teal-600 hover:text-teal-700">Manage all invoices →</Link>
          </div>
          {!invoices && <p className="text-sm text-slatey">Loading…</p>}
          {invoices && invoices.length === 0 && <p className="text-sm text-slatey">No invoices yet.</p>}
          {invoices && invoices.length > 0 && (
            <ul className="divide-y divide-black/5">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-ink">{inv.invoice_number}</p>
                    <p className="text-xs text-slatey">{inv.description || "—"} · {new Date(inv.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-ink">{formatCurrency(inv.amount)}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium ${statusStyle(inv.status)}`}>{inv.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "Documents" && (
        <div className="card">
          <p className="eyebrow mb-4">Documents</p>
          {!documents && <p className="text-sm text-slatey">Loading…</p>}
          {documents && documents.length === 0 && <p className="text-sm text-slatey">No documents uploaded yet.</p>}
          {documents && documents.length > 0 && (
            <ul className="divide-y divide-black/5">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-ink">{doc.document_name}</p>
                    <p className="text-xs text-slatey">
                      {doc.document_type || "—"} {doc.expiry_date && `· expires ${new Date(doc.expiry_date).toLocaleDateString()}`}
                    </p>
                    {doc.rejection_reason && doc.status === "Rejected" && <p className="text-xs text-red-600">{doc.rejection_reason}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.file_url && <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-teal-600 hover:text-teal-700">Download</a>}
                    <span className={`px-2 py-0.5 text-xs font-medium ${statusStyle(doc.status)}`}>{doc.status}</span>
                    {doc.status !== "Approved" && <button onClick={() => handleDocumentStatus(doc, "Approved")} className="text-xs font-medium text-teal-600 hover:text-teal-700">Approve</button>}
                    {doc.status !== "Rejected" && <button onClick={() => handleDocumentStatus(doc, "Rejected")} className="text-xs font-medium text-red-600 hover:text-red-700">Reject</button>}
                    {doc.status !== "Pending Review" && <button onClick={() => handleDocumentStatus(doc, "Pending Review")} className="text-xs text-slatey hover:text-ink">Reset</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "Notes" && (
        <div className="card max-w-2xl">
          <p className="eyebrow mb-4">Internal notes</p>
          <form onSubmit={handleAddNote} className="mb-4 flex gap-3">
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" className={inputClass} />
            <button type="submit" className="btn-primary">Add</button>
          </form>
          {!notes && <p className="text-sm text-slatey">Loading…</p>}
          {notes && notes.length === 0 && <p className="text-sm text-slatey">No notes yet.</p>}
          {notes && notes.length > 0 && (
            <ul className="divide-y divide-black/5">
              {notes.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="text-ink">{n.note}</p>
                    <p className="text-xs text-slatey">{n.created_by} · {new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleDeleteNote(n.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
