import { useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi.js";

function CampaignForm({ onCreate, onCancel }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onCreate({ subject, body });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-6 space-y-3">
      <input
        placeholder="Subject"
        required
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
      <textarea
        placeholder="Body (one paragraph per line)"
        rows={6}
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-slatey hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);

  function load() {
    adminApi.get("/api/newsletter/subscribers").then(setSubscribers).catch((err) => setError(err.message));
    adminApi.get("/api/newsletter/campaigns").then(setCampaigns).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  const activeSubscribers = subscribers?.filter((s) => s.status === "subscribed").length ?? 0;

  async function handleCreate(payload) {
    try {
      await adminApi.post("/api/newsletter/campaigns", payload);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSend(id) {
    if (!confirm(`Send this campaign to ${activeSubscribers} subscriber(s)? This can't be undone.`)) return;
    setError("");
    try {
      await adminApi.post(`/api/newsletter/campaigns/${id}/send`, {});
      setNotice("Sending in the background — refresh in a moment to see results.");
      setTimeout(load, 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this draft?")) return;
    try {
      await adminApi.del(`/api/newsletter/campaigns/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Newsletter</h1>
          <p className="text-sm text-slatey">{activeSubscribers} active subscriber{activeSubscribers === 1 ? "" : "s"}.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + New campaign
          </button>
        )}
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="mb-4 border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">{notice}</div>}
      {showForm && <CampaignForm onCreate={handleCreate} onCancel={() => setShowForm(false)} />}

      {!campaigns ? (
        <p className="text-sm text-slatey">Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="card text-sm text-slatey">No campaigns yet.</div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{c.subject}</p>
                <p className="text-xs text-slatey">
                  {c.status === "sent"
                    ? `Sent ${new Date(c.sent_at).toLocaleString()} — ${c.sent_count} delivered, ${c.failed_count} failed`
                    : "Draft"}
                </p>
              </div>
              {c.status === "draft" && (
                <div className="flex gap-3">
                  <button onClick={() => handleSend(c.id)} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                    Send now
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs font-medium text-red-600 hover:text-red-700">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
