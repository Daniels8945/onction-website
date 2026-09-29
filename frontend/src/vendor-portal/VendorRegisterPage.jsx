import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { vendorApi } from "./lib/vendorApi.js";

const BUSINESS_TYPES = ["Manufacturer", "Distributor", "Service Provider"];
const EMPTY = {
  company_name: "", business_type: "Manufacturer", products_services: "", website: "",
  first_name: "", last_name: "", email: "", phone: "",
  street_address: "", city: "", region: "", postal_code: "", country: "",
};
const inputClass = "w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slatey">{label}</label>
      {children}
    </div>
  );
}

export default function VendorRegisterPage() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const navigate = useNavigate();

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const vendor = await vendorApi.post("/api/vendor-platform/auth/register", form);
      setCreated(vendor);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist px-4">
        <div className="card w-full max-w-md text-center">
          <p className="eyebrow mb-2">Registration received</p>
          <h1 className="mb-4 font-syne text-xl font-semibold text-ink">Save your vendor code</h1>
          <p className="mb-4 border border-black/10 bg-mist px-4 py-3 font-mono text-lg text-ink">{created.vendor_code}</p>
          <p className="mb-6 text-sm text-slatey">
            You'll need this code to log in. Your account is <strong>Pending Review</strong> — you'll be able to submit
            invoices once an admin approves it.
          </p>
          <button onClick={() => navigate("/login")} className="btn-primary w-full">Go to sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow mb-2">Onction Energy</p>
        <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Vendor registration</h1>
        <p className="mb-6 text-sm text-slatey">Register your company to submit invoices and manage compliance documents.</p>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <p className="eyebrow">Company</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company name *"><input required value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className={inputClass} /></Field>
            <Field label="Business type">
              <select value={form.business_type} onChange={(e) => set("business_type", e.target.value)} className={inputClass}>
                {BUSINESS_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </Field>
          </div>
          <Field label="Products / services *"><textarea required rows={2} value={form.products_services} onChange={(e) => set("products_services", e.target.value)} className={inputClass} /></Field>
          <Field label="Website"><input value={form.website} onChange={(e) => set("website", e.target.value)} className={inputClass} /></Field>

          <p className="eyebrow pt-2">Contact</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className={inputClass} /></Field>
            <Field label="Last name"><input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className={inputClass} /></Field>
            <Field label="Email *"><input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} /></Field>
          </div>

          <p className="eyebrow pt-2">Address</p>
          <Field label="Street address"><input value={form.street_address} onChange={(e) => set("street_address", e.target.value)} className={inputClass} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City"><input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} /></Field>
            <Field label="Region / State"><input value={form.region} onChange={(e) => set("region", e.target.value)} className={inputClass} /></Field>
            <Field label="Postal code"><input value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} className={inputClass} /></Field>
          </div>
          <Field label="Country"><input value={form.country} onChange={(e) => set("country", e.target.value)} className={inputClass} /></Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting ? "Submitting…" : "Register"}
            </button>
            <Link to="/login" className="text-xs font-medium text-slatey hover:text-ink">Already registered? Sign in →</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
