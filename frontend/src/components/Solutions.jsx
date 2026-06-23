import { solutions } from "../data/content.js";
import SectionHeader from "./SectionHeader.jsx";
import Reveal from "./Reveal.jsx";
import { Arrow } from "./icons.jsx";

import currencyImg from "../../assets/istockphoto-2220779018-1024x1024.jpg";
import powerStationImg from "../../assets/newpowa-wbWDnQ-1Ui0-unsplash.jpg";
import tradingChartImg from "../../assets/maxim-hopman-fiXLQXAhCfk-unsplash.jpg";
import handshakeImg from "../../assets/cytonn-photography-vWchRczcQwM-unsplash.jpg";
import windTurbineImg from "../../assets/konstantin-dyadyun-5_G1uVw7WRM-unsplash.jpg";
import dashboardImg from "../../assets/istockphoto-1402667894-1024x1024.jpg";
import portfolioImg from "../../assets/istockphoto-2019990812-1024x1024.jpg";
import advisoryImg from "../../assets/kaleidico-26MJGnCM0Wc-unsplash.jpg";
import growthImg from "../../assets/feey-xDqpTGU5JmQ-unsplash.jpg";

// One image per solution, in the same order as solutions.items in content.js:
// purchase&sale, banking&swaps, cross-border, exchange&bilateral, renewables,
// efficiency&optimisation, portfolio mgmt, advisory, investment facilitation.
const SOLUTION_IMAGES = [
  currencyImg,
  powerStationImg,
  tradingChartImg,
  handshakeImg,
  windTurbineImg,
  dashboardImg,
  portfolioImg,
  advisoryImg,
  growthImg,
];

export default function Solutions() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-mist">
      <div className="wrap py-20 sm:py-24">
        <SectionHeader heading={solutions.heading} intro={solutions.intro} />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.items.map((item, idx) => (
            <Reveal key={item.title} delay={(idx % 3) * 80}>
              <article className="group flex h-full flex-col overflow-hidden rounded-none border border-black/5 bg-white shadow-[0_1px_2px_rgba(10,31,60,0.04)] transition hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(10,31,60,0.10)]">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={SOLUTION_IMAGES[idx]}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold text-navy-900">{item.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slatey">{item.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-teal-600">
                    Learn more <Arrow width={14} height={14} />
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
