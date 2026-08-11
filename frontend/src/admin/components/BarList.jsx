// A ranked list as horizontal bars — built in plain HTML rather than a
// charting library, per the dataviz skill's guidance for simple rankings.
// Single measure across categories -> one hue (sequential blue), not one
// color per row.
const SERIES_BLUE = "#2a78d6";

export default function BarList({ items, labelKey, valueKey, emptyLabel = "No data yet" }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-slatey">{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((i) => i[valueKey]), 1);

  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-secondary text-ink" title={item[labelKey]}>
              {item[labelKey]}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-slatey">{item[valueKey]}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item[valueKey] / max) * 100}%`, background: SERIES_BLUE }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
