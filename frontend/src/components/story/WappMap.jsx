import { useMemo, useState } from "react";
import { useInView } from "../../motion/useInView.js";

// Stylised network of the 14 WAPP member states and the main regional
// interconnection corridors. Deliberately a network diagram, not a
// geographic map: nodes sit at approximate positions (lon/lat projected
// linearly), and corridors are simplified — the goal is to show how the
// region's grids link up and where Onction's home market sits.
const COUNTRIES = [
  { id: "SN", name: "Senegal", lat: 14.6, lon: -14.8 },
  { id: "GM", name: "The Gambia", lat: 13.3, lon: -16.2, labelDy: 22 },
  { id: "GW", name: "Guinea-Bissau", lat: 11.9, lon: -15.2, labelDx: -8, labelAnchor: "end" },
  { id: "GN", name: "Guinea", lat: 10.4, lon: -10.9 },
  { id: "SL", name: "Sierra Leone", lat: 8.4, lon: -11.9, labelAnchor: "end", labelDx: -10 },
  { id: "LR", name: "Liberia", lat: 6.4, lon: -9.4, labelDy: 24 },
  { id: "CI", name: "Côte d'Ivoire", lat: 7.5, lon: -5.5 },
  { id: "ML", name: "Mali", lat: 13.4, lon: -7.5 },
  { id: "BF", name: "Burkina Faso", lat: 12.3, lon: -1.6 },
  { id: "GH", name: "Ghana", lat: 7.9, lon: -1.1, labelDy: 24 },
  { id: "TG", name: "Togo", lat: 8.6, lon: 0.9, labelDy: 24 },
  { id: "BJ", name: "Benin", lat: 9.4, lon: 2.4 },
  { id: "NE", name: "Niger", lat: 14.2, lon: 4.5 },
  { id: "NG", name: "Nigeria", lat: 9.1, lon: 8.1, home: true },
];

export const CORRIDORS = [
  { key: "coastal", name: "Coastal backbone", route: ["NG", "BJ", "TG", "GH", "CI"], note: "Links the coastal systems from Nigeria to Côte d'Ivoire." },
  { key: "clsg", name: "CLSG line", route: ["CI", "LR", "SL", "GN"], note: "Côte d'Ivoire–Liberia–Sierra Leone–Guinea interconnection." },
  { key: "omvg", name: "OMVG loop", route: ["GN", "GW", "GM", "SN"], note: "The Gambia River Basin interconnection." },
  { key: "north", name: "North core", route: ["NG", "NE", "BF"], note: "Northern corridor linking Nigeria, Niger and Burkina Faso." },
  { key: "sahel", name: "Sahel links", route: ["GH", "BF", "ML", "SN"], note: "Connections into the Sahel from the coast." },
  { key: "ci-ml", name: "Côte d'Ivoire–Mali", route: ["CI", "ML"], note: "Interconnection between Côte d'Ivoire and Mali." },
];

const K = 44;
const project = ({ lat, lon }) => ({ x: (lon + 18.5) * K, y: (17.5 - lat) * K });

export default function WappMap() {
  const [ref, inView] = useInView({ threshold: 0.25 });
  const [focus, setFocus] = useState("NG");
  const [corridor, setCorridor] = useState(null);
  const nodes = useMemo(() => Object.fromEntries(COUNTRIES.map((c) => [c.id, { ...c, ...project(c) }])), []);

  const paths = useMemo(
    () =>
      CORRIDORS.map((c) => ({
        ...c,
        d: c.route
          .map((id, i) => {
            const n = nodes[id];
            if (i === 0) return `M${n.x.toFixed(0)} ${n.y.toFixed(0)}`;
            const p = nodes[c.route[i - 1]];
            const mx = (p.x + n.x) / 2;
            const my = (p.y + n.y) / 2 - Math.hypot(n.x - p.x, n.y - p.y) * 0.12;
            return `Q${mx.toFixed(0)} ${my.toFixed(0)} ${n.x.toFixed(0)} ${n.y.toFixed(0)}`;
          })
          .join(" "),
      })),
    [nodes]
  );

  const focused = nodes[focus];
  const linked = CORRIDORS.filter((c) => c.route.includes(focus));
  const lit = (c) => (corridor ? corridor === c.key : c.route.includes(focus));

  return (
    <div ref={ref} className={`grid gap-8 lg:grid-cols-[1fr_320px] ${inView ? "is-in" : ""}`}>
      <div className="relative overflow-x-auto border border-white/10 bg-navy-950">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden="true"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        <svg viewBox="0 0 1280 560" className="relative h-auto w-full min-w-[680px]" role="img" aria-label="Network diagram of the 14 West African Power Pool member states and their main interconnection corridors">
          {paths.map((c, i) => (
            <g key={c.key} className="transition-opacity duration-400" opacity={lit(c) ? 1 : 0.28}>
              <path d={c.d} pathLength="1" className="dr" fill="none" stroke={lit(c) ? "#13C2B6" : "#8aa0b8"} strokeWidth={lit(c) ? 3 : 2} style={{ "--d": `${200 + i * 160}ms` }} />
              {lit(c) && <path d={c.d} pathLength="1" className="flow" fill="none" stroke="#F7B955" strokeWidth="3" strokeLinecap="round" />}
            </g>
          ))}
          {COUNTRIES.map((c, i) => {
            const n = nodes[c.id];
            const on = c.id === focus;
            const connected = linked.some((l) => l.route.includes(c.id));
            return (
              <g
                key={c.id}
                role="button"
                tabIndex={0}
                aria-label={`${c.name}${c.home ? ", Onction's home market" : ""}`}
                aria-pressed={on}
                onPointerEnter={(e) => e.pointerType === "mouse" && (setFocus(c.id), setCorridor(null))}
                onFocus={() => { setFocus(c.id); setCorridor(null); }}
                onClick={() => setFocus(c.id)}
                className="map-node cursor-pointer outline-none"
                style={{ "--d": `${120 + i * 60}ms` }}
              >
                {c.home && <circle cx={n.x} cy={n.y} r="18" className="pulse-ring fill-teal-400/40" />}
                <circle cx={n.x} cy={n.y} r="22" fill="transparent" />
                <circle cx={n.x} cy={n.y} r={c.home ? 11 : on ? 9 : 7} className="transition-all duration-400"
                  fill={on || c.home ? "#13C2B6" : connected ? "#2DD4BF" : "#F8F5EC"} stroke="#06121F" strokeWidth="3" />
                <text
                  x={n.x + (c.labelDx ?? 14)}
                  y={n.y + (c.labelDy ?? 5)}
                  textAnchor={c.labelAnchor || "start"}
                  className={`select-none font-outfit text-[17px] transition-colors duration-400 ${on ? "fill-teal-400 font-semibold" : "fill-white/70"}`}
                >
                  {c.name}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="sticky left-0 px-4 pb-3 text-[11px] uppercase tracking-[0.16em] text-white/35">Simplified network · not to scale<span className="sm:hidden"> · swipe to explore</span></p>
      </div>

      {/* Detail panel */}
      <div className="flex flex-col gap-6">
        <div key={focus} className="border border-white/10 bg-white/[0.04] p-6 animate-fadeUp">
          <p className="eyebrow-light">{focused.home ? "Home market" : "WAPP member"}</p>
          <h3 className="mt-2 font-syne text-2xl font-medium text-white">{focused.name}</h3>
          {focused.home ? (
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Onction is licensed by the Nigerian Electricity Regulatory Commission as a bulk electricity trader, with trading hubs in Lagos and Abuja.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-white/70">Part of the regional market Onction trades into as a WAPP participant.</p>
          )}
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-white/45">Corridors</p>
          <ul className="mt-2 space-y-1.5 text-sm text-white/85">
            {linked.length ? linked.map((l) => <li key={l.key}>— {l.name}</li>) : <li className="text-white/50">No corridor shown</li>}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.14em] text-white/45">Highlight a corridor</p>
          <div className="flex flex-wrap gap-2">
            {CORRIDORS.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={corridor === c.key}
                // Hover and keyboard focus preview; a tap toggles. A tap also
                // focuses the button (Android) and fires a mouseenter, which
                // used to preview it a moment before the click toggled it off.
                onPointerEnter={(e) => e.pointerType === "mouse" && setCorridor(c.key)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setCorridor(null)}
                onFocus={(e) => e.target.matches(":focus-visible") && setCorridor(c.key)}
                onBlur={() => setCorridor(null)}
                onClick={() => setCorridor((cur) => (cur === c.key ? null : c.key))}
                title={c.note}
                className={`border px-3 py-1.5 text-xs transition-colors duration-400 ${corridor === c.key ? "border-teal-400 bg-teal-500 text-navy-950" : "border-white/20 text-white/75 hover:border-teal-400"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
