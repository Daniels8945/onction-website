import { sdg } from "../data/content.js";
import Reveal from "./Reveal.jsx";
import { Check } from "./icons.jsx";

export default function Sdg() {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950 text-white">
      {/* Artistic background — circuit-grid texture, glow orbs, and the same
          animated current-flow lines used in the Hero, instead of a flat
          gradient fill. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(to right,rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.08) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 85% 75% at 30% 50%,#000 30%,transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 30% 50%,#000 30%,transparent 100%)",
          }}
        />
        <div className="absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-teal-600/25 blur-[130px]" />
        <div className="absolute -right-24 bottom-0 h-[380px] w-[380px] rounded-full bg-teal-800/30 blur-[120px]" />

        {/* Current flow lines — same signature animation as the Hero */}
        <div className="absolute left-0 top-1/3 h-px w-full overflow-hidden">
          <div className="h-px w-1/3 animate-current bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
        </div>
        <div className="absolute left-0 top-2/3 h-px w-full overflow-hidden">
          <div
            className="h-px w-1/4 animate-current bg-gradient-to-r from-transparent via-teal-300/70 to-transparent"
            style={{ animationDelay: "3s" }}
          />
        </div>
      </div>

      <div className="wrap relative grid gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <Reveal>
          <p className="font-outfit text-xs uppercase tracking-[0.22em] text-teal-200">
            {sdg.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            {sdg.heading}
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-white/80">{sdg.body}</p>
          <p className="mt-8 font-outfit text-sm text-teal-200">By 2030, we aim to —</p>
        </Reveal>

        <Reveal delay={120}>
          <ul className="space-y-4">
            {sdg.goals.map((g) => (
              <li
                key={g}
                className="flex items-start gap-3 rounded-none bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur"
              >
                <Check width={20} height={20} className="mt-0.5 shrink-0 text-teal-200" />
                <span className="text-[15px] leading-snug text-white/90">{g}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
