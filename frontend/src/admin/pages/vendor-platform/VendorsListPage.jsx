import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { LuBan, LuCircleCheck, LuClock, LuFileClock, LuPlus, LuReceipt, LuTrash2, LuUser, LuUsers } from "react-icons/lu";
import { adminApi } from "../../lib/adminApi.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";
import { useCanManage } from "../../lib/useCanManage.js";
import { formatDate } from "../../lib/format.js";
import { Alert, Avatar, Button, EmptyState, ListSkeleton, Menu, PageHeader, Panel, SearchInput, Select, StatCard, Table, Tabs, Td, Th } from "../../components/ui.jsx";
import { AWAITING_REVIEW, BUSINESS_TYPES, StatusBadge, VENDOR_STATUSES, isExpiringSoon, useStatusChange } from "./shared.jsx";

function matches(v, term) {
  if (!term) return true;
  return [v.company_name, v.email, v.vendor_code, `${v.first_name || ""} ${v.last_name || ""}`, v.products_services].some((f) => (f || "").toLowerCase().includes(term));
}

export default function VendorsListPage() {
  const [vendors, setVendors] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const businessType = params.get("type") || "";
  const navigate = useNavigate();
  const canManage = useCanManage();
  const { ask, dialogs } = useStatusChange();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  }

  function load() {
    adminApi.get("/api/vendor-platform/vendors").then(setVendors).catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    adminApi.get("/api/vendor-platform/invoices").then(setInvoices).catch(() => setInvoices([]));
    adminApi.get("/api/vendor-platform/documents").then(setDocuments).catch(() => setDocuments([]));
  }, []);

  const counts = useMemo(() => {
    const c = { "": vendors?.length || 0 };
    VENDOR_STATUSES.forEach((s) => (c[s] = vendors?.filter((v) => v.status === s).length || 0));
    return c;
  }, [vendors]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (vendors || []).filter((v) => (!status || v.status === status) && (!businessType || v.business_type === businessType) && matches(v, term));
  }, [vendors, status, businessType, search]);

  const invoicesToReview = invoices?.filter((i) => AWAITING_REVIEW.includes(i.status)).length;
  const docsToReview = documents?.filter((d) => d.status === "Pending Review").length;
  const docsExpiring = documents?.filter(isExpiringSoon).length;

  async function changeStatus(vendor, to) {
    const answer = await ask({ noun: "vendor", name: vendor.company_name, to });
    if (!answer) return;
    try {
      const updated = await adminApi.put(`/api/vendor-platform/vendors/${vendor.id}/status`, { status: to, rejection_reason: answer.reason });
      setVendors((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      toast.success(`${vendor.company_name} is now ${to}.`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(vendor) {
    const ok = await confirm({
      title: `Delete ${vendor.company_name}?`,
      message: "This permanently removes the vendor along with all of their invoices, documents, notifications and notes. It can't be undone — consider marking them Inactive instead.",
      confirmLabel: "Delete vendor",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/vendor-platform/vendors/${vendor.id}`);
      setVendors((prev) => prev.filter((v) => v.id !== vendor.id));
      toast.success("Vendor deleted.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  function rowMenu(v) {
    return [
      { label: "View profile", icon: LuUser, onClick: () => navigate(`/admin/vendors/${v.id}`) },
      canManage && v.status !== "Approved" && { label: "Approve", icon: LuCircleCheck, onClick: () => changeStatus(v, "Approved") },
      canManage && v.status !== "Rejected" && { label: "Reject", icon: LuBan, onClick: () => changeStatus(v, "Rejected") },
      canManage && v.status === "Approved" && { label: "Mark inactive", icon: LuClock, onClick: () => changeStatus(v, "Inactive") },
      canManage && { divider: true },
      canManage && { label: "Delete vendor", icon: LuTrash2, danger: true, onClick: () => handleDelete(v) },
    ];
  }

  const filtersActive = !!(search || businessType);

  return (
    <div>
      {dialogs}
      {confirmDialog}
      <PageHeader
        title="Vendors"
        description="Review registrations, manage vendor accounts and keep compliance up to date."
        actions={canManage && <Button variant="primary" icon={LuPlus} to="/admin/vendors/add">Add vendor</Button>}
      />

      <section aria-label="Needs attention" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Awaiting approval"
          value={vendors ? counts["Pending Review"] : "–"}
          hint="New vendor registrations"
          icon={LuUsers}
          tone={counts["Pending Review"] ? "warning" : undefined}
          onClick={() => setParam("status", "Pending Review")}
          active={status === "Pending Review"}
        />
        <StatCard
          label="Invoices to review"
          value={invoices ? invoicesToReview : "–"}
          hint="Submitted or under review"
          icon={LuReceipt}
          tone={invoicesToReview ? "warning" : undefined}
          to="/admin/invoices?status=review"
        />
        <StatCard
          label="Documents to review"
          value={documents ? docsToReview : "–"}
          hint="Pending compliance checks"
          icon={LuFileClock}
          tone={docsToReview ? "warning" : undefined}
          to="/admin/documents?status=Pending+Review"
        />
        <StatCard
          label="Expiring documents"
          value={documents ? docsExpiring : "–"}
          hint="Expired or within 30 days"
          icon={LuClock}
          tone={docsExpiring ? "danger" : undefined}
          to="/admin/documents?status=expiring"
        />
      </section>

      {error && <Alert tone="danger" title="Vendors couldn't be loaded" className="mb-4">{error}</Alert>}

      <Panel padded={false}>
        <div className="border-b border-black/[0.06] px-5 pt-2">
          <Tabs
            value={status}
            onChange={(v) => setParam("status", v)}
            items={[{ value: "", label: "All", count: counts[""] }, ...VENDOR_STATUSES.map((s) => ({ value: s, label: s, count: counts[s] }))]}
          />
        </div>
        <div className="flex flex-col gap-3 border-b border-black/[0.06] px-5 py-3 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, code or products…" className="flex-1" />
          <Select value={businessType} onChange={(e) => setParam("type", e.target.value)} className="sm:w-52" aria-label="Business type">
            <option value="">All business types</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>

        {!vendors && !error && <ListSkeleton />}
        {vendors && vendors.length === 0 && (
          <EmptyState
            icon={LuUsers}
            title="No vendors yet"
            description="Vendors appear here when they register through the vendor portal, or when you add one directly."
            action={canManage && <Button variant="primary" icon={LuPlus} to="/admin/vendors/add">Add a vendor</Button>}
          />
        )}
        {vendors && vendors.length > 0 && visible.length === 0 && (
          <EmptyState
            compact
            icon={LuUsers}
            title={status && !filtersActive ? `No ${status.toLowerCase()} vendors` : "No vendors match"}
            description={filtersActive ? "Try a different search or business type." : "Nothing to do here right now."}
            action={
              filtersActive && (
                <Button size="sm" onClick={() => { setSearch(""); setParam("type", ""); }}>
                  Clear filters
                </Button>
              )
            }
          />
        )}

        {visible.length > 0 && (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th>Vendor</Th>
                  <Th>Contact</Th>
                  <Th>Type</Th>
                  <Th>Registered</Th>
                  <Th>Status</Th>
                  <Th align="right"><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {visible.map((v) => (
                  <tr key={v.id} className="group cursor-pointer transition hover:bg-mist/60" onClick={() => navigate(`/admin/vendors/${v.id}`)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={v.company_name} />
                        <div className="min-w-0">
                          <Link to={`/admin/vendors/${v.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-ink group-hover:text-teal-700">
                            {v.company_name}
                          </Link>
                          <p className="font-mono text-[11px] text-slatey">{v.vendor_code}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-ink">{[v.first_name, v.last_name].filter(Boolean).join(" ") || "—"}</p>
                      <p className="text-xs text-slatey">{v.email || "No email"}</p>
                    </Td>
                    <Td className="text-slatey">{v.business_type || "—"}</Td>
                    <Td className="whitespace-nowrap">
                      <p className="text-ink">{formatDate(v.submitted_at)}</p>
                      <p className="text-xs text-slatey">{v.self_registered ? "Self-registered" : "Added by admin"}</p>
                    </Td>
                    <Td><StatusBadge status={v.status} /></Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {canManage && v.status === "Pending Review" && (
                          <Button size="sm" variant="secondary" icon={LuCircleCheck} onClick={() => changeStatus(v, "Approved")}>
                            Approve
                          </Button>
                        )}
                        <Menu items={rowMenu(v)} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ul className="divide-y divide-black/[0.05] md:hidden">
              {visible.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <Link to={`/admin/vendors/${v.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={v.company_name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{v.company_name}</p>
                      <p className="truncate text-xs text-slatey">{v.business_type || v.vendor_code}</p>
                      <StatusBadge status={v.status} className="mt-1" />
                    </div>
                  </Link>
                  <Menu items={rowMenu(v)} />
                </li>
              ))}
            </ul>
            <p className="border-t border-black/[0.06] px-5 py-3 text-xs text-slatey">
              Showing {visible.length} of {vendors.length} vendor{vendors.length === 1 ? "" : "s"}
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}
