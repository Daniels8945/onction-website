import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "../../lib/adminApi.js";
import { usePromptDialog } from "../../hooks/usePromptDialog.jsx";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";
import { statusStyle } from "../../../lib/vendorPlatform.js";

const STATUSES = ["Pending Review", "Approved", "Rejected"];
const inputClass = "w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500";

export default function VendorDocumentsPage() {
  const [documents, setDocuments] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor_id: "", document_name: "", document_type: "", expiry_date: "", notes: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const vendorName = (id) => vendors.find((v) => v.id === id)?.company_name || `#${id}`;

  function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status_filter", statusFilter);
    if (vendorFilter) params.set("vendor_id", vendorFilter);
    adminApi.get(`/api/vendor-platform/documents?${params}`).then(setDocuments).catch((err) => setError(err.message));
  }

  useEffect(load, [statusFilter, vendorFilter]);
  useEffect(() => {
    adminApi.get("/api/vendor-platform/vendors").then(setVendors).catch(() => {});
  }, []);

  async function handleStatus(doc, newStatus) {
    let rejection_reason;
    if (newStatus === "Rejected") {
      rejection_reason = await prompt({ title: "Reason for rejection", label: "This will be shown to the vendor" });
      if (!rejection_reason) return;
    }
    try {
      await adminApi.put(`/api/vendor-platform/documents/${doc.id}/status`, { status: newStatus, rejection_reason });
      toast.success(`Document ${newStatus.toLowerCase()}.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(doc) {
    const ok = await confirm({ title: `Delete "${doc.document_name}"?`, confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await adminApi.del(`/api/vendor-platform/documents/${doc.id}`);
      toast.success("Document deleted.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      data.append("vendor_id", form.vendor_id);
      data.append("document_name", form.document_name);
      data.append("document_type", form.document_type);
      if (form.expiry_date) data.append("expiry_date", new Date(form.expiry_date).toISOString());
      data.append("notes", form.notes);
      data.append("file", file);
      await adminApi.upload("/api/vendor-platform/documents", data);
      toast.success("Document uploaded.");
      setShowForm(false);
      setForm({ vendor_id: "", document_name: "", document_type: "", expiry_date: "", notes: "" });
      setFile(null);
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
      {confirmDialog}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Documents</h1>
          <p className="text-sm text-slatey">Compliance documents uploaded by, or on behalf of, vendors.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">{showForm ? "Cancel" : "+ Upload document"}</button>
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="card mb-6 max-w-xl space-y-3">
          <select required value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} className={inputClass}>
            <option value="">Select vendor…</option>
            {vendors.map((v) => (<option key={v.id} value={v.id}>{v.company_name}</option>))}
          </select>
          <input required placeholder="Document name" value={form.document_name} onChange={(e) => setForm({ ...form, document_name: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Document type (e.g. Tax ID)" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className={inputClass} />
            <input type="date" placeholder="Expiry date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className={inputClass} />
          </div>
          <textarea rows={2} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <input required type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm" />
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Uploading…" : "Upload"}</button>
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
      {!documents && !error && <p className="text-sm text-slatey">Loading…</p>}
      {documents && documents.length === 0 && <div className="card text-sm text-slatey">No documents match these filters.</div>}

      {documents && documents.length > 0 && (
        <div className="overflow-x-auto border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const expiringSoon = doc.expiry_date && new Date(doc.expiry_date) < new Date(Date.now() + 30 * 86400000);
                return (
                  <tr key={doc.id} className="border-t border-black/5 hover:bg-mist">
                    <td className="px-4 py-3 font-medium text-ink">
                      {doc.file_url ? <a href={doc.file_url} target="_blank" rel="noreferrer" className="hover:text-teal-600">{doc.document_name}</a> : doc.document_name}
                      <div className="text-xs text-slatey">{doc.document_type || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slatey">{vendorName(doc.vendor_id)}</td>
                    <td className="px-4 py-3 text-slatey">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                    <td className={`px-4 py-3 ${expiringSoon ? "font-medium text-amber-600" : "text-slatey"}`}>
                      {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : "—"}
                      {expiringSoon && " ⚠"}
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-medium ${statusStyle(doc.status)}`}>{doc.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {doc.status !== "Approved" && <button onClick={() => handleStatus(doc, "Approved")} className="text-xs font-medium text-teal-600 hover:text-teal-700">Approve</button>}
                        {doc.status !== "Rejected" && <button onClick={() => handleStatus(doc, "Rejected")} className="text-xs font-medium text-red-600 hover:text-red-700">Reject</button>}
                        {doc.status !== "Pending Review" && <button onClick={() => handleStatus(doc, "Pending Review")} className="text-xs text-slatey hover:text-ink">Reset</button>}
                        <button onClick={() => handleDelete(doc)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
