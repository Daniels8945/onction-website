import { useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi.js";
import StatTile from "../components/StatTile.jsx";
import TrafficChart from "../components/TrafficChart.jsx";
import EnquiriesChart from "../components/EnquiriesChart.jsx";
import BarList from "../components/BarList.jsx";

const RANGE_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

function formatDuration(seconds) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}m ${remaining}s`;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [traffic, setTraffic] = useState(null);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.all([adminApi.get(`/api/analytics/traffic?days=${days}`), adminApi.get(`/api/analytics/business?days=${days}`)])
      .then(([t, b]) => {
        setTraffic(t);
        setBusiness(b);
      })
      .catch((err) => setError(err.message));
  }, [days]);

  const newVsReturning = traffic?.new_vs_returning;
  const totalSessions = (newVsReturning?.new ?? 0) + (newVsReturning?.returning ?? 0);
  const returningPct = totalSessions ? Math.round((newVsReturning.returning / totalSessions) * 100) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Analytics</h1>
          <p className="text-sm text-slatey">Site traffic and lead activity.</p>
        </div>
        <div className="flex gap-1 border border-black/10 bg-white p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                days === opt.days ? "bg-navy-950 text-white" : "text-slatey hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!traffic || !business ? (
        <p className="text-sm text-slatey">Loading…</p>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Pageviews" value={traffic.totals.pageviews} />
            <StatTile label="Unique visitors" value={traffic.totals.unique_visitors} />
            <StatTile label="Enquiries this period" value={business.totals.current_period} deltaPct={business.totals.delta_pct} />
            <StatTile label="Event registrations" value={business.totals.registrations_current_period} />
          </div>

          <section className="card">
            <p className="eyebrow mb-4">Traffic over time</p>
            <TrafficChart series={traffic.series} />
          </section>

          <div>
            <p className="eyebrow mb-4">Audience behavior</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label="Bounce rate" value={traffic.bounce_rate_pct != null ? `${traffic.bounce_rate_pct}%` : "—"} />
              <StatTile label="Avg. time on page" value={formatDuration(traffic.avg_time_on_page_seconds)} />
              <StatTile label="New visitors" value={newVsReturning?.new ?? 0} />
              <StatTile
                label="Returning visitors"
                value={returningPct != null ? `${newVsReturning.returning} (${returningPct}%)` : newVsReturning?.returning ?? 0}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="card">
              <p className="eyebrow mb-4">Top pages</p>
              <BarList items={traffic.top_pages} labelKey="path" valueKey="count" />
            </section>
            <section className="card">
              <p className="eyebrow mb-4">Top referrers</p>
              <BarList items={traffic.top_referrers} labelKey="referrer" valueKey="count" emptyLabel="No referrer data yet" />
            </section>
            <section className="card">
              <p className="eyebrow mb-4">Landing pages</p>
              <BarList items={traffic.landing_pages} labelKey="path" valueKey="count" emptyLabel="Not enough session data yet" />
            </section>
            <section className="card">
              <p className="eyebrow mb-4">Exit pages</p>
              <BarList items={traffic.exit_pages} labelKey="path" valueKey="count" emptyLabel="Not enough session data yet" />
            </section>
            <section className="card">
              <p className="eyebrow mb-4">Browsers</p>
              <BarList items={traffic.browsers} labelKey="name" valueKey="count" />
            </section>
            <section className="card">
              <p className="eyebrow mb-4">Operating systems</p>
              <BarList items={traffic.operating_systems} labelKey="name" valueKey="count" />
            </section>
            <section className="card">
              <p className="eyebrow mb-4">Acquisition channels</p>
              <BarList items={traffic.referrer_categories} labelKey="category" valueKey="count" />
            </section>
            <section className="card">
              <p className="eyebrow mb-4">Campaigns (UTM)</p>
              <BarList items={traffic.top_campaigns} labelKey="campaign" valueKey="count" emptyLabel="No tagged campaign links yet" />
            </section>
            <section className="card">
              <p className="eyebrow mb-4">Visitor countries</p>
              <BarList items={traffic.countries} labelKey="country" valueKey="count" emptyLabel="No geo data resolved yet" />
            </section>
            <section className="card">
              <p className="eyebrow mb-4">Conversions by channel</p>
              <BarList
                items={business.conversions_by_channel}
                labelKey="channel"
                valueKey="count"
                emptyLabel="No enquiries or registrations in this window yet"
              />
            </section>
          </div>

          <section className="card">
            <p className="eyebrow mb-4">Enquiries over time</p>
            <EnquiriesChart series={business.series} />
          </section>

          <section className="card">
            <p className="eyebrow mb-4">Enquiries by country</p>
            <BarList items={business.by_country} labelKey="country" valueKey="count" emptyLabel="No country data yet" />
          </section>
        </div>
      )}
    </div>
  );
}
