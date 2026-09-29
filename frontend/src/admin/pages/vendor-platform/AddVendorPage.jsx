import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi } from "../../lib/adminApi.js";

const BUSINESS_TYPES = ["Manufacturer", "Distributor", "Service Provider"];

const EMPTY = {
  company_name: "",
  business_type: "Manufacturer",
  products_services: "",
  website: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  street_address: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
};

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slatey">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500";

export default function AddVendorPage() {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const vendor = await adminApi.post("/api/vendor-platform/vendors", form);
      toast.success(`${vendor.company_name} created — code ${vendor.vendor_code}`);
      navigate(`/admin/vendors/${vendor.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link to="/admin/vendors" className="mb-4 inline-block text-xs font-medium text-slatey hover:text-ink">
        ← All vendors
      </Link>
      <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Add vendor</h1>
      <p className="mb-6 text-sm text-slatey">A vendor code is generated automatically once created.</p>

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <p className="eyebrow">Company</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company name *">
            <input required value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Business type">
            <select value={form.business_type} onChange={(e) => set("business_type", e.target.value)} className={inputClass}>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Products / services *">
          <textarea required rows={2} value={form.products_services} onChange={(e) => set("products_services", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Website">
          <input value={form.website} onChange={(e) => set("website", e.target.value)} className={inputClass} />
        </Field>

        <p className="eyebrow pt-2">Contact</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Last name">
            <input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
          </Field>
        </div>

        <p className="eyebrow pt-2">Address</p>
        <Field label="Street address">
          <input value={form.street_address} onChange={(e) => set("street_address", e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City">
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Region / State">
            <input value={form.region} onChange={(e) => set("region", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Postal code">
            <input value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Country">
          <input value={form.country} onChange={(e) => set("country", e.target.value)} className={inputClass} />
        </Field>

        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? "Creating…" : "Create vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}
