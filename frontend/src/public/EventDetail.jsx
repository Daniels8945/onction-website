import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { getSessionId } from "../lib/session.js";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function RegistrationForm({ slug, onRegistered }) {
  const [form, setForm] = useState({ full_name: "", email: "", company: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/events/public/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, session_id: getSessionId() || undefined }),
      });
      if (!res.ok) throw new Error("Registration failed — please try again.");
      const data = await res.json();
      onRegistered(data.status);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <input
        required
        placeholder="Full name"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
      <input
        type="email"
        required
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
      <input
        placeholder="Company (optional)"
        value={form.company}
        onChange={(e) => setForm({ ...form, company: e.target.value })}
        className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
        {submitting ? "Registering…" : "Register"}
      </button>
    </form>
  );
}

export default function EventDetail() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [registeredStatus, setRegisteredStatus] = useState(null);

  useEffect(() => {
    setEvent(null);
    setNotFound(false);
    fetch(`${API_BASE}/api/events/public/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setEvent)
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <>
        <Header />
        <main className="wrap flex min-h-[50vh] flex-col items-center justify-center text-center">
          <p className="eyebrow mb-2">404</p>
          <h1 className="font-syne text-2xl font-semibold text-ink">Event not found</h1>
        </main>
        <Footer />
      </>
    );
  }

  if (!event) return null;

  const isFull = event.capacity != null && event.registered_count >= event.capacity;

  return (
    <>
      <Header />
      <main className="wrap max-w-3xl py-20">
        <p className="eyebrow mb-2">{event.category}</p>
        <h1 className="font-syne text-3xl font-semibold text-ink md:text-4xl">{event.title}</h1>
        <p className="mt-3 text-sm text-slatey">
          {new Date(event.starts_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
          {event.location && ` · ${event.location}`}
        </p>
        {event.cover_image_url && <img src={event.cover_image_url} alt="" className="my-8 w-full" />}
        {event.description && <p className="mb-8 text-slatey">{event.description}</p>}

        <div className="max-w-md">
          {registeredStatus === "registered" && (
            <div className="border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
              You're registered — see you there!
            </div>
          )}
          {registeredStatus === "waitlisted" && (
            <div className="border border-spark-400/40 bg-spark-400/10 px-4 py-3 text-sm text-spark-500">
              This event is full — you've been added to the waitlist and we'll email you if a spot opens up.
            </div>
          )}
          {!registeredStatus && (
            <>
              <p className="eyebrow mb-3">{isFull ? "Join the waitlist" : "Register"}</p>
              <RegistrationForm slug={slug} onRegistered={setRegisteredStatus} />
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
