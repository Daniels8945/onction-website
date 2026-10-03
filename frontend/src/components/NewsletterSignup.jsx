import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-sm text-teal-400" role="status">You're subscribed — check your inbox for a welcome email.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm gap-2">
      <input
        type="email"
        required
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-teal-400"
      />
      <button type="submit" disabled={status === "loading"} className="btn-primary shrink-0 !px-4 !py-2 disabled:opacity-60">
        {status === "loading" ? "…" : "Subscribe"}
      </button>
      {status === "error" && <p className="mt-1 text-xs text-red-400">Something went wrong — try again.</p>}
    </form>
  );
}
