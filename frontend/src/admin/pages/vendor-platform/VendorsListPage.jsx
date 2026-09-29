import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi } from "../../lib/adminApi.js";
import { usePromptDialog } from "../../hooks/usePromptDialog.jsx";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";
import { statusStyle } from "../../../lib/vendorPlatform.js";

const STATUSES = ["Pending Review", "Approved", "Rejected", "Inactive"];
const BUSINESS_TYPES = ["Manufacturer", "Distributor", "Service Provider"];

export default function VendorsListPage() {
  const [vendors, setVendors] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (businessType) params.set("business_type", businessType);
    if (search) params.set("search", search);
    adminApi.get(`/api/vendor-platform/vendors?${params}`).then(setVendors).catch((err) => setError(err.message));
  }

  useEffect(load, [status, businessType, search]);

  async function handleStatusChange(vendor, newStatus) {
    let rejection_reason;
    if (newStatus === "Rejected") {
      rejection_reason = await prompt({ title: "Reason for rejection", label: "This will be shown to the vendor", placeholder: "e.g. Incomplete documentation" });
      if (!rejection_reason) return;
    }
    try {
      await adminApi.put(`/api/vendor-platform/vendors/${vendor.id}/status`, { status: newStatus, rejection_reason });
      toast.success(`${vendor.company_name} is now ${newStatus}.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(vendor) {
    const ok = await confirm({
      title: `Delete ${vendor.company_name}?`,
      message: "This permanently removes the vendor and all their invoices, documents, and notes.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/vendor-platform/vendors/${vendor.id}`);
      toast.success("Vendor deleted.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      {promptDialog}
      {confirmDialog}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Vendors</h1>
          <p className="text-sm text-slatey">Registered vendors, self-registered or added directly.</p>
        </div>
        <button onClick={() => navigate("/admin/vendors/add")} className="btn-primary">
          + Add vendor
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, email, code…"
          className="min-w-[220px] border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500">
          <option value="">All types</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!vendors && !error && <p className="text-sm text-slatey">Loading…</p>}
      {vendors && vendors.length === 0 && <div className="card text-sm text-slatey">No vendors match these filters.</div>}

      {vendors && vendors.length > 0 && (
        <div className="overflow-x-auto border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-t border-black/5 hover:bg-mist">
                  <td className="px-4 py-3 font-medium text-ink">
                    <Link to={`/admin/vendors/${v.id}`} className="hover:text-teal-600">{v.company_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slatey">{v.vendor_code}</td>
                  <td className="px-4 py-3 text-slatey">{v.business_type || "—"}</td>
                  <td className="px-4 py-3 text-slatey">
                    <div>{[v.first_name, v.last_name].filter(Boolean).join(" ") || "—"}</div>
                    <div className="text-xs">{v.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={v.status}
                      onChange={(e) => handleStatusChange(v, e.target.value)}
                      className={`border-0 px-2 py-0.5 text-xs font-medium outline-none ${statusStyle(v.status)}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(v)} className="text-xs font-medium text-red-600 hover:text-red-700">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
