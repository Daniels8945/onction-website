import { useEffect, useId, useRef, useState } from "react";
import toast from "react-hot-toast";
import { LuImage, LuImageOff, LuLink, LuLoaderCircle, LuTrash2, LuUpload } from "react-icons/lu";
import { adminApi } from "../lib/adminApi.js";
import MediaPicker from "./MediaPicker.jsx";
import { Button, Input, cx } from "./ui.jsx";
import { IMAGE_TYPES, IMAGE_ACCEPT_LABEL as ACCEPT_LABEL, checkImageFile } from "../lib/imageRules.js";

const isUploaded = (url) => url?.startsWith("/api/files/");

// Upload an image (drag-and-drop or browse), pick one already in the media
// library, or — for older content — keep an image address. The stored value
// is always a URL string, so existing records keep working unchanged.
// Uploads land in the Media library, where they can be reused elsewhere.
export default function ImageUpload({ value, onChange, label = "Image", hint, required, disabled, aspect = "aspect-video" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [picking, setPicking] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [broken, setBroken] = useState(false);
  const fileRef = useRef(null);
  const mounted = useRef(true);
  const id = useId();

  useEffect(() => () => (mounted.current = false), []);
  useEffect(() => setBroken(false), [value]);

  async function upload(file) {
    setError("");
    const problem = checkImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const asset = await adminApi.upload("/api/media", data);
      if (!mounted.current) return; // editor closed mid-upload; the file stays in the media library
      onChange(asset.url);
      toast.success("Image uploaded. Save to keep it.");
    } catch (err) {
      if (mounted.current) setError(`Upload failed: ${err.message}`);
    } finally {
      if (mounted.current) setUploading(false);
    }
  }

  function onFiles(files) {
    const file = files?.[0];
    if (file) upload(file);
  }

  const busy = disabled || uploading;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p id={`${id}-label`} className="text-xs font-medium text-ink">
          {label}
          {required ? <span className="ml-0.5 text-red-500" aria-hidden="true">*</span> : <span className="ml-1 font-normal text-slatey">(optional)</span>}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
          <div className={cx("relative grid place-items-center bg-mist", aspect)}>
            {broken ? (
              <div className="flex flex-col items-center gap-1 p-4 text-center text-xs text-slatey">
                <LuImageOff size={20} aria-hidden="true" />
                This image can't be loaded. Replace it, or check the address.
              </div>
            ) : (
              <img src={value} alt={`Current ${label.toLowerCase()}`} onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
            )}
            {uploading && <UploadingOverlay />}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.06] px-3 py-2">
            <p className="mr-auto min-w-0 truncate text-xs text-slatey" title={value}>
              {isUploaded(value) ? "Uploaded image" : "Image address"}
            </p>
            <Button size="sm" icon={LuUpload} onClick={() => fileRef.current?.click()} disabled={busy}>Replace</Button>
            <Button size="sm" icon={LuImage} onClick={() => setPicking(true)} disabled={busy}>Library</Button>
            <Button size="sm" variant="danger-ghost" icon={LuTrash2} onClick={() => { setError(""); onChange(""); }} disabled={busy}>Remove</Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={busy ? -1 : 0}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-hint`}
          aria-disabled={busy || undefined}
          onClick={() => !busy && fileRef.current?.click()}
          onKeyDown={(e) => {
            if (!busy && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) onFiles(e.dataTransfer.files);
          }}
          className={cx(
            "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
            busy ? "cursor-default opacity-70" : "cursor-pointer hover:border-teal-500 hover:bg-teal-50/40",
            dragging ? "border-teal-500 bg-teal-50/60" : "border-black/15 bg-mist/50"
          )}
        >
          {uploading ? (
            <UploadingOverlay inline />
          ) : (
            <>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-teal-600 ring-1 ring-black/5">
                <LuUpload size={18} aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-ink">
                Drag an image here, or <span className="text-teal-700 underline underline-offset-2">browse</span>
              </p>
            </>
          )}
        </div>
      )}

      <p id={`${id}-hint`} className="mt-1.5 text-xs text-slatey">
        {hint ? `${hint} ` : ""}
        {ACCEPT_LABEL}.
      </p>

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {!value && (
          <button type="button" onClick={() => setPicking(true)} disabled={busy} className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline disabled:opacity-50">
            <LuImage size={13} aria-hidden="true" /> Choose from the media library
          </button>
        )}
        <button type="button" onClick={() => setShowUrl((s) => !s)} disabled={busy} aria-expanded={showUrl} className="inline-flex items-center gap-1.5 text-xs font-medium text-slatey hover:text-ink disabled:opacity-50">
          <LuLink size={13} aria-hidden="true" /> {showUrl ? "Hide image address" : "Use an image address instead"}
        </button>
      </div>
      {showUrl && (
        <div className="mt-2">
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            aria-label={`${label} address`}
            disabled={busy}
          />
          <p className="mt-1 text-xs text-slatey">Only for images already hosted elsewhere. Uploading is preferred — it keeps the image on your own storage.</p>
        </div>
      )}

      {picking && (
        <MediaPicker
          kind="image"
          currentUrl={value}
          onClose={() => setPicking(false)}
          onSelect={(url) => {
            setError("");
            onChange(url);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

function UploadingOverlay({ inline }) {
  const body = (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink shadow" role="status">
      <LuLoaderCircle size={14} className="animate-spin text-teal-600" aria-hidden="true" /> Uploading…
    </span>
  );
  return inline ? body : <div className="absolute inset-0 grid place-items-center bg-white/60">{body}</div>;
}
