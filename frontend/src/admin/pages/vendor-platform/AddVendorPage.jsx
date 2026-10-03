import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi } from "../../lib/adminApi.js";
import { Button, Field, Input, PageHeader, Select, Textarea } from "../../components/ui.jsx";
import { BUSINESS_TYPES } from "./shared.jsx";

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
  street_address2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
};

function Section({ title, description, children }) {
  return (
    <section className="grid gap-4 border-b border-black/[0.07] py-8 first:pt-0 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-body text-sm font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-slatey">{description}</p>
      </div>
      <div className="rounded-xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(10,31,60,0.04)]">{children}</div>
    </section>
  );
}

function validate(form) {
  const errors = {};
  if (!form.company_name.trim()) errors.company_name = "Company name is required.";
  if (!form.products_services.trim()) errors.products_services = "Describe what this vendor supplies.";
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address.";
  return errors;
}

export default function AddVendorPage() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById("add-vendor-form")?.querySelector("[aria-invalid=true]")?.focus();
      return;
    }
    setSaving(true);
    try {
      const vendor = await adminApi.post("/api/vendor-platform/vendors", form);
      toast.success(`${vendor.company_name} added — vendor code ${vendor.vendor_code}.`);
      navigate(`/admin/vendors/${vendor.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="add-vendor-form" onSubmit={handleSubmit} noValidate className="pb-24">
      <PageHeader
        back={{ to: "/admin/vendors", label: "Vendors" }}
        title="Add vendor"
        description="Register a vendor directly. They start in Pending Review and get a vendor code automatically, so you can approve them once their documents are in."
      />

      <Section title="Company" description="Who the vendor is and what they supply.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" required error={errors.company_name}>
            {(a) => <Input {...a} value={form.company_name} onChange={set("company_name")} autoFocus />}
          </Field>
          <Field label="Business type">
            {(a) => (
              <Select {...a} value={form.business_type} onChange={set("business_type")}>
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Products / services" required error={errors.products_services} className="sm:col-span-2">
            {(a) => <Textarea {...a} rows={3} value={form.products_services} onChange={set("products_services")} placeholder="e.g. Gas turbine maintenance and overhaul" />}
          </Field>
          <Field label="Website" optional className="sm:col-span-2">
            {(a) => <Input {...a} value={form.website} onChange={set("website")} placeholder="https://" />}
          </Field>
        </div>
      </Section>

      <Section title="Primary contact" description="The person who receives portal notifications and emails.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">{(a) => <Input {...a} value={form.first_name} onChange={set("first_name")} autoComplete="off" />}</Field>
          <Field label="Last name">{(a) => <Input {...a} value={form.last_name} onChange={set("last_name")} autoComplete="off" />}</Field>
          <Field label="Email" error={errors.email} hint="Needed for email notifications and password resets.">
            {(a) => <Input {...a} type="email" value={form.email} onChange={set("email")} autoComplete="off" />}
          </Field>
          <Field label="Phone">{(a) => <Input {...a} type="tel" value={form.phone} onChange={set("phone")} autoComplete="off" />}</Field>
        </div>
      </Section>

      <Section title="Address" description="Registered business address.">
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="Street address" className="sm:col-span-6">{(a) => <Input {...a} value={form.street_address} onChange={set("street_address")} />}</Field>
          <Field label="Address line 2" optional className="sm:col-span-6">{(a) => <Input {...a} value={form.street_address2} onChange={set("street_address2")} />}</Field>
          <Field label="City" className="sm:col-span-2">{(a) => <Input {...a} value={form.city} onChange={set("city")} />}</Field>
          <Field label="Region / state" className="sm:col-span-2">{(a) => <Input {...a} value={form.region} onChange={set("region")} />}</Field>
          <Field label="Postal code" className="sm:col-span-2">{(a) => <Input {...a} value={form.postal_code} onChange={set("postal_code")} />}</Field>
          <Field label="Country" className="sm:col-span-3">{(a) => <Input {...a} value={form.country} onChange={set("country")} />}</Field>
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <Button variant="ghost" to="/admin/vendors">Cancel</Button>
          <Button type="submit" variant="primary" loading={saving}>Create vendor</Button>
        </div>
      </div>
    </form>
  );
}
