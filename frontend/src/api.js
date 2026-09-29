// Small fetch helper. In dev, "/api" is proxied to the FastAPI backend
// (see vite.config.js). In production, set VITE_API_BASE to the backend URL.
import { getSessionId } from "./lib/session.js";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function submitEnquiry(payload) {
  const res = await fetch(`${API_BASE}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, session_id: getSessionId() || undefined }),
  });

  if (!res.ok) {
    let detail = "Something went wrong. Please try again.";
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch (_) {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }
  return res.json();
}
