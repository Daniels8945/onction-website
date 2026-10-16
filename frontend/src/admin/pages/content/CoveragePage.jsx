import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuCheck, LuX } from "react-icons/lu";
import { adminApi } from "../../lib/adminApi.js";
import { Alert, Badge, ListSkeleton, PageHeader, Panel, StatCard, Table, Td, Th } from "../../components/ui.jsx";
import { STATUS } from "../../content/useSchema.js";
import { builtIn, managedKeys } from "../../../cms/registry.js";

// Website-wide content coverage, built from evidence rather than intentions:
// the server reports each area's schema and status; this page adds whether the
// public site actually reads that area (the registry in src/cms) and whether
// the built-in content can be loaded into the editor.
export default function CoveragePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminApi.get("/api/content/coverage").then(setData).catch((e) => setError(e.message));
  }, []);

  const rows = data?.managed.map((m) => ({ ...m, wired: managedKeys.includes(m.key), seeded: builtIn(m.key) != null })) || [];
  const fully = rows.filter((r) => r.wired && r.seeded).length;

  return (
    <div>
      <PageHeader
        back={{ to: "/admin/content", label: "Website content" }}
        title="Content coverage"
        description="Which parts of the public website can be edited here, how, and what still needs a developer — and why."
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {!data && !error && <Panel padded={false}><ListSkeleton rows={6} /></Panel>}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Editable content areas" value={`${fully} / ${rows.length}`} hint="Read by the website and loaded with its current content" />
            <StatCard label="Published from the dashboard" value={rows.filter((r) => r.status === "published" || r.status === "changes").length} hint="Others show their built-in content" />
            <StatCard label="Kept in code (by design)" value={data.code_managed.length} hint="Layout, maps, routes — see below" />
          </div>

          {fully < rows.length && <Alert tone="warning" title="Some areas aren't connected to the website yet">They're marked ✗ below; edits to them would not appear on the site.</Alert>}

          <Panel title="Editable here" padded={false}>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Content area</Th>
                    <Th>Pages</Th>
                    <Th>Status</Th>
                    <Th>On the site</Th>
                    <Th>What editors can do</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <Td>
                        <Link to={`/admin/content/${r.key}`} className="font-medium text-ink hover:text-teal-700">{r.label}</Link>
                        <p className="text-[11px] text-slatey">{r.area}{r.protected ? " · protected" : ""} · {r.fields} fields</p>
                      </Td>
                      <Td className="max-w-[220px] text-xs text-slatey">{r.pages.join(", ")}</Td>
                      <Td><Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge></Td>
                      <Td>{r.wired && r.seeded ? <LuCheck className="text-teal-600" aria-label="Connected" /> : <LuX className="text-red-600" aria-label="Not connected" />}</Td>
                      <Td className="text-xs text-slatey">{r.capabilities.join(" · ")}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Panel>

          <Panel title="Managed in other dashboard sections" padded={false}>
            <Table>
              <tbody>
                {data.existing_admin.map((e) => (
                  <tr key={e.where}>
                    <Td className="font-medium text-ink">{e.page}</Td>
                    <Td className="text-sm text-slatey">{e.area}</Td>
                    <Td><Link to={e.where} className="text-sm text-teal-700 hover:underline">Open →</Link></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>

          <Panel title="Kept in code, on purpose" description="Changing these safely needs a developer: they're part of the design, the page structure or the site's behaviour." padded={false}>
            <Table>
              <tbody>
                {data.code_managed.map((c) => (
                  <tr key={c.page + c.area}>
                    <Td className="whitespace-nowrap font-medium text-ink">{c.page}</Td>
                    <Td className="text-sm text-ink">{c.area}</Td>
                    <Td className="text-sm text-slatey">{c.reason}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        </div>
      )}
    </div>
  );
}
