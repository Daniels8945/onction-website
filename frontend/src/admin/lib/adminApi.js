// Authenticated fetch wrapper for the dashboard. Mirrors src/api.js's plain
// helper, but attaches the admin JWT and centralizes 401 handling so any
// expired/invalid session bounces the user back to /admin/login.
const API_BASE = import.meta.env.VITE_API_BASE || "";
const TOKEN_KEY = "onction_admin_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class SessionExpiredError extends Error {}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const token = getToken();
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  // A 401 only means the session expired if we sent one; otherwise (e.g. a
  // wrong password at sign-in) fall through and show the server's message.
  if (res.status === 401 && token) {
    setToken(null);
    throw new SessionExpiredError("Session expired — please log in again.");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch (_) {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : res.text();
}

export const adminApi = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
  upload: (path, formData) => request(path, { method: "POST", body: formData, isForm: true }),
};

export { SessionExpiredError, API_BASE };
