import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { vendorApi } from "../lib/vendorApi.js";

export default function VendorNotificationsPage() {
  const [notifications, setNotifications] = useState(null);

  function load() {
    vendorApi.get("/api/vendor-platform/notifications").then(setNotifications).catch((err) => toast.error(err.message));
  }

  useEffect(load, []);

  async function markRead(id) {
    try {
      await vendorApi.put(`/api/vendor-platform/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function markAllRead() {
    try {
      await vendorApi.put("/api/vendor-platform/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await vendorApi.del(`/api/vendor-platform/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-syne text-2xl font-semibold text-ink">Notifications</h1>
        {notifications?.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="text-xs font-medium text-teal-600 hover:text-teal-700">Mark all read</button>
        )}
      </div>

      {!notifications && <p className="text-sm text-slatey">Loading…</p>}
      {notifications && notifications.length === 0 && <div className="card text-sm text-slatey">No notifications yet.</div>}

      {notifications && notifications.length > 0 && (
        <ul className="divide-y divide-black/5 border border-black/5 bg-white">
          {notifications.map((n) => (
            <li key={n.id} className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${!n.is_read ? "bg-teal-50/40" : ""}`}>
              <button onClick={() => !n.is_read && markRead(n.id)} className="flex-1 text-left">
                <p className={`font-medium ${n.is_read ? "text-ink" : "text-teal-800"}`}>{n.title}</p>
                {n.message && <p className="text-xs text-slatey">{n.message}</p>}
                <p className="mt-1 text-xs text-slatey">{new Date(n.created_at).toLocaleString()}</p>
              </button>
              <button onClick={() => handleDelete(n.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
