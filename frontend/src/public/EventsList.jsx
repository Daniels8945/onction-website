import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InnerHero from "../components/page/InnerHero.jsx";
import Reveal from "../components/Reveal.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import handshakeImg from "../../assets/cytonn-photography-vWchRczcQwM-unsplash.jpg";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function EventsList() {
  const [events, setEvents] = useState(null);
  usePageMeta("Events", "Upcoming Onction Energy events.");

  useEffect(() => {
    fetch(`${API_BASE}/api/events/public`)
      .then((res) => res.json())
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  return (
    <>
      <main>
      <InnerHero crumb="Events" title="Where to meet the desk" accent="the desk" intro="Briefings, forums and industry events hosted or attended by Onction Energy." image={handshakeImg} compact />
      <section className="wrap py-16 sm:py-20">

        {!events && <p className="text-sm text-slatey">Loading…</p>}
        {events && events.length === 0 && (
          <p className="text-slatey">
            No upcoming events — check back soon, or <Link to="/contact" className="font-medium text-teal-700 underline underline-offset-4">talk to the desk</Link> directly.
          </p>
        )}

        <div className="space-y-4">
          {events?.map((ev, i) => {
            const full = ev.capacity != null && ev.registered_count >= ev.capacity;
            return (
              <Reveal key={ev.id} delay={i * 60}>
              <Link to={`/events/${ev.slug}`} className="card flex flex-col justify-between gap-3 md:flex-row md:items-center">
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
              </Reveal>
            );
          })}
        </div>
      </section>
      </main>
    </>
  );
}
