import { useEffect, useRef, useState } from "react";
import Dialog from "../content/Dialog.jsx";
import { DraftTag, PlaceholderArt } from "../content/Placeholder.jsx";
import { formatDate } from "./MediaVisual.jsx";
import { CATEGORIES } from "../../data/media.js";
import { Arrow } from "../icons.jsx";

const catLabel = (k) => CATEGORIES.find((c) => c.key === k)?.label;

// Full-screen viewer for the gallery: photos and videos, with previous/next
// buttons, ←/→ keys and a horizontal swipe on touch screens.
export default function Lightbox({ items, index, onIndex, onClose }) {
  const open = index != null && items[index];
  const item = open ? items[index] : null;
  const step = (d) => onIndex((index + d + items.length) % items.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Swipe: a mostly horizontal drag of 50px or more moves one item.
  const start = useRef(null);
  const swipe = {
    onPointerDown: (e) => e.pointerType !== "mouse" && (start.current = [e.clientX, e.clientY]),
    onPointerUp: (e) => {
      if (!start.current) return;
      const dx = e.clientX - start.current[0], dy = e.clientY - start.current[1];
      start.current = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    },
  };

  return (
    <Dialog open={!!open} onClose={onClose} label="Media viewer" className="h-[100dvh] w-screen">
      {item && (
        <div className="flex h-full w-full flex-col text-white" {...swipe}>
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <span className="font-outfit text-xs tabular-nums text-white/60">
              {index + 1} / {items.length}
            </span>
            <button type="button" onClick={onClose} aria-label="Close viewer" className="grid h-11 w-11 place-items-center text-3xl leading-none text-white/80 transition-colors hover:text-teal-400">
              ×
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-20">
            <Stage key={item.id} item={item} />
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous" className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center border border-white/30 bg-navy-950/60 transition-colors hover:border-teal-400 hover:text-teal-400 sm:grid">
                  <Arrow width={18} height={18} className="rotate-180" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next" className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center border border-white/30 bg-navy-950/60 transition-colors hover:border-teal-400 hover:text-teal-400 sm:grid">
                  <Arrow width={18} height={18} />
                </button>
              </>
            )}
          </div>

          <div className="mx-auto w-full max-w-4xl px-5 pb-6 pt-4 sm:px-6" aria-live="polite">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-outfit text-[11px] uppercase tracking-[0.18em] text-teal-400">
              {!item.verified && <DraftTag />}
              {catLabel(item.category) && <span>{catLabel(item.category)}</span>}
              {formatDate(item.date) && <span className="text-white/50">{formatDate(item.date)}</span>}
            </div>
            <p className="mt-2 font-syne text-lg font-medium leading-snug sm:text-xl">{item.title}</p>
            {item.caption && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-white/65">{item.caption}</p>}
            {items.length > 1 && <p className="mt-3 text-xs text-white/40 sm:hidden">Swipe for more</p>}
          </div>
        </div>
      )}
    </Dialog>
  );
}

function Stage({ item }) {
  const [state, setState] = useState("loading"); // loading | ready | error
  const box = "max-h-full max-w-full";

  if (item.type === "video" && item.youtube) {
    return (
      <div className="aspect-video w-full max-w-5xl">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${item.youtube}?autoplay=1&rel=0`}
          title={item.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }
  if (!(item.src || item.image)) {
    return (
      <div className="aspect-[4/3] w-full max-w-3xl">
        <PlaceholderArt kind={item.type === "video" ? "video" : "photo"} subject={item.subject} />
      </div>
    );
  }
  if (state === "error") {
    return <p className="text-sm text-white/60">This {item.type === "video" ? "video" : "image"} couldn't be loaded. Try the next one, or come back later.</p>;
  }
  return (
    <>
      {state === "loading" && <span className="absolute h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-teal-400" aria-label="Loading" />}
      {item.type === "video" ? (
        <video
          src={item.src}
          poster={item.poster}
          controls
          autoPlay
          playsInline
          onLoadedData={() => setState("ready")}
          onError={() => setState("error")}
          className={`${box} h-full w-auto`}
        />
      ) : (
        <img
          src={item.src || item.image}
          alt={item.alt || item.title}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          className={`${box} h-full w-auto object-contain transition-opacity duration-400 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </>
  );
}
