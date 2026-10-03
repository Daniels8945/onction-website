import { Link } from "react-router-dom";
import SplitText from "../../motion/SplitText.jsx";
import Parallax from "../../motion/Parallax.jsx";
import Reveal from "../Reveal.jsx";
import { useFontsReady } from "../../motion/useFontsReady.js";

// Inner-page hero in the landing hero's language (dark photo, left-to-right
// scrim, breadcrumb, the brand "current" lines) so every page reads as part
// of the same site. The headline rises word-by-word, the photo settles from a
// slight zoom and drifts with the scroll on desktop.
export default function InnerHero({ crumb, title, accent, intro, image, children, compact = false }) {
  const fontsReady = useFontsReady();
  return (
    <section className="relative isolate overflow-hidden bg-navy-950 text-white">
      <div className="absolute inset-0" aria-hidden="true">
        {image && (
          <Parallax speed={0.14} className="absolute -inset-y-[12%] inset-x-0">
            <img src={image} alt="" fetchpriority="high" decoding="async" className="hero-settle h-full w-full object-cover" />
          </Parallax>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/80 to-navy-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-navy-950/40" />
        <div className={`absolute left-0 h-px w-full overflow-hidden ${compact ? "top-[62%]" : "top-1/3"}`}>
          <div className="h-px w-1/3 animate-current bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
        </div>
        <div className={`absolute left-0 h-px w-full overflow-hidden ${compact ? "top-[88%]" : "top-2/3"}`}>
          <div className="h-px w-1/4 animate-current bg-gradient-to-r from-transparent via-spark-400/60 to-transparent" style={{ animationDelay: "3s" }} />
        </div>
      </div>

      {/* Reserved minimum height: the web fonts swap in after first paint and
          the wider Syne headline can reflow onto an extra line — this keeps
          that growth inside the hero instead of shoving the page down (CLS). */}
      <div className={`wrap relative pt-[calc(clamp(64px,7.5vw,91px)+1.75rem)] ${compact ? "min-h-[440px] pb-14 sm:min-h-[460px] sm:pb-16" : "min-h-[720px] pb-16 sm:min-h-[660px] sm:pb-24"}`}>
        <nav aria-label="Breadcrumb" className="font-outfit text-sm font-medium tracking-wide text-[#f8f5ec]">
          <Link to="/" className="mx-1.5 font-light hover:text-teal-400">Home</Link>
          <span className="mx-1.5" aria-hidden="true">/</span>
          <span aria-current="page">{crumb}</span>
        </nav>

        <div className={`${compact ? "mt-10" : "mt-14 sm:mt-20"} max-w-3xl`} style={{ visibility: fontsReady ? "visible" : "hidden" }}>
          <SplitText
            as="h1"
            text={title}
            accent={accent}
            accentClassName="text-teal-400"
            className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-[3.4rem]"
          />
          {intro && (
            <Reveal delay={350}>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-[17px]">{intro}</p>
            </Reveal>
          )}
          {children && (
            <Reveal delay={500} className="mt-9">
              {children}
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
