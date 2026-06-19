import { capability } from "../data/content.js";
import SectionHeader from "./SectionHeader.jsx";
import Reveal from "./Reveal.jsx";
import { Check } from "./icons.jsx";

export default function Capability() {
  return (
    <section id="capability" className="scroll-mt-20 bg-navy-950 text-white">
      <div className="wrap grid gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:items-center">
        {/* SectionHeader owns its own Reveal; waveform is decorative, no animation needed */}
        <div>
          <SectionHeader
            eyebrow={capability.eyebrow}
            heading={capability.heading}
            intro={capability.body}
            light
            introClassName="max-w-md"
          />

          {/* Abstract waveform visual */}
          <div className="mt-10 hidden gap-1.5 lg:flex" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, k) => (
              <span
                key={k}
                className="w-1 rounded-full bg-teal-500/30"
                style={{
                  height: `${18 + Math.abs(Math.sin(k * 0.7)) * 34}px`,
                  background: k % 5 === 0 ? "#13C2B6" : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <Reveal delay={120}>
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
            {capability.items.map((item, idx) => (
              <li key={item} className="flex items-start gap-4 p-5">
                <span className="mt-0.5 font-mono text-sm text-teal-400">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-[15px] leading-snug text-white/90">{item}</span>
                <Check width={18} height={18} className="mt-0.5 shrink-0 text-teal-400" />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
