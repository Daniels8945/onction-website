import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi, API_BASE, getToken } from "../lib/adminApi.js";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";

const CATEGORIES = ["Onction Event", "Industry Event"];

function toLocalInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventEditorPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function loadRegistrations() {
    adminApi.get(`/api/events/${id}/registrations`).then(setRegistrations).catch(() => {});
  }

  useEffect(() => {
    adminApi.get(`/api/events/${id}`).then(setEvent).catch((err) => setError(err.message));
    loadRegistrations();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await adminApi.put(`/api/events/${id}`, {
        slug: event.slug,
        title: event.title,
        category: event.category,
        description: event.description,
        location: event.location,
        starts_at: new Date(event.starts_at).toISOString(),
        ends_at: event.ends_at ? new Date(event.ends_at).toISOString() : null,
        cover_image_url: event.cover_image_url,
        capacity: event.capacity ? Number(event.capacity) : null,
        status: event.status,
      });
      setEvent(updated);
      toast.success("Saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRegistration(regId) {
    const ok = await confirm({
      title: "Cancel this registration?",
      message: "If the event is full, the next waitlisted person will be promoted automatically.",
      confirmLabel: "Cancel registration",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/events/${id}/registrations/${regId}`);
      loadRegistrations();
      adminApi.get(`/api/events/${id}`).then(setEvent);
      toast.success("Registration cancelled.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  function exportCsv() {
    const token = getToken();
    fetch(`${API_BASE}/api/events/${id}/registrations/export`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `event-${id}-registrations.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  if (error && !event) return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!event) return <p className="text-sm text-slatey">Loading…</p>;

  return (
    <div>
      {confirmDialog}
      <Link to="/admin/events" className="mb-4 inline-block text-xs font-medium text-slatey hover:text-ink">
        ← All events
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <p className="eyebrow">Event details</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-slatey">Title</label>
            <input
              value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })}
              className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slatey">URL slug</label>
              <div className="flex items-center border border-black/10 px-3 py-2 text-sm focus-within:border-teal-500">
                <span className="text-slatey">/events/</span>
                <input value={event.slug} onChange={(e) => setEvent({ ...event, slug: e.target.value })} className="w-full outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slatey">Category</label>
              <select
                value={event.category}
                onChange={(e) => setEvent({ ...event, category: e.target.value })}
                className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slatey">Description</label>
            <textarea
              rows={3}
              value={event.description}
              onChange={(e) => setEvent({ ...event, description: e.target.value })}
              className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slatey">Location</label>
            <input
              value={event.location}
              onChange={(e) => setEvent({ ...event, location: e.target.value })}
              placeholder="Virtual, or a physical address"
              className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slatey">Starts</label>
              <input
                type="datetime-local"
                value={toLocalInput(event.starts_at)}
                onChange={(e) => setEvent({ ...event, starts_at: e.target.value })}
                className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slatey">Ends (optional)</label>
              <input
                type="datetime-local"
                value={toLocalInput(event.ends_at)}
                onChange={(e) => setEvent({ ...event, ends_at: e.target.value })}
                className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slatey">Cover image URL</label>
            <input
              value={event.cover_image_url || ""}
              onChange={(e) => setEvent({ ...event, cover_image_url: e.target.value })}
              className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slatey">Capacity (blank = unlimited)</label>
              <input
                type="number"
                min={1}
                value={event.capacity || ""}
                onChange={(e) => setEvent({ ...event, capacity: e.target.value })}
                className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slatey">Status</label>
              <select
                value={event.status}
                onChange={(e) => setEvent({ ...event, status: e.target.value })}
                className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
            {event.status === "published" && (
              <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-teal-600 hover:text-teal-700">
                View live ↗
              </a>
            )}
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <p className="eyebrow">
              Registrations ({event.registered_count}
              {event.capacity ? ` / ${event.capacity}` : ""}
              {event.waitlisted_count > 0 ? `, ${event.waitlisted_count} waitlisted` : ""})
            </p>
            <button onClick={exportCsv} className="text-xs font-medium text-teal-600 hover:text-teal-700">
              Export CSV
            </button>
          </div>
          {!registrations && <p className="text-sm text-slatey">Loading…</p>}
          {registrations && registrations.length === 0 && <p className="text-sm text-slatey">No registrations yet.</p>}
          {registrations && registrations.length > 0 && (
            <ul className="divide-y divide-black/5">
              {registrations.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-ink">{r.full_name}</p>
                    <p className="text-xs text-slatey">
                      {r.email} {r.company && `· ${r.company}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium ${
                        r.status === "registered" ? "bg-teal-100 text-teal-700" : r.status === "waitlisted" ? "bg-spark-400/20 text-spark-500" : "bg-black/5 text-slatey"
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.status !== "cancelled" && (
                      <button onClick={() => handleCancelRegistration(r.id)} className="text-xs text-red-600 hover:text-red-700">
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
