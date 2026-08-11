import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function EventsList() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/events/public`)
      .then((res) => res.json())
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  return (
    <>
      <Header />
      <main className="wrap py-20">
        <p className="eyebrow mb-2">What's on</p>
        <h1 className="mb-10 font-syne text-4xl font-semibold text-ink">Events</h1>

        {!events && <p className="text-sm text-slatey">Loading…</p>}
        {events && events.length === 0 && <p className="text-sm text-slatey">No upcoming events — check back soon.</p>}

        <div className="space-y-4">
          {events?.map((ev) => {
            const full = ev.capacity != null && ev.registered_count >= ev.capacity;
            return (
              <Link key={ev.id} to={`/events/${ev.slug}`} className="card flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="eyebrow mb-1">{ev.category}</p>
                  <h2 className="font-syne text-xl font-semibold text-ink">{ev.title}</h2>
                  <p className="mt-1 text-sm text-slatey">
                    {new Date(ev.starts_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · {ev.location}
                  </p>
                </div>
                <span className={`shrink-0 px-3 py-1 text-xs font-medium ${full ? "bg-black/5 text-slatey" : "bg-teal-100 text-teal-700"}`}>
                  {full ? "Waitlist open" : "Registration open"}
                </span>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
