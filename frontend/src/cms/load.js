import { applyContent } from "./registry.js";
import { showDrafts } from "../lib/contentStatus.js";

// Loads dashboard-managed content before the site first renders.
//
//   normal visit   published content (GET /api/content/public)
//   ?preview       signed-in staff see drafts too (GET /api/content/preview);
//                  anyone else just gets published content
//
// Never blocks for long: if the API is slow or down, the site renders its
// built-in content after LIMIT ms rather than waiting.
const API_BASE = import.meta.env.VITE_API_BASE || "";
const LIMIT = 2500;

export const cmsState = { mode: "built-in", applied: [] };

function staffToken() {
  try {
    return localStorage.getItem("onction_admin_token");
  } catch {
    return null;
  }
}

export async function loadContent() {
  const token = showDrafts ? staffToken() : null;
  const preview = !!token;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LIMIT);
  try {
    const res = await fetch(`${API_BASE}/api/content/${preview ? "preview" : "public"}`, {
      headers: preview ? { Authorization: `Bearer ${token}` } : {},
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`content ${res.status}`);
    const docs = await res.json();
    cmsState.applied = applyContent(docs);
    cmsState.mode = preview ? "preview" : cmsState.applied.length ? "published" : "built-in";
  } catch {
    cmsState.mode = "built-in"; // keep the site's own content
  } finally {
    clearTimeout(timer);
  }
  return cmsState;
}
