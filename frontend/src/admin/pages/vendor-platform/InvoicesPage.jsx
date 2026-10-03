import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LuCircleCheck, LuClock, LuCreditCard, LuPlus, LuReceipt, LuTriangleAlert } from "react-icons/lu";
import { adminApi } from "../../lib/adminApi.js";
import { useCanManage } from "../../lib/useCanManage.js";
import { useCurrency } from "../../lib/usePlatformSettings.js";
import { formatDate, formatDay } from "../../lib/format.js";
import { formatCurrency } from "../../../lib/vendorPlatform.js";
import { Alert, Badge, Button, EmptyState, ListSkeleton, PageHeader, Panel, SearchInput, Select, StatCard, Table, Tabs, Td, Th, cx } from "../../components/ui.jsx";
import { AWAITING_REVIEW, InvoiceDrawer, InvoiceFormModal, StatusBadge, isOverdue } from "./shared.jsx";

// Tabs are workflow stages rather than raw statuses: "To review" groups
// Submitted + Under Review, which is what an approver actually works through.
const TABS = [
  { value: "review", label: "To review", test: (i) => AWAITING_REVIEW.includes(i.status) },
  { value: "Approved", label: "Approved · unpaid", test: (i) => i.status === "Approved" },
  { value: "overdue", label: "Overdue", test: isOverdue },
  { value: "Paid", label: "Paid", test: (i) => i.status === "Paid" },
  { value: "Rejected", label: "Rejected", test: (i) => i.status === "Rejected" },
  { value: "all", label: "All", test: () => true },
];

export default function InvoicesPage() {
  const currency = useCurrency();
  const canManage = useCanManage();
  const [invoices, setInvoices] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = params.get("status") || "review";
  const vendorFilter = params.get("vendor") || "";

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  }

  useEffect(() => {
    adminApi.get("/api/vendor-platform/invoices").then(setInvoices).catch((err) => setError(err.message));
    adminApi.get("/api/vendor-platform/vendors").then(setVendors).catch(() => {});
    adminApi.get("/api/vendor-platform/services").then(setServices).catch(() => {});
  }, []);

  const vendorName = (id) => vendors.find((v) => v.id === id)?.company_name || `Vendor #${id}`;

  const scoped = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (invoices || []).filter(
      (i) =>
        (!vendorFilter || String(i.vendor_id) === vendorFilter) &&
        (!term || [i.invoice_number, i.description, i.service_name, vendorName(i.vendor_id)].some((f) => (f || "").toLowerCase().includes(term)))
    );
  }, [invoices, vendorFilter, search, vendors]);

  const activeTab = TABS.find((t) => t.value === tab) || TABS[0];
  const visible = scoped.filter(activeTab.test);

  const summary = useMemo(() => {
    const list = invoices || [];
    const sum = (arr) => arr.reduce((t, i) => t + i.amount, 0);
    const review = list.filter((i) => AWAITING_REVIEW.includes(i.status));
    const approved = list.filter((i) => i.status === "Approved");
    const overdue = list.filter(isOverdue);
    const paid = list.filter((i) => i.status === "Paid");
    return { review, approved, overdue, paid, sum };
  }, [invoices]);

  const openInvoice = invoices?.find((i) => i.id === openId);

  function replace(updated) {
    setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  return (
    <div>
      {openInvoice && (
        <InvoiceDrawer invoice={openInvoice} vendorName={vendorName(openInvoice.vendor_id)} canManage={canManage} onClose={() => setOpenId(null)} onChanged={replace} />
      )}
      {creating && (
        <InvoiceFormModal
          vendors={vendors}
          services={services}
          onClose={() => setCreating(false)}
          onCreated={(inv) => {
            setInvoices((prev) => [inv, ...(prev || [])]);
            setCreating(false);
            setParam("status", "review");
          }}
        />
      )}

      <PageHeader
        title="Invoices"
        description="Review vendor invoices, approve them for payment and record payments."
        actions={canManage && <Button variant="primary" icon={LuPlus} onClick={() => setCreating(true)}>New invoice</Button>}
      />

      <section aria-label="Summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="To review"
          value={invoices ? summary.review.length : "–"}
          hint={invoices ? formatCurrency(summary.sum(summary.review), currency) : " "}
          icon={LuClock}
          tone={summary.review.length ? "warning" : undefined}
          onClick={() => setParam("status", "review")}
          active={tab === "review"}
        />
        <StatCard
          label="Approved, awaiting payment"
          value={invoices ? summary.approved.length : "–"}
          hint={invoices ? formatCurrency(summary.sum(summary.approved), currency) : " "}
          icon={LuCreditCard}
          tone={summary.approved.length ? "info" : undefined}
          onClick={() => setParam("status", "Approved")}
          active={tab === "Approved"}
        />
        <StatCard
          label="Overdue"
          value={invoices ? summary.overdue.length : "–"}
          hint={invoices ? formatCurrency(summary.sum(summary.overdue), currency) : " "}
          icon={LuTriangleAlert}
          tone={summary.overdue.length ? "danger" : undefined}
          onClick={() => setParam("status", "overdue")}
          active={tab === "overdue"}
        />
        <StatCard
          label="Paid"
          value={invoices ? summary.paid.length : "–"}
          hint={invoices ? formatCurrency(summary.sum(summary.paid), currency) : " "}
          icon={LuCircleCheck}
          tone={summary.paid.length ? "success" : undefined}
          onClick={() => setParam("status", "Paid")}
          active={tab === "Paid"}
        />
      </section>

      {error && <Alert tone="danger" title="Invoices couldn't be loaded" className="mb-4">{error}</Alert>}

      <Panel padded={false}>
        <div className="border-b border-black/[0.06] px-5 pt-2">
          <Tabs value={activeTab.value} onChange={(v) => setParam("status", v)} items={TABS.map((t) => ({ value: t.value, label: t.label, count: scoped.filter(t.test).length }))} />
        </div>
        <div className="flex flex-col gap-3 border-b border-black/[0.06] px-5 py-3 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search invoice number, vendor or description…" className="flex-1" />
          <Select value={vendorFilter} onChange={(e) => setParam("vendor", e.target.value)} className="sm:w-60" aria-label="Vendor">
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.company_name}</option>
            ))}
          </Select>
        </div>

        {!invoices && !error && <ListSkeleton />}
        {invoices && visible.length === 0 && (
          <EmptyState
            compact={invoices.length > 0}
            icon={LuReceipt}
            title={invoices.length === 0 ? "No invoices yet" : activeTab.value === "review" && !search && !vendorFilter ? "You're all caught up" : "No invoices here"}
            description={
              invoices.length === 0
                ? "Invoices submitted by vendors through the portal will appear here for review."
                : activeTab.value === "review" && !search && !vendorFilter
                  ? "There are no invoices waiting for review."
                  : "Try another tab, vendor or search."
            }
          />
        )}

        {visible.length > 0 && (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Vendor</Th>
                  <Th>Submitted</Th>
                  <Th>Due</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {visible.map((inv) => {
                  const overdue = isOverdue(inv);
                  return (
                    <tr key={inv.id} className="cursor-pointer transition hover:bg-mist/60" onClick={() => setOpenId(inv.id)}>
                      <Td>
                        <button type="button" className="font-medium text-ink hover:text-teal-700" onClick={(e) => { e.stopPropagation(); setOpenId(inv.id); }}>
                          {inv.invoice_number}
                        </button>
                        <p className="max-w-[18rem] truncate text-xs text-slatey">{inv.description || inv.service_name || "—"}</p>
                      </Td>
                      <Td>
                        <Link to={`/admin/vendors/${inv.vendor_id}`} onClick={(e) => e.stopPropagation()} className="text-ink hover:text-teal-700">
                          {vendorName(inv.vendor_id)}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap text-slatey">{formatDate(inv.submitted_at)}</Td>
                      <Td className="whitespace-nowrap">
                        <span className={cx(overdue ? "font-medium text-red-600" : "text-slatey")}>{formatDay(inv.due_date)}</span>
                        {overdue && <Badge tone="danger" dot={false} className="ml-2">Overdue</Badge>}
                      </Td>
                      <Td align="right" className="whitespace-nowrap font-medium tabular-nums text-ink">{formatCurrency(inv.amount, currency)}</Td>
                      <Td><StatusBadge status={inv.status} /></Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <ul className="divide-y divide-black/[0.05] md:hidden">
              {visible.map((inv) => (
                <li key={inv.id}>
                  <button type="button" onClick={() => setOpenId(inv.id)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{inv.invoice_number}</p>
                      <p className="truncate text-xs text-slatey">{vendorName(inv.vendor_id)}</p>
                      <p className={cx("mt-0.5 text-xs", isOverdue(inv) ? "font-medium text-red-600" : "text-slatey")}>
                        {isOverdue(inv) ? "Overdue · " : "Due "}
                        {formatDay(inv.due_date)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium tabular-nums text-ink">{formatCurrency(inv.amount, currency)}</p>
                      <StatusBadge status={inv.status} className="mt-1" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-black/[0.06] px-5 py-3 text-xs text-slatey">
              {visible.length} invoice{visible.length === 1 ? "" : "s"} · {formatCurrency(visible.reduce((t, i) => t + i.amount, 0), currency)}
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}
