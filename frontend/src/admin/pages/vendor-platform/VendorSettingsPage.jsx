import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "../../lib/adminApi.js";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];
const inputClass = "w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slatey">{label}</label>
      {children}
    </div>
  );
}

export default function VendorSettingsPage() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.get("/api/vendor-platform/settings").then(setForm).catch((err) => setError(err.message));
  }, []);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await adminApi.put("/api/vendor-platform/settings", form);
      setForm(updated);
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !form) return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!form) return <p className="text-sm text-slatey">Loading…</p>;

  return (
    <div>
      <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Vendor platform settings</h1>
      <p className="mb-6 text-sm text-slatey">Controls vendor registration, invoicing, and document review defaults.</p>

      <form onSubmit={handleSave} className="card max-w-2xl space-y-4">
        <p className="eyebrow">Company</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company name"><input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className={inputClass} /></Field>
          <Field label="Company email"><input type="email" value={form.company_email} onChange={(e) => set("company_email", e.target.value)} className={inputClass} /></Field>
          <Field label="Company phone"><input value={form.company_phone} onChange={(e) => set("company_phone", e.target.value)} className={inputClass} /></Field>
          <Field label="Support email"><input type="email" value={form.support_email} onChange={(e) => set("support_email", e.target.value)} className={inputClass} /></Field>
        </div>
        <Field label="Company address"><input value={form.company_address} onChange={(e) => set("company_address", e.target.value)} className={inputClass} /></Field>

        <p className="eyebrow pt-2">Invoicing</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Currency">
            <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputClass}>
              {CURRENCIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </Field>
          <Field label="Invoice prefix"><input value={form.invoice_prefix} onChange={(e) => set("invoice_prefix", e.target.value)} className={inputClass} /></Field>
          <Field label="Max invoice amount (optional)">
            <input type="number" min="0" value={form.max_invoice_amount ?? ""} onChange={(e) => set("max_invoice_amount", e.target.value ? Number(e.target.value) : null)} className={inputClass} />
          </Field>
        </div>
        <Field label="Vendor code prefix"><input value={form.vendor_code_prefix} onChange={(e) => set("vendor_code_prefix", e.target.value)} className={inputClass} /></Field>

        <p className="eyebrow pt-2">Document review</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.require_document_approval} onChange={(e) => set("require_document_approval", e.target.checked)} />
            Require manual document approval
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.auto_approve_documents} onChange={(e) => set("auto_approve_documents", e.target.checked)} />
            Auto-approve documents on upload
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.email_notifications} onChange={(e) => set("email_notifications", e.target.checked)} />
            Send email notifications
          </label>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button>
        </div>
      </form>
    </div>
  );
}
