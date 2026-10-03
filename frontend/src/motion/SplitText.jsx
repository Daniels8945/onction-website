import { useInView } from "./useInView.js";

// Headline reveal: each word rises out of its own overflow mask, staggered.
// `accent` is a word or phrase inside `text` rendered in the accent colour —
// Tata's two-tone heading ("Smart energy *solutions*") in Onction teal.
export default function SplitText({ text, as: Tag = "h2", accent, accentClassName = "text-teal-600", className = "", delay = 0, stagger = 45 }) {
  const [ref, inView] = useInView({ threshold: 0.3 });
  const accentWords = accent ? accent.split(/\s+/) : [];
  const words = text.split(/\s+/);
  const accentStart = accent ? findPhrase(words, accentWords) : -1;

  return (
    <Tag ref={ref} className={`${className} ${inView ? "is-in" : ""}`} aria-label={text}>
      {words.map((word, i) => {
        const isAccent = accentStart >= 0 && i >= accentStart && i < accentStart + accentWords.length;
        return (
          <span key={i} aria-hidden="true">
            <span className="sw">
              <span className={isAccent ? accentClassName : undefined} style={{ "--d": `${delay + i * stagger}ms` }}>
                {word}
              </span>
            </span>
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </Tag>
  );
}

function findPhrase(words, phrase) {
  const clean = (w) => w.replace(/[^\w']/g, "").toLowerCase();
  for (let i = 0; i <= words.length - phrase.length; i++) {
    if (phrase.every((p, j) => clean(words[i + j]) === clean(p))) return i;
  }
  return -1;
}
