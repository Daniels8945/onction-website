import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuBan,
  LuCircleCheck,
  LuClock,
  LuCopy,
  LuFileText,
  LuPencil,
  LuPlus,
  LuPower,
  LuReceipt,
  LuRotateCcw,
  LuStickyNote,
  LuTrash2,
  LuUpload,
} from "react-icons/lu";
import { adminApi } from "../../lib/adminApi.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";
import { useCanManage } from "../../lib/useCanManage.js";
import { useCurrency } from "../../lib/usePlatformSettings.js";
import { formatDate, formatDateTime, formatDay, relativeTime } from "../../lib/format.js";
import { formatCurrency, formatCurrencyCompact } from "../../../lib/vendorPlatform.js";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Input,
  ListSkeleton,
  Menu,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  StatCard,
  Table,
  Tabs,
  Td,
  Textarea,
  Th,
  cx,
} from "../../components/ui.jsx";
import {
  AWAITING_REVIEW,
  BUSINESS_TYPES,
  DocumentTable,
  DocumentUploadModal,
  InvoiceDrawer,
  InvoiceFormModal,
  StatusBadge,
  isExpiringSoon,
  isOverdue,
  useStatusChange,
} from "./shared.jsx";

const EDITABLE_FIELDS = [
  "company_name",
  "business_type",
  "products_services",
  "website",
  "first_name",
  "last_name",
  "email",
  "phone",
  "street_address",
  "street_address2",
  "city",
  "region",
  "postal_code",
  "country",
];

// Primary status actions offered for each vendor status; the rest live in
// the overflow menu (the backend accepts any transition).
const PRIMARY_ACTIONS = {
  "Pending Review": [
    { to: "Approved", label: "Approve", icon: LuCircleCheck, variant: "primary" },
    { to: "Rejected", label: "Reject", icon: LuBan, variant: "secondary" },
  ],
  Approved: [],
  Rejected: [{ to: "Approved", label: "Approve", icon: LuCircleCheck, variant: "secondary" }],
  Inactive: [{ to: "Approved", label: "Reactivate", icon: LuPower, variant: "secondary" }],
};

const MENU_LABEL = { Approved: "Approve", Rejected: "Reject", Inactive: "Mark inactive", "Pending Review": "Move back to review" };
const MENU_ICON = { Approved: LuCircleCheck, Rejected: LuBan, Inactive: LuClock, "Pending Review": LuRotateCcw };

function Detail({ label, children, className }) {
  return (
    <div className={className}>
      <dt className="text-xs text-slatey">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{children || <span className="text-slate-400">Not provided</span>}</dd>
    </div>
  );
}

function DetailsPanel({ vendor, canManage, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(vendor);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!editing) setForm(vendor);
  }, [vendor, editing]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const dirty = EDITABLE_FIELDS.some((f) => (form[f] || "") !== (vendor[f] || ""));

  async function save(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.company_name?.trim()) nextErrors.company_name = "Company name is required.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Enter a valid email address.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      const payload = Object.fromEntries(EDITABLE_FIELDS.map((f) => [f, form[f] || null]));
      payload.company_name = form.company_name.trim();
      const updated = await adminApi.put(`/api/vendor-platform/vendors/${vendor.id}`, payload);
      onSaved(updated);
      setEditing(false);
      toast.success("Vendor details saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const address = [vendor.street_address, vendor.street_address2, vendor.city, vendor.region, vendor.postal_code, vendor.country].filter(Boolean).join(", ");

  if (!editing) {
    return (
      <Panel
        title="Company & contact"
        actions={canManage && <Button size="sm" icon={LuPencil} onClick={() => setEditing(true)}>Edit</Button>}
      >
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Detail label="Business type">{vendor.business_type}</Detail>
          <Detail label="Website">
            {vendor.website && (
              <a href={/^https?:\/\//.test(vendor.website) ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                {vendor.website}
              </a>
            )}
          </Detail>
          <Detail label="Products / services" className="sm:col-span-2">{vendor.products_services}</Detail>
          <Detail label="Primary contact">{[vendor.first_name, vendor.last_name].filter(Boolean).join(" ")}</Detail>
          <Detail label="Email">{vendor.email && <a href={`mailto:${vendor.email}`} className="text-teal-700 hover:underline">{vendor.email}</a>}</Detail>
          <Detail label="Phone">{vendor.phone && <a href={`tel:${vendor.phone}`} className="hover:underline">{vendor.phone}</a>}</Detail>
          <Detail label="Address" className="sm:col-span-2">{address}</Detail>
        </dl>
      </Panel>
    );
  }

  return (
    <form onSubmit={save}>
      <Panel
        title="Edit company & contact"
        description="Changes are recorded in the audit log."
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setErrors({}); }}>Cancel</Button>
            <Button size="sm" type="submit" variant="primary" loading={saving} disabled={!dirty}>Save changes</Button>
          </>
        }
      >
        <div className="space-y-6">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Company</legend>
            <Field label="Company name" required error={errors.company_name}>
              {(a) => <Input {...a} value={form.company_name || ""} onChange={set("company_name")} />}
            </Field>
            <Field label="Business type">
              {(a) => (
                <Select {...a} value={form.business_type || ""} onChange={set("business_type")}>
                  <option value="">Not specified</option>
                  {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Products / services" className="sm:col-span-2">
              {(a) => <Textarea {...a} rows={2} value={form.products_services || ""} onChange={set("products_services")} />}
            </Field>
            <Field label="Website" className="sm:col-span-2">
              {(a) => <Input {...a} value={form.website || ""} onChange={set("website")} placeholder="https://" />}
            </Field>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Primary contact</legend>
            <Field label="First name">{(a) => <Input {...a} value={form.first_name || ""} onChange={set("first_name")} />}</Field>
            <Field label="Last name">{(a) => <Input {...a} value={form.last_name || ""} onChange={set("last_name")} />}</Field>
            <Field label="Email" error={errors.email}>{(a) => <Input {...a} type="email" value={form.email || ""} onChange={set("email")} />}</Field>
            <Field label="Phone">{(a) => <Input {...a} type="tel" value={form.phone || ""} onChange={set("phone")} />}</Field>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-6">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Address</legend>
            <Field label="Street address" className="sm:col-span-6">{(a) => <Input {...a} value={form.street_address || ""} onChange={set("street_address")} />}</Field>
            <Field label="Address line 2" optional className="sm:col-span-6">{(a) => <Input {...a} value={form.street_address2 || ""} onChange={set("street_address2")} />}</Field>
            <Field label="City" className="sm:col-span-2">{(a) => <Input {...a} value={form.city || ""} onChange={set("city")} />}</Field>
            <Field label="Region / state" className="sm:col-span-2">{(a) => <Input {...a} value={form.region || ""} onChange={set("region")} />}</Field>
            <Field label="Postal code" className="sm:col-span-2">{(a) => <Input {...a} value={form.postal_code || ""} onChange={set("postal_code")} />}</Field>
            <Field label="Country" className="sm:col-span-3">{(a) => <Input {...a} value={form.country || ""} onChange={set("country")} />}</Field>
          </fieldset>
        </div>
      </Panel>
    </form>
  );
}

function NotesPanel({ vendorId, notes, setNotes, canManage }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  async function add(e) {
    e?.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const note = await adminApi.post(`/api/vendor-platform/vendors/${vendorId}/notes`, { note: text.trim() });
      setNotes((prev) => [note, ...(prev || [])]);
      setText("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(note) {
    const ok = await confirm({ title: "Delete this note?", message: "It will be removed for everyone on the team.", confirmLabel: "Delete note", destructive: true });
    if (!ok) return;
    try {
      await adminApi.del(`/api/vendor-platform/vendors/notes/${note.id}`);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Panel title="Internal notes" description="Only visible to your team — never shown to the vendor." padded={false}>
      {dialog}
      {canManage && (
        <form onSubmit={add} className="border-b border-black/[0.06] p-5">
          <Textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add(e);
            }}
            placeholder="Add context for the team — calls, agreements, concerns…"
            aria-label="New note"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">⌘ + Enter to post</p>
            <Button type="submit" size="sm" variant="primary" loading={saving} disabled={!text.trim()}>Add note</Button>
          </div>
        </form>
      )}
      {!notes && <ListSkeleton rows={2} />}
      {notes && notes.length === 0 && <EmptyState compact icon={LuStickyNote} title="No notes yet" description="Notes help the team remember decisions and conversations with this vendor." />}
      {notes && notes.length > 0 && (
        <ul className="divide-y divide-black/[0.05]">
          {notes.map((n) => (
            <li key={n.id} className="group flex gap-3 px-5 py-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mist text-[11px] font-semibold uppercase text-slatey ring-1 ring-black/5">
                {n.created_by?.[0] || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slatey">
                  <span className="font-medium text-ink">{n.created_by}</span> · <span title={formatDateTime(n.created_at)}>{relativeTime(n.created_at)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{n.note}</p>
              </div>
              {canManage && (
                <IconButton icon={LuTrash2} size="sm" label="Delete note" variant="danger-ghost" onClick={() => remove(n)} className="opacity-60 group-hover:opacity-100" />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function VendorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currency = useCurrency();
  const canManage = useCanManage();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState("");
  const [invoices, setInvoices] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [notes, setNotes] = useState(null);
  const [services, setServices] = useState([]);
  const [openInvoice, setOpenInvoice] = useState(null);
  const [modal, setModal] = useState(null); // "invoice" | "document"
  const { ask, dialogs } = useStatusChange();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    setVendor(null);
    adminApi.get(`/api/vendor-platform/vendors/${id}`).then(setVendor).catch((err) => setError(err.message));
    // Loaded up front (not per tab) so the summary and tab counts are right.
    adminApi.get(`/api/vendor-platform/invoices?vendor_id=${id}`).then(setInvoices).catch(() => setInvoices([]));
    adminApi.get(`/api/vendor-platform/documents?vendor_id=${id}`).then(setDocuments).catch(() => setDocuments([]));
    adminApi.get(`/api/vendor-platform/vendors/${id}/notes`).then(setNotes).catch(() => setNotes([]));
    adminApi.get("/api/vendor-platform/services").then(setServices).catch(() => {});
  }, [id]);

  const stats = useMemo(() => {
    const list = invoices || [];
    const sum = (arr) => arr.reduce((t, i) => t + i.amount, 0);
    const outstanding = list.filter((i) => [...AWAITING_REVIEW, "Approved"].includes(i.status));
    return {
      total: sum(list.filter((i) => i.status !== "Rejected")),
      outstanding: sum(outstanding),
      outstandingCount: outstanding.length,
      paid: sum(list.filter((i) => i.status === "Paid")),
      paidCount: list.filter((i) => i.status === "Paid").length,
      toReview: list.filter((i) => AWAITING_REVIEW.includes(i.status)).length,
      overdue: list.filter(isOverdue).length,
    };
  }, [invoices]);

  const docStats = useMemo(() => {
    const list = documents || [];
    return {
      approved: list.filter((d) => d.status === "Approved").length,
      pending: list.filter((d) => d.status === "Pending Review").length,
      expiring: list.filter(isExpiringSoon).length,
    };
  }, [documents]);

  function setTab(value) {
    const next = new URLSearchParams(params);
    value === "overview" ? next.delete("tab") : next.set("tab", value);
    setParams(next, { replace: true });
  }

  async function changeStatus(to) {
    const answer = await ask({ noun: "vendor", name: vendor.company_name, to });
    if (!answer) return;
    try {
      const updated = await adminApi.put(`/api/vendor-platform/vendors/${id}/status`, { status: to, rejection_reason: answer.reason });
      setVendor(updated);
      toast.success(`${vendor.company_name} is now ${to}.`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${vendor.company_name}?`,
      message: `This permanently removes the vendor along with ${invoices?.length || 0} invoice(s), ${documents?.length || 0} document(s) and all notes. It can't be undone — consider marking them Inactive instead.`,
      confirmLabel: "Delete vendor",
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

  if (error && !vendor) {
    return (
      <Alert tone="danger" title="This vendor couldn't be loaded" action={<Button size="sm" to="/admin/vendors">Back to vendors</Button>}>
        {error}
      </Alert>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const primary = canManage ? PRIMARY_ACTIONS[vendor.status] || [] : [];
  const menuStatuses = ["Approved", "Pending Review", "Rejected", "Inactive"].filter((s) => s !== vendor.status && !primary.some((p) => p.to === s));

  return (
    <div>
      {dialogs}
      {confirmDialog}
      {openInvoice && (
        <InvoiceDrawer
          invoice={openInvoice}
          vendorName={vendor.company_name}
          canManage={canManage}
          onClose={() => setOpenInvoice(null)}
          onChanged={(updated) => setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
        />
      )}
      {modal === "invoice" && (
        <InvoiceFormModal
          vendors={[vendor]}
          services={services}
          defaultVendorId={vendor.id}
          onClose={() => setModal(null)}
          onCreated={(inv) => {
            setInvoices((prev) => [inv, ...(prev || [])]);
            setModal(null);
            setTab("invoices");
          }}
        />
      )}
      {modal === "document" && (
        <DocumentUploadModal
          vendors={[vendor]}
          defaultVendorId={vendor.id}
          onClose={() => setModal(null)}
          onUploaded={(doc) => {
            setDocuments((prev) => [doc, ...(prev || [])]);
            setModal(null);
            setTab("documents");
          }}
        />
      )}

      <PageHeader
        back={{ to: "/admin/vendors", label: "Vendors" }}
        title={
          <span className="flex items-center gap-4">
            <Avatar name={vendor.company_name} size="lg" className="hidden sm:grid" />
            <span className="min-w-0">
              <span className="block truncate">{vendor.company_name}</span>
            </span>
          </span>
        }
        meta={
          <>
            <StatusBadge status={vendor.status} />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(vendor.vendor_code).then(() => toast.success("Vendor code copied."))}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs text-slatey transition hover:bg-black/5 hover:text-ink"
              title="Copy vendor code"
            >
              {vendor.vendor_code} <LuCopy size={12} aria-hidden="true" />
            </button>
            {vendor.business_type && <span className="text-xs text-slatey">· {vendor.business_type}</span>}
            <span className="text-xs text-slatey">· {vendor.self_registered ? "Self-registered" : "Added by admin"} {formatDate(vendor.submitted_at)}</span>
          </>
        }
        actions={
          <>
            {primary.map((a) => (
              <Button key={a.to} variant={a.variant} icon={a.icon} onClick={() => changeStatus(a.to)}>
                {a.label}
              </Button>
            ))}
            {canManage && (
              <Menu
                items={[
                  ...menuStatuses.map((s) => ({ label: MENU_LABEL[s], icon: MENU_ICON[s], onClick: () => changeStatus(s) })),
                  { divider: true },
                  { label: "New invoice", icon: LuReceipt, onClick: () => setModal("invoice") },
                  { label: "Upload document", icon: LuUpload, onClick: () => setModal("document") },
                  { divider: true },
                  { label: "Delete vendor", icon: LuTrash2, danger: true, onClick: handleDelete },
                ]}
              />
            )}
          </>
        }
      />

      {vendor.status === "Pending Review" && (
        <Alert tone="warning" title="Waiting for your review" className="mb-6">
          Check the company details and uploaded documents, then approve or reject this registration.
          {docStats.pending > 0 && ` ${docStats.pending} document${docStats.pending > 1 ? "s are" : " is"} also awaiting review.`}
        </Alert>
      )}
      {vendor.status === "Rejected" && (
        <Alert tone="danger" title="Registration rejected" className="mb-6">
          {vendor.rejection_reason || "No reason recorded."}
        </Alert>
      )}
      {vendor.status === "Inactive" && (
        <Alert tone="info" title="Inactive vendor" className="mb-6">
          This account has been deactivated. Reactivate it to resume working with this vendor.
        </Alert>
      )}

      <section aria-label="Summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total invoiced" value={invoices ? formatCurrencyCompact(stats.total, currency) : "–"} title={formatCurrency(stats.total, currency)} hint={invoices ? `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}` : " "} icon={LuReceipt} />
        <StatCard
          label="Outstanding"
          value={invoices ? formatCurrencyCompact(stats.outstanding, currency) : "–"}
          title={formatCurrency(stats.outstanding, currency)}
          hint={stats.overdue ? `${stats.overdue} overdue` : `${stats.outstandingCount} awaiting review or payment`}
          icon={LuClock}
          tone={stats.overdue ? "danger" : stats.toReview ? "warning" : undefined}
          onClick={() => setTab("invoices")}
        />
        <StatCard label="Paid" value={invoices ? formatCurrencyCompact(stats.paid, currency) : "–"} title={formatCurrency(stats.paid, currency)} hint={`${stats.paidCount} paid invoice${stats.paidCount === 1 ? "" : "s"}`} icon={LuCircleCheck} tone={stats.paid ? "success" : undefined} />
        <StatCard
          label="Documents"
          value={documents ? `${docStats.approved}/${documents.length}` : "–"}
          hint={docStats.expiring ? `${docStats.expiring} expiring soon` : docStats.pending ? `${docStats.pending} awaiting review` : "approved"}
          icon={LuFileText}
          tone={docStats.expiring ? "danger" : docStats.pending ? "warning" : undefined}
          onClick={() => setTab("documents")}
        />
      </section>

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "invoices", label: "Invoices", count: invoices?.length },
          { value: "documents", label: "Documents", count: documents?.length },
          { value: "notes", label: "Notes", count: notes?.length },
        ]}
      />

      {tab === "overview" && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DetailsPanel vendor={vendor} canManage={canManage} onSaved={setVendor} />
          </div>
          <div className="space-y-6">
            <Panel title="Account">
              <dl className="space-y-4">
                <Detail label="Vendor portal access">
                  {vendor.has_password ? <Badge tone="success">Password set</Badge> : <Badge tone="neutral">No password yet</Badge>}
                </Detail>
                <Detail label="Registered">{`${formatDate(vendor.submitted_at)} · ${vendor.self_registered ? "self-registered" : "added by admin"}`}</Detail>
                <Detail label="Status last changed">{vendor.status_updated_at ? formatDateTime(vendor.status_updated_at) : "Never"}</Detail>
                <Detail label="Details last updated">{vendor.updated_at ? formatDateTime(vendor.updated_at) : "Never"}</Detail>
              </dl>
            </Panel>
            <Panel title="Latest note" actions={<Button size="sm" variant="ghost" onClick={() => setTab("notes")}>All notes</Button>}>
              {!notes ? (
                <Skeleton className="h-10" />
              ) : notes.length === 0 ? (
                <p className="text-sm text-slatey">No notes yet.</p>
              ) : (
                <>
                  <p className="line-clamp-4 whitespace-pre-wrap text-sm text-ink">{notes[0].note}</p>
                  <p className="mt-2 text-xs text-slatey">{notes[0].created_by} · {relativeTime(notes[0].created_at)}</p>
                </>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "invoices" && (
        <Panel
          title="Invoices"
          padded={false}
          actions={canManage && <Button size="sm" icon={LuPlus} onClick={() => setModal("invoice")}>New invoice</Button>}
        >
          {!invoices && <ListSkeleton rows={3} />}
          {invoices && invoices.length === 0 && (
            <EmptyState compact icon={LuReceipt} title="No invoices yet" description="Invoices this vendor submits through the portal will appear here." />
          )}
          {invoices && invoices.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th className="hidden sm:table-cell">Submitted</Th>
                  <Th className="hidden sm:table-cell">Due</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="cursor-pointer transition hover:bg-mist/60" onClick={() => setOpenInvoice(inv)}>
                    <Td>
                      <button type="button" className="font-medium text-ink hover:text-teal-700" onClick={(e) => { e.stopPropagation(); setOpenInvoice(inv); }}>
                        {inv.invoice_number}
                      </button>
                      <p className="max-w-[16rem] truncate text-xs text-slatey">{inv.description || inv.service_name || "—"}</p>
                    </Td>
                    <Td className="hidden whitespace-nowrap text-slatey sm:table-cell">{formatDate(inv.submitted_at)}</Td>
                    <Td className={cx("hidden whitespace-nowrap sm:table-cell", isOverdue(inv) ? "font-medium text-red-600" : "text-slatey")}>{formatDay(inv.due_date)}</Td>
                    <Td align="right" className="whitespace-nowrap font-medium tabular-nums text-ink">{formatCurrency(inv.amount, currency)}</Td>
                    <Td><StatusBadge status={inv.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      )}

      {tab === "documents" && (
        <Panel
          title="Documents"
          padded={false}
          actions={canManage && <Button size="sm" icon={LuUpload} onClick={() => setModal("document")}>Upload</Button>}
        >
          {!documents ? (
            <ListSkeleton rows={3} />
          ) : (
            <DocumentTable
              documents={documents}
              canManage={canManage}
              onChanged={(doc) => setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)))}
              onDeleted={(doc) => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
              emptyState={<EmptyState compact icon={LuFileText} title="No documents yet" description="Compliance documents the vendor uploads will appear here for review." />}
            />
          )}
        </Panel>
      )}

      {tab === "notes" && (
        <div className="max-w-3xl">
          <NotesPanel vendorId={vendor.id} notes={notes} setNotes={setNotes} canManage={canManage} />
        </div>
      )}
    </div>
  );
}
