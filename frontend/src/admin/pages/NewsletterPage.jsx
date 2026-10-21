import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { LuDownload, LuEye, LuFlaskConical, LuMail, LuPencil, LuPlus, LuSend, LuTrash2, LuUserMinus, LuUsers } from "react-icons/lu";
import { adminApi, API_BASE, getToken } from "../lib/adminApi.js";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";
import { useCanManage } from "../lib/useCanManage.js";
import { formatDate, formatDateTime } from "../../lib/dates.js";
import ImageUpload from "../components/ImageUpload.jsx";
import HelpLink from "../components/HelpLink.jsx";
import { RowMenu } from "../components/Thumb.jsx";
import { Alert, Badge, Button, Drawer, EmptyState, Field, Input, ListSkeleton, Modal, PageHeader, Panel, SearchInput, Skeleton, StatCard, Table, Tabs, Td, Textarea, Th } from "../components/ui.jsx";

const CAMPAIGN_STATUS = {
  draft: { tone: "neutral", label: "Draft" },
  sending: { tone: "info", label: "Sending…" },
  sent: { tone: "success", label: "Sent" },
  failed: { tone: "danger", label: "Not delivered" },
};
const editable = (c) => c.status === "draft" || c.status === "failed";

export default function NewsletterPage() {
  const [tab, setTab] = useState("campaigns");
  const [overview, setOverview] = useState(null);
  const [subscribers, setSubscribers] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // {} for a new campaign, or a campaign
  const [previewing, setPreviewing] = useState(null);
  const canManage = useCanManage();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const load = useCallback(() => {
    setError("");
    adminApi.get("/api/newsletter/overview").then(setOverview).catch(() => {});
    adminApi.get("/api/newsletter/subscribers").then(setSubscribers).catch((err) => setError(err.message));
    adminApi.get("/api/newsletter/campaigns").then(setCampaigns).catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  // While anything is sending, check back until it finishes.
  const sending = campaigns?.some((c) => c.status === "sending");
  useEffect(() => {
    if (!sending) return;
    const t = setInterval(() => adminApi.get("/api/newsletter/campaigns").then(setCampaigns).catch(() => {}), 2500);
    return () => clearInterval(t);
  }, [sending]);

  const active = subscribers?.filter((s) => s.status === "subscribed").length ?? 0;
  const emailReady = overview?.email_configured;

  async function sendCampaign(c) {
    const ok = await confirm({
      title: "Send this campaign now?",
      message: (
        <div className="space-y-2">
          <p>
            “<strong>{c.subject}</strong>” will be emailed to <strong>{active} active subscriber{active === 1 ? "" : "s"}</strong>.
          </p>
          <p>Sending can't be stopped or undone. Preview it and send yourself a test first if you haven't.</p>
        </div>
      ),
      confirmLabel: `Send to ${active}`,
      destructive: true,
    });
    if (!ok) return false;
    try {
      const updated = await adminApi.post(`/api/newsletter/campaigns/${c.id}/send`, {});
      setCampaigns((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      toast.success("Sending — results appear here when it finishes.");
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  }

  async function deleteCampaign(c) {
    const ok = await confirm({
      title: `Delete “${c.subject}”?`,
      message: c.status === "sent" ? "This removes the campaign from the dashboard. It doesn't unsend emails that were already delivered." : "This permanently deletes the draft.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/newsletter/campaigns/${c.id}`);
      setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
      toast.success("Campaign deleted.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      {confirmDialog}
      <PageHeader
        title="Newsletter"
        description="Write email campaigns and send them to people who subscribed on the website."
        actions={
          <>
            <HelpLink topic="newsletter" />
            {canManage && tab === "campaigns" && <Button variant="primary" icon={LuPlus} onClick={() => setEditing({})}>New campaign</Button>}
          </>
        }
      />

      {error && <Alert tone="danger" className="mb-4" action={<Button size="sm" onClick={load}>Try again</Button>}>{error}</Alert>}
      {overview && !emailReady && (
        <Alert tone="warning" title="Email sending isn't set up on this server" className="mb-4">
          You can write, edit and preview campaigns, but they can't be sent until the SMTP settings (SMTP_HOST and the others) are added to the server's
          configuration. Nothing is ever marked as sent unless the mail server accepted it.
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Active subscribers" value={subscribers ? active : "—"} icon={LuUsers} tone="success" />
        <StatCard label="Unsubscribed" value={subscribers ? subscribers.length - active : "—"} icon={LuUserMinus} />
        <StatCard label="Campaigns sent" value={campaigns ? campaigns.filter((c) => c.status === "sent").length : "—"} icon={LuMail} />
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: "campaigns", label: "Campaigns", count: campaigns?.length },
          { value: "subscribers", label: "Subscribers", count: subscribers?.length },
        ]}
      />

      {tab === "campaigns" ? (
        <Panel padded={false}>
          {!campaigns ? (
            <ListSkeleton rows={3} />
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={LuMail}
              title="No campaigns yet"
              description="Write a campaign, preview it, send yourself a test, then send it to your subscribers."
              action={canManage && <Button variant="primary" icon={LuPlus} onClick={() => setEditing({})}>New campaign</Button>}
            />
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {campaigns.map((c) => {
                const st = CAMPAIGN_STATUS[c.status] || { tone: "neutral", label: c.status };
                return (
                  <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">{c.subject}</p>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slatey">
                        {c.status === "sent" || c.status === "failed"
                          ? `${c.status === "sent" ? "Sent" : "Attempted"} ${formatDateTime(c.sent_at)} — ${c.sent_count} delivered${c.failed_count ? `, ${c.failed_count} failed` : ""}`
                          : c.status === "sending"
                            ? "Being sent now…"
                            : `Created ${formatDate(c.created_at)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="ghost" icon={LuEye} onClick={() => setPreviewing(c)}>Preview</Button>
                      {canManage && editable(c) && <Button size="sm" icon={LuPencil} onClick={() => setEditing(c)}>Edit</Button>}
                      {canManage && editable(c) && (
                        <Button size="sm" variant="primary" icon={LuSend} onClick={() => sendCampaign(c)} disabled={!emailReady || active === 0} title={!emailReady ? "Email sending isn't set up" : active === 0 ? "No active subscribers" : undefined}>
                          Send
                        </Button>
                      )}
                      <RowMenu label={`More actions for ${c.subject}`} items={[canManage && c.status !== "sending" && { label: "Delete", icon: LuTrash2, danger: true, onClick: () => deleteCampaign(c) }]} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      ) : (
        <SubscribersTab subscribers={subscribers} setSubscribers={setSubscribers} canManage={canManage} confirm={confirm} />
      )}

      {editing && (
        <CampaignEditor
          campaign={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, { andPreview }) => {
            setCampaigns((prev) => (prev?.some((x) => x.id === saved.id) ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...(prev || [])]));
            setEditing(null);
            if (andPreview) setPreviewing(saved);
          }}
        />
      )}
      {previewing && (
        <CampaignPreview
          campaign={previewing}
          canManage={canManage}
          onClose={() => setPreviewing(null)}
          onEdit={editable(previewing) && canManage ? () => { setEditing(previewing); setPreviewing(null); } : null}
          onSend={editable(previewing) && canManage && emailReady && active > 0 ? async () => { if (await sendCampaign(previewing)) setPreviewing(null); } : null}
        />
      )}
    </div>
  );
}

function CampaignEditor({ campaign, onClose, onSaved }) {
  const isNew = !campaign.id;
  const [form, setForm] = useState({ subject: campaign.subject || "", body: campaign.body || "", image_url: campaign.image_url || "" });
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const subjectError = touched && !form.subject.trim() ? "A subject line is required." : undefined;

  async function save(andPreview) {
    setTouched(true);
    if (!form.subject.trim()) return;
    setSaving(true);
    try {
      const payload = { subject: form.subject.trim(), body: form.body, image_url: form.image_url || null };
      const saved = isNew ? await adminApi.post("/api/newsletter/campaigns", payload) : await adminApi.put(`/api/newsletter/campaigns/${campaign.id}`, payload);
      toast.success("Draft saved. Nothing has been sent.");
      onSaved(saved, { andPreview });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      title={isNew ? "New campaign" : "Edit campaign"}
      subtitle="Saving keeps it as a draft. Nothing is emailed until you press Send."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={LuEye} onClick={() => save(true)} loading={saving}>Save and preview</Button>
          <Button variant="primary" onClick={() => save(false)} loading={saving}>Save draft</Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Subject line" required error={subjectError} hint={!subjectError && "What subscribers see in their inbox."} counter={<span className="text-[11px] tabular-nums text-slatey">{form.subject.length}/200</span>}>
          {(p) => <Input {...p} value={form.subject} maxLength={200} onChange={(e) => setForm({ ...form, subject: e.target.value })} onBlur={() => setTouched(true)} autoFocus />}
        </Field>
        <ImageUpload label="Header image" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} hint="Shown full width above the subject. Wide images work best." />
        <Field label="Message" optional hint="Plain text. Each line becomes its own paragraph. An unsubscribe link is added automatically.">
          {(p) => <Textarea {...p} rows={12} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="leading-relaxed" />}
        </Field>
      </div>
    </Drawer>
  );
}

function CampaignPreview({ campaign, canManage, onClose, onEdit, onSend }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const frameRef = useRef(null);

  useEffect(() => {
    adminApi.get(`/api/newsletter/campaigns/${campaign.id}/preview`).then(setData).catch((err) => setError(err.message));
  }, [campaign.id]);

  async function sendTest() {
    setTesting(true);
    try {
      const r = await adminApi.post(`/api/newsletter/campaigns/${campaign.id}/test`, {});
      toast.success(`Test sent to ${r.sent_to}. Subscribers weren't emailed.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal
      title="Email preview"
      description="Exactly what subscribers receive. Previewing never sends anything."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {onEdit && <Button icon={LuPencil} onClick={onEdit}>Edit</Button>}
          {canManage && data?.email_configured && <Button icon={LuFlaskConical} onClick={sendTest} loading={testing}>Send a test to me</Button>}
          {onSend && <Button variant="primary" icon={LuSend} onClick={onSend}>Send to {data?.recipients ?? "…"}</Button>}
        </>
      }
    >
      {error ? (
        <Alert tone="danger">{error}</Alert>
      ) : !data ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : (
        <div className="space-y-3">
          <dl className="grid gap-1 rounded-lg bg-mist px-4 py-3 text-sm sm:grid-cols-[90px_1fr]">
            <dt className="text-slatey">Subject</dt>
            <dd className="font-medium text-ink">{data.subject}</dd>
            <dt className="text-slatey">Goes to</dt>
            <dd className="text-ink">{data.recipients} active subscriber{data.recipients === 1 ? "" : "s"}</dd>
          </dl>
          {!data.email_configured && <Alert tone="warning">Email sending isn't set up on this server, so this campaign can't be sent or tested yet.</Alert>}
          {/* sandbox with no permissions: the email's HTML can't run scripts or navigate the dashboard */}
          <iframe ref={frameRef} title="Email preview" sandbox="" srcDoc={data.html} className="h-[60vh] w-full rounded-lg border border-black/10 bg-white" />
        </div>
      )}
    </Modal>
  );
}

function SubscribersTab({ subscribers, setSubscribers, canManage, confirm }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (subscribers || []).filter((s) => (status === "all" || s.status === status) && (!q || `${s.email} ${s.name || ""}`.toLowerCase().includes(q)));
  }, [subscribers, search, status]);

  async function unsubscribe(s) {
    const ok = await confirm({
      title: `Unsubscribe ${s.email}?`,
      message: "Use this when someone asks you to stop emailing them. They won't receive campaigns. Only they can re-subscribe, by signing up again on the website.",
      confirmLabel: "Unsubscribe",
      destructive: true,
    });
    if (!ok) return;
    try {
      const updated = await adminApi.post(`/api/newsletter/subscribers/${s.id}/unsubscribe`, {});
      setSubscribers((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
      toast.success("Unsubscribed.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function erase(s) {
    const ok = await confirm({
      title: `Permanently delete ${s.email}?`,
      message: "Use this for a data-deletion request. The record is erased completely — to simply stop emailing someone, unsubscribe them instead.",
      confirmLabel: "Delete permanently",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/newsletter/subscribers/${s.id}`);
      setSubscribers((prev) => prev.filter((x) => x.id !== s.id));
      toast.success("Subscriber deleted.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  function exportCsv() {
    fetch(`${API_BASE}/api/newsletter/subscribers/export`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 403 ? "Your role can't export subscriber data." : "Export failed");
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "newsletter-subscribers.csv";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => toast.error(err.message));
  }

  const count = (st) => (subscribers || []).filter((s) => st === "all" || s.status === st).length;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
          {[
            ["all", "All"],
            ["subscribed", "Subscribed"],
            ["unsubscribed", "Unsubscribed"],
          ].map(([value, label]) => (
            <Button key={value} size="sm" variant={status === value ? "dark" : "ghost"} aria-pressed={status === value} onClick={() => setStatus(value)}>
              {label} <span className="tabular-nums opacity-70">{count(value)}</span>
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by email or name…" className="sm:w-72" />
          {canManage && <Button icon={LuDownload} onClick={exportCsv}>Export CSV</Button>}
        </div>
      </div>
      <Panel padded={false}>
        {!subscribers ? (
          <ListSkeleton rows={4} />
        ) : subscribers.length === 0 ? (
          <EmptyState icon={LuUsers} title="No subscribers yet" description="People who sign up with the newsletter form in the website footer appear here." />
        ) : shown.length === 0 ? (
          <EmptyState compact title="No subscribers match" description="Try another search or filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Email</Th>
                <Th className="hidden sm:table-cell">Name</Th>
                <Th>Status</Th>
                <Th className="hidden md:table-cell">Signed up</Th>
                <Th align="right"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {shown.map((s) => (
                <tr key={s.id} className="hover:bg-mist/60">
                  <Td className="max-w-[260px] truncate font-medium text-ink">{s.email}</Td>
                  <Td className="hidden text-slatey sm:table-cell">{s.name || "—"}</Td>
                  <Td><Badge tone={s.status === "subscribed" ? "success" : "neutral"}>{s.status === "subscribed" ? "Subscribed" : "Unsubscribed"}</Badge></Td>
                  <Td className="hidden whitespace-nowrap text-slatey md:table-cell">{formatDate(s.created_at)}</Td>
                  <Td align="right">
                    <RowMenu
                      label={`Actions for ${s.email}`}
                      items={[
                        canManage && s.status === "subscribed" && { label: "Unsubscribe", icon: LuUserMinus, onClick: () => unsubscribe(s) },
                        canManage && { label: "Delete permanently", icon: LuTrash2, danger: true, onClick: () => erase(s) },
                      ]}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
