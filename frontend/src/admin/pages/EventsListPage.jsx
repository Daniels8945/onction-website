import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi } from "../lib/adminApi.js";
import { usePromptDialog } from "../hooks/usePromptDialog.jsx";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function EventsListPage() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    adminApi.get("/api/events").then(setEvents).catch((err) => setError(err.message));
  }, []);

  async function handleCreate() {
    const title = await prompt({
      title: "New event",
      label: "Event title",
      placeholder: 'e.g. "WAPP Trading Forum 2026"',
    });
    if (!title) return;
    try {
      const event = await adminApi.post("/api/events", {
        slug: slugify(title),
        title,
        starts_at: new Date().toISOString(),
        status: "draft",
      });
      navigate(`/admin/events/${event.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: "Delete this event?",
      message: "This deletes the event and all its registrations. This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/events/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success("Event deleted.");
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
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Events</h1>
          <p className="text-sm text-slatey">Onction events and industry events, with registration.</p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          + New event
        </button>
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!events && !error && <p className="text-sm text-slatey">Loading…</p>}
      {events && events.length === 0 && <div className="card text-sm text-slatey">No events yet.</div>}

      {events && events.length > 0 && (
        <div className="overflow-x-auto border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-t border-black/5 hover:bg-mist">
                  <td className="px-4 py-3 font-medium text-ink">
                    <Link to={`/admin/events/${ev.id}`} className="hover:text-teal-600">
                      {ev.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slatey">{new Date(ev.starts_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slatey">
                    {ev.registered_count}
                    {ev.capacity ? ` / ${ev.capacity}` : ""}
                    {ev.waitlisted_count > 0 && ` (+${ev.waitlisted_count} waitlisted)`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium ${ev.status === "published" ? "bg-teal-100 text-teal-700" : "bg-black/5 text-slatey"}`}>
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(ev.id)} className="text-xs font-medium text-red-600 hover:text-red-700">
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
