import { Link } from "react-router-dom";
import SplitText from "../../motion/SplitText.jsx";
import Parallax from "../../motion/Parallax.jsx";
import Reveal from "../Reveal.jsx";
import { useInView } from "../../motion/useInView.js";
import { useFontsReady } from "../../motion/useFontsReady.js";
import MediaVisual from "./MediaVisual.jsx";
import { pageCopy } from "../../data/pages.js";

// Media & Gallery opening. An energy network draws itself across the right
// of the hero — the same line language as the homepage map — and each node
// it reaches opens into a photograph from the gallery: Onction's market
// connections giving way to the people and moments behind them. The frames
// sit at different depths and drift apart slightly with the scroll on
// desktop. Static (fully drawn, all open) for reduced motion; the copy
// never waits on it.

// Frames in a 100×80 box: x, y, w, h (percent) + parallax speed + delay.
const FRAMES = [
  { x: 4, y: 12, w: 50, h: 46, speed: 0.04, d: 900 },
  { x: 60, y: 0, w: 36, h: 40, speed: 0.1, d: 1250 },
  { x: 50, y: 52, w: 44, h: 38, speed: 0.07, d: 1600 },
  { x: 14, y: 66, w: 26, h: 26, speed: 0.13, d: 1950 },
];
const centre = (f) => [f.x + f.w / 2, f.y + f.h / 2];

export default function MediaHero({ items, onOpen }) {
  const fontsReady = useFontsReady();
  const [ref, inView] = useInView({ threshold: 0.1 });
  const frames = FRAMES.slice(0, Math.max(items.length, 0));
  const nodes = (frames.length ? frames : FRAMES).map(centre);
  // A route through the nodes plus spurs out to the edges of the composition.
  const route = nodes.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y * 0.8}`).join(" ");
  const spurs = [
    `M0 ${nodes[0][1] * 0.8} L${nodes[0][0]} ${nodes[0][1] * 0.8}`,
    `M${nodes[1][0]} ${nodes[1][1] * 0.8} L100 6`,
    `M${nodes[2][0]} ${nodes[2][1] * 0.8} L100 70`,
  ];

  return (
    <section className="relative isolate overflow-hidden bg-navy-950 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "26px 26px" }} />
      <div className="wrap relative grid min-h-[720px] gap-12 pb-16 pt-[calc(clamp(64px,7.5vw,91px)+1.75rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:pb-24">
        <div style={{ visibility: fontsReady ? "visible" : "hidden" }}>
          <nav aria-label="Breadcrumb" className="font-outfit text-sm font-medium tracking-wide text-[#f8f5ec]">
            <Link to="/" className="mx-1.5 font-light hover:text-teal-400">Home</Link>
            <span className="mx-1.5" aria-hidden="true">/</span>
            <Link to="/news" className="mx-1.5 font-light hover:text-teal-400">News and media</Link>
            <span className="mx-1.5" aria-hidden="true">/</span>
            <span aria-current="page">Media & gallery</span>
          </nav>
          <SplitText as="h1" text={pageCopy.media.hero.title} accent={pageCopy.media.hero.accent} accentClassName="text-teal-400" className="mt-14 font-display text-4xl font-bold leading-[1.05] sm:mt-20 sm:text-5xl md:text-[3.4rem]" />
          <Reveal delay={350}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-[17px]">
              {pageCopy.media.hero.intro}
            </p>
          </Reveal>
          <Reveal delay={500} className="mt-9 flex flex-wrap gap-x-8 gap-y-3 font-outfit text-sm">
            <a href="#featured" className="group inline-flex items-center gap-2 font-semibold uppercase tracking-[0.12em] text-white hover:text-teal-400">
              Featured stories <span className="nudge text-teal-400" aria-hidden="true">→</span>
            </a>
            <a href="#gallery" className="group inline-flex items-center gap-2 font-semibold uppercase tracking-[0.12em] text-white hover:text-teal-400">
              Browse the gallery <span className="nudge text-teal-400" aria-hidden="true">→</span>
            </a>
          </Reveal>
        </div>

        {/* The network → photographs composition */}
        <div ref={ref} className={`relative mx-auto aspect-[5/4] w-full max-w-[720px] ${inView ? "is-in" : ""}`}>
          <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {spurs.map((d, i) => (
              <path key={i} d={d} pathLength="1" className="dr" fill="none" stroke="rgba(138,160,184,0.5)" strokeWidth="0.18" style={{ "--d": `${200 + i * 150}ms` }} />
            ))}
            <path id="media-route" d={route} pathLength="1" className="dr" fill="none" stroke="#13c2b6" strokeWidth="0.3" style={{ "--d": "300ms" }} />
          </svg>
          {/* nodes sit outside the stretched SVG so they stay round */}
          {nodes.map(([x, y], i) => (
            <span key={i} className="media-node absolute h-3 w-3 rounded-full border-2 border-teal-400 bg-navy-950" style={{ left: `${x}%`, top: `${y}%`, "--d": `${FRAMES[i].d - 250}ms` }} aria-hidden="true" />
          ))}
          {frames.map((f, i) => {
            const item = items[i];
            return (
              <div key={item.id} className="absolute" style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, height: `${f.h}%` }}>
                <Parallax speed={f.speed} className="h-full w-full">
                  <button
                    type="button"
                    onClick={() => onOpen(item.id)}
                    aria-label={`Open: ${item.title}`}
                    className="group block h-full w-full overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.45)] outline-none ring-teal-400 ring-offset-2 ring-offset-navy-950 focus-visible:ring-2"
                  >
                    <div className={`ir ir-bottom h-full w-full ${inView ? "is-in" : ""}`} style={{ "--d": `${f.d}ms` }}>
                      <MediaVisual item={item} eager={i === 0} />
                    </div>
                  </button>
                </Parallax>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
