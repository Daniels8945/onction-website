import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useVendorAuth } from "./VendorAuthContext.jsx";

export default function VendorLoginPage() {
  const { login, isAuthenticated } = useVendorAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [vendorCode, setVendorCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(vendorCode.trim(), password);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm rounded-none border border-white/10 bg-navy-900 p-8 shadow-xl">
        <p className="eyebrow-light mb-2">Onction Energy</p>
        <h1 className="mb-6 font-syne text-2xl font-semibold text-white">Vendor sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="vendorCode" className="mb-1 block text-xs font-medium text-white/70">Vendor code</label>
            <input
              id="vendorCode"
              required
              placeholder="e.g. OSL-2026-XYZ-1234"
              value={vendorCode}
              onChange={(e) => setVendorCode(e.target.value)}
              className="w-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-white/70">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Leave blank if you haven't set one yet"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs">
          <Link to="/forgot-password" className="text-white/50 hover:text-teal-400">Forgot password?</Link>
          <Link to="/register" className="text-white/50 hover:text-teal-400">Register as a vendor →</Link>
        </div>
      </div>
    </div>
  );
}
