import { showDrafts } from "./contentStatus.js";

// Public detail pages (a news article, an event) load through here. Normally
// that's the public endpoint, which only ever returns published items. When a
// signed-in staff member opens the page with ?preview, it asks the staff-only
// preview endpoint instead, so a draft renders in the real public layout. The
// API checks the token — a visitor adding ?preview still gets only published
// content.
const API_BASE = import.meta.env.VITE_API_BASE || "";

function staffToken() {
  if (!showDrafts) return null;
  try {
    return localStorage.getItem("onction_admin_token");
  } catch {
    return null;
  }
}

export async function fetchPublicOrPreview(publicPath, previewPath) {
  const token = staffToken();
  if (token) {
    const res = await fetch(`${API_BASE}${previewPath}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) return { data: await res.json(), preview: true };
    if (res.status === 404) throw new Error("not found");
    // Expired session etc.: fall through to what the public would see.
  }
  const res = await fetch(`${API_BASE}${publicPath}`);
  if (!res.ok) throw new Error("not found");
  return { data: await res.json(), preview: false };
}
