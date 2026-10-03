// Pieces shared by the vendor-platform screens (vendors, vendor profile,
// invoices, documents) so the same object behaves the same everywhere.
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  LuBan,
  LuCircleCheck,
  LuClock,
  LuCreditCard,
  LuDownload,
  LuExternalLink,
  LuFileText,
  LuRotateCcw,
  LuTrash2,
  LuTriangleAlert,
  LuUpload,
} from "react-icons/lu";
import { adminApi } from "../../lib/adminApi.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";
import { usePromptDialog } from "../../hooks/usePromptDialog.jsx";
import { daysUntil, formatDate, formatDateTime, formatDay, toDateInput } from "../../lib/format.js";
import { formatCurrency, statusTone } from "../../../lib/vendorPlatform.js";
import { downloadInvoicePdf } from "../../../lib/invoicePdf.js";
import { usePlatformSettings } from "../../lib/usePlatformSettings.js";
import { Alert, Badge, Button, Drawer, EmptyState, Field, Input, Menu, Modal, Select, Table, Td, Textarea, Th, cx } from "../../components/ui.jsx";

export const VENDOR_STATUSES = ["Pending Review", "Approved", "Rejected", "Inactive"];
export const INVOICE_STATUSES = ["Submitted", "Under Review", "Approved", "Paid", "Rejected"];
export const DOCUMENT_STATUSES = ["Pending Review", "Approved", "Rejected"];
export const BUSINESS_TYPES = ["Manufacturer", "Distributor", "Service Provider"];
export const AWAITING_REVIEW = ["Submitted", "Under Review"];
export const EXPIRY_WINDOW_DAYS = 30;

export function StatusBadge({ status, className }) {
  return (
    <Badge tone={statusTone(status)} className={className}>
      {status}
    </Badge>
  );
}

export function isExpiringSoon(doc) {
  const d = daysUntil(doc.expiry_date);
  return d !== null && d <= EXPIRY_WINDOW_DAYS;
}

export function isOverdue(invoice) {
  const d = daysUntil(invoice.due_date);
  return d !== null && d < 0 && !["Paid", "Rejected"].includes(invoice.status);
}

export function ExpiryLabel({ date }) {
  const d = daysUntil(date);
  if (d === null) return <span className="text-slate-400">No expiry</span>;
  if (d < 0)
    return (
      <span className="inline-flex items-center gap-1 font-medium text-red-600">
        <LuTriangleAlert size={13} aria-hidden="true" /> Expired {formatDay(date)}
      </span>
    );
  if (d <= EXPIRY_WINDOW_DAYS)
    return (
      <span className="inline-flex items-center gap-1 font-medium text-amber-700">
        <LuClock size={13} aria-hidden="true" /> {d === 0 ? "Expires today" : `Expires in ${d} day${d === 1 ? "" : "s"}`}
      </span>
    );
  return <span className="text-slatey">{formatDay(date)}</span>;
}

// --- Status changes -----------------------------------------------------------
// Every status change on the platform notifies the vendor (in-portal, and by
// email when enabled in settings), so none of them fire without a confirm,
// and rejections always collect the reason the backend requires.

const NOTIFY_NOTE = "The vendor is notified in their portal, and by email if notifications are on.";

export function useStatusChange() {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { prompt, dialog: promptDialog } = usePromptDialog();

  // Resolves to { reason } when confirmed, or null when cancelled.
  const ask = useCallback(
    async ({ noun, name, to }) => {
      if (to === "Rejected") {
        const reason = await prompt({
          title: `Reject ${noun}?`,
          message: (
            <>
              <span className="font-medium text-ink">{name}</span> will be marked as rejected. {NOTIFY_NOTE}
            </>
          ),
          label: "Reason (shared with the vendor)",
          placeholder: "e.g. Tax clearance certificate has expired",
          confirmLabel: "Reject",
          destructive: true,
          multiline: true,
        });
        return reason ? { reason } : null;
      }
      const ok = await confirm({
        title: `Mark ${noun} as ${to}?`,
        message: (
          <>
            <span className="font-medium text-ink">{name}</span> will move to <span className="font-medium text-ink">{to}</span>. {NOTIFY_NOTE}
          </>
        ),
        confirmLabel: `Mark ${to}`,
        destructive: to === "Inactive",
      });
      return ok ? { reason: undefined } : null;
    },
    [confirm, prompt]
  );

  return {
    ask,
    dialogs: (
      <>
        {confirmDialog}
        {promptDialog}
      </>
    ),
  };
}

// --- Invoices -----------------------------------------------------------------

// Suggested next steps per invoice status. The backend accepts any
// transition, so the remaining statuses stay reachable from "More".
const INVOICE_NEXT = {
  Submitted: ["Under Review", "Approved", "Rejected"],
  "Under Review": ["Approved", "Rejected"],
  Approved: ["Rejected"],
  Rejected: ["Submitted"],
  Paid: [],
};

const INVOICE_ACTION_LABEL = {
  "Under Review": "Start review",
  Approved: "Approve",
  Rejected: "Reject",
  Submitted: "Reopen",
};

function PaymentForm({ invoice, currency, onRecorded, onCancel }) {
  const [form, setForm] = useState({ payment_date: toDateInput(new Date()), payment_method: "Bank transfer", payment_reference: "", payment_notes: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await adminApi.post(`/api/vendor-platform/invoices/${invoice.id}/payment`, {
        ...form,
        payment_date: new Date(form.payment_date).toISOString(),
      });
      toast.success(`${invoice.invoice_number} marked as paid.`);
      onRecorded(updated);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-teal-500/40 bg-teal-50/40 p-4">
      <p className="mb-1 text-sm font-semibold text-ink">Record payment of {formatCurrency(invoice.amount, currency)}</p>
      <p className="mb-4 text-xs text-slatey">This marks the invoice as Paid and notifies the vendor.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Payment date" required>
          {(a) => <Input {...a} type="date" required value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />}
        </Field>
        <Field label="Method">
          {(a) => <Input {...a} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} />}
        </Field>
        <Field label="Reference" optional className="sm:col-span-2">
          {(a) => <Input {...a} placeholder="e.g. bank transfer ID" value={form.payment_reference} onChange={(e) => setForm({ ...form, payment_reference: e.target.value })} />}
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" icon={LuCreditCard} loading={saving}>
          Mark as paid
        </Button>
      </div>
    </form>
  );
}

function Detail({ label, children, className }) {
  return (
    <div className={className}>
      <dt className="text-xs text-slatey">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children || "—"}</dd>
    </div>
  );
}

export function InvoiceDrawer({ invoice: initial, vendorName, canManage, onClose, onChanged }) {
  const settings = usePlatformSettings();
  const currency = settings?.currency || "NGN";
  const [invoice, setInvoice] = useState(initial);
  const [history, setHistory] = useState(null);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const { ask, dialogs } = useStatusChange();

  useEffect(() => {
    adminApi.get(`/api/vendor-platform/invoices/${initial.id}/history`).then(setHistory).catch(() => setHistory([]));
  }, [initial.id, invoice.status]);

  function applyUpdate(updated) {
    setInvoice(updated);
    setPaying(false);
    onChanged(updated);
  }

  async function changeStatus(to) {
    const answer = await ask({ noun: "invoice", name: invoice.invoice_number, to });
    if (!answer) return;
    setBusy(true);
    try {
      const updated = await adminApi.put(`/api/vendor-platform/invoices/${invoice.id}/status`, { status: to, reason: answer.reason });
      toast.success(`${invoice.invoice_number} is now ${to}.`);
      applyUpdate(updated);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const next = INVOICE_NEXT[invoice.status] || [];
  const others = INVOICE_STATUSES.filter((s) => s !== "Paid" && s !== invoice.status && !next.includes(s));
  const overdue = isOverdue(invoice);

  return (
    <Drawer
      title={invoice.invoice_number}
      subtitle={vendorName}
      headerExtra={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={invoice.status} />
          {overdue && <Badge tone="danger">Overdue</Badge>}
        </div>
      }
      onClose={onClose}
      footer={
        <Button
          icon={LuDownload}
          onClick={() => downloadInvoicePdf(invoice, { companyName: settings?.company_name || undefined, vendorName, currency })}
        >
          Download PDF
        </Button>
      }
    >
      {dialogs}
      <div className="space-y-6">
        <div>
          <p className="text-xs text-slatey">Amount</p>
          <p className="font-syne text-3xl font-semibold tabular-nums text-ink">{formatCurrency(invoice.amount, currency)}</p>
        </div>

        {invoice.status === "Rejected" && invoice.rejection_reason && (
          <Alert tone="danger" title="Rejected">{invoice.rejection_reason}</Alert>
        )}
        {invoice.status === "Paid" && (
          <Alert tone="success" title={`Paid ${formatDay(invoice.payment_date)}`}>
            {[invoice.payment_method, invoice.payment_reference && `ref ${invoice.payment_reference}`].filter(Boolean).join(" · ") || "Payment recorded."}
          </Alert>
        )}

        {canManage && invoice.status !== "Paid" && (
          <div>
            <p className="mb-2 text-xs font-medium text-slatey">Next step</p>
            {paying ? (
              <PaymentForm invoice={invoice} currency={currency} onRecorded={applyUpdate} onCancel={() => setPaying(false)} />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {invoice.status === "Approved" && (
                  <Button variant="primary" icon={LuCreditCard} onClick={() => setPaying(true)}>
                    Record payment
                  </Button>
                )}
                {next.map((to, i) => (
                  <Button
                    key={to}
                    disabled={busy}
                    variant={to === "Rejected" ? "danger-ghost" : i === 0 && invoice.status !== "Approved" ? "primary" : "secondary"}
                    icon={to === "Rejected" ? LuBan : to === "Submitted" ? LuRotateCcw : to === "Approved" ? LuCircleCheck : LuClock}
                    onClick={() => changeStatus(to)}
                  >
                    {INVOICE_ACTION_LABEL[to]}
                  </Button>
                ))}
                {others.length > 0 && (
                  <Menu
                    label="Other statuses"
                    items={others.map((s) => ({ label: `Move to ${s}`, onClick: () => changeStatus(s) }))}
                  />
                )}
              </div>
            )}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-black/[0.07] p-4">
          <Detail label="Submitted">{formatDate(invoice.submitted_at)}</Detail>
          <Detail label="Due">
            <span className={cx(overdue && "font-medium text-red-600")}>{formatDay(invoice.due_date)}</span>
          </Detail>
          <Detail label="Service">{invoice.service_name}</Detail>
          <Detail label="Description">{invoice.description}</Detail>
          {invoice.notes && <Detail label="Notes" className="col-span-2">{invoice.notes}</Detail>}
        </dl>

        {invoice.line_items?.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-slatey">Line items</p>
            <div className="overflow-hidden rounded-xl border border-black/[0.07]">
              <Table>
                <thead>
                  <tr>
                    <Th>Item</Th>
                    <Th align="right" className="hidden sm:table-cell">Qty</Th>
                    <Th align="right" className="hidden sm:table-cell">Unit</Th>
                    <Th align="right">Amount</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {invoice.line_items.map((li) => (
                    <tr key={li.id}>
                      <Td>{li.description}</Td>
                      <Td align="right" className="hidden tabular-nums sm:table-cell">{li.quantity}</Td>
                      <Td align="right" className="hidden tabular-nums sm:table-cell">{formatCurrency(li.unit_price, currency)}</Td>
                      <Td align="right" className="font-medium tabular-nums">{formatCurrency(li.amount, currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}

        <div>
          <p className="mb-3 text-xs font-medium text-slatey">Activity</p>
          {!history && <p className="text-sm text-slatey">Loading…</p>}
          {history && (
            <ol className="relative space-y-4 border-l border-black/10 pl-5">
              <li className="relative">
                <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                <p className="text-sm text-ink">Invoice submitted</p>
                <p className="text-xs text-slatey">{formatDateTime(invoice.submitted_at)}</p>
              </li>
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className={cx("absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white", { success: "bg-teal-500", danger: "bg-red-500", warning: "bg-amber-500", info: "bg-sky-500" }[statusTone(h.status)] || "bg-slate-400")} />
                  <p className="text-sm text-ink">
                    Moved to <span className="font-medium">{h.status}</span>
                  </p>
                  {h.reason && <p className="text-sm text-slatey">“{h.reason}”</p>}
                  <p className="text-xs text-slatey">
                    {h.changed_by} · {formatDateTime(h.changed_at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export function InvoiceFormModal({ vendors, services, defaultVendorId, onClose, onCreated }) {
  const settings = usePlatformSettings();
  const currency = settings?.currency || "NGN";
  const [form, setForm] = useState({ vendor_id: defaultVendorId ? String(defaultVendorId) : "", service_id: "", description: "", amount: "", due_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const selectedService = services.find((s) => String(s.id) === form.service_id);
  const max = settings?.max_invoice_amount;
  const overMax = max && Number(form.amount) > max;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const inv = await adminApi.post("/api/vendor-platform/invoices", {
        vendor_id: Number(form.vendor_id),
        service_id: form.service_id ? Number(form.service_id) : null,
        description: form.description,
        amount: Number(form.amount) || 0,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        notes: form.notes,
        line_items: [],
      });
      toast.success(`Invoice ${inv.invoice_number} created.`);
      onCreated(inv);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="New invoice"
      description="Create an invoice on a vendor's behalf. It starts in Submitted and the vendor is emailed a receipt."
      onClose={onClose}
      as="form"
      formProps={{ onSubmit: submit }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving}>Create invoice</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vendor" required className="sm:col-span-2">
          {(a) => (
            <Select {...a} required value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} disabled={!!defaultVendorId}>
              <option value="">Select a vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.company_name} ({v.vendor_code})</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Service" optional hint={selectedService && `Catalogue price: ${formatCurrency(selectedService.unit_price, currency)}${selectedService.unit ? ` / ${selectedService.unit}` : ""}`}>
          {(a) => (
            <Select {...a} value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
              <option value="">No service</option>
              {services.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={`Amount (${currency})`} required error={overMax ? `Above the ${formatCurrency(max, currency)} limit set in Settings` : undefined}>
          {(a) => <Input {...a} required type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />}
        </Field>
        <Field label="Description" className="sm:col-span-2">
          {(a) => <Input {...a} value={form.description} placeholder="What the invoice is for" onChange={(e) => setForm({ ...form, description: e.target.value })} />}
        </Field>
        <Field label="Due date" optional>
          {(a) => <Input {...a} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />}
        </Field>
        <Field label="Internal notes" optional className="sm:col-span-2">
          {(a) => <Textarea {...a} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}
        </Field>
      </div>
    </Modal>
  );
}

// --- Documents ----------------------------------------------------------------

export function DocumentUploadModal({ vendors, defaultVendorId, onClose, onUploaded }) {
  const [form, setForm] = useState({ vendor_id: defaultVendorId ? String(defaultVendorId) : "", document_name: "", document_type: "", expiry_date: "", notes: "" });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  function pickFile(f) {
    setFile(f || null);
    setFileError("");
    if (f && !form.document_name) setForm((prev) => ({ ...prev, document_name: f.name.replace(/\.[^.]+$/, "") }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) {
      setFileError("Choose a file to upload.");
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
      const doc = await adminApi.upload("/api/vendor-platform/documents", data);
      toast.success("Document uploaded.");
      onUploaded(doc);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Upload document"
      description="Add a compliance document on a vendor's behalf."
      onClose={onClose}
      as="form"
      formProps={{ onSubmit: submit }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" icon={LuUpload} loading={saving}>Upload</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vendor" required className="sm:col-span-2">
          {(a) => (
            <Select {...a} required value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} disabled={!!defaultVendorId}>
              <option value="">Select a vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.company_name}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="File" required error={fileError} className="sm:col-span-2">
          {() => (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className={cx("flex items-center gap-3 rounded-lg border border-dashed px-4 py-4", fileError ? "border-red-400" : "border-black/15")}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mist text-slatey">
                <LuFileText size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file ? file.name : "Drop a file here"}</p>
                <p className="text-xs text-slatey">{file ? `${(file.size / 1024).toFixed(0)} KB` : "PDF, Word or image"}</p>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
              <Button size="sm" onClick={() => fileRef.current?.click()}>{file ? "Replace" : "Browse"}</Button>
            </div>
          )}
        </Field>
        <Field label="Document name" required className="sm:col-span-2">
          {(a) => <Input {...a} required value={form.document_name} onChange={(e) => setForm({ ...form, document_name: e.target.value })} />}
        </Field>
        <Field label="Type" optional>
          {(a) => <Input {...a} placeholder="e.g. Tax clearance" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} />}
        </Field>
        <Field label="Expiry date" optional hint="We'll flag it 30 days before.">
          {(a) => <Input {...a} type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />}
        </Field>
        <Field label="Notes" optional className="sm:col-span-2">
          {(a) => <Textarea {...a} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}
        </Field>
      </div>
    </Modal>
  );
}

// Table (desktop) / list (mobile) of documents with review actions.
export function DocumentTable({ documents, vendorName, canManage, onChanged, onDeleted, emptyState }) {
  const { ask, dialogs } = useStatusChange();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [busyId, setBusyId] = useState(null);

  async function changeStatus(doc, to) {
    const answer = await ask({ noun: "document", name: doc.document_name, to });
    if (!answer) return;
    setBusyId(doc.id);
    try {
      const updated = await adminApi.put(`/api/vendor-platform/documents/${doc.id}/status`, { status: to, rejection_reason: answer.reason });
      toast.success(`${doc.document_name} ${to === "Pending Review" ? "moved back to review" : to.toLowerCase()}.`);
      onChanged(updated);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(doc) {
    const ok = await confirm({ title: `Delete “${doc.document_name}”?`, message: "The file is removed permanently.", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      await adminApi.del(`/api/vendor-platform/documents/${doc.id}`);
      toast.success("Document deleted.");
      onDeleted(doc);
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (documents.length === 0) return emptyState || <EmptyState compact icon={LuFileText} title="No documents" />;

  function reviewButtons(doc) {
    if (!canManage || doc.status !== "Pending Review") return null;
    return (
      <>
        <Button size="sm" variant="secondary" icon={LuCircleCheck} disabled={busyId === doc.id} onClick={() => changeStatus(doc, "Approved")}>
          Approve
        </Button>
        <Button size="sm" variant="danger-ghost" disabled={busyId === doc.id} onClick={() => changeStatus(doc, "Rejected")}>
          Reject
        </Button>
      </>
    );
  }

  function menu(doc) {
    if (!canManage) return doc.file_url ? <Button size="sm" variant="ghost" href={doc.file_url} target="_blank" rel="noreferrer" icon={LuExternalLink}>Open</Button> : null;
    const pending = doc.status === "Pending Review";
    return (
        <Menu
          items={[
            doc.file_url && { label: "Open file", icon: LuExternalLink, onClick: () => window.open(doc.file_url, "_blank", "noopener") },
            !pending && doc.status !== "Approved" && { label: "Approve", icon: LuCircleCheck, onClick: () => changeStatus(doc, "Approved") },
            !pending && doc.status !== "Rejected" && { label: "Reject", icon: LuBan, onClick: () => changeStatus(doc, "Rejected") },
            !pending && { label: "Move back to review", icon: LuRotateCcw, onClick: () => changeStatus(doc, "Pending Review") },
            { divider: true },
            { label: "Delete", icon: LuTrash2, danger: true, onClick: () => remove(doc) },
          ]}
        />
    );
  }

  return (
    <>
      {dialogs}
      {confirmDialog}
      <Table className="hidden md:block">
        <thead>
          <tr>
            <Th>Document</Th>
            {vendorName && <Th>Vendor</Th>}
            <Th>Uploaded</Th>
            <Th>Expiry</Th>
            <Th>Status</Th>
            <Th align="right"><span className="sr-only">Actions</span></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.05]">
          {documents.map((doc) => (
            <tr key={doc.id} className="transition hover:bg-mist/60">
              <Td>
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-mist text-slatey ring-1 ring-black/5">
                    <LuFileText size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    {doc.file_url ? (
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="font-medium text-ink hover:text-teal-700">{doc.document_name}</a>
                    ) : (
                      <p className="font-medium text-ink">{doc.document_name}</p>
                    )}
                    <p className="text-xs text-slatey">{doc.document_type || "Untyped"}</p>
                    {doc.status === "Rejected" && doc.rejection_reason && <p className="mt-0.5 text-xs text-red-600">“{doc.rejection_reason}”</p>}
                  </div>
                </div>
              </Td>
              {vendorName && <Td className="text-slatey">{vendorName(doc.vendor_id)}</Td>}
              <Td className="whitespace-nowrap text-slatey">{formatDate(doc.uploaded_at)}</Td>
              <Td className="whitespace-nowrap text-xs"><ExpiryLabel date={doc.expiry_date} /></Td>
              <Td><StatusBadge status={doc.status} /></Td>
              <Td align="right">
                <div className="flex items-center justify-end gap-1.5">
                  {reviewButtons(doc)}
                  {menu(doc)}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <ul className="divide-y divide-black/[0.05] md:hidden">
        {documents.map((doc) => (
          <li key={doc.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{doc.document_name}</p>
                <p className="truncate text-xs text-slatey">
                  {vendorName ? `${vendorName(doc.vendor_id)} · ` : ""}
                  {doc.document_type || "Untyped"}
                </p>
                <p className="mt-1 text-xs"><ExpiryLabel date={doc.expiry_date} /></p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <StatusBadge status={doc.status} />
                {menu(doc)}
              </div>
            </div>
            {reviewButtons(doc) && <div className="mt-2 flex gap-2">{reviewButtons(doc)}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}
