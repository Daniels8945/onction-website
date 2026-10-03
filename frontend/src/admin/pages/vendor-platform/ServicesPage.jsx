import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { LuPencil, LuPlus, LuTrash2, LuWrench } from "react-icons/lu";
import { adminApi } from "../../lib/adminApi.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";
import { useCanManage } from "../../lib/useCanManage.js";
import { useCurrency } from "../../lib/usePlatformSettings.js";
import { formatCurrency } from "../../../lib/vendorPlatform.js";
import { Alert, Button, EmptyState, Field, Input, ListSkeleton, Menu, Modal, PageHeader, Panel, SearchInput, Select, Switch, Table, Td, Textarea, Th } from "../../components/ui.jsx";

const CATEGORIES = ["IT & Software", "Logistics", "Manufacturing", "Consulting", "Maintenance", "Supply", "Other"];
const EMPTY = { name: "", category: CATEGORIES[0], unit: "", unit_price: "", description: "" };

function ServiceModal({ service, currency, onClose, onSaved }) {
  const [form, setForm] = useState(
    service
      ? { name: service.name, category: service.category || CATEGORIES[0], unit: service.unit || "", unit_price: service.unit_price, description: service.description || "" }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, name: form.name.trim(), unit_price: Number(form.unit_price) || 0 };
    try {
      const saved = service
        ? await adminApi.put(`/api/vendor-platform/services/${service.id}`, payload)
        : await adminApi.post("/api/vendor-platform/services", payload);
      toast.success(service ? "Service updated." : "Service added to the catalogue.");
      onSaved(saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={service ? "Edit service" : "Add service"}
      description="Vendors pick from active services when they submit invoices."
      onClose={onClose}
      as="form"
      formProps={{ onSubmit: submit }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving}>{service ? "Save changes" : "Add service"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service name" required className="sm:col-span-2">
          {(a) => <Input {...a} required value={form.name} onChange={set("name")} placeholder="e.g. Turbine inspection" />}
        </Field>
        <Field label="Category">
          {(a) => (
            <Select {...a} value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Unit" optional>
          {(a) => <Input {...a} value={form.unit} onChange={set("unit")} placeholder="e.g. per hour" />}
        </Field>
        <Field label={`Unit price (${currency})`}>
          {(a) => <Input {...a} type="number" min="0" step="0.01" inputMode="decimal" value={form.unit_price} onChange={set("unit_price")} />}
        </Field>
        <Field label="Description" optional className="sm:col-span-2">
          {(a) => <Textarea {...a} rows={3} value={form.description} onChange={set("description")} />}
        </Field>
      </div>
    </Modal>
  );
}

export default function ServicesPage() {
  const currency = useCurrency();
  const canManage = useCanManage();
  const [services, setServices] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | service
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    adminApi.get("/api/vendor-platform/services").then(setServices).catch((err) => setError(err.message));
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (services || []).filter(
      (s) => (!category || s.category === category) && (!term || [s.name, s.description, s.category].some((f) => (f || "").toLowerCase().includes(term)))
    );
  }, [services, search, category]);

  function upsert(saved) {
    setServices((prev) => (prev.some((s) => s.id === saved.id) ? prev.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...prev]));
  }

  async function toggleActive(service) {
    // Optimistic — flip immediately, roll back on failure.
    upsert({ ...service, active: !service.active });
    try {
      upsert(await adminApi.put(`/api/vendor-platform/services/${service.id}`, { active: !service.active }));
    } catch (err) {
      upsert(service);
      toast.error(err.message);
    }
  }

  async function handleDelete(service) {
    const ok = await confirm({
      title: `Delete “${service.name}”?`,
      message: "It's removed from the catalogue. To keep it on record but hide it from vendors, turn it off instead.",
      confirmLabel: "Delete service",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/vendor-platform/services/${service.id}`);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      toast.success("Service deleted.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  const activeCount = services?.filter((s) => s.active).length || 0;

  return (
    <div>
      {confirmDialog}
      {editing && (
        <ServiceModal
          service={editing === "new" ? null : editing}
          currency={currency}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            upsert(saved);
            setEditing(null);
          }}
        />
      )}
      <PageHeader
        title="Services"
        description="The catalogue vendors reference when they submit invoices."
        meta={services && <span className="text-xs text-slatey">{activeCount} of {services.length} active</span>}
        actions={canManage && <Button variant="primary" icon={LuPlus} onClick={() => setEditing("new")}>Add service</Button>}
      />

      {error && <Alert tone="danger" title="Services couldn't be loaded" className="mb-4">{error}</Alert>}

      <Panel padded={false}>
        <div className="flex flex-col gap-3 border-b border-black/[0.06] px-5 py-3 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search services…" className="flex-1" />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-52" aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>

        {!services && !error && <ListSkeleton rows={4} />}
        {services && services.length === 0 && (
          <EmptyState
            icon={LuWrench}
            title="No services yet"
            description="Build a catalogue of the services and supplies you buy so vendors can reference them on invoices."
            action={canManage && <Button variant="primary" icon={LuPlus} onClick={() => setEditing("new")}>Add first service</Button>}
          />
        )}
        {services && services.length > 0 && visible.length === 0 && <EmptyState compact icon={LuWrench} title="No services match" description="Try a different search or category." />}

        {visible.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Service</Th>
                <Th className="hidden md:table-cell">Category</Th>
                <Th align="right">Unit price</Th>
                <Th>Available</Th>
                <Th align="right"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {visible.map((s) => (
                <tr key={s.id} className="transition hover:bg-mist/60">
                  <Td>
                    <p className="font-medium text-ink">{s.name}</p>
                    <p className="max-w-md truncate text-xs text-slatey">{s.description || <span className="md:hidden">{s.category}</span>}</p>
                  </Td>
                  <Td className="hidden text-slatey md:table-cell">{s.category || "—"}</Td>
                  <Td align="right" className="whitespace-nowrap tabular-nums text-ink">
                    {formatCurrency(s.unit_price, currency)}
                    {s.unit && <span className="text-xs text-slatey"> / {s.unit.replace(/^per\s+/i, "")}</span>}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Switch checked={s.active} onChange={() => toggleActive(s)} disabled={!canManage} ariaLabel={`${s.name} available to vendors`} />
                      <span className="hidden text-xs text-slatey sm:inline">{s.active ? "Active" : "Hidden"}</span>
                    </div>
                  </Td>
                  <Td align="right">
                    {canManage && (
                      <Menu
                        items={[
                          { label: "Edit", icon: LuPencil, onClick: () => setEditing(s) },
                          { divider: true },
                          { label: "Delete", icon: LuTrash2, danger: true, onClick: () => handleDelete(s) },
                        ]}
                      />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
