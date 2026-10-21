// The same limits the API enforces (backend/app/storage.py) — checked here
// first so a wrong file fails instantly instead of after a slow upload.
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_IMAGE_MB = 10;
export const IMAGE_ACCEPT_LABEL = `JPG, PNG, WebP or GIF, up to ${MAX_IMAGE_MB} MB`;

export function checkImageFile(file) {
  if (!IMAGE_TYPES.includes(file.type)) return `“${file.name}” isn't a supported image. Use ${IMAGE_ACCEPT_LABEL}.`;
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_IMAGE_MB} MB. Export it smaller and try again.`;
  if (file.size === 0) return `“${file.name}” is empty.`;
  return null;
}

