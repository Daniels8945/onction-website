import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { LuDownload, LuFileText, LuHistory, LuReceipt, LuSettings, LuTrash2, LuUser } from "react-icons/lu";
import { adminApi, API_BASE, getToken } from "../../lib/adminApi.js";
import { useAuth } from "../../AuthContext.jsx";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";
import { formatDate, parseDate } from "../../lib/format.js";
import { Alert, Button, EmptyState, ListSkeleton, Menu, PageHeader, Panel, SearchInput } from "../../components/ui.jsx";

// "invoice.status_changed" -> icon + "Invoice status changed"
const DOMAIN_ICON = { vendor: LuUser, invoice: LuReceipt, document: LuFileText, settings: LuSettings };

function describe(action) {
  const [domain, verb = ""] = action.split(".");
  const text = `${domain} ${verb.replace(/_/g, " ")}`.trim();
  return { Icon: DOMAIN_ICON[domain] || LuHistory, label: text.charAt(0).toUpperCase() + text.slice(1) };
}

function dayLabel(date) {
  const d = parseDate(date);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return formatDate(date);
}

export default function AuditLogPage() {
  const { admin } = useAuth();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  // Debounce the server-side search so it doesn't fire on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    adminApi
      .get(`/api/vendor-platform/audit?${params}`)
      .then((rows) => {
        setEntries(rows);
        setError("");
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, [query]);

  const groups = useMemo(() => {
    const out = [];
    (entries || []).forEach((e) => {
      const label = dayLabel(e.timestamp);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(e);
      else out.push({ label, items: [e] });
    });
    return out;
  }, [entries]);

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/vendor-platform/audit/export`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "vendor-platform-audit-log.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleClear() {
    const ok = await confirm({
      title: "Clear the entire audit log?",
      message: "Every entry is permanently deleted, for everyone. Export a CSV first if you may need this history later.",
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
      <PageHeader
        title="Audit log"
        description="Every administrative action taken on the vendor platform, newest first."
        actions={
          <>
            <Button icon={LuDownload} onClick={exportCsv} loading={exporting}>Export CSV</Button>
            {admin?.role === "Super Admin" && (
              <Menu items={[{ label: "Clear entire log", icon: LuTrash2, danger: true, onClick: handleClear }]} />
            )}
          </>
        }
      />

      {error && <Alert tone="danger" title="The audit log couldn't be loaded" className="mb-4">{error}</Alert>}

      <Panel padded={false}>
        <div className="border-b border-black/[0.06] px-5 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search action, person or details…" className="max-w-md" />
        </div>
        {!entries && !error && <ListSkeleton />}
        {entries && entries.length === 0 && (
          <EmptyState
            compact={!!query}
            icon={LuHistory}
            title={query ? "No matching entries" : "No activity yet"}
            description={query ? "Try a different search term." : "Approvals, status changes and edits on the vendor platform are recorded here."}
          />
        )}
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="sticky top-0 z-10 border-b border-black/[0.05] bg-mist/95 px-5 py-2 font-body text-xs font-semibold text-slatey backdrop-blur">{group.label}</h2>
            <ul className="divide-y divide-black/[0.05]">
              {group.items.map((e) => {
                const { Icon, label } = describe(e.action);
                return (
                  <li key={e.id} className="flex gap-3 px-5 py-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mist text-slatey ring-1 ring-black/5">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        <span className="font-medium">{label}</span>
                        {e.details && <span className="text-slatey"> — {e.details.replace(/ -> /g, " → ")}</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-slatey">
                        {e.performed_by} · {parseDate(e.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </Panel>
    </div>
  );
}
