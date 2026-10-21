import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { LuCircleAlert, LuCircleCheck, LuDownload, LuInfo, LuLightbulb, LuRefreshCw, LuTriangleAlert, LuX } from "react-icons/lu";
import { API_BASE, getToken } from "../lib/adminApi.js";
import { adminApi } from "../lib/adminApi.js";
import { Alert, Badge, Button, Panel, Select, Skeleton, Switch, Tabs, cx } from "../components/ui.jsx";
import { Bars, DataTable, Definition, MetricCard, Rate, TrendChart, fmtDur, fmtInt, fmtPct } from "../analytics/parts.jsx";
import { pages as sitePages } from "../../data/site.js";
import HelpLink from "../components/HelpLink.jsx";

// Analytics: website performance, behaviour, content, acquisition and leads.
// Every number comes from GET /api/analytics/report, computed on the server
// for the chosen range in West Africa Time — nothing here is estimated. See
// backend/app/analytics_reports.py for the definitions (also shown in-page).

const watToday = () => new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
const shift = (d, days) => new Date(new Date(`${d}T12:00:00Z`).getTime() + days * 86400_000).toISOString().slice(0, 10);
const PRESETS = [
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "custom", label: "Custom" },
];
const fmtDay = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const TITLE = Object.fromEntries(sitePages.map((p) => [p.to, p.title]));
const titleOf = (path) => TITLE[path] || (path.startsWith("/news/") ? "News article" : path.startsWith("/events/") ? "Event" : null);
const countryName = (() => {
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return (c) => dn.of(c) || c;
  } catch {
    return (c) => c;
  }
})();

const STATUS_ICON = { ok: [LuCircleCheck, "text-teal-700", "OK"], warn: [LuTriangleAlert, "text-amber-700", "Check"], info: [LuInfo, "text-sky-700", "Note"] };
const SEVERITY = { warning: ["warning", "Needs attention"], notice: ["info", "Worth a look"], info: ["neutral", "For context"] };
const KIND = { fact: "Measured", possible: "Possible explanation", recommend: "Recommendation" };

export default function AnalyticsPage() {
  const [preset, setPreset] = useState("30");
  const [range, setRange] = useState(() => ({ start: shift(watToday(), -29), end: watToday() }));
  const [compare, setCompare] = useState(true);
  const [thisSiteOnly, setThisSiteOnly] = useState(true);
  const [channel, setChannel] = useState("");
  const [device, setDevice] = useState("");
  const [page, setPage] = useState("");
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | refreshing | error
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  const params = useMemo(() => {
    const p = new URLSearchParams({ start: range.start, end: range.end, compare: String(compare) });
    if (thisSiteOnly) p.set("host", window.location.hostname);
    if (channel) p.set("channel", channel);
    if (device) p.set("device", device);
    if (page) p.set("page", page);
    return p;
  }, [range, compare, thisSiteOnly, channel, device, page]);

  const load = useCallback(() => {
    setState((s) => (s === "loading" || !data ? "loading" : "refreshing"));
    setError("");
    adminApi
      .get(`/api/analytics/report?${params}`)
      .then((d) => {
        setData(d);
        setState("ready");
        setLoadedAt(Date.now());
      })
      .catch((e) => {
        setError(e.message);
        setState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  useEffect(load, [load]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  function choosePreset(key) {
    setPreset(key);
    const p = PRESETS.find((x) => x.key === key);
    if (p?.days) setRange({ start: shift(watToday(), -(p.days - 1)), end: watToday() });
  }

  async function exportCsv(report) {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/export?report=${report}&${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `onction-${report}-${range.start}-to-${range.end}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(e.message);
    }
  }

  const stale = loadedAt && now - loadedAt > 10 * 60_000;
  const s = data?.summary;
  const cmp = data?.comparison;
  const dl = data?.deltas || {};
  const go = (t) => () => setTab(t);
  const insights = data?.insights || [];
  const warnings = data?.health.checks.filter((c) => c.status === "warn").length || 0;

  return (
    <div>
      {/* ── 1. header & reporting controls ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 max-w-2xl text-sm text-slatey">How the public website performs — visits, behaviour, content, where visitors come from, and the enquiries it produces.</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpLink topic="analytics" />
          <Button size="sm" icon={LuRefreshCw} onClick={load} loading={state === "refreshing"}>Refresh</Button>
          <ExportMenu tab={tab} onExport={exportCsv} disabled={!data} />
        </div>
      </div>

      <Panel className="mb-5" bodyClassName="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div role="group" aria-label="Reporting period" className="flex flex-wrap gap-1 rounded-lg border border-black/10 bg-mist p-1">
            {PRESETS.map((p) => (
              <button key={p.key} type="button" aria-pressed={preset === p.key} onClick={() => choosePreset(p.key)} className={cx("rounded-md px-3 py-1.5 text-xs font-medium transition", preset === p.key ? "bg-white text-ink shadow-sm" : "text-slatey hover:text-ink")}>
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex items-end gap-2">
              <label className="text-xs text-slatey">From<input type="date" value={range.start} max={range.end} onChange={(e) => e.target.value && setRange((r) => ({ ...r, start: e.target.value }))} className="mt-1 block rounded-lg border border-black/10 px-2 py-1.5 text-sm text-ink" /></label>
              <label className="text-xs text-slatey">To<input type="date" value={range.end} min={range.start} max={watToday()} onChange={(e) => e.target.value && setRange((r) => ({ ...r, end: e.target.value }))} className="mt-1 block rounded-lg border border-black/10 px-2 py-1.5 text-sm text-ink" /></label>
            </div>
          )}
          <label className="text-xs text-slatey">Channel
            <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="mt-1 py-1.5 text-xs">
              <option value="">All channels</option>
              {(data?.channel_rules || []).map((c) => <option key={c.channel} value={c.channel}>{c.channel}</option>)}
            </Select>
          </label>
          <label className="text-xs text-slatey">Device
            <Select value={device} onChange={(e) => setDevice(e.target.value)} className="mt-1 py-1.5 text-xs">
              <option value="">All devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </Select>
          </label>
          <div className="flex flex-col gap-2 pb-0.5">
            <Switch checked={compare} onChange={setCompare} label="Compare with previous period" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/[0.06] pt-3 text-xs text-slatey">
          <span><strong className="font-semibold text-ink">{fmtDay(range.start)} – {fmtDay(range.end)}</strong></span>
          {compare && cmp && <span>{cmp.available ? `vs ${fmtDay(cmp.start)} – ${fmtDay(cmp.end)}` : <span title={cmp.note}>No comparison: {cmp.note}</span>}</span>}
          <span>{data?.range.timezone || "West Africa Time (WAT, UTC+1)"}</span>
          {loadedAt && <span>Updated {new Date(loadedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · reports are calculated when you load them</span>}
          {stale && <span className="text-amber-700">Over 10 minutes old — refresh for the latest</span>}
          <label className="ml-auto inline-flex items-center gap-2">
            <input type="checkbox" className="accent-teal-600" checked={thisSiteOnly} onChange={(e) => setThisSiteOnly(e.target.checked)} />
            Only traffic to {window.location.hostname}
          </label>
        </div>
        {page && (
          <div className="flex items-center gap-2 text-xs">
            <Badge tone="info" dot={false}>Page: {page}</Badge>
            <span className="text-slatey">Showing only sessions that viewed this page.</span>
            <button type="button" onClick={() => setPage("")} className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"><LuX size={12} /> Clear</button>
          </div>
        )}
      </Panel>

      {state === "error" && (
        <Alert tone="danger" title="The report couldn't be loaded" className="mb-5" action={<Button size="sm" onClick={load}>Try again</Button>}>
          {error}. No figures are shown rather than showing possibly wrong ones.
        </Alert>
      )}

      {!data ? (
        state === "error" ? null : <LoadingState />
      ) : (
        <div className={cx(state === "refreshing" && "opacity-60 transition-opacity")} aria-busy={state === "refreshing"}>
          <Tabs
            className="mb-5"
            value={tab}
            onChange={setTab}
            items={[
              { value: "overview", label: "Overview", count: insights.length || undefined },
              { value: "content", label: "Content" },
              { value: "acquisition", label: "Acquisition" },
              { value: "conversions", label: "Leads & conversions" },
              { value: "audience", label: "Audience" },
              { value: "health", label: "Data health", count: warnings || undefined },
            ]}
          />

          {s.small_sample && s.sessions > 0 && (
            <Alert tone="info" className="mb-5" title={`Small sample: ${fmtInt(s.sessions)} session${s.sessions === 1 ? "" : "s"}`}>
              Percentages and changes below rest on very few visits — read them alongside the underlying counts. They become reliable from about 30 sessions.
            </Alert>
          )}

          {tab === "overview" && (
            <div className="space-y-5">
              {/* ── 2. executive overview ── */}
              <KpiBand title="Traffic" help="How much of the public site was used.">
                <MetricCard emphasis label="Sessions" value={fmtInt(s.sessions)} delta={dl.sessions} polarity="up" comparison={cmp} definition={data.definitions.sessions} />
                <MetricCard emphasis label="Visitors" value={fmtInt(s.visitors)} delta={dl.visitors} polarity="up" comparison={cmp} definition={data.definitions.visitors}
                  sub={s.visitors == null ? "Not measurable for visits from the previous tracker — see Data health" : s.new_visitors != null ? `${fmtInt(s.new_visitors)} new · ${fmtInt(s.returning_visitors)} returning` : null} />
                <MetricCard emphasis label="Pageviews" value={fmtInt(s.pageviews)} delta={dl.pageviews} polarity="up" comparison={cmp} definition={data.definitions.pageviews} />
              </KpiBand>
              <KpiBand title="Engagement" help="Whether visitors found something worth their time.">
                <MetricCard label="Engagement rate" value={fmtPct(s.engagement_rate)} delta={dl.engagement_rate} polarity="up" comparison={cmp} definition={data.definitions.engagement_rate} sub={`${fmtInt(s.engaged_sessions)} of ${fmtInt(s.sessions)} sessions`} />
                <MetricCard label="Avg. engagement time" value={fmtDur(s.avg_engagement_s)} delta={dl.avg_engagement_s} polarity="up" comparison={cmp} definition={data.definitions.avg_engagement_time}
                  sub={s.engagement_measured_sessions < s.sessions ? `measured in ${fmtInt(s.engagement_measured_sessions)} sessions` : null} />
                <MetricCard label="Pages per session" value={s.pages_per_session ?? "—"} delta={dl.pages_per_session} polarity="up" comparison={cmp} definition={data.definitions.pages_per_session} />
                <MetricCard label="Bounce rate" value={fmtPct(s.bounce_rate)} delta={dl.bounce_rate} polarity="down" comparison={cmp} definition={data.definitions.bounce_rate} />
              </KpiBand>
              <KpiBand title="Business outcomes" help="Leads the website produced — counted only when the server accepted them.">
                <MetricCard emphasis label="Enquiries" value={fmtInt(s.enquiries)} delta={dl.enquiries} polarity="up" comparison={cmp} definition={data.definitions.enquiries} onClick={go("conversions")} />
                <MetricCard emphasis label="Event registrations" value={fmtInt(s.registrations)} delta={dl.registrations} polarity="up" comparison={cmp} definition={data.definitions.registrations} onClick={go("conversions")} />
                <MetricCard emphasis label="Conversion rate" value={fmtPct(s.conversion_rate)} delta={dl.conversion_rate} polarity="up" comparison={cmp} definition={data.definitions.conversion_rate}
                  sub={`${fmtInt(s.attributed_conversions)} converting sessions ÷ ${fmtInt(s.sessions)}`} onClick={go("conversions")} />
              </KpiBand>

              {/* ── 3. traffic trends ── */}
              <Panel title="Traffic over time" description={`By ${data.range.interval}, in WAT.${data.previous_series ? " Dashed lines: the previous period, aligned day by day." : ""}`}>
                <TrendChart series={data.series} previous={data.previous_series} interval={data.range.interval} keys={["sessions", "visitors", "pageviews"]} labels={{ sessions: "Sessions", visitors: "Visitors", pageviews: "Pageviews" }} />
                {data.data_since && new Date(data.data_since) > new Date(`${range.start}T00:00:00+01:00`) && (
                  <p className="mt-3 text-xs text-slatey">Data collection began on {fmtDay(data.data_since.slice(0, 10))}; earlier days show no data rather than real zeros. Trends become more meaningful as history builds up.</p>
                )}
              </Panel>

              {/* ── 10. insights ── */}
              <Insights items={insights} onOpen={setTab} />
            </div>
          )}

          {tab === "content" && <ContentTab data={data} onPage={(p) => setPage(p)} />}
          {tab === "acquisition" && <AcquisitionTab data={data} />}
          {tab === "conversions" && <ConversionsTab data={data} />}
          {tab === "audience" && <AudienceTab data={data} />}
          {tab === "health" && <HealthTab data={data} />}
        </div>
      )}
    </div>
  );
}

function KpiBand({ title, help, children }) {
  return (
    <section aria-label={title}>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <p className="text-xs text-slatey">{help}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">{children}</div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading analytics">
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function ExportMenu({ tab, onExport, disabled }) {
  const [open, setOpen] = useState(false);
  const options = {
    overview: [["summary", "Key metrics"], ["series", "Traffic over time"]],
    content: [["pages", "Pages"]],
    acquisition: [["channels", "Channels"], ["referrers", "Referrers"], ["campaigns", "Campaigns"]],
    conversions: [["series", "Conversions over time"], ["channels", "Conversions by channel"], ["pages", "Conversions by page"]],
    audience: [["technology", "Devices & browsers"]],
    health: [["summary", "Key metrics"]],
  }[tab];
  return (
    <div className="relative">
      <Button size="sm" icon={LuDownload} onClick={() => setOpen((o) => !o)} disabled={disabled} aria-expanded={open}>Export CSV</Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-black/10 bg-white p-1 shadow-lg" role="menu">
          <p className="px-3 py-1.5 text-[11px] text-slatey">Same period and filters as on screen. Aggregates only.</p>
          {options.map(([key, label]) => (
            <button key={key} role="menuitem" type="button" onClick={() => { setOpen(false); onExport(key); }} className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-ink hover:bg-mist">{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Insights({ items, onOpen }) {
  return (
    <Panel title="Insights" description="Rule-based observations from this period's data. Each says whether it's a measured fact, a possible explanation or a recommendation.">
      {!items.length ? (
        <p className="text-sm text-slatey">Nothing stands out in this period.</p>
      ) : (
        <ul className="divide-y divide-black/[0.05]">
          {items.map((it, i) => {
            const [tone, sev] = SEVERITY[it.severity];
            return (
              <li key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <LuLightbulb size={16} className={cx("mt-0.5 shrink-0", it.severity === "warning" ? "text-amber-600" : "text-slate-400")} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {it.title}
                    <Badge tone={tone} dot={false}>{sev}</Badge>
                    <span className="text-[11px] font-normal uppercase tracking-wide text-slatey">{KIND[it.kind]}</span>
                  </p>
                  <p className="mt-1 text-sm text-slatey">{it.evidence}{it.sample != null && <span className="text-slate-400"> · based on {fmtInt(it.sample)}</span>}</p>
                  <p className="mt-1 text-sm text-ink"><span className="font-medium">Next step:</span> {it.action}</p>
                </div>
                {it.tab && it.tab !== "overview" && <button type="button" onClick={() => onOpen(it.tab)} className="shrink-0 self-start text-xs font-medium text-teal-700 hover:underline">Open report</button>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

const lowNote = <p className="mt-2 text-xs text-slatey">* Grey rates rest on fewer than 10 observations.</p>;

function ContentTab({ data, onPage }) {
  const d = data.definitions;
  return (
    <div className="space-y-5">
      <Panel title="Page performance" description="Click a page to filter the whole report to sessions that viewed it.">
        <DataTable
          rows={data.pages.map((p) => ({ ...p, title: titleOf(p.path) }))}
          searchKey="path"
          searchLabel="Filter by page path"
          initialSort={{ key: "pageviews", dir: "desc" }}
          onRowClick={(r) => onPage(r.path)}
          rowLabel={(r) => `Filter report to ${r.path}`}
          columns={[
            { key: "path", label: "Page", render: (r) => <span>{r.path}{r.title && <span className="ml-2 font-normal text-slatey">{r.title}</span>}</span> },
            { key: "pageviews", label: "Views", align: "right", render: (r) => fmtInt(r.pageviews), definition: d.pageviews },
            { key: "visitors", label: "Visitors", align: "right", render: (r) => fmtInt(r.visitors) },
            { key: "entrances", label: "Entrances", align: "right", render: (r) => fmtInt(r.entrances), definition: d.landing_page },
            { key: "avg_engagement_s", label: "Avg. time", align: "right", render: (r) => fmtDur(r.avg_engagement_s), definition: "Average visible, in-use time per view of this page." },
            { key: "engagement_rate", label: "Engaged after landing", align: "right", render: (r) => <Rate value={r.engagement_rate} n={r.entrances} low={r.low_sample} /> },
            { key: "exit_rate", label: "Exit rate", align: "right", render: (r) => <Rate value={r.exit_rate} n={r.pageviews} low={r.pageviews < 10} />, definition: d.exit_page },
            { key: "conversions_assisted", label: "In converting visits", align: "right", render: (r) => fmtInt(r.conversions_assisted), definition: "Sessions that included this page and went on to enquire or register." },
          ]}
        />
        {lowNote}
      </Panel>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Landing pages" description="Where visits began.">
          <DataTable rows={data.landing_pages} initialSort={{ key: "entrances", dir: "desc" }} maxRows={10} columns={[
            { key: "path", label: "Page" },
            { key: "entrances", label: "Sessions", align: "right", render: (r) => fmtInt(r.entrances) },
            { key: "bounce_rate", label: "Bounce", align: "right", render: (r) => <Rate value={r.bounce_rate} n={r.entrances} low={r.low_sample} /> },
            { key: "conversions_from_landing", label: "Converted", align: "right", render: (r) => fmtInt(r.conversions_from_landing) },
          ]} />
        </Panel>
        <Panel title="Exit pages" description="Where visits ended. Exit rate = exits ÷ views of that page.">
          <DataTable rows={data.exit_pages} initialSort={{ key: "exits", dir: "desc" }} maxRows={10} columns={[
            { key: "path", label: "Page" },
            { key: "exits", label: "Exits", align: "right", render: (r) => fmtInt(r.exits) },
            { key: "pageviews", label: "Views", align: "right", render: (r) => fmtInt(r.pageviews) },
            { key: "exit_rate", label: "Exit rate", align: "right", render: (r) => <Rate value={r.exit_rate} n={r.pageviews} low={r.pageviews < 10} /> },
          ]} />
        </Panel>
      </div>
      <Panel title="Common journeys" description={`The first three pages of visits that saw more than one page (${fmtInt(data.multi_page_sessions)} sessions). Only sequences actually recorded are shown.`}>
        {data.paths.length ? (
          <Bars rows={data.paths} label="path" value="sessions" max={10} />
        ) : (
          <p className="text-sm text-slatey">No multi-page visits in this period yet.</p>
        )}
      </Panel>
    </div>
  );
}

function AcquisitionTab({ data }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Sessions by channel" actions={<button type="button" className="text-xs font-medium text-teal-700 hover:underline" onClick={() => setRulesOpen((o) => !o)} aria-expanded={rulesOpen}>{rulesOpen ? "Hide" : "How channels are decided"}</button>}>
          {rulesOpen && (
            <dl className="mb-4 space-y-1.5 rounded-lg bg-mist p-3 text-xs">
              {data.channel_rules.map((r) => <div key={r.channel}><dt className="inline font-semibold text-ink">{r.channel}: </dt><dd className="inline text-slatey">{r.rule}</dd></div>)}
              <p className="pt-1 text-slatey">Rules are applied in this order to the first page of each visit; later pages never change where a visit came from.</p>
            </dl>
          )}
          <Bars rows={data.channels} label="channel" value="sessions" empty="No sessions in this period." />
        </Panel>
        <Panel title="Channel quality">
          <DataTable rows={data.channels} initialSort={{ key: "sessions", dir: "desc" }} columns={[
            { key: "channel", label: "Channel" },
            { key: "sessions", label: "Sessions", align: "right", render: (r) => fmtInt(r.sessions) },
            { key: "visitors", label: "Visitors", align: "right", render: (r) => fmtInt(r.visitors) },
            { key: "engagement_rate", label: "Engaged", align: "right", render: (r) => <Rate value={r.engagement_rate} n={r.sessions} low={r.low_sample} /> },
            { key: "conversions", label: "Conversions", align: "right", render: (r) => fmtInt(r.conversions) },
            { key: "conversion_rate", label: "Conv. rate", align: "right", render: (r) => <Rate value={r.conversion_rate} n={r.sessions} low={r.low_sample} /> },
          ]} />
          {lowNote}
        </Panel>
      </div>
      <Panel title="Referring websites" description="Other sites that sent visits (domain only — full addresses are never stored). The site's own pages and subdomains aren't counted as referrals.">
        <DataTable rows={data.referrers} searchKey="referrer" searchLabel="Filter referrers" initialSort={{ key: "sessions", dir: "desc" }} empty="No visits arrived from other websites in this period." columns={[
          { key: "referrer", label: "Website" },
          { key: "sessions", label: "Sessions", align: "right", render: (r) => fmtInt(r.sessions) },
          { key: "visitors", label: "Visitors", align: "right", render: (r) => fmtInt(r.visitors) },
          { key: "top_landing", label: "Landed on", render: (r) => <span className="text-xs text-slatey">{r.top_landing.join(", ")}</span> },
          { key: "conversions", label: "Conversions", align: "right", render: (r) => fmtInt(r.conversions) },
        ]} />
      </Panel>
      <Panel title="Campaigns" description="Visits that arrived with utm_campaign tags.">
        {data.campaigns.length ? (
          <DataTable rows={data.campaigns} initialSort={{ key: "sessions", dir: "desc" }} columns={[
            { key: "campaign", label: "Campaign" },
            { key: "source", label: "Source" },
            { key: "medium", label: "Medium" },
            { key: "sessions", label: "Sessions", align: "right", render: (r) => fmtInt(r.sessions) },
            { key: "engagement_rate", label: "Engaged", align: "right", render: (r) => <Rate value={r.engagement_rate} n={r.sessions} low={r.low_sample} /> },
            { key: "conversions", label: "Conversions", align: "right", render: (r) => fmtInt(r.conversions) },
          ]} />
        ) : (
          <div className="rounded-lg bg-mist p-4 text-sm text-slatey">
            <p className="font-medium text-ink">No tagged campaigns in this period.</p>
            <p className="mt-1">That's a finding, not an error: campaign results need links tagged with UTM parameters. For example, a LinkedIn post linking to the WAPP page:</p>
            <code className="mt-2 block break-all rounded bg-white px-2 py-1.5 text-xs text-ink">https://onctionenergy.com/market?utm_source=linkedin&amp;utm_medium=social&amp;utm_campaign=wapp-forum-2026</code>
            <p className="mt-2">Use <code>utm_medium=email</code> for newsletters, <code>cpc</code> for search ads and <code>paid-social</code> for social ads so channels are classified correctly.</p>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ConversionsTab({ data }) {
  const s = data.summary;
  const f = data.conversions.funnel;
  const unlinked = s.enquiries + s.registrations - s.attributed_conversions;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard emphasis label="Enquiries accepted" value={fmtInt(s.enquiries)} definition={data.definitions.enquiries} />
        <MetricCard emphasis label="Registrations accepted" value={fmtInt(s.registrations)} definition={data.definitions.registrations} />
        <MetricCard label="Converting sessions" value={fmtInt(s.attributed_conversions)} sub={unlinked > 0 ? `${fmtInt(unlinked)} conversion${unlinked === 1 ? "" : "s"} not linked to a visit` : "all linked to a visit"} definition="Sessions in which an enquiry or registration was accepted. Conversions from visitors who declined analytics can't be linked to a session." />
        <MetricCard label="Conversion rate" value={fmtPct(s.conversion_rate)} sub={`${fmtInt(s.attributed_conversions)} ÷ ${fmtInt(s.sessions)} sessions`} definition={data.definitions.conversion_rate} />
      </div>
      <Panel title="Enquiries and registrations over time" description="Server-accepted submissions only — never button clicks.">
        <TrendChart series={data.series} interval={data.range.interval} keys={["enquiries", "registrations"]} labels={{ enquiries: "Enquiries", registrations: "Registrations" }} kind="bar" height={220} />
      </Panel>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Enquiry funnel" description="Sessions reaching each step. The form view and start are recorded in the browser; the last step is the server's record.">
          <Funnel steps={f.enquiry} />
        </Panel>
        <Panel title="Event registration funnel">
          <Funnel steps={f.registration} />
          <div className="mt-4 border-t border-black/[0.06] pt-3">
            <p className="text-xs font-semibold text-ink">Phone & email link clicks</p>
            <p className="mt-0.5 text-xs text-slatey">A click opens the visitor's phone or mail app — it doesn't confirm a call or email was made.</p>
            <div className="mt-2 flex gap-6 text-sm">
              {f.contact_clicks.length ? f.contact_clicks.map((c) => <span key={c.method}><span className="font-semibold tabular-nums text-ink">{fmtInt(c.count)}</span> <span className="text-slatey">{c.method}</span></span>) : <span className="text-slatey">None recorded.</span>}
            </div>
          </div>
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="By landing page">
          <DataTable rows={data.conversions.by_landing} initialSort={{ key: "conversions", dir: "desc" }} maxRows={12} columns={[
            { key: "path", label: "Landing page" },
            { key: "sessions", label: "Sessions", align: "right", render: (r) => fmtInt(r.sessions) },
            { key: "conversions", label: "Converted", align: "right", render: (r) => fmtInt(r.conversions) },
            { key: "rate", label: "Rate", align: "right", render: (r) => <Rate value={r.rate} n={r.sessions} low={r.low_sample} /> },
          ]} />
        </Panel>
        <Panel title="By channel">
          <DataTable rows={data.conversions.by_channel} initialSort={{ key: "conversions", dir: "desc" }} columns={[
            { key: "channel", label: "Channel" },
            { key: "sessions", label: "Sessions", align: "right", render: (r) => fmtInt(r.sessions) },
            { key: "conversions", label: "Converted", align: "right", render: (r) => fmtInt(r.conversions) },
            { key: "rate", label: "Rate", align: "right", render: (r) => <Rate value={r.rate} n={r.sessions} low={r.low_sample} /> },
          ]} />
        </Panel>
      </div>
      <p className="text-xs text-slatey">Lead details (names, emails, messages) never enter analytics — open <a href="/admin/enquiries" className="font-medium text-teal-700 hover:underline">Enquiries</a> to work with individual leads.</p>
    </div>
  );
}

function Funnel({ steps }) {
  const top = Math.max(steps[0]?.sessions || 0, 1);
  if (!steps.some((x) => x.sessions)) return <p className="py-3 text-sm text-slatey">No activity at any step in this period.</p>;
  return (
    <ol className="space-y-3">
      {steps.map((st, i) => {
        const prev = i ? steps[i - 1].sessions : null;
        const conv = prev ? Math.round((st.sessions / prev) * 100) : null;
        return (
          <li key={st.step}>
            <div className="mb-1 flex justify-between text-sm"><span className="text-ink">{i + 1}. {st.step}</span><span className="tabular-nums text-ink">{fmtInt(st.sessions)}{conv != null && <span className="ml-2 text-xs text-slatey">{conv}% of previous step</span>}</span></div>
            <div className="h-2 rounded-full bg-mist" aria-hidden="true"><div className="h-2 rounded-full" style={{ width: `${Math.max(2, (st.sessions / top) * 100)}%`, background: ["#86b6ef", "#3987e5", "#1c5cab"][Math.min(i, 2)] }} /></div>
          </li>
        );
      })}
    </ol>
  );
}

function AudienceTab({ data }) {
  const s = data.summary;
  const t = data.tech;
  const eng = (r) => (r.low_sample ? "" : `${r.engagement_rate ?? "—"}% engaged`);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="New and returning visitors">
          {s.new_visitors == null ? (
            <p className="text-sm text-slatey">Not available for this period: it only contains visits from the previous tracker, which couldn't recognise returning browsers.</p>
          ) : (
            <Bars rows={[{ name: "New", n: s.new_visitors }, { name: "Returning", n: s.returning_visitors }]} label="name" value="n" />
          )}
          <p className="mt-3 text-xs text-slatey">{data.definitions.new_visitors} {data.definitions.returning_visitors}</p>
        </Panel>
        <Panel title="Devices"><Bars rows={t.devices} label="name" value="sessions" extra={eng} /></Panel>
        <Panel title="Screen sizes" description="Window width when the visit began."><Bars rows={t.viewports} label="name" value="sessions" empty="Recorded from this version onwards." /></Panel>
        <Panel title="Browsers"><Bars rows={t.browsers} label="name" value="sessions" /></Panel>
        <Panel title="Operating systems"><Bars rows={t.os} label="name" value="sessions" /></Panel>
        <Panel title="Countries" description={`Coverage: ${data.geo.coverage ?? 0}% of sessions.`}>
          {data.geo.countries.length ? (
            <Bars rows={data.geo.countries.map((c) => ({ ...c, name: countryName(c.code) }))} label="name" value="sessions" />
          ) : (
            <p className="text-sm text-slatey">No country data yet. It comes from Cloudflare's country header, so it appears once the live site is served through Cloudflare — no IP addresses are looked up or stored.</p>
          )}
          <p className="mt-3 text-xs text-slatey">Countries are approximate (based on the network the visitor used) and never more precise than a country.</p>
        </Panel>
      </div>
      {s.sessions > 0 && s.small_sample && <p className="text-xs text-slatey">With {fmtInt(s.sessions)} sessions, these splits may not represent your audience yet.</p>}
    </div>
  );
}

function HealthTab({ data }) {
  const checks = data.health.checks;
  return (
    <div className="space-y-5">
      <Panel title="Tracking health" description="Checks run against the stored data for this period — not just whether the page loaded.">
        <ul className="divide-y divide-black/[0.05]">
          {checks.map((c) => {
            const [Icon, color, word] = STATUS_ICON[c.status] || STATUS_ICON.info;
            return (
              <li key={c.id} className="flex gap-3 py-3 first:pt-0">
                <Icon size={17} className={cx("mt-0.5 shrink-0", color)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{c.title} <span className={cx("ml-1 text-[11px] font-medium uppercase tracking-wide", color)}>{word}</span></p>
                  <p className="mt-0.5 text-sm text-slatey">{c.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="How the numbers are defined">
        <dl className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
          {Object.entries(data.definitions).map(([k, v]) => (
            <div key={k}><dt className="font-semibold capitalize text-ink">{k.replace(/_/g, " ")}</dt><dd className="mt-0.5 text-slatey">{v}</dd></div>
          ))}
        </dl>
      </Panel>
      <Panel title="Privacy">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slatey">
          <li>Nothing is recorded until a visitor accepts analytics in the cookie banner; declining deletes the anonymous IDs.</li>
          <li>Visitors are identified only by a random ID on their device, stored on the server as a salted hash. No IP address is stored or sent to third parties, and no fingerprinting is used.</li>
          <li>Referrers are kept as a domain only. Form contents never enter analytics; enquiries are linked to a visit by an anonymous session ID.</li>
          <li>Raw events are deleted automatically after the retention period (13 months by default, <code>ANALYTICS_RETENTION_DAYS</code>).</li>
          <li>Staff signed in to the dashboard, and anyone viewing a ?preview page, are never counted.</li>
        </ul>
      </Panel>
    </div>
  );
}
