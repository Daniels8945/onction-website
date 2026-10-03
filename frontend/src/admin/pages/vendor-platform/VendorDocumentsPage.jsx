import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuFolderOpen, LuUpload } from "react-icons/lu";
import { adminApi } from "../../lib/adminApi.js";
import { useCanManage } from "../../lib/useCanManage.js";
import { Alert, Button, EmptyState, ListSkeleton, PageHeader, Panel, SearchInput, Select, Tabs } from "../../components/ui.jsx";
import { DocumentTable, DocumentUploadModal, EXPIRY_WINDOW_DAYS, isExpiringSoon } from "./shared.jsx";

const TABS = [
  { value: "Pending Review", label: "To review", test: (d) => d.status === "Pending Review" },
  { value: "expiring", label: "Expiring", test: isExpiringSoon },
  { value: "Approved", label: "Approved", test: (d) => d.status === "Approved" },
  { value: "Rejected", label: "Rejected", test: (d) => d.status === "Rejected" },
  { value: "all", label: "All", test: () => true },
];

export default function VendorDocumentsPage() {
  const canManage = useCanManage();
  const [documents, setDocuments] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = params.get("status") || "Pending Review";
  const vendorFilter = params.get("vendor") || "";

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  }

  useEffect(() => {
    adminApi.get("/api/vendor-platform/documents").then(setDocuments).catch((err) => setError(err.message));
    adminApi.get("/api/vendor-platform/vendors").then(setVendors).catch(() => {});
  }, []);

  const vendorName = (id) => vendors.find((v) => v.id === id)?.company_name || `Vendor #${id}`;

  const scoped = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (documents || []).filter(
      (d) =>
        (!vendorFilter || String(d.vendor_id) === vendorFilter) &&
        (!term || [d.document_name, d.document_type, vendorName(d.vendor_id)].some((f) => (f || "").toLowerCase().includes(term)))
    );
  }, [documents, vendorFilter, search, vendors]);

  const activeTab = TABS.find((t) => t.value === tab) || TABS[0];
  const visible = scoped.filter(activeTab.test);
  // Soonest expiry first on the Expiring tab — that's the order to act in.
  if (activeTab.value === "expiring") visible.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

  const emptyCopy = {
    "Pending Review": ["Nothing to review", "New documents from vendors will appear here."],
    expiring: ["No documents expiring", `Nothing has expired or expires in the next ${EXPIRY_WINDOW_DAYS} days.`],
  }[activeTab.value] || ["No documents here", "Try another tab, vendor or search."];

  return (
    <div>
      {uploading && (
        <DocumentUploadModal
          vendors={vendors}
          onClose={() => setUploading(false)}
          onUploaded={(doc) => {
            setDocuments((prev) => [doc, ...(prev || [])]);
            setUploading(false);
          }}
        />
      )}

      <PageHeader
        title="Documents"
        description="Review vendor compliance documents and keep an eye on expiry dates."
        actions={canManage && <Button variant="primary" icon={LuUpload} onClick={() => setUploading(true)}>Upload document</Button>}
      />

      {error && <Alert tone="danger" title="Documents couldn't be loaded" className="mb-4">{error}</Alert>}

      <Panel padded={false}>
        <div className="border-b border-black/[0.06] px-5 pt-2">
          <Tabs value={activeTab.value} onChange={(v) => setParam("status", v)} items={TABS.map((t) => ({ value: t.value, label: t.label, count: scoped.filter(t.test).length }))} />
        </div>
        <div className="flex flex-col gap-3 border-b border-black/[0.06] px-5 py-3 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search document, type or vendor…" className="flex-1" />
          <Select value={vendorFilter} onChange={(e) => setParam("vendor", e.target.value)} className="sm:w-60" aria-label="Vendor">
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.company_name}</option>
            ))}
          </Select>
        </div>

        {!documents && !error && <ListSkeleton />}
        {documents && (
          <DocumentTable
            documents={visible}
            vendorName={vendorName}
            canManage={canManage}
            onChanged={(doc) => setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)))}
            onDeleted={(doc) => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
            emptyState={
              documents.length === 0 ? (
                <EmptyState icon={LuFolderOpen} title="No documents yet" description="Compliance documents uploaded by vendors — registrations, tax clearance, insurance — will appear here." />
              ) : (
                <EmptyState compact icon={LuFolderOpen} title={emptyCopy[0]} description={emptyCopy[1]} />
              )
            }
          />
        )}
      </Panel>
    </div>
  );
}
