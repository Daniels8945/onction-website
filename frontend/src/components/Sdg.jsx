import { sdg } from "../data/content.js";
import Reveal from "./Reveal.jsx";
import { Check } from "./icons.jsx";

export default function Sdg() {
  return (
    <section className="bg-gradient-to-br from-teal-700 to-navy-900 text-white">
      <div className="wrap grid gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-teal-200">
            {sdg.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            {sdg.heading}
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-white/80">{sdg.body}</p>
          <p className="mt-8 font-mono text-sm text-teal-200">By 2030, we aim to —</p>
        </Reveal>

        <Reveal delay={120}>
          <ul className="space-y-4">
            {sdg.goals.map((g) => (
              <li
                key={g}
                className="flex items-start gap-3 rounded-xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur"
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
