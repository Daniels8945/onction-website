import SplitText from "../../motion/SplitText.jsx";
import Reveal from "../Reveal.jsx";

// Two-tone section heading (Tata's "Our *offerings*"), matching the landing
// page's SectionHeader type scale, with the word-mask reveal.
export default function SectionTitle({ eyebrow, title, accent, intro, light = false, className = "", as = "h2" }) {
  return (
    <div className={`font-outfit ${className}`}>
      {eyebrow && (
        <Reveal variant="fade">
          <p className={light ? "eyebrow-light mb-3" : "eyebrow mb-3"}>{eyebrow}</p>
        </Reveal>
      )}
      <SplitText
        as={as}
        text={title}
        accent={accent}
        accentClassName={light ? "text-teal-400" : "text-teal-600"}
        className={`max-w-3xl font-syne text-3xl font-medium leading-[1.12] sm:text-5xl ${light ? "text-white" : "text-navy-900"}`}
      />
      {intro && (
        <Reveal delay={200}>
          <p className={`mt-5 max-w-2xl leading-relaxed ${light ? "text-white/75" : "text-slatey"}`}>{intro}</p>
        </Reveal>
      )}
    </div>
  );
}
