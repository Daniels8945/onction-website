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
    // apply Outfit font to the section container so P and body text inherit it
    <Reveal className={`${className} font-outfit`}>
      <p className={light ? "eyebrow-light mb-3" : "eyebrow mb-3"}>{eyebrow}</p>
      <h1
        className={`max-w-2xl text-3xl font-medium font-syne sm:text-5xl ${
          light ? "text-white" : "text-navy-900"
        }`}
      >
        {heading}
      </h1>
      {intro && (
        <p
          className={`mt-4 max-w-2xl font-outfit leading-relaxed ${
            light ? "text-white/75" : "text-slatey"
          } ${introClassName}`}
        >
          {intro}
        </p>
      )}
    </Reveal>
  );
}
