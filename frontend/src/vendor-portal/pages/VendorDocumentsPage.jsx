import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { vendorApi } from "../lib/vendorApi.js";
import { useConfirmDialog } from "../../admin/hooks/useConfirmDialog.jsx";
import { statusStyle } from "../../lib/vendorPlatform.js";

const DOCUMENT_TYPES = ["Certificate of Incorporation", "Tax ID", "Insurance Certificate", "Other"];
const inputClass = "w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500";
const EMPTY = { document_name: "", document_type: DOCUMENT_TYPES[0], expiry_date: "", notes: "" };

export default function VendorDocumentsPage() {
  const [documents, setDocuments] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function load() {
    vendorApi.get("/api/vendor-platform/documents").then(setDocuments).catch((err) => toast.error(err.message));
  }

  useEffect(load, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large (max 10MB).");
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      data.append("document_name", form.document_name);
      data.append("document_type", form.document_type);
      if (form.expiry_date) data.append("expiry_date", new Date(form.expiry_date).toISOString());
      data.append("notes", form.notes);
      data.append("file", file);
      await vendorApi.upload("/api/vendor-platform/documents", data);
      toast.success("Document uploaded.");
      setShowForm(false);
      setForm(EMPTY);
      setFile(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doc) {
    const ok = await confirm({ title: `Delete "${doc.document_name}"?`, confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await vendorApi.del(`/api/vendor-platform/documents/${doc.id}`);
      toast.success("Document deleted.");
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
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Documents</h1>
          <p className="text-sm text-slatey">Certificates, tax IDs, and other compliance documents.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">{showForm ? "Cancel" : "+ Upload document"}</button>
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="card mb-6 max-w-xl space-y-3">
          <input required placeholder="Document name" value={form.document_name} onChange={(e) => setForm({ ...form, document_name: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className={inputClass}>
              {DOCUMENT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
            <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className={inputClass} />
          </div>
          <textarea rows={2} placeholder="Notes for the reviewer" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          <input required type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm" />
          <p className="text-xs text-slatey">PDF, images, or Word docs — max 10MB.</p>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Uploading…" : "Upload"}</button>
        </form>
      )}

      {!documents && <p className="text-sm text-slatey">Loading…</p>}
      {documents && documents.length === 0 && <div className="card text-sm text-slatey">No documents uploaded yet.</div>}

      {documents && documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => {
            const expired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
            const expiringSoon = doc.expiry_date && !expired && new Date(doc.expiry_date) < new Date(Date.now() + 30 * 86400000);
            return (
              <div key={doc.id} className="flex items-center justify-between border border-black/5 bg-white px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{doc.document_name}</p>
                  <p className="text-xs text-slatey">
                    {doc.document_type}
                    {doc.expiry_date && ` · expires ${new Date(doc.expiry_date).toLocaleDateString()}`}
                    {(expired || expiringSoon) && <span className="ml-1 font-medium text-amber-600">{expired ? "expired" : "expiring soon"}</span>}
                  </p>
                  {doc.rejection_reason && doc.status === "Rejected" && <p className="text-xs text-red-600">{doc.rejection_reason}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {doc.file_url && <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-teal-600 hover:text-teal-700">View</a>}
                  <span className={`px-2 py-0.5 text-xs font-medium ${statusStyle(doc.status)}`}>{doc.status}</span>
                  <button onClick={() => handleDelete(doc)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
