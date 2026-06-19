import Reveal from "./Reveal.jsx";

// Reusable eyebrow + heading + optional intro block used by every section.
// light=true flips colours for dark backgrounds (Capability, SDG, Hero).
export default function SectionHeader({
  eyebrow,
  heading,
  intro,
  light = false,
  className = "",
  introClassName = "",
}) {
  return (
    <Reveal className={className}>
      <p className={light ? "eyebrow-light mb-3" : "eyebrow mb-3"}>{eyebrow}</p>
      <h2
        className={`max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl ${
          light ? "text-white" : "text-navy-900"
        }`}
      >
        {heading}
      </h2>
      {intro && (
        <p
          className={`mt-4 max-w-2xl leading-relaxed ${
            light ? "text-white/75" : "text-slatey"
          } ${introClassName}`}
        >
          {intro}
        </p>
      )}
    </Reveal>
  );
}
