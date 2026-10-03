import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuMonitor, LuSmartphone, LuTablet, LuX } from "react-icons/lu";
import BlockRenderer from "../../../blocks/BlockRenderer.jsx";
import { Badge, Button, EmptyState, cx } from "../../components/ui.jsx";

const DEVICES = [
  { key: "desktop", label: "Desktop", icon: LuMonitor, width: "100%" },
  { key: "tablet", label: "Tablet", icon: LuTablet, width: "820px" },
  { key: "mobile", label: "Mobile", icon: LuSmartphone, width: "390px" },
];

// Renders the current (unsaved) blocks inside an iframe so Tailwind's
// responsive breakpoints respond to the chosen device width, not the admin
// window. The site's stylesheets are cloned into the frame's <head>.
function Frame({ children }) {
  const [doc, setDoc] = useState(null);

  function handleLoad(e) {
    // Image/video load events inside the portal bubble up the React tree to
    // here too — only the iframe's own load should initialise the frame.
    if (e.target !== e.currentTarget || doc) return;
    const frameDoc = e.currentTarget.contentDocument;
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => frameDoc.head.appendChild(node.cloneNode(true)));
    frameDoc.body.className = "bg-white text-ink font-body antialiased";
    // Links in a preview shouldn't navigate the frame away.
    frameDoc.addEventListener("click", (ev) => {
      if (ev.target.closest("a")) ev.preventDefault();
    });
    setDoc(frameDoc);
  }

  return (
    <iframe title="Page preview" srcDoc="<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>" onLoad={handleLoad} className="h-full w-full bg-white">
      {doc && createPortal(children, doc.body)}
    </iframe>
  );
}

export default function PagePreview({ page, blocks, dirty, onClose }) {
  const [device, setDevice] = useState("desktop");
  const width = DEVICES.find((d) => d.key === device).width;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-200" role="dialog" aria-modal="true" aria-label="Page preview">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-black/10 bg-white px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <p className="truncate text-sm font-semibold text-ink">{page.title || "Untitled page"}</p>
          <span className="hidden truncate text-xs text-slatey md:inline">/{page.slug}</span>
          {dirty && <Badge tone="warning" className="hidden sm:inline-flex">Includes unsaved changes</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-lg bg-mist p-0.5 ring-1 ring-black/5 sm:flex" role="radiogroup" aria-label="Preview width">
            {DEVICES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={device === key}
                title={label}
                onClick={() => setDevice(key)}
                className={cx(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition",
                  device === key ? "bg-white text-ink shadow-sm" : "text-slatey hover:text-ink"
                )}
              >
                <Icon size={15} aria-hidden="true" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>
          <Button size="sm" icon={LuX} onClick={onClose}>
            Close preview
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-0 sm:p-4">
        <div className="mx-auto h-full overflow-hidden bg-white shadow-xl transition-[max-width] duration-300 sm:rounded-lg" style={{ maxWidth: width }}>
          {blocks.length === 0 ? (
            <EmptyState title="Nothing to preview yet" description="Add a block to see how the page will look." className="h-full" />
          ) : (
            <Frame>
              <main>
                {blocks.map((block) => (
                  <BlockRenderer key={block.clientId} block={block} />
                ))}
              </main>
              <p className="border-t border-black/5 py-6 text-center text-xs text-slatey">The site header and footer are added automatically on the live page.</p>
            </Frame>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
