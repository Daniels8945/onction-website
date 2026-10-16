import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LuArrowDown, LuArrowUp, LuChevronDown, LuChevronUp, LuInfo, LuMinus } from "react-icons/lu";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cx } from "../components/ui.jsx";

// Building blocks for the Analytics page. Colours follow the validated
// reference palette (dataviz skill): categorical slots in fixed order for
// series identity; status colours (with an icon and words, never alone) for
// changes vs the previous period.
export const SERIES_COLORS = { pageviews: "#2a78d6", visitors: "#eb6834", sessions: "#1baf7a", enquiries: "#2a78d6", registrations: "#eb6834" };
const STATUS = { good: "#0a7d0a", bad: "#c22f2f", neutral: "#52514e" }; // darker text-safe steps of status good/critical
const GRID = "#e1e0d9";
const MUTED = "#6f6e69";

// ── formatting ───────────────────────────────────────────────────────────────
export const fmtInt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-GB"));
export const fmtPct = (n) => (n == null ? "—" : `${n}%`);
export function fmtDur(s) {
  if (s == null) return "—";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
}
export function fmtBucket(b, interval) {
  if (interval === "hour") return b.slice(11, 16);
  const d = new Date(`${b.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── definition popover (click/tap/keyboard, not hover-only) ─────────────────
export function Definition({ text, label = "What this means" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  if (!text) return null;
  return (
    <span ref={ref} className="relative inline-flex">
      <button type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50">
        <LuInfo size={13} aria-hidden="true" />
      </button>
      {open && (
        <span id={id} role="tooltip" className="absolute left-1/2 top-6 z-30 w-64 -translate-x-1/2 rounded-lg border border-black/10 bg-white p-3 text-left text-xs font-normal leading-relaxed text-slatey shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

// ── change vs previous period ────────────────────────────────────────────────
// polarity: "up" = higher is better, "down" = lower is better, "none" = neither
export function Delta({ value, polarity = "up", available, note }) {
  if (!available) return null; // the toolbar explains why there's no comparison
  if (value == null) return <span className="text-xs text-slate-400">— vs previous</span>;
  const flat = Math.abs(value) < 0.5;
  const good = polarity === "none" || flat ? null : (value > 0) === (polarity === "up");
  const color = good == null ? STATUS.neutral : good ? STATUS.good : STATUS.bad;
  const Icon = flat ? LuMinus : value > 0 ? LuArrowUp : LuArrowDown;
  const words = flat ? "No change" : `${value > 0 ? "Up" : "Down"} ${Math.abs(value)}%`;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color }}>
      <Icon size={12} aria-hidden="true" />
      {words}
      <span className="font-normal text-slatey">vs previous</span>
    </span>
  );
}

export function MetricCard({ label, value, sub, delta, polarity, comparison, definition, emphasis = false, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button", onClick } : {})}
      className={cx(
        "flex min-w-0 flex-col rounded-xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(10,31,60,0.04)]",
        emphasis ? "border-black/[0.09]" : "border-black/[0.06]",
        onClick && "transition hover:border-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
      )}
    >
      <span className="flex items-center gap-1 text-xs font-medium text-slatey">
        {label}
        <Definition text={definition} label={`What ${label.toLowerCase()} means`} />
      </span>
      <span className={cx("mt-1.5 font-syne font-semibold tabular-nums text-ink", emphasis ? "text-[1.85rem] leading-tight" : "text-2xl")}>{value}</span>
      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {delta !== undefined && <Delta value={delta} polarity={polarity} available={comparison?.available} note={comparison?.note} />}
        {sub && <span className="text-xs text-slatey">{sub}</span>}
      </span>
    </Tag>
  );
}

// ── time series ──────────────────────────────────────────────────────────────
function SeriesTooltip({ active, payload, label, keys, labels, interval, prev }) {
  if (!active || !payload?.length) return null;
  const i = payload[0]?.payload?._i;
  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-ink">{label}{interval === "hour" ? " WAT" : ""}</p>
      {keys.map((k) => {
        const p = payload.find((x) => x.dataKey === k);
        if (!p) return null;
        const before = prev?.[i]?.[k];
        return (
          <div key={k} className="flex items-center gap-1.5 text-slatey">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[k] }} />
            {labels[k]}: <span className="font-medium tabular-nums text-ink">{fmtInt(p.value)}</span>
            {before != null && <span className="text-slate-400">(prev. {fmtInt(before)})</span>}
          </div>
        );
      })}
    </div>
  );
}

export function TrendChart({ series, previous, interval, keys, labels, kind = "line", height = 260 }) {
  const [shown, setShown] = useState(() => new Set(keys));
  const [asTable, setAsTable] = useState(false);
  const data = useMemo(() => series.map((r, i) => ({ ...r, _i: i, label: fmtBucket(r.bucket, interval), ...Object.fromEntries(keys.map((k) => [`prev_${k}`, previous?.[i]?.[k] ?? null])) })), [series, previous, keys, interval]);
  const active = keys.filter((k) => shown.has(k));
  const toggle = (k) => setShown((s) => {
    const n = new Set(s);
    if (n.has(k) && n.size > 1) n.delete(k);
    else n.add(k);
    return n;
  });
  const allZero = series.every((r) => keys.every((k) => !r[k]));
  const uncollected = series.filter((r) => r.collected === false).length;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Series">
          {keys.map((k) => (
            <button key={k} type="button" aria-pressed={shown.has(k)} onClick={() => toggle(k)} className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition", shown.has(k) ? "border-black/15 bg-white text-ink" : "border-transparent bg-mist text-slate-400")}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: shown.has(k) ? SERIES_COLORS[k] : "#c9c8c2" }} />
              {labels[k]}
            </button>
          ))}
          {previous && kind === "line" && <span className="inline-flex items-center gap-1.5 px-1 text-xs text-slatey"><span className="inline-block w-4 border-t-2 border-dashed border-slate-400" /> previous period</span>}
        </div>
        <button type="button" onClick={() => setAsTable((t) => !t)} className="text-xs font-medium text-teal-700 hover:underline" aria-pressed={asTable}>{asTable ? "Show chart" : "Show as table"}</button>
      </div>
      {asTable ? (
        <div className="max-h-[300px] overflow-auto rounded-lg border border-black/[0.06]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-mist text-xs text-slatey"><tr><th className="px-3 py-2 text-left font-medium">Period</th>{keys.map((k) => <th key={k} className="px-3 py-2 text-right font-medium">{labels[k]}</th>)}</tr></thead>
            <tbody>{series.map((r, i) => <tr key={r.bucket} className="border-t border-black/[0.04]"><td className="px-3 py-1.5 text-ink">{r.bucket}</td>{keys.map((k) => <td key={k} className="px-3 py-1.5 text-right tabular-nums">{r[k] == null ? <span className="text-slate-400">no data</span> : fmtInt(r[k])}{previous?.[i] && <span className="ml-1 text-xs text-slate-400">/ {fmtInt(previous[i][k])}</span>}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={height}>
            {kind === "bar" ? (
              <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={16} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<SeriesTooltip keys={active} labels={labels} interval={interval} />} cursor={{ fill: "rgba(10,31,60,0.04)" }} />
                {active.map((k) => <Bar key={k} dataKey={k} fill={SERIES_COLORS[k]} radius={[4, 4, 0, 0]} maxBarSize={18} />)}
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={16} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<SeriesTooltip keys={active} labels={labels} interval={interval} prev={previous} />} cursor={{ stroke: GRID }} />
                {previous && active.map((k) => <Line key={`p-${k}`} dataKey={`prev_${k}`} stroke={SERIES_COLORS[k]} strokeOpacity={0.45} strokeDasharray="4 4" strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={false} />)}
                {active.map((k) => <Line key={k} type="linear" dataKey={k} stroke={SERIES_COLORS[k]} strokeWidth={2} dot={data.length <= 14 ? { r: 3, strokeWidth: 0, fill: SERIES_COLORS[k] } : false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />)}
              </LineChart>
            )}
          </ResponsiveContainer>
          {allZero && <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slatey">{uncollected === series.length ? "No data was being collected in this period." : "No activity recorded in this period."}</p>}
        </div>
      )}
    </div>
  );
}

// ── horizontal value bars (single series, values written out) ───────────────
export function Bars({ rows, label, value, format = fmtInt, extra, empty = "Nothing recorded.", max = 8 }) {
  if (!rows?.length) return <p className="py-4 text-sm text-slatey">{empty}</p>;
  const top = rows.slice(0, max);
  const peak = Math.max(...top.map((r) => r[value] || 0), 1);
  const total = rows.reduce((a, r) => a + (r[value] || 0), 0);
  return (
    <ul className="space-y-2.5">
      {top.map((r) => (
        <li key={r[label]}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink" title={r[label]}>{r[label]}</span>
            <span className="shrink-0 tabular-nums text-ink">
              {format(r[value])}
              <span className="ml-1.5 text-xs text-slatey">{total ? `${Math.round((r[value] / total) * 100)}%` : ""}</span>
              {extra && <span className="ml-2 text-xs text-slatey">{extra(r)}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-mist" aria-hidden="true">
            <div className="h-1.5 rounded-full" style={{ width: `${Math.max(2, (r[value] / peak) * 100)}%`, background: SERIES_COLORS.pageviews }} />
          </div>
        </li>
      ))}
      {rows.length > max && <li className="text-xs text-slatey">+ {rows.length - max} more (see export)</li>}
    </ul>
  );
}

// ── sortable, searchable table ───────────────────────────────────────────────
export function DataTable({ rows, columns, initialSort, searchKey, searchLabel = "Search", onRowClick, rowLabel, empty = "No data in this period.", maxRows = 50 }) {
  const [sort, setSort] = useState(initialSort);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (rows || []).filter((r) => !term || String(r[searchKey] ?? "").toLowerCase().includes(term));
    const col = columns.find((c) => c.key === sort?.key);
    if (!col) return list;
    return [...list].sort((a, b) => {
      const x = a[col.key], y = b[col.key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const d = typeof x === "string" ? x.localeCompare(y) : x - y;
      return sort.dir === "asc" ? d : -d;
    });
  }, [rows, q, sort, columns, searchKey]);
  return (
    <div>
      {searchKey && rows?.length > 5 && (
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchLabel} aria-label={searchLabel}
          className="mb-3 block w-full max-w-xs rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
      )}
      {!filtered.length ? (
        <p className="py-6 text-center text-sm text-slatey">{q ? "Nothing matches that search." : empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/[0.06]">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-mist/70 text-xs text-slatey">
              <tr>
                {columns.map((c) => {
                  const on = sort?.key === c.key;
                  return (
                    <th key={c.key} scope="col" aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cx("whitespace-nowrap px-3 py-2 font-medium", c.align === "right" ? "text-right" : "text-left")}>
                      <button type="button" onClick={() => setSort({ key: c.key, dir: on && sort.dir === "desc" ? "asc" : "desc" })} className={cx("inline-flex items-center gap-1 hover:text-ink", on && "text-ink")}>
                        {c.label}
                        {c.definition && <span onClick={(e) => e.stopPropagation()}><Definition text={c.definition} /></span>}
                        {on ? sort.dir === "asc" ? <LuChevronUp size={12} /> : <LuChevronDown size={12} /> : null}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, maxRows).map((r, i) => (
                <tr key={i} className={cx("border-t border-black/[0.04]", onRowClick && "cursor-pointer hover:bg-mist/60")} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                  {columns.map((c, ci) => (
                    <td key={c.key} className={cx("px-3 py-2", c.align === "right" ? "text-right tabular-nums" : "text-left", ci === 0 && "max-w-[280px] truncate font-medium text-ink")}>
                      {ci === 0 && onRowClick ? (
                        <button type="button" className="max-w-full truncate text-left hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50" onClick={(e) => { e.stopPropagation(); onRowClick(r); }} aria-label={rowLabel ? rowLabel(r) : undefined}>
                          {c.render ? c.render(r) : r[c.key]}
                        </button>
                      ) : c.render ? c.render(r) : r[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > maxRows && <p className="border-t border-black/[0.04] px-3 py-2 text-xs text-slatey">Showing {maxRows} of {filtered.length}. Export for the full list.</p>}
        </div>
      )}
    </div>
  );
}

/** A rate whose denominator is too small is shown, but greyed with its sample. */
export function Rate({ value, n, low }) {
  if (value == null) return <span className="text-slate-400">—</span>;
  return (
    <span className={low ? "text-slate-400" : undefined} title={low ? `Based on ${n} — too few for a reliable rate` : undefined}>
      {value}%{low && <span className="ml-0.5 text-[10px]">*</span>}
    </span>
  );
}
