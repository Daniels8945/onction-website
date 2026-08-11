import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Single measure over time -> one hue. Same slot-1 blue as the traffic
// chart's "pageviews" series, for a consistent read across the dashboard.
const SERIES_BLUE = "#2a78d6";
const GRIDLINE = "#e1e0d9";
const MUTED = "#898781";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-black/10 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-ink">{label}</p>
      <div className="flex items-center gap-1.5 text-slatey">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: SERIES_BLUE }} />
        Enquiries: <span className="font-medium text-ink">{payload[0].value}</span>
      </div>
    </div>
  );
}

export default function EnquiriesChart({ series }) {
  if (!series || series.length === 0) {
    return <p className="text-sm text-slatey">No enquiries in this window yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="enquiriesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_BLUE} stopOpacity={0.25} />
            <stop offset="100%" stopColor={SERIES_BLUE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRIDLINE} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRIDLINE }} />
        <Area
          type="monotone"
          dataKey="enquiries"
          stroke={SERIES_BLUE}
          strokeWidth={2}
          fill="url(#enquiriesFill)"
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
