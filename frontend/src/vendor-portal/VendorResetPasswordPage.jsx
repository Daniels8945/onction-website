import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { vendorApi } from "./lib/vendorApi.js";

export default function VendorResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await vendorApi.post("/api/vendor-platform/auth/reset-password", { token, new_password: newPassword });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message || "That link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm rounded-none border border-white/10 bg-navy-900 p-8 shadow-xl">
        <p className="eyebrow-light mb-2">Onction Energy</p>
        <h1 className="mb-6 font-syne text-2xl font-semibold text-white">Set a new password</h1>

        {!token ? (
          <p className="text-sm text-red-400">This link is missing its reset token — use the link from your email.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="mb-1 block text-xs font-medium text-white/70">New password</label>
              <input
                id="newPassword"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
              {submitting ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-5 block text-xs text-white/50 hover:text-teal-400">← Back to sign in</Link>
      </div>
    </div>
  );
}
