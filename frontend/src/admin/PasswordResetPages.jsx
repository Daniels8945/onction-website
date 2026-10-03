import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { adminApi } from "./lib/adminApi.js";

// Dashboard password recovery: request a link by email, then set a new
// password from that link (/admin/reset-password?token=…). Same look as the
// sign-in page.
function Shell({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm border border-white/10 bg-navy-900 p-8 shadow-xl">
        <p className="eyebrow-light mb-2">Onction Energy</p>
        <h1 className="mb-6 font-syne text-2xl font-semibold text-white">{title}</h1>
        {children}
        <Link to="/admin/login" className="mt-6 inline-block text-xs text-white/60 hover:text-teal-400">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}

const inputClass = "w-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400";

export function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await adminApi.post("/api/auth/forgot-password", { email });
      setStatus("sent");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <Shell title="Reset your password">
      {status === "sent" ? (
        <p className="text-sm leading-relaxed text-white/75">
          If <span className="text-white">{email}</span> belongs to a dashboard account, a reset link is on its way. It expires in 1 hour — check spam if it
          doesn't arrive.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-white/65">Enter your dashboard email and we'll send you a link to set a new password.</p>
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-white/70">Email</label>
            <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={status === "sending"} className="btn-primary w-full disabled:opacity-60">
            {status === "sending" ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </Shell>
  );
}

export function AdminResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("The passwords don't match.");
    setSaving(true);
    setError("");
    try {
      await adminApi.post("/api/auth/reset-password", { token, new_password: pw });
      setDone(true);
      setTimeout(() => navigate("/admin/login", { replace: true }), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <Shell title="Link incomplete">
        <p className="text-sm text-white/70">This reset link is missing its token. <Link to="/admin/forgot-password" className="text-teal-400">Request a new one</Link>.</p>
      </Shell>
    );
  }

  return (
    <Shell title="Choose a new password">
      {done ? (
        <p className="text-sm text-teal-300">Password updated — taking you to sign in…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="pw" className="mb-1 block text-xs font-medium text-white/70">New password</label>
            <input id="pw" type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="pw2" className="mb-1 block text-xs font-medium text-white/70">Repeat new password</label>
            <input id="pw2" type="password" required minLength={8} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputClass} />
          </div>
          {error && (
            <p className="text-sm text-red-400">
              {error}
              {/expired|invalid/i.test(error) && (
                <> <Link to="/admin/forgot-password" className="text-teal-400 underline">Request a new link</Link>.</>
              )}
            </p>
          )}
          <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
            {saving ? "Saving…" : "Set new password"}
          </button>
        </form>
      )}
    </Shell>
  );
}
