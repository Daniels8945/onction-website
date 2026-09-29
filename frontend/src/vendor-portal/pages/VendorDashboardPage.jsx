import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { vendorApi } from "../lib/vendorApi.js";
import { useVendorAuth } from "../VendorAuthContext.jsx";
import { formatCurrency, statusStyle } from "../../lib/vendorPlatform.js";

const STATUS_MESSAGE = {
  "Pending Review": "Your registration is awaiting review. You can browse the portal, but can't submit invoices until you're approved.",
  Approved: "Your account is approved.",
  Rejected: "Your registration was rejected.",
  Inactive: "Your account is inactive — please contact support.",
};

export default function VendorDashboardPage() {
  const { vendor } = useVendorAuth();
  const [invoices, setInvoices] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    vendorApi.get("/api/vendor-platform/invoices").then(setInvoices).catch(() => {});
    vendorApi.get("/api/vendor-platform/documents").then(setDocuments).catch(() => {});
    vendorApi.get("/api/vendor-platform/settings").then(setSettings).catch(() => {});
  }, []);

  const currency = settings?.currency || "NGN";
  const totalInvoiced = invoices?.reduce((sum, i) => sum + i.amount, 0) || 0;
  const totalPaid = invoices?.filter((i) => i.status === "Paid").reduce((sum, i) => sum + i.amount, 0) || 0;
  const pendingCount = invoices?.filter((i) => !["Paid", "Rejected"].includes(i.status)).length || 0;
  const expiringDocs = documents?.filter((d) => d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 30 * 86400000)) || [];

  return (
    <div>
      <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Welcome, {vendor?.company_name}</h1>
      <p className="mb-6 text-sm text-slatey">{vendor?.vendor_code}</p>

      {vendor?.status && STATUS_MESSAGE[vendor.status] && (
        <div className={`mb-6 border px-4 py-3 text-sm ${vendor.status === "Approved" ? "border-teal-200 bg-teal-50 text-teal-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {STATUS_MESSAGE[vendor.status]}
          {vendor.status === "Rejected" && vendor.rejection_reason && <p className="mt-1 font-medium">{vendor.rejection_reason}</p>}
        </div>
      )}

      {expiringDocs.length > 0 && (
        <div className="mb-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {expiringDocs.length} document{expiringDocs.length > 1 ? "s" : ""} expiring soon or already expired.{" "}
          <Link to="/documents" className="font-medium underline">Review →</Link>
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="card">
          <p className="eyebrow mb-1">Total invoiced</p>
          <p className="font-syne text-xl font-semibold text-ink">{formatCurrency(totalInvoiced, currency)}</p>
        </div>
        <div className="card">
          <p className="eyebrow mb-1">Total paid</p>
          <p className="font-syne text-xl font-semibold text-ink">{formatCurrency(totalPaid, currency)}</p>
        </div>
        <div className="card">
          <p className="eyebrow mb-1">Pending review</p>
          <p className="font-syne text-xl font-semibold text-ink">{pendingCount}</p>
        </div>
      </div>

      <div className="mb-6 flex gap-3">
        <Link to="/invoices" className="btn-primary">Submit invoice</Link>
        <Link to="/documents" className="btn-ghost !text-ink !border-black/20 hover:!border-teal-500">Upload document</Link>
      </div>

      <div className="card">
        <p className="eyebrow mb-4">Recent invoices</p>
        {!invoices && <p className="text-sm text-slatey">Loading…</p>}
        {invoices && invoices.length === 0 && <p className="text-sm text-slatey">No invoices yet.</p>}
        {invoices && invoices.length > 0 && (
          <ul className="divide-y divide-black/5">
            {invoices.slice(0, 3).map((inv) => (
              <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
                <p className="font-medium text-ink">{inv.invoice_number}</p>
                <div className="flex items-center gap-3">
                  <span>{formatCurrency(inv.amount, currency)}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium ${statusStyle(inv.status)}`}>{inv.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
