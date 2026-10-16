import { useEffect, useRef, useState } from "react";
import { useInView } from "../../motion/useInView.js";
import { useReducedMotion } from "../../motion/motionPreference.js";
import { ECOSYSTEM } from "../../data/partners.js";
import { Arrow } from "../icons.jsx";

// The electricity market around Onction, as an interactive map: supply-side
// roles on the left, demand-side roles on the right, Onction's desk at the
// centre where they meet. Energy (amber, into the desk) and delivered power
// (teal, out to buyers) move along the lines; two-way relationships carry
// both. Picking a role highlights its line and filters the directory below.
//
// A description of the market, not a claim of agreements — the note under
// the map says so. 2D SVG on purpose: readable on a phone, operable from the
// keyboard, and nothing to download before it can be used.

const W = 1000, H = 600, HUB = [500, 300];
const POS = {
  generation: [150, 120],
  infrastructure: [110, 300],
  finance: [150, 480],
  distribution: [850, 120],
  customers: [890, 300],
  collaboration: [850, 480],
};
const NODES = ECOSYSTEM.map((e, i) => ({ ...e, n: i + 1, pos: POS[e.key] }));

// Line from a role to the desk, bowed gently towards the vertical centre.
function linePath([x, y]) {
  const [hx, hy] = HUB;
  const mx = (x + hx) / 2, my = (y + hy) / 2 + (y < hy ? 26 : y > hy ? -26 : 0);
  return `M${x} ${y} Q${mx} ${my} ${hx + (x < hx ? -58 : 58)} ${hy}`;
}

export default function EcosystemMap({ active, onSelect, counts }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView({ threshold: 0.25 });
  const svgRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const shown = hovered || active;
  const info = NODES.find((n) => n.key === shown);

  // Pause the flowing particles while the map is off-screen.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg?.pauseAnimations || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting && !reduced ? svg.unpauseAnimations() : svg.pauseAnimations()));
    io.observe(svg);
    return () => io.disconnect();
  }, [reduced]);

  const toggle = (key) => onSelect(active === key ? null : key);
  const nodeProps = (key) => ({
    role: "button",
    tabIndex: 0,
    "aria-pressed": active === key,
    onClick: () => toggle(key),
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle(key);
      }
    },
    onPointerEnter: (e) => e.pointerType === "mouse" && setHovered(key),
    onPointerLeave: (e) => e.pointerType === "mouse" && setHovered(null),
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:items-center">
      <div ref={ref} className={`eco-map-wrap relative ${inView ? "is-in" : ""} ${shown ? "eco2-focus" : ""}`}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="The roles in the electricity market around Onction">
          <defs>
            <radialGradient id="eco2Glow">
              <stop offset="0%" stopColor="#13c2b6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#13c2b6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* sides */}
          <text x="60" y="36" className="eco2-side">SUPPLY</text>
          <text x={W - 60} y="36" textAnchor="end" className="eco2-side">DEMAND</text>
          <line x1={HUB[0]} y1="40" x2={HUB[0]} y2={H - 40} className="eco2-divider dr" pathLength="1" style={{ "--d": "200ms" }} />

          {/* lines + energy moving along them */}
          {NODES.map((n, i) => {
            const d = linePath(n.pos);
            const on = shown === n.key;
            return (
              <g key={n.key} className={`eco2-link ${on ? "on" : ""}`} data-key={n.key}>
                <path id={`eco2-l-${n.key}`} d={d} pathLength="1" className="dr eco2-line" style={{ "--d": `${400 + i * 120}ms` }} />
                {/* toward the desk = energy in (amber); away = power out (teal) */}
                {!reduced &&
                  (n.flow === "both" ? ["in", "out"] : [n.flow]).map((dir, k) => (
                    <circle key={dir} r={on ? 5 : 3.6} className={`eco2-p eco2-p-${dir}`}>
                      <animateMotion dur={`${3.6 + (i % 3) * 0.5}s`} begin={`${-(i * 0.7 + k * 1.8)}s`} repeatCount="indefinite" keyPoints={dir === "in" ? "0;1" : "1;0"} keyTimes="0;1" calcMode="linear">
                        <mpath href={`#eco2-l-${n.key}`} />
                      </animateMotion>
                    </circle>
                  ))}
              </g>
            );
          })}

          {/* Onction at the centre */}
          <g className="eco2-hub">
            <circle cx={HUB[0]} cy={HUB[1]} r="150" fill="url(#eco2Glow)" />
            <circle cx={HUB[0]} cy={HUB[1]} r="58" className="eco2-ring" style={{ transformOrigin: `${HUB[0]}px ${HUB[1]}px` }} />
            <circle cx={HUB[0]} cy={HUB[1]} r="36" className="eco2-inner" />
            <circle cx={HUB[0]} cy={HUB[1]} r="12" className="eco2-core" />
            <text x={HUB[0]} y={HUB[1] + 92} textAnchor="middle" className="eco2-hub-label">ONCTION</text>
            <text x={HUB[0]} y={HUB[1] + 116} textAnchor="middle" className="eco2-small">Bulk electricity trader</text>
          </g>

          {/* roles */}
          {NODES.map((n, i) => {
            const [x, y] = n.pos;
            const left = n.side === "supply";
            const on = shown === n.key;
            return (
              <g key={n.key} className={`eco2-node ${on ? "on" : ""} ${active === n.key ? "pinned" : ""}`} style={{ "--d": `${300 + i * 120}ms` }} aria-label={`${n.label}${counts[n.key] ? `, ${counts[n.key]} organisations` : ""}`} {...nodeProps(n.key)}>
                <circle cx={x} cy={y} r="44" fill="transparent" />
                <circle cx={x} cy={y} r="26" className="eco2-node-ring" />
                <text x={x} y={y + 7} textAnchor="middle" className="eco2-node-n">{String(n.n).padStart(2, "0")}</text>
                {/* long labels wrap after their "&" */}
                {(n.label.includes(" & ") ? [n.label.split(" & ")[0] + " &", n.label.split(" & ")[1]] : [n.label]).map((line, k, all) => (
                  <text key={k} x={left ? x + 40 : x - 40} y={y - 40 - (all.length - 1 - k) * 24} textAnchor={left ? "start" : "end"} className="eco2-label hidden md:inline">
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
        <p className="mt-4 text-xs leading-relaxed text-white/45">Illustrative. Shows the roles in the market and how power and value move between them — not specific organisations, agreements or volumes.</p>
      </div>

      {/* Detail panel + the same choices as plain buttons (the primary control on phones) */}
      <div>
        <div className="min-h-[220px] border border-white/10 bg-white/[0.04] p-6 sm:p-7" aria-live="polite">
          <div key={shown || "intro"} className="animate-fadeUp">
            {info ? (
              <>
                <p className="font-outfit text-[11px] uppercase tracking-[0.2em] text-teal-400">
                  {String(info.n).padStart(2, "0")} · {info.side === "supply" ? "Supply side" : "Demand side"}
                </p>
                <h3 className="mt-2 font-syne text-2xl font-medium text-white">{info.label}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{info.role}</p>
                <p className="mt-3 border-l-2 border-teal-500 pl-3 text-sm leading-relaxed text-white/85">{info.onction}</p>
              </>
            ) : (
              <>
                <p className="font-outfit text-[11px] uppercase tracking-[0.2em] text-teal-400">Explore the market</p>
                <h3 className="mt-2 font-syne text-2xl font-medium text-white">Where Onction sits</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Power flows in from generators and out to the businesses that use it; finance, the grid and specialist partners keep it moving. Choose a role to see how Onction works with it.
                </p>
              </>
            )}
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {NODES.map((n) => (
            <li key={n.key}>
              <button
                type="button"
                aria-pressed={active === n.key}
                onClick={() => toggle(n.key)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(n.key)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(null)}
                className={`group flex w-full items-center gap-3 border px-4 py-3 text-left font-outfit text-sm transition-colors duration-400 ${
                  active === n.key ? "border-teal-400 bg-teal-500 text-navy-950" : "border-white/15 text-white/85 hover:border-teal-400"
                }`}
              >
                <span className={`text-xs tabular-nums ${active === n.key ? "text-navy-950/70" : "text-teal-400"}`}>{String(n.n).padStart(2, "0")}</span>
                <span className="flex-1">{n.label}</span>
                {counts[n.key] > 0 && <span className={`text-xs ${active === n.key ? "text-navy-950/70" : "text-white/45"}`}>{counts[n.key]}</span>}
                <Arrow width={14} height={14} className={`nudge ${active === n.key ? "" : "text-teal-400"}`} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
