import { useState } from "react";
import { Link } from "react-router-dom";
import { vendorApi } from "./lib/vendorApi.js";

export default function VendorForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await vendorApi.post("/api/vendor-platform/auth/forgot-password", { email });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm rounded-none border border-white/10 bg-navy-900 p-8 shadow-xl">
        <p className="eyebrow-light mb-2">Onction Energy</p>
        <h1 className="mb-6 font-syne text-2xl font-semibold text-white">Reset your password</h1>

        {sent ? (
          <p className="text-sm text-white/70">If that email is registered, a reset link has been sent. Check your inbox.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-white/70">Email on file</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-5 block text-xs text-white/50 hover:text-teal-400">← Back to sign in</Link>
      </div>
    </div>
  );
}
