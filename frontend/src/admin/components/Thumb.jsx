import { useState } from "react";
import { LuImage } from "react-icons/lu";
import { Menu } from "./ui.jsx";

// Small cover-image thumbnail for content listings; falls back to an icon
// when there's no image or it fails to load.
export default function Thumb({ url }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="grid h-11 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-mist ring-1 ring-black/5">
      {url && !broken ? (
        <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        <LuImage size={16} className="text-slate-400" aria-hidden="true" />
      )}
    </span>
  );
}

// A row's overflow menu, hidden when the viewer has no actions in it.
export function RowMenu({ items, label }) {
  const real = items.filter((i) => i && !i.divider);
  if (!real.length) return null;
  const cleaned = items.filter(Boolean);
  while (cleaned.length && cleaned[cleaned.length - 1].divider) cleaned.pop();
  while (cleaned.length && cleaned[0].divider) cleaned.shift();
  return <Menu label={label} items={cleaned} />;
}
