import { metrics } from "../data/content.js";
import SectionHeader from "./SectionHeader.jsx";
import Reveal from "./Reveal.jsx";

export default function Metrics() {
  return (
    <section className="bg-mist">
      <div className="wrap py-16 sm:py-20">

        {/* <SectionHeader eyebrow="Mandate & market" heading="Metrics that matter" /> */}
        <SectionHeader heading="Metrics that matter" />

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {metrics.map((m, idx) => (
            <Reveal key={m.label} delay={idx * 80}>
              <div className="border-l-2 border-teal-500 pl-5">
                <div className="font-outfit text-4xl font-medium text-navy-900 sm:text-5xl">
                  {m.value}
                  {m.unit && <span className="text-teal-500"> {m.unit}</span>}
                </div>
                <p className="mt-2 font-syne text-md leading-snug text-[#202020]">{m.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
