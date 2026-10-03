import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "../../lib/adminApi.js";
import { invalidatePlatformSettings } from "../../lib/usePlatformSettings.js";
import { useCanManage } from "../../lib/useCanManage.js";
import { Alert, Button, Field, Input, PageHeader, Select, Skeleton, Switch } from "../../components/ui.jsx";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];

function Section({ title, description, children }) {
  return (
    <section className="grid gap-4 border-b border-black/[0.07] py-8 first:pt-0 last:border-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-body text-sm font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-slatey">{description}</p>
      </div>
      <div className="rounded-xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(10,31,60,0.04)]">{children}</div>
    </section>
  );
}

export default function VendorSettingsPage() {
  const canManage = useCanManage();
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .get("/api/vendor-platform/settings")
      .then((s) => {
        setSaved(s);
        setForm(s);
      })
      .catch((err) => setError(err.message));
  }, []);

  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));
  const onInput = (field) => (e) => set(field)(e.target.value);
  const dirty = form && saved && JSON.stringify(form) !== JSON.stringify(saved);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await adminApi.put("/api/vendor-platform/settings", form);
      setSaved(updated);
      setForm(updated);
      invalidatePlatformSettings(updated);
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !form) return <Alert tone="danger" title="Settings couldn't be loaded">{error}</Alert>;
  if (!form) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-72" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  const year = new Date().getFullYear();

  return (
    <form onSubmit={handleSave} className="pb-24">
      <PageHeader title="Vendor platform settings" description="Company details, numbering and review rules for the vendor portal." />

      {!canManage && (
        <Alert tone="info" className="mb-6">You have view-only access. Ask an Admin to change these settings.</Alert>
      )}

      <fieldset disabled={!canManage}>
        <Section title="Company" description="Shown to vendors in the portal, on emails and on invoice PDFs.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" className="sm:col-span-2">{(a) => <Input {...a} value={form.company_name} onChange={onInput("company_name")} />}</Field>
            <Field label="Company email">{(a) => <Input {...a} type="email" value={form.company_email} onChange={onInput("company_email")} />}</Field>
            <Field label="Company phone">{(a) => <Input {...a} type="tel" value={form.company_phone} onChange={onInput("company_phone")} />}</Field>
            <Field label="Support email" hint="Where vendors are told to go for help." className="sm:col-span-2">
              {(a) => <Input {...a} type="email" value={form.support_email} onChange={onInput("support_email")} />}
            </Field>
            <Field label="Company address" className="sm:col-span-2">{(a) => <Input {...a} value={form.company_address} onChange={onInput("company_address")} />}</Field>
          </div>
        </Section>

        <Section title="Invoicing & numbering" description="Applies to new vendors and invoices. Existing codes and numbers never change.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency" hint="Used for every amount across the dashboard and portal.">
              {(a) => (
                <Select {...a} value={form.currency} onChange={onInput("currency")}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Invoice amount limit" optional hint="Invoices created here above this amount show a warning.">
              {(a) => (
                <Input
                  {...a}
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={form.max_invoice_amount ?? ""}
                  onChange={(e) => set("max_invoice_amount")(e.target.value ? Number(e.target.value) : null)}
                />
              )}
            </Field>
            <Field label="Vendor code prefix" hint={<>New codes look like <span className="font-mono text-ink">{form.vendor_code_prefix || "…"}-{year}-ABC-1234</span></>}>
              {(a) => <Input {...a} value={form.vendor_code_prefix} onChange={(e) => set("vendor_code_prefix")(e.target.value.toUpperCase())} className="font-mono" />}
            </Field>
            <Field label="Invoice number prefix" hint={<>New numbers look like <span className="font-mono text-ink">{form.invoice_prefix || "…"}-{year}-123456</span></>}>
              {(a) => <Input {...a} value={form.invoice_prefix} onChange={(e) => set("invoice_prefix")(e.target.value.toUpperCase())} className="font-mono" />}
            </Field>
          </div>
        </Section>

        <Section title="Documents & notifications" description="How uploaded compliance documents are handled and whether vendors get emails.">
          <div className="space-y-5">
            <Switch
              label="Auto-approve uploaded documents"
              description="New uploads are marked Approved immediately instead of waiting in the review queue."
              checked={form.auto_approve_documents}
              onChange={set("auto_approve_documents")}
            />
            <Switch
              label="Require manual document approval"
              description="Documents should be reviewed by your team before they count as approved."
              checked={form.require_document_approval}
              onChange={set("require_document_approval")}
            />
            {form.auto_approve_documents && form.require_document_approval && (
              <Alert tone="warning">These two settings conflict. While auto-approve is on, uploads are approved without review.</Alert>
            )}
            <div className="border-t border-black/[0.06] pt-5">
              <Switch
                label="Email vendors about changes"
                description="Status changes, invoice updates and payments are always posted to the vendor's portal inbox; this also sends them by email."
                checked={form.email_notifications}
                onChange={set("email_notifications")}
              />
            </div>
          </div>
        </Section>
      </fieldset>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 backdrop-blur lg:left-60">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <p className="flex items-center gap-2 text-sm text-ink">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" /> You have unsaved changes
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setForm(saved)}>Discard</Button>
              <Button type="submit" variant="primary" loading={saving}>Save settings</Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
