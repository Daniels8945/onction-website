import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "../../motion/useInView.js";
import { useSceneMode } from "../../motion/sceneMode.js";
import { useReducedMotion } from "../../motion/motionPreference.js";
import Parallax from "../../motion/Parallax.jsx";
import SplitText from "../../motion/SplitText.jsx";
import Reveal from "../Reveal.jsx";

// "Living still" between Quick Links and Metrics: a cinematic, mostly-static
// composition of West Africa's energy ecosystem with Onction at the point
// where supply meets demand.
//
// Everything here is CONCEPTUAL. The coastline and Nigeria are simplified
// silhouettes; generation and demand nodes stand for kinds of participants
// (placed at plausible locations such as demand at major cities), not
// specific assets; no trading routes, volumes or shares are asserted. The
// only factual anchors are Onction's offices (Lagos HQ, Abuja), Nigeria as
// its licensed home market, and the WAPP region it participates in.
//
// Motion: on entering view it assembles in stages (map → Nigeria →
// generation → grid → flows into the market → Onction → offtakers → energy
// in motion), then settles into an ambient state — slow particles, a gently
// turning market ring, and a soft wave of connectivity rippling from
// Nigeria across the region. Pauses when off-screen; static when reduced.

// ── Geography (lon, lat), projected linearly ─────────────────────────────
const LON0 = -18, LAT0 = 18.5, K = 47;
const P = ([lon, lat]) => [(lon - LON0) * K, (LAT0 - lat) * K];

const REGION = [[-17.2, 18.5], [-16.3, 16.4], [-16.9, 15.2], [-17.5, 14.7], [-16.8, 13.9], [-16.7, 12.5], [-16.2, 11.9], [-15.4, 11.1], [-14.8, 10.6], [-13.7, 9.6], [-13.2, 8.5], [-12.4, 7.4], [-11.4, 6.8], [-10.8, 6.3], [-9.4, 5.4], [-7.6, 4.4], [-6.0, 4.5], [-4.0, 5.25], [-2.9, 5.0], [-2.0, 4.75], [-1.0, 5.1], [0.0, 5.6], [1.2, 6.1], [2.4, 6.35], [3.4, 6.45], [4.5, 6.3], [5.0, 5.8], [5.6, 4.9], [6.1, 4.3], [7.0, 4.4], [8.3, 4.6], [9.0, 4.0], [9.6, 3.9], [9.8, 3.0], [16, 3.0], [16, 18.5]];
const NIGERIA = [[2.7, 6.4], [3.4, 6.45], [4.5, 6.3], [5.0, 5.8], [5.6, 4.9], [6.1, 4.3], [7.0, 4.4], [8.3, 4.6], [8.6, 4.8], [9.4, 6.3], [10.3, 7.0], [11.9, 7.1], [12.5, 8.5], [13.3, 9.8], [14.2, 11.2], [14.6, 12.1], [13.6, 13.7], [12.5, 13.1], [11.0, 13.4], [9.6, 12.8], [8.1, 13.3], [6.8, 13.1], [5.6, 13.8], [4.1, 13.5], [3.6, 12.4], [3.6, 11.6], [2.8, 9.8], [2.7, 9.1]];

// The coast alone (the REGION polygon minus its inland box edges).
const COAST = REGION.slice(0, REGION.findIndex(([lon, lat]) => lon === 9.8 && lat === 3.0) + 1);
const coastPath = COAST.map((pt, i) => `${i ? "L" : "M"}${P(pt)[0].toFixed(0)} ${P(pt)[1].toFixed(0)}`).join("");

function inside([x, y], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Nigeria's six geopolitical zones (states are official; outlines are
// simplified — dots are assigned to a zone by these rough polygons).
export const ZONES = [
  { key: "nw", name: "North West", poly: [[3.4, 10.0], [3.6, 13.9], [10.2, 13.4], [10.3, 11.3], [8.6, 9.3], [6.0, 10.3], [4.2, 10.3]],
    states: ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"],
    role: "Large population centres such as Kano and Kaduna make it a major centre of electricity demand, with strong solar potential across the Sahel." },
  { key: "ne", name: "North East", poly: [[10.2, 13.4], [14.8, 13.8], [14.8, 11.0], [13.0, 8.5], [11.8, 6.6], [10.3, 7.0], [9.6, 8.6], [9.8, 10.5], [10.3, 11.3]],
    states: ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
    role: "A vast zone where widening reliable access to electricity is central to the SDG 7 goal of energy for all." },
  { key: "nc", name: "North Central", poly: [[2.7, 9.2], [3.4, 10.0], [4.2, 10.3], [6.0, 10.3], [8.6, 9.3], [9.8, 10.5], [9.6, 8.6], [10.3, 7.0], [9.2, 6.6], [8.6, 7.1], [7.2, 7.0], [6.5, 7.8], [5.4, 8.2], [4.4, 8.3], [3.0, 8.6]],
    states: ["Benue", "FCT Abuja", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
    role: "Home to Abuja — where Onction has an office — and to the hydro stations on the Niger and Kaduna rivers at Kainji, Jebba and Shiroro." },
  { key: "sw", name: "South West", poly: [[2.6, 6.3], [4.5, 6.2], [5.0, 5.8], [5.3, 6.9], [5.7, 7.6], [5.4, 8.2], [4.4, 8.3], [3.0, 8.6], [2.6, 9.2]],
    states: ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
    role: "Home to Lagos — Onction's head office and the country's largest commercial and industrial hub." },
  { key: "se", name: "South East", poly: [[6.7, 5.8], [6.7, 6.9], [7.2, 7.0], [8.2, 6.9], [8.3, 6.2], [7.8, 5.2], [7.2, 5.2]],
    states: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
    role: "Dense commercial and manufacturing activity around cities such as Aba, Onitsha and Enugu drives strong demand." },
  { key: "ss", name: "South South", poly: null,
    states: ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
    role: "The Niger Delta — the centre of Nigeria's gas production and home to many of its gas-fired power stations." },
];

function zoneOf([lon, lat]) {
  for (const k of ["se", "sw", "nc", "nw", "ne"]) {
    if (inside([lon, lat], ZONES.find((z) => z.key === k).poly)) return k;
  }
  if (lat < 7.9) return "ss";
  if (lon > 10) return "ne";
  return lat > 10.3 ? "nw" : "nc";
}

// Halftone silhouette: every dot is a zero-length round-capped segment in
// one <path>, so ~1,500 dots cost a single element (one path per zone).
function buildDots() {
  let region = "", ng = "";
  const zones = Object.fromEntries(ZONES.map((z) => [z.key, { d: "", sx: 0, sy: 0, n: 0 }]));
  for (let lat = 3.2; lat <= 18.3; lat += 0.42) {
    for (let lon = -17.8; lon <= 15.8; lon += 0.42) {
      if (!inside([lon, lat], REGION)) continue;
      const [x, y] = P([lon, lat]);
      const seg = `M${x.toFixed(1)} ${y.toFixed(1)}h0`;
      if (inside([lon, lat], NIGERIA)) {
        ng += seg;
        const z = zones[zoneOf([lon, lat])];
        z.d += seg; z.sx += x; z.sy += y; z.n += 1;
      }
      else region += seg;
    }
  }
  Object.values(zones).forEach((z) => { z.cx = z.sx / z.n; z.cy = z.sy / z.n; });
  return { region, ng, zones };
}

// ── Participants (conceptual) ────────────────────────────────────────────
const HUB = [3.4, 6.45]; // Lagos head office
const ABUJA = [7.49, 9.06];
const GEN_NG = [[6.0, 5.1], [7.1, 5.0], [5.6, 5.9], [4.1, 6.95], [4.6, 9.9], [5.0, 9.3], [6.8, 9.95], [8.6, 12.0], [11.2, 11.6], [6.2, 12.7], [9.4, 13.0]];
const GEN_REGION = [[-0.1, 6.3], [-5.2, 6.4], [-11.0, 10.4], [-15.8, 14.9], [-1.5, 12.2], [-8.0, 12.6], [2.1, 13.5]];
const DEMAND_NG = [[3.35, 6.62], [3.9, 7.4], [5.6, 6.34], [7.0, 4.8], [6.8, 6.15], [7.5, 6.45], ABUJA, [7.44, 10.5], [8.5, 12.0], [8.9, 9.9], [13.15, 11.8], [5.25, 13.06], [4.55, 8.5]];
const DEMAND_REGION = [[-0.2, 5.6], [-4.0, 5.35], [1.2, 6.15], [2.4, 6.4], [-1.5, 12.37], [-8.0, 12.64], [2.1, 13.5], [-17.4, 14.7], [-13.7, 9.55], [-13.2, 8.48], [-10.8, 6.3], [-16.6, 13.45], [-15.6, 11.86]];

function curve(a, b, bend = 0.18) {
  const [x1, y1] = P(a), [x2, y2] = P(b);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  return `M${x1.toFixed(0)} ${y1.toFixed(0)}Q${(mx - dy * bend).toFixed(0)} ${(my + dx * bend).toFixed(0)} ${x2.toFixed(0)} ${y2.toFixed(0)}`;
}

// Grid mesh: each node joins its two nearest neighbours.
function buildMesh(points) {
  const edges = new Set();
  const out = [];
  points.forEach((p, i) => {
    points
      .map((q, j) => [j, Math.hypot(p[0] - q[0], p[1] - q[1])])
      .filter(([j, d]) => j !== i && d < 6.5)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .forEach(([j]) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!edges.has(key)) {
          edges.add(key);
          out.push(curve(p, points[j], 0.06));
        }
      });
  });
  return out;
}

const STEPS = [
  { title: "Generation", body: "Gas-fired plants and solar, wind and hydro projects produce power." },
  { title: "Transmission", body: "The grid carries it across the country and between neighbours." },
  { title: "Energy market", body: "Supply and demand meet — bilateral, exchange and regional." },
  { title: "Onction", body: "We aggregate supply, structure the deal and manage the risk." },
  { title: "Offtakers", body: "Utilities and large consumers receive dependable power." },
];

const DESKTOP_VIEW = "0 0 1600 740";
const MOBILE_VIEW = "690 250 660 495"; // Nigeria, centred on the Onction hub

const NODE_INFO = {
  hub: { eyebrow: "Onction", title: "Lagos · head office", body: "A NERC-licensed bulk electricity trader: aggregating supply, structuring the deal and managing the risk between generators and buyers.", link: ["About Onction", "/about"] },
  abuja: { eyebrow: "Onction", title: "Abuja office", body: "Our second trading hub, in the Federal Capital Territory.", link: ["Our offices", "/contact#offices"] },
  gen: { eyebrow: "Generation", title: "Power producers", body: "Gas-fired plants and solar, wind and hydro projects that need a dependable route to market. Positions shown are illustrative.", link: ["How we trade", "/how-we-trade"] },
  demand: { eyebrow: "Offtakers", title: "Utilities & large consumers", body: "Distribution companies and commercial and industrial users that receive power under structured supply contracts. Positions are illustrative.", link: ["Power purchase & sale", "/solutions#power-purchase-and-sale"] },
  wapp: { eyebrow: "Regional market", title: "West African Power Pool", body: "Neighbouring markets across the WAPP region, where Onction participates in cross-border trading.", link: ["Our market", "/market"] },
};

// Card describing whatever is hovered/selected on the map.
function ExploreCard({ active, pinned, onClear }) {
  let content;
  if (!active) {
    content = (
      <>
        <p className="eco-card-eyebrow">Explore Nigeria</p>
        <p className="eco-card-title">Our home market</p>
        <p className="eco-card-body">Hover or tap a region of Nigeria, or any point on the network, to see how power moves through it.</p>
      </>
    );
  } else if (active.startsWith("zone:")) {
    const z = ZONES.find((x) => x.key === active.slice(5));
    content = (
      <>
        <p className="eco-card-eyebrow">Geopolitical zone</p>
        <p className="eco-card-title">{z.name}</p>
        <p className="eco-card-body">{z.role}</p>
        <p className="eco-card-states">{z.states.join(" · ")}</p>
      </>
    );
  } else {
    const n = NODE_INFO[active.slice(5)];
    content = (
      <>
        <p className="eco-card-eyebrow">{n.eyebrow}</p>
        <p className="eco-card-title">{n.title}</p>
        <p className="eco-card-body">{n.body}</p>
        <a href={n.link[1]} className="eco-card-link group">
          {n.link[0]} <span className="nudge" aria-hidden="true">→</span>
        </a>
      </>
    );
  }
  return (
    <div className="eco-card" aria-live="polite">
      <div key={active || "intro"} className="animate-fadeUp">{content}</div>
      {pinned && (
        <button type="button" onClick={onClear} className="eco-card-clear" aria-label="Clear selection">
          ×
        </button>
      )}
    </div>
  );
}

export default function EcosystemStory() {
  const mode = useSceneMode();
  const reduced = useReducedMotion();
  const [ref, inView] = useInView({ threshold: 0.3 });
  const netRef = useRef(null);
  const [view, setView] = useState(DESKTOP_VIEW);
  // Explore: hover previews, click/tap pins. Items are zones or node kinds.
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(null);
  const active = hovered || pinned;
  const activeZone = active?.startsWith("zone:") ? active.slice(5) : null;
  const explore = (id) => ({
    onMouseEnter: () => setHovered(id),
    onMouseLeave: () => setHovered(null),
    onFocus: () => setHovered(id),
    onBlur: () => setHovered(null),
    onClick: () => setPinned((p) => (p === id ? null : id)),
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setPinned((p) => (p === id ? null : id));
      } else if (e.key === "Escape") {
        setPinned(null);
      }
    },
  });

  const dots = useMemo(buildDots, []);
  const mesh = useMemo(() => buildMesh([HUB, ...GEN_NG, ...GEN_REGION, ...DEMAND_NG, ...DEMAND_REGION]), []);
  const inFlows = useMemo(() => GEN_NG.map((g, i) => curve(g, HUB, i % 2 ? 0.2 : -0.2)), []);
  const outFlows = useMemo(() => DEMAND_NG.map((d, i) => curve(HUB, d, i % 2 ? -0.16 : 0.16)), []);
  const [hx, hy] = P(HUB);
  const [ax, ay] = P(ABUJA);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const set = () => setView(mq.matches ? MOBILE_VIEW : DESKTOP_VIEW);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  // Pause the SMIL particles and CSS loops whenever the section is off-screen.
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = netRef.current?.closest("section");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const svg = netRef.current;
    if (!svg?.pauseAnimations) return;
    live && !reduced ? svg.unpauseAnimations() : svg.pauseAnimations();
  }, [live, reduced]);

  const svgProps = { viewBox: view, preserveAspectRatio: "xMidYMid slice", className: "absolute inset-0 h-full w-full", "aria-hidden": true };

  return (
    <section
      id="ecosystem"
      data-mode={mode}
      className={`eco relative isolate overflow-hidden ${live ? "" : "eco-paused"}`}
      aria-labelledby="eco-heading"
    >
      <div className="wrap relative pt-20 sm:pt-24">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div>
            <Reveal variant="fade">
              <p className="eco-eyebrow mb-3 font-outfit text-xs uppercase tracking-[0.22em]">The energy ecosystem</p>
            </Reveal>
            <SplitText
              as="h2"
              text="Where West Africa's power meets its market"
              accent="its market"
              accentClassName="eco-accent"
              className="eco-title max-w-2xl font-syne text-3xl font-medium leading-[1.1] sm:text-5xl"
            />
            <span id="eco-heading" className="sr-only">Where West Africa's power meets its market</span>
          </div>
          <Reveal delay={200}>
            <p className="eco-body max-w-xl font-outfit leading-relaxed">
              Electricity is generated, carried across the grid, traded and delivered. Onction sits where supply meets demand —
              aggregating it, structuring the deal and moving power to the businesses and communities that need it, at home in
              Nigeria and across the West African Power Pool.
            </p>
          </Reveal>
        </div>
      </div>

      {/* ── The living composition ── */}
      <div ref={ref} className={`relative mt-10 ${inView ? "is-in" : ""}`}>
        <div className="relative mx-auto aspect-[4/3] w-full max-w-[1600px] md:aspect-[1600/740]">
          {/* Layer 1: halftone map */}
          <Parallax speed={0.03} className="absolute inset-0">
            <svg {...svgProps}>
              {/* The coastline defines the shape; the inland north and east
                  dissolve so it reads as a region, not a box. */}
              <defs>
                <radialGradient id="ecoFadeGrad" gradientUnits="userSpaceOnUse" cx="930" cy="600" r="900">
                  <stop offset="0.35" stopColor="#fff" />
                  <stop offset="0.78" stopColor="#fff" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <mask id="ecoFade" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="740">
                  <rect width="1600" height="740" fill="url(#ecoFadeGrad)" />
                </mask>
              </defs>
              <g className="eco-map" mask="url(#ecoFade)">
                <path d={dots.region} className="eco-dots" strokeWidth="4.2" strokeLinecap="round" />
                <path d={coastPath} pathLength="1" className="dr eco-coast" style={{ "--d": "300ms" }} />
              </g>
              <g className={`eco-ng ${activeZone ? "eco-exploring" : ""}`}>
                {ZONES.map((z) => (
                  <path key={z.key} d={dots.zones[z.key].d} className={`eco-dots-ng eco-zone ${activeZone === z.key ? "on" : ""}`} strokeWidth="4.6" strokeLinecap="round" />
                ))}
              </g>
              {activeZone && (
                <text x={dots.zones[activeZone].cx} y={dots.zones[activeZone].cy + 6} textAnchor="middle" className="eco-zone-label">
                  {ZONES.find((z) => z.key === activeZone).name.toUpperCase()}
                </text>
              )}
              <g className="eco-labels">
                <text x={P([8.7, 10.9])[0]} y={P([8.7, 10.9])[1]} textAnchor="middle" className="eco-country">NIGERIA</text>
                <text x={P([-9.5, 16.8])[0]} y={P([-9.5, 16.8])[1]} className="eco-region">WEST AFRICA · WAPP REGION</text>
              </g>
            </svg>
          </Parallax>

          {/* Layer 2: network, flows, nodes */}
          <Parallax speed={0.06} className="absolute inset-0">
            <svg {...svgProps} ref={netRef}>
              <defs>
                <radialGradient id="ecoHubGlow">
                  <stop offset="0%" stopColor="var(--eco-glow)" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="var(--eco-glow)" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* explore: invisible hit areas over each zone (thick strokes on the zone's dots) */}
              <g className="eco-hits">
                {ZONES.map((z) => (
                  <path
                    key={z.key}
                    d={dots.zones[z.key].d}
                    className="eco-hit"
                    stroke="transparent"
                    strokeWidth="24"
                    strokeLinecap="round"
                    pointerEvents="stroke"
                    role="button"
                    tabIndex={0}
                    aria-label={`${z.name} zone`}
                    aria-pressed={pinned === `zone:${z.key}`}
                    {...explore(`zone:${z.key}`)}
                  />
                ))}
              </g>

              {/* regional connectivity wave (conceptual reach, not routes) */}
              <g className="eco-wave">
                {[0, 1].map((k) => (
                  <circle key={k} cx={hx} cy={hy} r="40" vectorEffect="non-scaling-stroke" className="eco-ripple" style={{ animationDelay: `${4.6 + k * 4}s` }} />
                ))}
              </g>

              {/* transmission mesh */}
              <g className="eco-mesh">
                {mesh.map((d, i) => (
                  <path key={i} d={d} pathLength="1" className="dr eco-mesh-line" style={{ "--d": `${1300 + (i % 12) * 40}ms` }} />
                ))}
              </g>

              {/* supply flowing into the market */}
              <g className="eco-in">
                {inFlows.map((d, i) => (
                  <path key={i} id={`eco-in-${i}`} d={d} pathLength="1" className="dr eco-in-line" style={{ "--d": `${2100 + i * 45}ms` }} />
                ))}
              </g>
              {/* delivered power flowing to offtakers */}
              <g className="eco-out">
                {outFlows.map((d, i) => (
                  <path key={i} id={`eco-out-${i}`} d={d} pathLength="1" className="dr eco-out-line" style={{ "--d": `${3300 + i * 40}ms` }} />
                ))}
              </g>
              <path d={`M${hx} ${hy}L${ax} ${ay}`} pathLength="1" className="dr eco-office-link" style={{ "--d": "2900ms" }} />

              {/* regional nodes: lit by the wave as it passes */}
              <g className="eco-regional eco-clickable" role="button" tabIndex={0} aria-label="West African Power Pool markets" {...explore("node:wapp")}>
                {[...GEN_REGION, ...DEMAND_REGION].map((p, i) => {
                  const [x, y] = P(p);
                  const dist = Math.hypot(x - hx, y - hy);
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="14" fill="transparent" />
                      <circle cx={x} cy={y} r="4" className="eco-rnode" style={{ "--d": `${900 + i * 30}ms`, animationDelay: `${4.6 + dist / 260}s` }} />
                    </g>
                  );
                })}
              </g>

              {/* generation (Nigeria) */}
              <g className={`eco-gen eco-clickable ${active === "node:gen" ? "eco-kind-on" : ""}`} role="button" tabIndex={0} aria-label="Generation" {...explore("node:gen")}>
                {GEN_NG.map((p, i) => {
                  const [x, y] = P(p);
                  return (
                    <g key={i} className="eco-node" style={{ "--d": `${900 + i * 45}ms` }}>
                      <circle cx={x} cy={y} r="16" fill="transparent" />
                      <circle cx={x} cy={y} r="9" className="eco-gen-ring" />
                      <circle cx={x} cy={y} r="3.5" className="eco-gen-core" />
                    </g>
                  );
                })}
              </g>

              {/* offtakers (Nigeria) */}
              <g className={`eco-demand eco-clickable ${active === "node:demand" ? "eco-kind-on" : ""}`} role="button" tabIndex={0} aria-label="Offtakers" {...explore("node:demand")}>
                {DEMAND_NG.map((p, i) => {
                  const [x, y] = P(p);
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="15" fill="transparent" />
                      <rect x={x - 4.5} y={y - 4.5} width="9" height="9" className="eco-node eco-demand-node" style={{ "--d": `${3100 + i * 35}ms` }} />
                    </g>
                  );
                })}
              </g>

              {/* energy in motion */}
              {!reduced && (
                <g className="eco-particles">
                  {inFlows.map((_, i) => (
                    <circle key={`i${i}`} r="4" className="eco-p-in">
                      <animateMotion dur={`${6 + (i % 4)}s`} begin={`-${(i * 1.7) % 6}s`} repeatCount="indefinite">
                        <mpath href={`#eco-in-${i}`} />
                      </animateMotion>
                      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.85;1" dur={`${6 + (i % 4)}s`} begin={`-${(i * 1.7) % 6}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
                  {outFlows.map((_, i) => (
                    <circle key={`o${i}`} r="3.6" className="eco-p-out">
                      <animateMotion dur={`${5 + (i % 5)}s`} begin={`-${(i * 1.3) % 5}s`} repeatCount="indefinite">
                        <mpath href={`#eco-out-${i}`} />
                      </animateMotion>
                      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur={`${5 + (i % 5)}s`} begin={`-${(i * 1.3) % 5}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
                </g>
              )}

              {/* Abuja office */}
              <g className="eco-office eco-clickable" role="button" tabIndex={0} aria-label="Abuja office" {...explore("node:abuja")}>
                <circle cx={ax} cy={ay} r="18" fill="transparent" />
                <circle cx={ax} cy={ay} r="7" className="eco-office-dot" />
                <text x={ax + 14} y={ay + 5} className="eco-small-label">Abuja</text>
              </g>

              {/* Onction: the market ring and the hub at its centre */}
              <g className="eco-hub eco-clickable" style={{ transformOrigin: `${hx}px ${hy}px` }} role="button" tabIndex={0} aria-label="Onction — Lagos head office" {...explore("node:hub")}>
                <circle cx={hx} cy={hy} r="120" fill="url(#ecoHubGlow)" />
                <circle cx={hx} cy={hy} r="66" className="eco-market-ring" style={{ transformOrigin: `${hx}px ${hy}px` }} />
                <circle cx={hx} cy={hy} r="40" className="eco-market-inner" />
                <circle cx={hx} cy={hy} r="15" className="eco-core" style={{ transformOrigin: `${hx}px ${hy}px` }} />
                <circle cx={hx} cy={hy} r="15" className="eco-transact" style={{ transformOrigin: `${hx}px ${hy}px` }} />
                <text x={hx - 128} y={hy - 36} textAnchor="end" className="eco-small-label">Supply</text>
                <text x={hx + 128} y={hy - 36} className="eco-small-label">Demand</text>
                <text x={hx} y={hy + 100} textAnchor="middle" className="eco-hub-label">ONCTION</text>
                <text x={hx} y={hy + 122} textAnchor="middle" className="eco-small-label">Lagos · head office</text>
              </g>
            </svg>
          </Parallax>

          {/* Explore card — desktop overlay (phones get it below the map) */}
          <div className="absolute left-4 top-4 z-10 hidden w-[310px] md:block">
            <ExploreCard active={active} pinned={!!pinned} onClear={() => setPinned(null)} />
          </div>

          {/* Key */}
          <div className="eco-key pointer-events-none absolute bottom-3 right-4 hidden gap-5 font-outfit text-[11px] uppercase tracking-[0.14em] md:flex">
            <span className="inline-flex items-center gap-2"><span className="eco-key-gen" /> Generation</span>
            <span className="inline-flex items-center gap-2"><span className="eco-key-hub" /> Onction & market</span>
            <span className="inline-flex items-center gap-2"><span className="eco-key-dem" /> Offtakers</span>
          </div>
        </div>

        {/* Story strip — lights up in step with the entrance */}
        <div className="wrap">
          <div className="mb-2 mt-4 md:hidden">
            <ExploreCard active={active} pinned={!!pinned} onClear={() => setPinned(null)} />
          </div>
          <ol className="eco-steps flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:gap-px md:overflow-visible">
            {STEPS.map((s, i) => (
              <li key={s.title} className="eco-step min-w-[70%] snap-start pt-5 sm:min-w-[40%] md:min-w-0" style={{ "--d": `${[900, 1300, 2100, 2700, 3300][i]}ms` }}>
                <span className="eco-step-bar block h-0.5" />
                <p className="mt-4 font-outfit text-xs tabular-nums">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="eco-step-title mt-1 font-syne text-lg font-medium">{s.title}</h3>
                <p className="eco-step-body mt-1 max-w-[16rem] text-sm leading-snug">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="eco-note mt-6 text-xs">Illustrative. Nodes represent the kinds of participants in the market — not specific assets, routes or volumes.</p>
        </div>

        {/* Hand-off to "Metrics that matter": the story settles, then the evidence */}
        <div className="flex flex-col items-center pb-2 pt-10">
          <span className="eco-handoff-label font-outfit text-[11px] uppercase tracking-[0.22em]">In numbers</span>
          <span className="eco-handoff mt-3 block h-14 w-px" />
        </div>
      </div>
    </section>
  );
}
