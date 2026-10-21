import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "../lib/adminApi.js";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";
import { useCanManage } from "../lib/useCanManage.js";
import { checkImageFile } from "../lib/imageRules.js";
import HelpLink from "../components/HelpLink.jsx";

export default function MediaPage() {
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const canManage = useCanManage();

  function loadAssets() {
    adminApi
      .get("/api/media")
      .then(setAssets)
      .catch((err) => setError(err.message));
  }

  useEffect(loadAssets, []);

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const problem = files.map((f) => (f.type.startsWith("image/") ? checkImageFile(f) : null)).find(Boolean);
    if (problem) {
      toast.error(problem);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        await adminApi.upload("/api/media", formData);
      }
      loadAssets();
      toast.success(files.length === 1 ? "File uploaded." : `${files.length} files uploaded.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: "Delete this file?",
      message: "It's removed from storage permanently. Any page, article, event or email still using it will show a missing image.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/media/${id}`);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast.success("File deleted.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Files may be served from this site (/api/files/…, relative); a copied link
  // is pasted elsewhere (emails, posts), so always copy the full address.
  function copyUrl(url) {
    navigator.clipboard?.writeText(new URL(url, window.location.origin).href);
    toast.success("URL copied to clipboard.");
  }

  return (
    <div>
      {confirmDialog}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Media library</h1>
          <p className="text-sm text-slatey">Every image and video uploaded to the site. Files uploaded from the News, Events, Newsletter and Website content editors land here too.</p>
        </div>
        <div className="flex items-center gap-2">
        <HelpLink topic="media" />
        {canManage && (
        <label className="btn-primary cursor-pointer">
          {uploading ? "Uploading…" : "Upload files"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
        )}
        </div>
      </div>

      {error && (
        <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!assets && !error && <p className="text-sm text-slatey">Loading…</p>}

      {assets && assets.length === 0 && (
        <div className="card text-sm text-slatey">No files uploaded yet.</div>
      )}

      {assets && assets.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative border border-black/5 bg-white p-2">
              {asset.content_type.startsWith("video/") ? (
                <video src={asset.url} className="aspect-square w-full object-cover" muted />
              ) : (
                <img src={asset.url} alt={asset.original_filename} className="aspect-square w-full object-cover" />
              )}
              <p className="mt-2 truncate text-xs text-slatey" title={asset.original_filename}>
                {asset.original_filename}
              </p>
              <p className="text-[11px] text-slatey/70">{(asset.size_bytes / 1024).toFixed(0)} KB</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => copyUrl(asset.url)}
                  className="flex-1 border border-black/10 px-2 py-1 text-[11px] font-medium text-ink hover:border-teal-500 hover:text-teal-600"
                >
                  Copy URL
                </button>
                {canManage && (
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="border border-black/10 px-2 py-1 text-[11px] font-medium text-red-600 hover:border-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
