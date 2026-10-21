import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { LuExternalLink, LuEye, LuEyeOff, LuSave, LuSend, LuTrash2 } from "react-icons/lu";
import { adminApi } from "../lib/adminApi.js";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";
import { useCanManage } from "../lib/useCanManage.js";
import { SLUG_PATTERN, STATUS_LABEL, STATUS_TONE, openPreview } from "../lib/publishing.js";
import { formatDateTime, parseUtc } from "../../lib/dates.js";
import ImageUpload from "../components/ImageUpload.jsx";
import HelpLink from "../components/HelpLink.jsx";
import { Alert, Badge, Button, Field, Input, PageHeader, Panel, Select, Skeleton, Textarea } from "../components/ui.jsx";

const CATEGORIES = ["Market News", "Company News", "Press"];
const SUMMARY_MAX = 400;

function toForm(p) {
  return {
    title: p.title,
    slug: p.slug,
    category: p.category,
    summary: p.summary || "",
    cover_image_url: p.cover_image_url || "",
    body: p.body || "",
  };
}

function validate(f) {
  const e = {};
  if (!f.title.trim()) e.title = "Give the article a title.";
  if (!SLUG_PATTERN.test(f.slug)) e.slug = "Use lowercase letters, numbers and single hyphens only.";
  if (f.summary.length > SUMMARY_MAX) e.summary = `Keep the summary to ${SUMMARY_MAX} characters.`;
  return e;
}

export default function NewsEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canManage = useCanManage();
  const [post, setPost] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [conflict, setConflict] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const load = useCallback(() => {
    setError("");
    setConflict(false);
    adminApi
      .get(`/api/news/${id}`)
      .then((p) => {
        setPost(p);
        setForm(toForm(p));
      })
      .catch((err) => setError(err.message));
  }, [id]);
  useEffect(load, [load]);

  const errors = useMemo(() => (form ? validate(form) : {}), [form]);
  const dirty = !!(post && form) && JSON.stringify(form) !== JSON.stringify(toForm(post));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));

  async function save(status, { quiet = false } = {}) {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      toast.error("Fix the highlighted fields first.");
      return null;
    }
    setBusy(status || "save");
    try {
      const updated = await adminApi.put(`/api/news/${id}`, {
        ...form,
        title: form.title.trim(),
        cover_image_url: form.cover_image_url || null,
        ...(status ? { status } : {}),
        expected_updated_at: post.updated_at,
      });
      setPost(updated);
      setForm(toForm(updated));
      setShowErrors(false);
      if (!quiet) {
        toast.success(
          status === "published" ? "Published — the article is on the website." : status === "draft" ? "Unpublished — the article is hidden from the website." : updated.status === "published" ? "Saved — the live article is updated." : "Draft saved. It isn't on the website yet."
        );
      }
      return updated;
    } catch (err) {
      if (/someone else/i.test(err.message)) setConflict(true);
      toast.error(/already exists/.test(err.message) ? "Another article already uses that web address — change the URL slug." : err.message);
      return null;
    } finally {
      setBusy("");
    }
  }

  async function preview() {
    const current = dirty ? await save(undefined, { quiet: true }) : post;
    if (current) openPreview(`/news/${current.slug}`);
  }

  async function publish() {
    const missing = [!form.body.trim() && "body text", !form.summary.trim() && "summary"].filter(Boolean);
    if (missing.length) {
      const ok = await confirm({
        title: "Publish without " + missing.join(" or ") + "?",
        message: missing.includes("body text") ? "The article page will only show the title. Most articles need body text." : "The News page cards use the summary as their teaser text.",
        confirmLabel: "Publish anyway",
      });
      if (!ok) return;
    }
    save("published");
  }

  async function unpublish() {
    const ok = await confirm({ title: "Unpublish this article?", message: "It disappears from the public News page straight away. You can publish it again at any time.", confirmLabel: "Unpublish" });
    if (ok) save("draft");
  }

  async function handleDelete() {
    const ok = await confirm({ title: `Delete “${post.title}”?`, message: "This permanently deletes the article. It can't be undone.", confirmLabel: "Delete article", destructive: true });
    if (!ok) return;
    try {
      await adminApi.del(`/api/news/${id}`);
      toast.success("Article deleted.");
      navigate("/admin/news");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function goBack(e) {
    if (!dirty) return;
    e.preventDefault();
    if (await confirm({ title: "Leave without saving?", message: "Your unsaved changes to this article will be lost.", confirmLabel: "Leave", destructive: true })) navigate("/admin/news");
  }

  if (error && !post) {
    return (
      <div>
        <PageHeader title="Article" back={{ to: "/admin/news", label: "All news" }} />
        <Alert tone="danger" title="This article couldn't be loaded" action={<Button size="sm" onClick={load}>Try again</Button>}>
          {/not found/i.test(error) ? "It may have been deleted." : error}
        </Alert>
      </div>
    );
  }
  if (!post || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const err = (field) => (showErrors ? errors[field] : undefined);
  const published = post.status === "published";
  const readOnly = !canManage;
  const paragraphs = form.body.split("\n").filter((l) => l.trim()).length;

  return (
    <div>
      {confirmDialog}
      <Link to="/admin/news" onClick={goBack} className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slatey transition hover:text-ink">
        ← All news
      </Link>
      <PageHeader
        title={post.title || "Untitled article"}
        meta={
          <>
            <Badge tone={STATUS_TONE[post.status]}>{STATUS_LABEL[post.status]}</Badge>
            {dirty && <Badge tone="warning">Unsaved changes</Badge>}
            <span className="text-xs text-slatey">Last saved {parseUtc(post.updated_at)?.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
          </>
        }
        actions={
          <>
            <HelpLink topic="news" />
            <Button icon={LuEye} onClick={preview} disabled={!!busy}>Preview</Button>
            {canManage && <Button icon={LuSave} onClick={() => save()} loading={busy === "save"} disabled={!dirty}>{published ? "Save changes" : "Save draft"}</Button>}
            {canManage && !published && <Button variant="primary" icon={LuSend} onClick={publish} loading={busy === "published"}>Publish</Button>}
            {canManage && published && <Button icon={LuEyeOff} onClick={unpublish} loading={busy === "draft"}>Unpublish</Button>}
          </>
        }
      />

      {conflict && (
        <Alert tone="warning" title="Someone else changed this article" className="mb-4" action={<Button size="sm" onClick={load}>Reload</Button>}>
          It was saved by someone else after you opened it. Reload to see their version — your unsaved edits on this screen will be replaced.
        </Alert>
      )}
      {readOnly && <Alert className="mb-4">You have view-only access. An Admin or Super Admin can edit articles.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Panel title="Article">
            <fieldset disabled={readOnly} className="space-y-4">
              <Field label="Title" required error={err("title")}>
                {(p) => <Input {...p} value={form.title} onChange={set("title")} maxLength={200} />}
              </Field>
              <Field
                label="Summary"
                optional
                error={err("summary")}
                hint="One or two sentences. Shown on the News page cards."
                counter={<span className={`text-[11px] tabular-nums ${form.summary.length > SUMMARY_MAX ? "text-red-600" : "text-slatey"}`}>{form.summary.length}/{SUMMARY_MAX}</span>}
              >
                {(p) => <Textarea {...p} rows={2} value={form.summary} onChange={set("summary")} />}
              </Field>
              <Field label="Body" optional hint={`Plain text. Each line becomes its own paragraph — press Enter between paragraphs. ${paragraphs} paragraph${paragraphs === 1 ? "" : "s"}.`}>
                {(p) => <Textarea {...p} rows={14} value={form.body} onChange={set("body")} className="leading-relaxed" />}
              </Field>
            </fieldset>
          </Panel>

          <Panel title="Cover image" description="Shown on the article page and on its News page card.">
            <ImageUpload label="Cover image" value={form.cover_image_url} onChange={set("cover_image_url")} disabled={readOnly} hint="Landscape works best (about 1600 × 900)." />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Publishing">
            <fieldset disabled={readOnly} className="space-y-4">
              <Field label="Category" required>
                {(p) => (
                  <Select {...p} value={form.category} onChange={set("category")}>
                    {[...new Set([...CATEGORIES, form.category])].map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Web address (URL slug)" required error={err("slug")} hint={!err("slug") && (published ? "Changing it breaks links people have already shared." : "Lowercase letters, numbers and hyphens.")}>
                {(p) => (
                  <div className="flex items-center rounded-lg border border-black/10 bg-white pl-3 text-sm shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
                    <span className="shrink-0 text-slatey">/news/</span>
                    <input {...p} value={form.slug} onChange={(e) => set("slug")(e.target.value.toLowerCase())} className="w-full min-w-0 bg-transparent py-2 pr-3 outline-none" />
                  </div>
                )}
              </Field>
            </fieldset>
            <div className="mt-4 space-y-3 border-t border-black/[0.06] pt-4 text-sm">
              <p className="text-slatey">
                {published
                  ? `Published ${formatDateTime(post.published_at)}. Visible on the News page.`
                  : "Draft: only signed-in staff can see it, using Preview."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={LuEye} onClick={preview} disabled={!!busy}>Preview</Button>
                {published && <Button size="sm" variant="ghost" icon={LuExternalLink} href={`/news/${post.slug}`} target="_blank" rel="noreferrer">View live</Button>}
              </div>
              {canManage && (
                <div className="border-t border-black/[0.06] pt-3">
                  <Button size="sm" variant="danger-ghost" icon={LuTrash2} onClick={handleDelete}>Delete article</Button>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
