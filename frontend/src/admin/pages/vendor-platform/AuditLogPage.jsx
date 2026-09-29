import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminApi, API_BASE, getToken } from "../../lib/adminApi.js";
import { useAuth } from "../../AuthContext.jsx";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";

export default function AuditLogPage() {
  const { admin } = useAuth();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    adminApi.get(`/api/vendor-platform/audit?${params}`).then(setEntries).catch((err) => setError(err.message));
  }

  useEffect(load, [search]);

  function exportCsv() {
    const token = getToken();
    fetch(`${API_BASE}/api/vendor-platform/audit/export`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vendor-platform-audit-log.csv";
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  async function handleClear() {
    const ok = await confirm({
      title: "Clear the entire audit log?",
      message: "This is irreversible and removes every entry.",
      confirmLabel: "Clear log",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del("/api/vendor-platform/audit");
      toast.success("Audit log cleared.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      {confirmDialog}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Audit log</h1>
          <p className="text-sm text-slatey">Every administrative action taken on the vendor platform.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={exportCsv} className="text-xs font-medium text-teal-600 hover:text-teal-700">Export CSV</button>
          {admin?.role === "Super Admin" && (
            <button onClick={handleClear} className="text-xs font-medium text-red-600 hover:text-red-700">Clear log</button>
          )}
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search action, performer, or details…"
        className="mb-4 min-w-[280px] border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!entries && !error && <p className="text-sm text-slatey">Loading…</p>}
      {entries && entries.length === 0 && <div className="card text-sm text-slatey">No audit entries yet.</div>}

      {entries && entries.length > 0 && (
        <div className="overflow-x-auto border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Performed by</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-black/5 align-top hover:bg-mist">
                  <td className="px-4 py-3 font-medium text-ink">{e.action}</td>
                  <td className="px-4 py-3 text-slatey">{e.performed_by}</td>
                  <td className="px-4 py-3 text-slatey">{e.details || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slatey">{new Date(e.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
