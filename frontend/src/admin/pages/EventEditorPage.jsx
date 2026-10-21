import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { LuDownload, LuExternalLink, LuEye, LuEyeOff, LuSave, LuSend, LuTrash2 } from "react-icons/lu";
import { adminApi, API_BASE, getToken } from "../lib/adminApi.js";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";
import { useCanManage } from "../lib/useCanManage.js";
import { SLUG_PATTERN, STATUS_LABEL, STATUS_TONE, openPreview } from "../lib/publishing.js";
import { formatDateTime, fromLocalInput, parseUtc, toLocalInput } from "../../lib/dates.js";
import ImageUpload from "../components/ImageUpload.jsx";
import HelpLink from "../components/HelpLink.jsx";
import { Alert, Badge, Button, EmptyState, Field, Input, ListSkeleton, PageHeader, Panel, Select, Skeleton, Textarea } from "../components/ui.jsx";

const CATEGORIES = ["Onction Event", "Industry Event"];

// The editable fields, in the shape the form works with (local date-times).
function toForm(ev) {
  return {
    title: ev.title,
    slug: ev.slug,
    category: ev.category,
    description: ev.description || "",
    location: ev.location || "",
    starts_at: toLocalInput(ev.starts_at),
    ends_at: toLocalInput(ev.ends_at),
    cover_image_url: ev.cover_image_url || "",
    capacity: ev.capacity ? String(ev.capacity) : "",
  };
}

function validate(f) {
  const e = {};
  if (!f.title.trim()) e.title = "Give the event a title.";
  if (!SLUG_PATTERN.test(f.slug)) e.slug = "Use lowercase letters, numbers and single hyphens only.";
  if (!f.starts_at) e.starts_at = "Choose when the event starts.";
  if (f.ends_at && f.starts_at && new Date(f.ends_at) < new Date(f.starts_at)) e.ends_at = "The end must be after the start.";
  if (f.capacity && !(Number.isInteger(Number(f.capacity)) && Number(f.capacity) >= 1)) e.capacity = "Use a whole number of at least 1, or leave blank.";
  return e;
}

export default function EventEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canManage = useCanManage();
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [conflict, setConflict] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const loadRegistrations = useCallback(() => {
    adminApi.get(`/api/events/${id}/registrations`).then(setRegistrations).catch(() => setRegistrations([]));
  }, [id]);

  const load = useCallback(() => {
    setError("");
    setConflict(false);
    adminApi
      .get(`/api/events/${id}`)
      .then((ev) => {
        setEvent(ev);
        setForm(toForm(ev));
      })
      .catch((err) => setError(err.message));
    loadRegistrations();
  }, [id, loadRegistrations]);
  useEffect(load, [load]);

  const errors = useMemo(() => (form ? validate(form) : {}), [form]);
  const dirty = !!(event && form) && JSON.stringify(form) !== JSON.stringify(toForm(event));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));

  // Saves every field (plus an optional status change). Returns the saved event, or null.
  async function save(status, { quiet = false } = {}) {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      toast.error("Fix the highlighted fields first.");
      return null;
    }
    setBusy(status || "save");
    try {
      const updated = await adminApi.put(`/api/events/${id}`, {
        title: form.title.trim(),
        slug: form.slug,
        category: form.category,
        description: form.description,
        location: form.location,
        starts_at: fromLocalInput(form.starts_at),
        ends_at: fromLocalInput(form.ends_at),
        cover_image_url: form.cover_image_url || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        ...(status ? { status } : {}),
        expected_updated_at: event.updated_at,
      });
      setEvent(updated);
      setForm(toForm(updated));
      setShowErrors(false);
      if (!quiet) {
        toast.success(
          status === "published" ? "Published — the event is on the website." : status === "draft" ? "Unpublished — the event is hidden from the website." : updated.status === "published" ? "Saved — the live page is updated." : "Draft saved. It isn't on the website yet."
        );
      }
      return updated;
    } catch (err) {
      if (/someone else/i.test(err.message)) setConflict(true);
      toast.error(/already exists/.test(err.message) ? "Another event already uses that web address — change the URL slug." : err.message);
      return null;
    } finally {
      setBusy("");
    }
  }

  async function preview() {
    const current = dirty ? await save(undefined, { quiet: true }) : event;
    if (current) openPreview(`/events/${current.slug}`);
  }

  async function unpublish() {
    const ok = await confirm({
      title: "Unpublish this event?",
      message: "It disappears from the public Events page and registration closes. Existing registrations are kept.",
      confirmLabel: "Unpublish",
    });
    if (ok) save("draft");
  }

  async function handleDelete() {
    const people = event.registered_count + event.waitlisted_count;
    const ok = await confirm({
      title: `Delete “${event.title}”?`,
      message: `This permanently deletes the event${people ? ` and its ${people} registration${people === 1 ? "" : "s"}` : ""}. It can't be undone.`,
      confirmLabel: "Delete event",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/events/${id}`);
      toast.success("Event deleted.");
      navigate("/admin/events");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleCancelRegistration(reg) {
    const ok = await confirm({
      title: `Cancel ${reg.full_name}'s registration?`,
      message: "If the event is full, the next person on the waitlist is promoted automatically and emailed.",
      confirmLabel: "Cancel registration",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/events/${id}/registrations/${reg.id}`);
      loadRegistrations();
      // Refresh the counts only, so unsaved edits on screen are left alone.
      adminApi.get(`/api/events/${id}`).then((ev) => setEvent((prev) => ({ ...prev, registered_count: ev.registered_count, waitlisted_count: ev.waitlisted_count })));
      toast.success("Registration cancelled.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  function exportCsv() {
    fetch(`${API_BASE}/api/events/${id}/registrations/export`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `event-${id}-registrations.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => toast.error(err.message));
  }

  async function goBack(e) {
    if (!dirty) return;
    e.preventDefault();
    if (await confirm({ title: "Leave without saving?", message: "Your unsaved changes to this event will be lost.", confirmLabel: "Leave", destructive: true })) navigate("/admin/events");
  }

  if (error && !event) {
    return (
      <div>
        <PageHeader title="Event" back={{ to: "/admin/events", label: "All events" }} />
        <Alert tone="danger" title="This event couldn't be loaded" action={<Button size="sm" onClick={load}>Try again</Button>}>
          {/not found/i.test(error) ? "It may have been deleted." : error}
        </Alert>
      </div>
    );
  }
  if (!event || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const err = (field) => (showErrors ? errors[field] : undefined);
  const published = event.status === "published";
  const readOnly = !canManage;
  const lastSaved = parseUtc(event.updated_at);

  return (
    <div>
      {confirmDialog}
      <Link to="/admin/events" onClick={goBack} className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slatey transition hover:text-ink">
        ← All events
      </Link>
      <PageHeader
        title={event.title || "Untitled event"}
        meta={
          <>
            <Badge tone={STATUS_TONE[event.status]}>{STATUS_LABEL[event.status]}</Badge>
            {dirty && <Badge tone="warning">Unsaved changes</Badge>}
            {lastSaved && <span className="text-xs text-slatey">Last saved {lastSaved.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>}
          </>
        }
        actions={
          <>
            <HelpLink topic="events" />
            <Button icon={LuEye} onClick={preview} disabled={!!busy}>Preview</Button>
            {canManage && (
              <Button icon={LuSave} onClick={() => save()} loading={busy === "save"} disabled={!dirty}>
                {published ? "Save changes" : "Save draft"}
              </Button>
            )}
            {canManage && !published && <Button variant="primary" icon={LuSend} onClick={() => save("published")} loading={busy === "published"}>Publish</Button>}
            {canManage && published && <Button icon={LuEyeOff} onClick={unpublish} loading={busy === "draft"}>Unpublish</Button>}
          </>
        }
      />

      {conflict && (
        <Alert tone="warning" title="Someone else changed this event" className="mb-4" action={<Button size="sm" onClick={load}>Reload</Button>}>
          It was saved by someone else after you opened it. Reload to see their version — your unsaved edits on this screen will be replaced.
        </Alert>
      )}
      {readOnly && <Alert className="mb-4">You have view-only access. An Admin or Super Admin can edit events.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Panel title="Event details">
            <fieldset disabled={readOnly} className="space-y-4">
              <Field label="Title" required error={err("title")}>
                {(p) => <Input {...p} value={form.title} onChange={set("title")} maxLength={200} />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Web address (URL slug)" required error={err("slug")} hint={!err("slug") && (published ? "Changing it breaks links people have already shared." : "Lowercase letters, numbers and hyphens.")}>
                  {(p) => (
                    <div className="flex items-center rounded-lg border border-black/10 bg-white pl-3 text-sm shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
                      <span className="shrink-0 text-slatey">/events/</span>
                      <input {...p} value={form.slug} onChange={(e) => set("slug")(e.target.value.toLowerCase())} className="w-full min-w-0 bg-transparent py-2 pr-3 outline-none" />
                    </div>
                  )}
                </Field>
                <Field label="Category" required>
                  {(p) => (
                    <Select {...p} value={form.category} onChange={set("category")}>
                      {[...new Set([...CATEGORIES, form.category])].map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  )}
                </Field>
              </div>
              <Field label="Description" optional hint="Shown under the title on the event page. Line breaks are kept as separate paragraphs.">
                {(p) => <Textarea {...p} rows={5} value={form.description} onChange={set("description")} />}
              </Field>
            </fieldset>
          </Panel>

          <Panel title="When and where">
            <fieldset disabled={readOnly} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Starts" required error={err("starts_at")} hint="In your computer's time zone.">
                  {(p) => <Input {...p} type="datetime-local" value={form.starts_at} onChange={set("starts_at")} />}
                </Field>
                <Field label="Ends" optional error={err("ends_at")}>
                  {(p) => <Input {...p} type="datetime-local" value={form.ends_at} onChange={set("ends_at")} min={form.starts_at || undefined} />}
                </Field>
              </div>
              <Field label="Location" optional hint="“Virtual”, a venue name, or an address.">
                {(p) => <Input {...p} value={form.location} onChange={set("location")} maxLength={300} placeholder="e.g. Eko Hotel, Lagos" />}
              </Field>
            </fieldset>
          </Panel>

          <Panel title="Cover image" description="Shown at the top of the event page and in the dashboard list.">
            <ImageUpload label="Cover image" value={form.cover_image_url} onChange={set("cover_image_url")} disabled={readOnly} hint="Landscape works best (about 1600 × 900)." />
          </Panel>

          <Panel title="Registration">
            <fieldset disabled={readOnly}>
              <Field label="Capacity" optional error={err("capacity")} hint={!err("capacity") && "Leave blank for unlimited. When full, new sign-ups join a waitlist."}>
                {(p) => <Input {...p} type="number" min={1} step={1} value={form.capacity} onChange={set("capacity")} className="sm:w-48" />}
              </Field>
            </fieldset>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Visibility">
            <div className="space-y-3 text-sm">
              <p className="text-slatey">
                {published
                  ? "Published: visible on the Events page, with registration open."
                  : "Draft: only signed-in staff can see it, using Preview. Registration is closed."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={LuEye} onClick={preview}>Preview</Button>
                {published && <Button size="sm" variant="ghost" icon={LuExternalLink} href={`/events/${event.slug}`} target="_blank" rel="noreferrer">View live</Button>}
              </div>
              {canManage && (
                <div className="border-t border-black/[0.06] pt-3">
                  <Button size="sm" variant="danger-ghost" icon={LuTrash2} onClick={handleDelete}>Delete event</Button>
                </div>
              )}
            </div>
          </Panel>

          <Panel
            title={`Registrations (${event.registered_count}${event.capacity ? ` / ${event.capacity}` : ""})`}
            description={event.waitlisted_count > 0 ? `${event.waitlisted_count} on the waitlist` : undefined}
            actions={<Button size="sm" variant="ghost" icon={LuDownload} onClick={exportCsv}>Export CSV</Button>}
            padded={false}
          >
            {!registrations ? (
              <ListSkeleton rows={2} />
            ) : registrations.length === 0 ? (
              <EmptyState compact title="No registrations yet" description={published ? "Sign-ups from the event page appear here." : "Registration opens once the event is published."} />
            ) : (
              <ul className="divide-y divide-black/[0.05]">
                {registrations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{r.full_name}</p>
                      <p className="truncate text-xs text-slatey">
                        {r.email} {r.company && `· ${r.company}`}
                      </p>
                      <p className="text-[11px] text-slate-400">{formatDateTime(r.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={r.status === "registered" ? "success" : r.status === "waitlisted" ? "warning" : "neutral"}>{r.status}</Badge>
                      {canManage && r.status !== "cancelled" && (
                        <Button size="xs" variant="danger-ghost" onClick={() => handleCancelRegistration(r)}>Cancel</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
