import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Validated categorical pair (see dataviz skill's validate_palette.js — both
// checks pass against our white/mist card surfaces): slot 1 blue = pageviews,
// slot 2 orange = unique visitors. Fixed order, never cycled.
const SERIES = {
  pageviews: { color: "#2a78d6", label: "Pageviews" },
  unique_visitors: { color: "#eb6834", label: "Unique visitors" },
};

const GRIDLINE = "#e1e0d9";
const MUTED = "#898781";

function Legend() {
  return (
    <div className="mb-3 flex gap-4">
      {Object.values(SERIES).map((s) => (
        <div key={s.label} className="flex items-center gap-1.5 text-xs text-slatey">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
          {s.label}
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-black/10 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5 text-slatey">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: SERIES[p.dataKey].color }} />
          {SERIES[p.dataKey].label}: <span className="font-medium text-ink">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function TrafficChart({ series }) {
  if (!series || series.length === 0) {
    return <p className="text-sm text-slatey">No traffic recorded in this window yet.</p>;
  }

  return (
    <div>
      <Legend />
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRIDLINE} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRIDLINE }} />
          <Line
            type="monotone"
            dataKey="pageviews"
            stroke={SERIES.pageviews.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="unique_visitors"
            stroke={SERIES.unique_visitors.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
