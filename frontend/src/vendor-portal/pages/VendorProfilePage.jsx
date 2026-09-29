import { useState } from "react";
import toast from "react-hot-toast";
import { vendorApi } from "../lib/vendorApi.js";
import { useVendorAuth } from "../VendorAuthContext.jsx";

const inputClass = "w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slatey">{label}</label>
      {children}
    </div>
  );
}

export default function VendorProfilePage() {
  const { vendor, refresh } = useVendorAuth();
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [pwSaving, setPwSaving] = useState(false);

  async function handleSetPassword(e) {
    e.preventDefault();
    setPwSaving(true);
    try {
      await vendorApi.post("/api/vendor-platform/auth/set-password", pw);
      setPw({ current_password: "", new_password: "" });
      await refresh();
      toast.success(vendor.has_password ? "Password changed." : "Password set.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Profile</h1>
      <p className="mb-6 text-sm text-slatey">{vendor.vendor_code}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <p className="eyebrow">Company details</p>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs text-slatey">Company name</dt><dd className="text-ink">{vendor.company_name}</dd></div>
            <div><dt className="text-xs text-slatey">Business type</dt><dd className="text-ink">{vendor.business_type || "—"}</dd></div>
            <div><dt className="text-xs text-slatey">Products / services</dt><dd className="text-ink">{vendor.products_services || "—"}</dd></div>
            <div><dt className="text-xs text-slatey">Contact</dt><dd className="text-ink">{[vendor.first_name, vendor.last_name].filter(Boolean).join(" ") || "—"}</dd></div>
            <div><dt className="text-xs text-slatey">Email</dt><dd className="text-ink">{vendor.email || "—"}</dd></div>
            <div><dt className="text-xs text-slatey">Phone</dt><dd className="text-ink">{vendor.phone || "—"}</dd></div>
            <div><dt className="text-xs text-slatey">Address</dt><dd className="text-ink">{[vendor.street_address, vendor.city, vendor.region, vendor.postal_code, vendor.country].filter(Boolean).join(", ") || "—"}</dd></div>
          </dl>
          <p className="text-xs text-slatey">To change your company details, contact support at the email shown on the platform settings.</p>
        </div>

        <div className="card">
          <p className="eyebrow mb-4">{vendor.has_password ? "Change password" : "Set a password"}</p>
          <form onSubmit={handleSetPassword} className="space-y-3">
            {vendor.has_password && (
              <Field label="Current password">
                <input type="password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} className={inputClass} />
              </Field>
            )}
            <Field label="New password">
              <input type="password" required minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} className={inputClass} />
            </Field>
            <button type="submit" disabled={pwSaving} className="btn-primary disabled:opacity-60">
              {pwSaving ? "Saving…" : vendor.has_password ? "Change password" : "Set password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
