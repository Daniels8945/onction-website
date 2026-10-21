import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { LuEye, LuHistory, LuRotateCcw, LuSave, LuSend, LuShieldCheck, LuTrash2, LuUndo2 } from "react-icons/lu";
import { adminApi } from "../../lib/adminApi.js";
import { useAuth } from "../../AuthContext.jsx";
import { useCanManage } from "../../lib/useCanManage.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.jsx";
import { Alert, Badge, Button, Drawer, EmptyState, Modal, PageHeader, Panel, Skeleton, Textarea, cx } from "../../components/ui.jsx";
import FieldEditor from "../../content/FieldEditor.jsx";
import { diffContent } from "../../content/diff.js";
import { STATUS, useSchema } from "../../content/useSchema.js";
import { builtIn } from "../../../cms/registry.js";
import HelpLink from "../../components/HelpLink.jsx";

// The Help Centre guide for a content area: a specific one where it exists.
const helpTopicFor = (key) => (key === "leadership.people" ? "leadership" : key === "media.library" ? "media-gallery" : key.startsWith("partners.") ? "partners" : "website-content");

const fmt = (d) => (d ? new Date(d.endsWith?.("Z") ? d : `${d}Z`).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
const slug = (t = "") => t.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// New list items get a permanent address/ID from their title the first time
// they're saved; existing ones keep theirs.
function withIds(fields, data) {
  if (!data || typeof data !== "object") return data;
  const out = Array.isArray(data) ? [...data] : { ...data };
  for (const f of fields) {
    if (f.type === "list" && Array.isArray(out[f.name])) {
      const idField = f.fields.find((x) => x.type === "slug");
      const taken = new Set();
      out[f.name] = out[f.name].map((item) => {
        let next = withIds(f.fields, item);
        if (idField && !next[idField.name]) {
          const base = slug(next.title || next.name || next.label || "item") || "item";
          let candidate = base;
          for (let n = 2; taken.has(candidate) || out[f.name].some((o) => o !== item && o[idField.name] === candidate); n++) candidate = `${base}-${n}`;
          next = { ...next, [idField.name]: candidate };
        }
        if (idField) taken.add(next[idField.name]);
        return next;
      });
    } else if (f.type === "group") {
      out[f.name] = withIds(f.fields, out[f.name] || {});
    }
  }
  return out;
}

function collectIds(fields, data, set = new Set()) {
  for (const f of fields) {
    if (f.type === "list" && Array.isArray(data?.[f.name])) {
      data[f.name].forEach((it) => {
        if (it?.id) set.add(it.id);
        if (it?.slug) set.add(it.slug);
        collectIds(f.fields, it, set);
      });
    }
  }
  return set;
}

export default function ContentEditorPage() {
  const { key } = useParams();
  const { schema, error: schemaError } = useSchema();
  const { admin } = useAuth();
  const canEdit = useCanManage();
  const { confirm, dialog } = useConfirmDialog();
  const coll = schema?.collections.find((c) => c.key === key);

  const [doc, setDoc] = useState(null);
  const [data, setData] = useState(null);
  const [saved, setSaved] = useState(null); // JSON of the last saved draft (or loaded state)
  const [issues, setIssues] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [history, setHistory] = useState(null);

  const load = useCallback(() => {
    setError("");
    setConflict(false);
    adminApi
      .get(`/api/content/docs/${key}`)
      .then((d) => {
        const initial = d.draft ?? d.published ?? builtIn(key) ?? {};
        setDoc(d);
        setData(initial);
        setSaved(JSON.stringify(initial));
        setIssues(d.issues || []);
      })
      .catch((e) => setError(e.message));
  }, [key]);
  useEffect(load, [load]);

  const dirty = data !== null && JSON.stringify(data) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const live = doc ? doc.published ?? builtIn(key) : null;
  const status = !doc ? "built-in" : doc.published == null ? (doc.draft == null ? "built-in" : "draft") : doc.draft == null ? "published" : "changes";
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const changes = useMemo(() => (coll && data && live ? diffContent(live, data, coll.fields) : []), [coll, data, live]);
  const canPublish = canEdit && (!coll?.protected || admin?.role === "Super Admin");
  const savedIds = useMemo(() => (coll && doc ? collectIds(coll.fields, doc.draft ?? doc.published ?? builtIn(key)) : new Set()), [coll, doc, key]);

  const ctx = {
    savedIds,
    confirmRemove: (label) => confirm({ title: `Remove “${label}”?`, message: "It disappears from the draft. Nothing changes on the website until you publish.", confirmLabel: "Remove", destructive: true }),
  };

  async function call(kind, fn) {
    setBusy(kind);
    try {
      return await fn();
    } catch (e) {
      if (/someone else saved/i.test(e.message)) setConflict(true);
      else toast.error(e.message);
      return null;
    } finally {
      setBusy("");
    }
  }

  async function saveDraft({ quiet = false } = {}) {
    const body = { data: withIds(coll.fields, data), rev: doc.rev };
    const d = await call("save", () => adminApi.put(`/api/content/docs/${key}/draft`, body));
    if (!d) return null;
    setDoc(d);
    setData(d.draft);
    setSaved(JSON.stringify(d.draft));
    setIssues(d.issues || []);
    if (!quiet) {
      const n = (d.issues || []).filter((i) => i.level === "error").length;
      n ? toast(`Draft saved — ${n} problem${n > 1 ? "s" : ""} to fix before publishing.`, { icon: "⚠️" }) : toast.success("Draft saved. The website hasn't changed.");
    }
    return d;
  }

  async function preview(path) {
    if (dirty && !(await saveDraft({ quiet: true }))) return;
    window.open(`${path}${path.includes("?") ? "&" : "?"}preview`, "_blank", "noopener");
  }

  async function publish(note) {
    const d = await call("publish", () => adminApi.post(`/api/content/docs/${key}/publish`, { rev: doc.rev, confirm: true, note: note || null }));
    if (!d) return;
    setDoc(d);
    setData(d.published);
    setSaved(JSON.stringify(d.published));
    setIssues(d.issues || []);
    setReviewing(false);
    toast.success("Published — the website now shows these changes.");
  }

  async function discard() {
    const ok = await confirm({ title: "Discard this draft?", message: "Your unpublished changes are removed (a copy is kept in History). The website is unaffected.", confirmLabel: "Discard draft", destructive: true });
    if (!ok) return;
    const d = await call("discard", () => adminApi.post(`/api/content/docs/${key}/discard`, { rev: doc.rev }));
    if (d) {
      toast.success("Draft discarded.");
      load();
    }
  }

  async function unpublish() {
    const ok = await confirm({
      title: "Return this area to its built-in content?",
      message: "The website goes back to the original approved content for this area. The published version is kept in History and can be restored.",
      confirmLabel: "Use built-in content",
      destructive: true,
    });
    if (!ok) return;
    const d = await call("unpublish", () => adminApi.post(`/api/content/docs/${key}/unpublish`, { rev: doc.rev, confirm: true }));
    if (d) {
      toast.success("The website now shows the built-in content for this area.");
      load();
    }
  }

  async function openHistory() {
    setHistory([]);
    const h = await call("history", () => adminApi.get(`/api/content/docs/${key}/history`));
    setHistory(h || []);
  }

  async function restore(rev) {
    if (dirty && !(await confirm({ title: "Replace your unsaved edits?", confirmLabel: "Replace", destructive: true }))) return;
    const d = await call("restore", () => adminApi.post(`/api/content/docs/${key}/restore/${rev.id}`, { rev: doc.rev }));
    if (!d) return;
    setDoc(d);
    setData(d.draft);
    setSaved(JSON.stringify(d.draft));
    setIssues(d.issues || []);
    setHistory(null);
    toast.success("Loaded into the draft. Review and publish it to put it live.");
  }

  if (schemaError || error) return <Alert tone="danger" title="Couldn't load this content">{schemaError || error}</Alert>;
  if (!schema || !doc || data === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!coll) return <EmptyState title="Unknown content area" description="This area doesn't exist." />;

  const st = STATUS[status];
  return (
    <div>
      <PageHeader
        back={{ to: "/admin/content", label: "Website content" }}
        title={coll.label}
        description={coll.description}
        meta={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            {coll.protected && <Badge tone="info" dot={false}><LuShieldCheck size={12} aria-hidden="true" /> Protected</Badge>}
            {dirty && <Badge tone="warning">Unsaved edits</Badge>}
          </>
        }
        actions={
          <>
            <HelpLink topic={helpTopicFor(key)} />
            <Button icon={LuHistory} onClick={openHistory}>History</Button>
            <Button icon={LuEye} onClick={() => preview(coll.used_on[0].path)}>Preview</Button>
            {canEdit && <Button icon={LuSave} onClick={() => saveDraft()} loading={busy === "save"} disabled={!dirty}>Save draft</Button>}
            {canEdit && (
              <Button variant="primary" icon={LuSend} onClick={async () => { if (dirty && !(await saveDraft({ quiet: true }))) return; setReviewing(true); }} disabled={status === "published" && !dirty || status === "built-in" && !dirty}>
                Review & publish
              </Button>
            )}
          </>
        }
      />

      {conflict && (
        <Alert tone="danger" title="Someone else changed this content" className="mb-4" action={<Button size="sm" onClick={load}>Reload</Button>}>
          Another editor saved this area after you opened it. Reload to see their version — copy anything you need first.
        </Alert>
      )}
      {!canEdit && <Alert tone="info" className="mb-4">You have view-only access. Ask an Admin to make changes.</Alert>}
      {coll.protected && canEdit && admin?.role !== "Super Admin" && (
        <Alert tone="info" className="mb-4">This area is protected. You can prepare and save a draft; a Super Admin publishes it.</Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <div className="space-y-6">
            {coll.fields.map((f) => (
              <FieldEditor key={f.name} field={f} value={data[f.name]} onChange={(v) => setData((d) => ({ ...d, [f.name]: v }))} issues={issues} path={f.name} ctx={ctx} disabled={!canEdit} />
            ))}
          </div>
          <datalist id="routes-route">{schema.routes.map((r) => <option key={r} value={r} />)}</datalist>
          <datalist id="routes-link">{[...schema.routes, ...schema.home_anchors].map((r) => <option key={r} value={r} />)}</datalist>
        </Panel>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Panel title="Status">
            <p className="text-sm text-slatey">{st.help}</p>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-slatey">Draft saved</dt><dd className="text-right text-ink">{fmt(doc.draft_updated_at)}{doc.draft_updated_by ? ` · ${doc.draft_updated_by}` : ""}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slatey">Last published</dt><dd className="text-right text-ink">{fmt(doc.published_at)}{doc.published_by ? ` · ${doc.published_by}` : ""}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slatey">Version</dt><dd className="text-ink">{doc.version || "—"}</dd></div>
            </dl>
            {canEdit && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-black/[0.06] pt-4">
                {doc.draft != null && <Button size="sm" variant="ghost" icon={LuUndo2} onClick={discard} loading={busy === "discard"}>Discard draft</Button>}
                {doc.published != null && canPublish && <Button size="sm" variant="danger-ghost" icon={LuRotateCcw} onClick={unpublish} loading={busy === "unpublish"}>Use built-in content</Button>}
              </div>
            )}
          </Panel>

          <Panel title="Problems">
            {issues.length ? (
              <ul className="space-y-2 text-sm">
                {errors.map((i, k) => <li key={`e${k}`} className="text-red-700">• {i.message}</li>)}
                {warnings.map((i, k) => <li key={`w${k}`} className="text-amber-800">• {i.message}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-slatey">{dirty ? "Save the draft to check it." : "None found."}</p>
            )}
          </Panel>

          <Panel title="Where this appears">
            <ul className="space-y-2 text-sm">
              {coll.used_on.map((u) => (
                <li key={u.label} className="flex items-center justify-between gap-3">
                  <span className="text-ink">{u.label}</span>
                  <button type="button" onClick={() => preview(u.path)} className="shrink-0 text-xs font-semibold text-teal-700 hover:underline">Preview</button>
                </li>
              ))}
            </ul>
            {coll.used_on.length > 1 && <p className="mt-3 text-xs text-slatey">Shared content: publishing updates every place listed.</p>}
          </Panel>
        </aside>
      </div>

      {reviewing && (
        <ReviewModal coll={coll} changes={changes} errors={errors} warnings={warnings} canPublish={canPublish} busy={busy === "publish"} onPreview={preview} onPublish={publish} onClose={() => setReviewing(false)} />
      )}

      {history && (
        <Drawer title="History" subtitle="Every publish, unpublish, discard and restore" onClose={() => setHistory(null)}>
          {busy === "history" ? (
            <Skeleton className="h-40 w-full" />
          ) : history.length ? (
            <ol className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="rounded-lg border border-black/[0.08] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={h.action === "publish" ? "success" : h.action === "restore" ? "info" : "neutral"}>{h.action}</Badge>
                    <span className="text-xs text-slatey">{fmt(h.at)}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slatey">{h.by}{h.version ? ` · version ${h.version}` : ""}</p>
                  {h.note && <p className="mt-1.5 text-sm text-ink">“{h.note}”</p>}
                  <p className="mt-1.5 text-xs text-slatey">{diffContent(live, h.data, coll.fields).length} differences from what's live now</p>
                  {canEdit && h.data && (
                    <Button size="xs" className="mt-2" icon={LuRotateCcw} onClick={() => restore(h)} loading={busy === "restore"}>Load into draft</Button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState compact title="No history yet" description="Publishing creates the first entry." />
          )}
        </Drawer>
      )}
      {dialog}
    </div>
  );
}

function ReviewModal({ coll, changes, errors, warnings, canPublish, busy, onPreview, onPublish, onClose }) {
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState(false);
  const blocked = errors.length > 0 || !canPublish || changes.length === 0;
  return (
    <Modal
      title="Review changes"
      description="Compare the draft with what the website shows now, then publish."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Back to editing</Button>
          <Button variant="primary" icon={LuSend} disabled={blocked || !checked} loading={busy} onClick={() => onPublish(note)}>Publish to website</Button>
        </>
      }
    >
      <div className="space-y-5">
        {errors.length > 0 && (
          <Alert tone="danger" title={`${errors.length} problem${errors.length > 1 ? "s" : ""} must be fixed first`}>
            <ul className="mt-1 list-disc pl-4">{errors.slice(0, 8).map((e, i) => <li key={i}>{e.message}</li>)}</ul>
          </Alert>
        )}
        {!canPublish && <Alert tone="info">Only a Super Admin can publish this protected area. Your draft is saved for them.</Alert>}
        {warnings.length > 0 && (
          <Alert tone="warning" title="Worth a second look">
            <ul className="mt-1 list-disc pl-4">{warnings.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
          </Alert>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Pages affected</p>
          <div className="flex flex-wrap gap-2">
            {coll.used_on.map((u) => (
              <button key={u.label} type="button" onClick={() => onPreview(u.path)} className="rounded-full border border-black/10 px-3 py-1 text-xs text-ink hover:border-teal-500 hover:text-teal-700">
                {u.label} ↗
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">{changes.length} change{changes.length === 1 ? "" : "s"}</p>
          {changes.length ? (
            <ul className="max-h-[42vh] divide-y divide-black/[0.06] overflow-y-auto rounded-lg border border-black/[0.08]">
              {changes.map((c) => (
                <li key={c.path} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[200px_1fr]">
                  <span className="text-xs font-medium text-slatey">{c.label}</span>
                  <div className="min-w-0 space-y-1">
                    {c.before && <p className="whitespace-pre-wrap break-words rounded bg-red-50 px-2 py-1 text-red-800 line-through decoration-red-300">{c.before}</p>}
                    {c.after ? <p className="whitespace-pre-wrap break-words rounded bg-teal-50 px-2 py-1 text-teal-900">{c.after}</p> : <p className="text-xs italic text-slatey">(removed)</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slatey">The draft matches what's live.</p>
          )}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink">Note for the history (optional)</span>
          <Textarea rows={2} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Updated Abuja office address" />
        </label>
        <label className={cx("flex items-start gap-3 rounded-lg border p-3 text-sm", checked ? "border-teal-300 bg-teal-50/50" : "border-black/10")}>
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-600" checked={checked} onChange={(e) => setChecked(e.target.checked)} disabled={blocked} />
          <span>I've previewed these changes and they're approved to go live.</span>
        </label>
      </div>
    </Modal>
  );
}
