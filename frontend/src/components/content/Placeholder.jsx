import { showDrafts } from "../../lib/contentStatus.js";

// Stand-in for media the company hasn't supplied yet. Deliberately not a
// stock photo: a branded frame that says what belongs there, so a draft can
// never be mistaken for a real Onction person, event or partner.
//   kind: "photo" | "portrait" | "video" | "logo"
export function PlaceholderArt({ kind = "photo", subject, className = "", dark = true, compact = false }) {
  const label = { photo: "Photograph to be supplied", portrait: "Portrait to be supplied", video: "Video to be supplied", logo: "Logo to be supplied" }[kind];
  return (
    <div
      className={`relative isolate flex h-full w-full flex-col justify-end overflow-hidden ${dark ? "bg-navy-900 text-white" : "bg-mist text-navy-900"} ${className}`}
      role="img"
      aria-label={`${label}${subject ? `: ${subject}` : ""}`}
    >
      <div
        className={`absolute inset-0 ${dark ? "opacity-[0.14]" : "opacity-[0.5]"}`}
        aria-hidden="true"
        style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${dark ? "#fff" : "#cbd5e1"} 1px, transparent 0)`, backgroundSize: "18px 18px" }}
      />
      <svg className={`absolute inset-0 h-full w-full ${dark ? "text-teal-400/35" : "text-teal-600/30"}`} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="0.4" aria-hidden="true">
        {kind === "portrait" ? (
          <>
            <circle cx="50" cy="40" r="13" />
            <path d="M24 86c3-16 13-24 26-24s23 8 26 24" />
          </>
        ) : kind === "logo" ? (
          <path d="M30 50h40M38 42h24M38 58h24" />
        ) : (
          <>
            <path d="M8 74 30 52l16 12 22-26 24 20" />
            <circle cx="30" cy="52" r="1.6" fill="currentColor" />
            <circle cx="46" cy="64" r="1.6" fill="currentColor" />
            <circle cx="68" cy="38" r="1.6" fill="currentColor" />
          </>
        )}
        {kind === "video" && <path d="M45 40v20l16-10z" fill="currentColor" stroke="none" opacity="0.8" />}
      </svg>
      {kind !== "logo" && !compact && (
        <div className="relative p-4 sm:p-5">
          <p className={`font-outfit text-[10px] uppercase tracking-[0.2em] ${dark ? "text-teal-400" : "text-teal-700"}`}>{label}</p>
          {subject && <p className={`mt-1 max-w-[28ch] text-sm leading-snug ${dark ? "text-white/70" : "text-slatey"}`}>{subject}</p>}
        </div>
      )}
    </div>
  );
}

// Marks an unverified entry while previewing, so nobody signs off a draft.
export function DraftTag({ className = "" }) {
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 bg-spark-400 px-2 py-0.5 font-outfit text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-950 ${className}`}>
      Draft
    </span>
  );
}

// Fixed notice on pages that are showing placeholder content.
export function PreviewNotice({ what }) {
  if (!showDrafts) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3" role="note">
      <p className="pointer-events-auto max-w-xl border border-spark-400/60 bg-navy-950/95 px-4 py-2.5 text-center text-xs leading-relaxed text-white/85 shadow-lg backdrop-blur">
        <span className="font-semibold text-spark-400">Preview</span> — {what} marked <span className="font-semibold">Draft</span> are placeholders or unapproved, and are hidden from the public until verified in the dashboard (Website content).
      </p>
    </div>
  );
}
