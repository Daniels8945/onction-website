import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LuCalendar, LuEye, LuEyeOff, LuExternalLink, LuPencil, LuPlus, LuSend, LuTrash2 } from "react-icons/lu";
import { adminApi } from "../lib/adminApi.js";
import { usePromptDialog } from "../hooks/usePromptDialog.jsx";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";
import { useCanManage } from "../lib/useCanManage.js";
import { STATUS_LABEL, STATUS_TONE, openPreview, slugify } from "../lib/publishing.js";
import { formatDateTime, parseUtc } from "../../lib/dates.js";
import HelpLink from "../components/HelpLink.jsx";
import Thumb, { RowMenu } from "../components/Thumb.jsx";
import { Alert, Badge, Button, EmptyState, ListSkeleton, PageHeader, Panel, SearchInput, Table, Tabs, Td, Th } from "../components/ui.jsx";

export default function EventsListPage() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const canManage = useCanManage();
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function load() {
    setError("");
    adminApi.get("/api/events").then(setEvents).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  const now = Date.now();
  const isPast = (ev) => (parseUtc(ev.ends_at || ev.starts_at)?.getTime() ?? 0) < now;

  const counts = useMemo(() => {
    const c = { all: 0, upcoming: 0, past: 0, draft: 0 };
    events?.forEach((ev) => {
      c.all += 1;
      if (ev.status === "draft") c.draft += 1;
      else if (isPast(ev)) c.past += 1;
      else c.upcoming += 1;
    });
    return c;
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (events || []).filter((ev) => {
      const inTab =
        tab === "all" ||
        (tab === "draft" && ev.status === "draft") ||
        (tab === "upcoming" && ev.status === "published" && !isPast(ev)) ||
        (tab === "past" && ev.status === "published" && isPast(ev));
      return inTab && (!q || [ev.title, ev.location, ev.category, ev.slug].join(" ").toLowerCase().includes(q));
    });
  }, [events, tab, search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    const title = await prompt({
      title: "New event",
      label: "Event title",
      placeholder: 'e.g. "WAPP Trading Forum 2026"',
      confirmLabel: "Create draft",
    });
    if (!title) return;
    const slug = slugify(title);
    if (!slug) {
      toast.error("Use at least one letter or number in the title.");
      return;
    }
    try {
      const event = await adminApi.post("/api/events", { slug, title, starts_at: new Date().toISOString(), status: "draft" });
      toast.success("Draft created — add the details, then publish.");
      navigate(`/admin/events/${event.id}`);
    } catch (err) {
      toast.error(/already exists/.test(err.message) ? "An event with that title already exists — choose a different title." : err.message);
    }
  }

  async function setStatus(ev, status) {
    if (status === "draft") {
      const ok = await confirm({
        title: `Unpublish “${ev.title}”?`,
        message: "It disappears from the public Events page straight away and registration closes. Existing registrations are kept, and you can publish it again at any time.",
        confirmLabel: "Unpublish",
      });
      if (!ok) return;
    }
    try {
      const updated = await adminApi.put(`/api/events/${ev.id}`, { status, expected_updated_at: ev.updated_at });
      setEvents((prev) => prev.map((e) => (e.id === ev.id ? updated : e)));
      toast.success(status === "published" ? "Published — it's on the website now." : "Unpublished — it's hidden from the website.");
    } catch (err) {
      toast.error(err.message);
      if (/someone else/i.test(err.message)) load();
    }
  }

  async function handleDelete(ev) {
    const people = ev.registered_count + ev.waitlisted_count;
    const ok = await confirm({
      title: `Delete “${ev.title}”?`,
      message: (
        <div className="space-y-2">
          <p>
            This permanently deletes the event{people > 0 ? <> and its <strong>{people} registration{people === 1 ? "" : "s"}</strong></> : ""}. It can't be undone.
          </p>
          {ev.status === "published" && <p>If you only want to hide it from the website, unpublish it instead.</p>}
        </div>
      ),
      confirmLabel: "Delete event",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/events/${ev.id}`);
      toast.success("Event deleted.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      {promptDialog}
      {confirmDialog}
      <PageHeader
        title="Events"
        description="Onction events and industry events. Each one has a public page with a registration form while it's published."
        actions={
          <>
            <HelpLink topic="events" />
            {canManage && <Button variant="primary" icon={LuPlus} onClick={handleCreate}>New event</Button>}
          </>
        }
      />

      {error && <Alert tone="danger" className="mb-4" action={<Button size="sm" onClick={load}>Try again</Button>}>{error}</Alert>}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All", count: counts.all },
            { value: "upcoming", label: "Upcoming", count: counts.upcoming },
            { value: "past", label: "Past", count: counts.past },
            { value: "draft", label: "Drafts", count: counts.draft },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search events…" className="lg:w-72" />
      </div>

      <Panel padded={false}>
        {!events && !error ? (
          <ListSkeleton rows={4} />
        ) : events && events.length === 0 ? (
          <EmptyState
            icon={LuCalendar}
            title="No events yet"
            description="Create an event to give it a public page with registration."
            action={canManage && <Button variant="primary" icon={LuPlus} onClick={handleCreate}>New event</Button>}
          />
        ) : shown.length === 0 ? (
          <EmptyState compact title="No events match" description="Try another tab or search." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th className="hidden md:table-cell">When</Th>
                <Th className="hidden lg:table-cell">Registered</Th>
                <Th className="hidden sm:table-cell">Status</Th>
                <Th align="right"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {shown.map((ev) => (
                <tr key={ev.id} className="hover:bg-mist/60">
                  <Td>
                    <div className="flex items-center gap-3 sm:min-w-[220px]">
                      <Thumb url={ev.cover_image_url} />
                      <div className="min-w-0">
                        <Link to={`/admin/events/${ev.id}`} className="line-clamp-2 font-medium text-ink hover:text-teal-700">{ev.title}</Link>
                        <Badge tone={STATUS_TONE[ev.status]} className="mt-1 sm:hidden">{STATUS_LABEL[ev.status] || ev.status}</Badge>
                        <p className="truncate text-xs text-slatey">
                          <span className="md:hidden">{formatDateTime(ev.starts_at)} · </span>
                          {ev.location || "No location yet"}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="hidden whitespace-nowrap text-slatey md:table-cell">
                    {formatDateTime(ev.starts_at)}
                    {isPast(ev) && <span className="ml-1.5 text-xs text-slate-400">(past)</span>}
                  </Td>
                  <Td className="hidden whitespace-nowrap text-slatey lg:table-cell">
                    {ev.registered_count}
                    {ev.capacity ? ` / ${ev.capacity}` : ""}
                    {ev.waitlisted_count > 0 && <span className="text-xs"> (+{ev.waitlisted_count} waitlist)</span>}
                  </Td>
                  <Td className="hidden sm:table-cell"><Badge tone={STATUS_TONE[ev.status]}>{STATUS_LABEL[ev.status] || ev.status}</Badge></Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                      <Button size="sm" variant="ghost" icon={LuEye} onClick={() => openPreview(`/events/${ev.slug}`)} aria-label="Preview"><span className="hidden sm:inline">Preview</span></Button>
                      <Button size="sm" icon={LuPencil} to={`/admin/events/${ev.id}`} aria-label={canManage ? "Edit" : "View"}><span className="hidden sm:inline">{canManage ? "Edit" : "View"}</span></Button>
                      <RowMenu
                        label={`More actions for ${ev.title}`}
                        items={[
                          canManage && ev.status === "draft" && { label: "Publish", icon: LuSend, onClick: () => setStatus(ev, "published") },
                          canManage && ev.status === "published" && { label: "Unpublish", icon: LuEyeOff, onClick: () => setStatus(ev, "draft") },
                          ev.status === "published" && { label: "View live page", icon: LuExternalLink, onClick: () => window.open(`/events/${ev.slug}`, "_blank", "noopener") },
                          canManage && { divider: true },
                          canManage && { label: "Delete", icon: LuTrash2, danger: true, onClick: () => handleDelete(ev) },
                        ]}
                      />
                    </div>
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
