import { useState } from "react";
import { PlaceholderArt } from "../content/Placeholder.jsx";

// The picture for any media entry: the photo (or a video's poster), a
// labelled frame while it's still to be supplied, or a quiet fallback if the
// file fails to load. Fills its parent; the parent sets the aspect ratio.
export default function MediaVisual({ item, className = "", eager = false, zoom = true }) {
  const [failed, setFailed] = useState(false);
  const src = item.type === "video" ? item.poster || (item.youtube && `https://i.ytimg.com/vi/${item.youtube}/hqdefault.jpg`) : item.src || item.image;
  if (!src) return <PlaceholderArt kind={item.type === "video" ? "video" : "photo"} subject={item.subject} className={className} />;
  if (failed) return <PlaceholderArt kind="photo" subject="This image couldn't be loaded" className={className} />;
  return (
    <img
      src={src}
      alt={item.alt || ""}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${zoom ? "transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]" : ""} ${className}`}
    />
  );
}

export function PlayBadge({ duration, large = false }) {
  return (
    <span className={`pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 bg-navy-950/80 font-outfit text-xs text-white backdrop-blur ${large ? "py-2 pl-2 pr-3" : "py-1.5 pl-1.5 pr-2.5"}`}>
      <span className={`grid place-items-center rounded-full bg-teal-500 text-navy-950 ${large ? "h-8 w-8" : "h-6 w-6"}`}>
        <svg width={large ? 12 : 10} height={large ? 12 : 10} viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 1v8l7-4z" fill="currentColor" />
        </svg>
      </span>
      Video{duration && duration !== "—" ? ` · ${duration}` : ""}
    </span>
  );
}

export function formatDate(d, opts = { day: "numeric", month: "long", year: "numeric" }) {
  if (!d) return null;
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-GB", opts);
}
