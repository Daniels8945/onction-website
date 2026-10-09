import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import InnerHero from "../components/page/InnerHero.jsx";
import SectionTitle from "../components/page/SectionTitle.jsx";
import PageEnd from "../components/page/PageEnd.jsx";
import Reveal from "../components/Reveal.jsx";
import EnergyLandscape from "../components/story/EnergyLandscape.jsx";
import { useScrollProgress } from "../motion/useScrollProgress.js";
import { useInView } from "../motion/useInView.js";
import { useReducedMotion } from "../motion/motionPreference.js";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { capability, highlights } from "../data/content.js";
import { Arrow, Check } from "../components/icons.jsx";

import pylonsImg from "../../assets/fre-sonneveld-q6n8nIrDQHE-unsplash.jpg";
import marketImg from "../../assets/site/aerial-network.jpg";

// The journey of a megawatt through Onction. Each step restates what the
// company already says about itself (content.js) — the page's job is to put
// those claims in the order the electricity actually travels.
const STEPS = [
  {
    title: "It starts at the plant",
    body: "Gas-fired power stations and solar, wind and hydro projects generate electricity. We give them a route to market — contracting their output so capacity doesn't sit idle and renewable production reaches buyers.",
  },
  {
    title: "Our desk matches supply to demand",
    body: "The trading desk aggregates supply and demand and structures the deal: long, medium or short-term contracts, bilateral or exchange-style, with banking and swap arrangements where positions need balancing.",
  },
  {
    title: "Scheduled onto the grid, around the clock",
    body: "Power travels over the transmission network to where it's needed. Our 24/7 desk handles scheduling, regulatory compliance and real-time transaction monitoring so every megawatt is delivered as contracted.",
  },
  {
    title: "Delivered to the people who need it",
    body: "Utilities and large commercial and industrial consumers receive dependable supply at competitive tariffs — backed by sound controls and timely commercial settlement.",
  },
  {
    title: "And across borders",
    body: "As a participant in the West African Power Pool, we trade across the region's interconnectors — moving surplus to where demand is, and balancing seasonal positions between neighbouring markets.",
  },
];

// Capability line → the solution that delivers it.
const WAYS = [
  { text: capability.items[0], to: "exchange-and-bilateral-transactions" },
  { text: capability.items[1], to: "cross-border-and-wapp-trading" },
  { text: capability.items[2], to: "power-banking-and-swaps" },
  { text: capability.items[3], to: "renewable-energy-solutions" },
  { text: capability.items[4], to: "exchange-and-bilateral-transactions" },
];

function PinnedStory() {
  const [ref, step] = useScrollProgress({ steps: STEPS.length });
  return (
    <section ref={ref} className="relative hidden bg-navy-950 text-white lg:block" style={{ height: `${STEPS.length * 90 + 60}vh` }} aria-label="The journey of a megawatt">
      <div className="sticky top-0 flex h-screen h-svh flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden="true"
          style={{ backgroundImage: "linear-gradient(to right,rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.12) 1px,transparent 1px)", backgroundSize: "64px 64px" }} />
        <div className="wrap relative grid flex-1 grid-cols-[minmax(320px,400px)_1fr] items-center gap-10 pt-24">
          {/* Captions */}
          <div>
            <p className="eyebrow-light mb-6">The journey of a megawatt</p>
            <div className="relative min-h-[300px]">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  aria-hidden={i !== step}
                  className={`absolute inset-0 transition-all duration-600 ease-out-expo ${
                    i === step ? "translate-y-0 opacity-100" : i < step ? "-translate-y-6 opacity-0" : "translate-y-6 opacity-0"
                  }`}
                >
                  <p className="font-outfit text-sm text-teal-400">{String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}</p>
                  <h2 className="mt-3 font-syne text-3xl font-medium leading-tight xl:text-4xl">{s.title}</h2>
                  <p className="mt-5 leading-relaxed text-white/70">{s.body}</p>
                </div>
              ))}
            </div>
            {/* Progress rail */}
            <div className="mt-8">
              <div className="h-px w-full bg-white/15">
                <div className="h-px origin-left bg-teal-400" style={{ transform: "scaleX(var(--p, 0))" }} />
              </div>
              <ol className="mt-3 flex justify-between font-outfit text-xs text-white/40">
                {STEPS.map((s, i) => (
                  <li key={s.title} className={`transition-colors duration-400 ${i <= step ? "text-teal-400" : ""}`}>{String(i + 1).padStart(2, "0")}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Landscape — wider than its column and panned by scroll */}
          <div className="relative min-w-0 overflow-hidden">
            <div className="w-[150%]" style={{ transform: "translate3d(calc(var(--p, 0) * -33.333%), 0, 0)" }}>
              <EnergyLandscape activeStep={step} />
            </div>
          </div>
        </div>
        <p className="wrap relative pb-6 text-xs uppercase tracking-[0.18em] text-white/35">Scroll to follow the power</p>
      </div>
    </section>
  );
}

// Phones and tablets get the pinned scene's story without the pinning: once
// the landscape scrolls into view it draws stage by stage on its own (the same
// --p the desktop scroll drives), panning along with the power until the
// visitor takes over the swipe. Reduced motion shows the finished drawing.
const PLAY_MS = 6000;

function usePlayedStory(enabled) {
  const [ref, inView] = useInView({ threshold: 0.35 });
  const scrollerRef = useRef(null);
  const [step, setStep] = useState(enabled ? 0 : -1);

  useEffect(() => {
    if (!enabled || !inView) return;
    const el = ref.current, scroller = scrollerRef.current;
    let frame = 0, panning = true;
    const stopPan = () => (panning = false);
    scroller.addEventListener("pointerdown", stopPan, { passive: true });
    scroller.addEventListener("wheel", stopPan, { passive: true });
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / PLAY_MS);
      const p = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // ease in-out
      el.style.setProperty("--p", p.toFixed(4));
      if (panning) scroller.scrollLeft = p * (scroller.scrollWidth - scroller.clientWidth);
      setStep(t === 1 ? -1 : Math.min(STEPS.length - 1, Math.floor(p * STEPS.length)));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("pointerdown", stopPan);
      scroller.removeEventListener("wheel", stopPan);
    };
  }, [enabled, inView, ref]);

  // step -1 = finished (or never animated): every stage lit, as before.
  // --p starts at 0 (nothing drawn) and is then driven directly on the
  // element; the prop never changes, so re-renders don't reset it.
  return { ref, scrollerRef, step, style: enabled ? { "--p": 0 } : undefined };
}

function StackedStory({ always = false }) {
  const story = usePlayedStory(!always);
  return (
    <section className={`bg-navy-950 py-16 text-white ${always ? "" : "lg:hidden"}`} aria-label="The journey of a megawatt">
      <div className="wrap">
        <p className="eyebrow-light mb-6">The journey of a megawatt</p>
        <div ref={story.scrollerRef} className="-mx-[clamp(1.25rem,3vw,4rem)] overflow-x-auto px-[clamp(1.25rem,3vw,4rem)] pb-2">
          <div ref={story.ref} style={story.style} className="w-[720px] text-teal-400/80 sm:w-[900px]">
            <EnergyLandscape activeStep={story.step} showAll={story.step === -1} />
          </div>
        </div>
        <p className="mt-2 text-xs text-white/40">Swipe to see the full picture</p>
        <ol className="mt-10 space-y-8 border-l border-teal-500/40 pl-6">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} className="relative">
              <span className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-teal-400" aria-hidden="true" />
              <p className="font-outfit text-sm text-teal-400">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="mt-1 font-syne text-2xl font-medium">{s.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function HowWeTradePage() {
  const reduced = useReducedMotion();
  usePageMeta("How we trade", "How electricity moves from generators, through Onction's 24/7 trading desk, to utilities, industry and across West Africa.");

  return (
    <main>
      <InnerHero
        crumb="How we trade"
        title="How we move power across West Africa"
        accent="move power"
        intro={capability.body}
        image={pylonsImg}
      />

      {/* The pinned, panning scene is skipped entirely for reduced motion */}
      {reduced ? <StackedStory always /> : (
        <>
          <PinnedStory />
          <StackedStory />
        </>
      )}

      {/* Ways we transact → solutions */}
      <section className="bg-white">
        <div className="wrap grid gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <SectionTitle eyebrow={capability.eyebrow} title="The arrangements behind every trade" accent="every trade" intro="Flexible purchase and sale arrangements keep supply diversified and dependable. Each one maps to a service you can engage us for." />
          <ul className="divide-y divide-black/10 border-y border-black/10">
            {WAYS.map((w, i) => (
              <Reveal as="li" key={w.text} delay={i * 70}>
                <Link to={`/solutions#${w.to}`} className="group flex items-center gap-5 py-5">
                  <span className="font-outfit text-sm text-teal-600">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1 text-[17px] leading-snug text-navy-900 transition-colors duration-400 group-hover:text-teal-700">{w.text}</span>
                  <Arrow width={18} height={18} className="nudge shrink-0 text-teal-600" />
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* The desk */}
      <section className="relative isolate overflow-hidden bg-mist">
        <div className="wrap grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Reveal variant="fade">
              <p className="font-display text-[clamp(5rem,14vw,11rem)] font-bold leading-none text-navy-900">
                24<span className="text-teal-500">/</span>7
              </p>
            </Reveal>
            <SectionTitle className="mt-4" title="A desk that never closes" accent="never closes" intro="Electricity is traded, scheduled and delivered in real time. Our desk is staffed for exactly that." />
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {highlights.items.slice(1, 5).map((h, i) => (
              <Reveal as="li" key={h.title} delay={i * 80} className="border border-black/5 bg-white p-6">
                <Check width={20} height={20} className="text-teal-600" />
                <h3 className="mt-4 font-semibold text-navy-900">{h.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slatey">{h.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <PageEnd next={{ title: "Our market: the West African Power Pool", to: "/market", image: marketImg, summary: "Fourteen nations, one regional electricity market." }} />
    </main>
  );
}

