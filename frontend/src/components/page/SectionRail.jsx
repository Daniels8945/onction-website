import { useEffect, useState } from "react";

// Tata's sticky "Sections" rail from their long-form pages: lists the page's
// sections, highlights the one being read, and jumps to any of them.
// Desktop only — on narrow screens the content simply stacks.
export default function SectionRail({ sections }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this page" className="sticky top-28 hidden lg:block">
      <p className="mb-4 font-syne text-xl font-medium text-navy-900">Sections</p>
      <ul className="relative border-l border-teal-600/40">
        {sections.map((s) => {
          const on = s.id === active;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={on ? "location" : undefined}
                className={`relative block py-2 pl-4 text-[15px] transition-all duration-400 ${on ? "font-semibold text-navy-900" : "text-slatey hover:text-navy-900"}`}
              >
                <span
                  className={`absolute -left-[4px] top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-teal-600 transition-transform duration-400 ${on ? "scale-100" : "scale-0"}`}
                  aria-hidden="true"
                />
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
