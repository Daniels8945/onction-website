import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LuChartColumn, LuChevronRight, LuShieldCheck } from "react-icons/lu";
import { adminApi } from "../../lib/adminApi.js";
import { Alert, Badge, Button, EmptyState, ListSkeleton, PageHeader, Panel, SearchInput, Tabs } from "../../components/ui.jsx";
import { STATUS } from "../../content/useSchema.js";

const AREA_ORDER = ["Homepage", "About & leadership", "Services & solutions", "Pages", "Media & gallery", "Partners & ecosystem", "Contact & company", "Navigation & footer"];
const fmt = (d) => (d ? new Date(d.endsWith?.("Z") ? d : `${d}Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null);

// "Website content": every editable area of the public site, findable by
// area, page or status. Each opens in the editor (ContentEditorPage).
export default function ContentListPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    adminApi.get("/api/content/docs").then(setRows).catch((e) => setError(e.message));
  }, []);

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0, review: 0, problems: 0, published: 0, "built-in": 0 };
    rows?.forEach((r) => {
      if (r.status === "draft" || r.status === "changes") c.review += 1;
      if (r.errors) c.problems += 1;
      if (r.status === "published" || r.status === "changes") c.published += 1;
      if (r.status === "built-in") c["built-in"] += 1;
    });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter((r) => {
      const inTab =
        tab === "all" ||
        (tab === "review" && (r.status === "draft" || r.status === "changes")) ||
        (tab === "problems" && r.errors) ||
        (tab === "published" && (r.status === "published" || r.status === "changes")) ||
        (tab === "built-in" && r.status === "built-in");
      const hay = [r.label, r.area, ...r.used_on.map((u) => u.label)].join(" ").toLowerCase();
      return inTab && (!q || hay.includes(q));
    });
  }, [rows, search, tab]);

  const groups = AREA_ORDER.map((a) => ({ area: a, rows: shown.filter((r) => r.area === a) })).filter((g) => g.rows.length);

  return (
    <div>
      <PageHeader
        title="Website content"
        description="Edit the words, photos and links on the public website. Changes are saved as drafts, previewed on the real page and only go live when you publish them."
        actions={<Button icon={LuChartColumn} to="/admin/content/coverage">Coverage report</Button>}
      />
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All", count: counts.all },
            { value: "review", label: "Drafts & reviews", count: counts.review },
            { value: "problems", label: "Problems", count: counts.problems },
            { value: "published", label: "Published", count: counts.published },
            { value: "built-in", label: "Built-in", count: counts["built-in"] },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search by area or page…" className="lg:w-72" />
      </div>

      {!rows && !error ? (
        <Panel padded={false}><ListSkeleton rows={8} /></Panel>
      ) : groups.length === 0 ? (
        <Panel><EmptyState title="Nothing here" description={tab === "review" ? "No drafts are waiting for review." : "Try another search."} /></Panel>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <Panel key={g.area} title={g.area} padded={false}>
              <ul className="divide-y divide-black/[0.05]">
                {g.rows.map((r) => {
                  const st = STATUS[r.status];
                  return (
                    <li key={r.key}>
                      <Link to={`/admin/content/${r.key}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-mist/70">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                            {r.label}
                            {r.protected && <LuShieldCheck size={14} className="text-sky-600" aria-label="Protected" />}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slatey">Appears on: {r.used_on.map((u) => u.label).join(" · ")}</p>
                        </div>
                        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {fmt(r.published_at) && <span className="text-[11px] text-slatey">Published {fmt(r.published_at)}</span>}
                        </div>
                        {(r.errors > 0 || r.warnings > 0) && (
                          <Badge tone={r.errors ? "danger" : "warning"} dot={false}>
                            {r.errors ? `${r.errors} problem${r.errors > 1 ? "s" : ""}` : `${r.warnings} note${r.warnings > 1 ? "s" : ""}`}
                          </Badge>
                        )}
                        <LuChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      <Panel title="Also managed in the dashboard" className="mt-6">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["News articles", "/admin/news"],
            ["Events", "/admin/events"],
            ["Media library (photos & videos)", "/admin/media"],
            ["Extra campaign pages", "/admin/pages"],
            ["Newsletter", "/admin/newsletter"],
          ].map(([l, to]) => (
            <li key={to}><Link to={to} className="text-teal-700 hover:underline">{l} →</Link></li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
