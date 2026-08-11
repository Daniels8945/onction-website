// A single-headline number, optionally with a status delta. Deltas always
// pair an icon with the color (never color alone) per the dataviz status
// rule, and only render when there's a real prior-period baseline to
// compare against.
export default function StatTile({ label, value, deltaPct }) {
  const hasDelta = typeof deltaPct === "number";
  const isUp = hasDelta && deltaPct >= 0;

  return (
    <div className="card">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-syne text-3xl font-semibold text-ink">{value}</p>
      {hasDelta && (
        <p
          className="mt-1 flex items-center gap-1 text-xs font-medium"
          style={{ color: isUp ? "#006300" : "#d03b3b" }}
        >
          <span aria-hidden="true">{isUp ? "▲" : "▼"}</span>
          {Math.abs(deltaPct)}% vs previous period
        </p>
      )}
    </div>
  );
}
