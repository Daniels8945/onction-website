import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { LuCheck, LuImage, LuUpload, LuVideo } from "react-icons/lu";
import { adminApi } from "../lib/adminApi.js";
import { Button, EmptyState, Modal, SearchInput, Skeleton, cx } from "./ui.jsx";

// Browse the Media library (or upload into it) and pick one asset's URL.
// `kind` narrows the grid to "image" or "video" content types.
export default function MediaPicker({ kind = "image", currentUrl, onSelect, onClose }) {
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(currentUrl || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    adminApi.get("/api/media").then(setAssets).catch((err) => setError(err.message));
  }, []);

  const visible = useMemo(() => {
    if (!assets) return [];
    const term = search.trim().toLowerCase();
    return assets.filter(
      (a) => a.content_type.startsWith(`${kind}/`) && (!term || a.original_filename.toLowerCase().includes(term))
    );
  }, [assets, kind, search]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const asset = await adminApi.upload("/api/media", data);
      setAssets((prev) => [asset, ...(prev || [])]);
      setSelected(asset.url);
      toast.success("Uploaded to the media library.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  const Icon = kind === "video" ? LuVideo : LuImage;

  return (
    <Modal
      title={kind === "video" ? "Choose a video" : "Choose an image"}
      description="Pick from the media library, or upload a new file."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!selected} onClick={() => onSelect(selected)}>
            Use selected {kind}
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by file name…" className="flex-1" />
        <input ref={fileRef} type="file" accept={`${kind}/*`} className="hidden" onChange={handleUpload} />
        <Button icon={LuUpload} loading={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "Uploading…" : "Upload new"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!assets && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}
      {assets && visible.length === 0 && (
        <EmptyState
          icon={Icon}
          title={search ? "No files match your search" : `No ${kind}s in the library yet`}
          description={search ? "Try a different file name." : `Upload a ${kind} to use it here and anywhere else on the site.`}
        />
      )}
      {visible.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {visible.map((a) => {
            const isSelected = selected === a.url;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a.url)}
                onDoubleClick={() => onSelect(a.url)}
                aria-pressed={isSelected}
                className={cx(
                  "group relative overflow-hidden rounded-lg border bg-mist text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                  isSelected ? "border-teal-500 ring-2 ring-teal-500" : "border-black/10 hover:border-black/25"
                )}
              >
                {kind === "video" ? (
                  <video src={a.url} muted preload="metadata" className="aspect-square w-full object-cover" />
                ) : (
                  <img src={a.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                )}
                <p className="truncate border-t border-black/5 bg-white px-2 py-1.5 text-xs text-slatey">{a.original_filename}</p>
                {isSelected && (
                  <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-teal-500 text-navy-950 shadow">
                    <LuCheck size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
