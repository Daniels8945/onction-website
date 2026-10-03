import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuArrowDown,
  LuArrowLeft,
  LuArrowUp,
  LuChevronDown,
  LuCircleAlert,
  LuCircleCheck,
  LuCopy,
  LuEllipsis,
  LuExternalLink,
  LuEye,
  LuEyeOff,
  LuFileText,
  LuPlus,
  LuRocket,
  LuSave,
  LuTrash2,
} from "react-icons/lu";
import { adminApi } from "../lib/adminApi.js";
import { BLOCK_TYPES } from "../../blocks/blockTypes.js";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";
import { relativeTime } from "../lib/format.js";
import { Alert, Badge, Button, EmptyState, Field, IconButton, Input, Menu, Panel, Skeleton, Tabs, Textarea, cx } from "../components/ui.jsx";
import BlockEditor from "./page-builder/BlockFields.jsx";
import BlockPicker from "./page-builder/BlockPicker.jsx";
import PagePreview from "./page-builder/PagePreview.jsx";
import { BLOCK_ICONS } from "./page-builder/blockIcons.js";

const META_LIMIT = 160;

function newClientId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Only the fields that are persisted — used to detect unsaved changes.
const blocksSnapshot = (blocks) => JSON.stringify(blocks.map((b) => ({ type: b.type, data: b.data })));
const metaSnapshot = (p) => JSON.stringify({ title: p.title, slug: p.slug, meta_description: p.meta_description || "" });

function withClientIds(blocks) {
  return blocks.map((b) => ({ ...b, clientId: newClientId() }));
}

// --- Block list -------------------------------------------------------------

function InsertHere({ onClick }) {
  return (
    <div className="group relative flex h-5 items-center justify-center">
      <div className="absolute inset-x-4 top-1/2 h-px bg-teal-500 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100" />
      <button
        type="button"
        onClick={onClick}
        className="relative z-10 inline-flex items-center gap-1 rounded-full border border-teal-500 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 opacity-0 shadow-sm transition group-hover:opacity-100 focus-visible:opacity-100"
      >
        <LuPlus size={12} aria-hidden="true" /> Insert block
      </button>
    </div>
  );
}

function BlockCard({ block, index, total, expanded, onToggle, onChange, onMove, onDuplicate, onDelete }) {
  const def = BLOCK_TYPES[block.type];
  const Icon = BLOCK_ICONS[block.type];
  const issues = def.check(block.data);
  const summary = def.summary(block.data);

  return (
    <div
      id={`block-${block.clientId}`}
      className={cx(
        "scroll-mt-24 rounded-xl border bg-white shadow-[0_1px_2px_rgba(10,31,60,0.04)] transition",
        expanded ? "border-black/15 shadow-[0_4px_16px_rgba(10,31,60,0.07)]" : "border-black/[0.07] hover:border-black/15"
      )}
    >
      <div className="flex items-center gap-2 py-2 pl-2 pr-2 sm:pl-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mist text-ink ring-1 ring-black/5">
            <Icon size={17} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{def.label}</span>
              <span className="text-xs tabular-nums text-slate-400">#{index + 1}</span>
              {issues.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700" title={issues.join("\n")}>
                  <LuCircleAlert size={13} aria-hidden="true" />
                  <span className="hidden sm:inline">Needs attention</span>
                </span>
              )}
            </span>
            <span className={cx("block truncate text-xs", summary ? "text-slatey" : "italic text-slate-400")}>{summary || "Empty"}</span>
          </span>
          <LuChevronDown size={17} className={cx("shrink-0 text-slatey transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        </button>
        <div className="flex shrink-0 items-center border-l border-black/[0.06] pl-1">
          <IconButton icon={LuArrowUp} size="sm" label="Move block up" disabled={index === 0} onClick={() => onMove(-1)} />
          <IconButton icon={LuArrowDown} size="sm" label="Move block down" disabled={index === total - 1} onClick={() => onMove(1)} />
          <Menu
            items={[
              { label: "Duplicate", icon: LuCopy, onClick: onDuplicate },
              { divider: true },
              { label: "Delete block", icon: LuTrash2, danger: true, onClick: onDelete },
            ]}
            trigger={({ toggle, open }) => (
              <IconButton icon={LuEllipsis} size="sm" label="Block actions" aria-haspopup="menu" aria-expanded={open} onClick={toggle} />
            )}
          />
        </div>
      </div>
      {expanded && (
        <div className="border-t border-black/[0.06] px-4 py-5 sm:px-5">
          {issues.length > 0 && (
            <Alert tone="warning" className="mb-5">
              <ul className="space-y-0.5">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </Alert>
          )}
          <BlockEditor type={block.type} data={block.data} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

// --- Sidebar -----------------------------------------------------------------

function ChecklistItem({ done, children, action }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5 text-sm">
      {done ? (
        <LuCircleCheck size={16} className="mt-0.5 shrink-0 text-teal-600" aria-label="Done" />
      ) : (
        <LuCircleAlert size={16} className="mt-0.5 shrink-0 text-amber-500" aria-label="To do" />
      )}
      <span className={cx("min-w-0 flex-1", done ? "text-slatey" : "text-ink")}>
        {children}
        {action && <span className="mt-0.5 block">{action}</span>}
      </span>
    </li>
  );
}

function SettingsPanel({ page, onChange, slugError, onSlugBlur }) {
  const meta = page.meta_description || "";
  const origin = window.location.origin.replace(/^https?:\/\//, "");
  return (
    <Panel title="Page settings" description="How the page is titled and found.">
      <div className="space-y-4">
        <Field label="Title" required hint="Shown in the browser tab and search results.">
          {(a11y) => <Input {...a11y} value={page.title} onChange={(e) => onChange({ title: e.target.value })} />}
        </Field>
        <Field label="URL" required error={slugError}>
          {(a11y) => (
            <div className="flex rounded-lg shadow-sm">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-black/10 bg-mist px-3 text-sm text-slatey">/</span>
              <Input
                {...a11y}
                value={page.slug}
                onChange={(e) => onChange({ slug: e.target.value })}
                onBlur={onSlugBlur}
                className="rounded-l-none shadow-none"
                spellCheck={false}
              />
            </div>
          )}
        </Field>
        <Field
          label="Meta description"
          optional
          hint="A one or two sentence summary shown under the title in search results."
          counter={<span className={cx("text-xs tabular-nums", meta.length > META_LIMIT ? "text-amber-600" : "text-slate-400")}>{meta.length}/{META_LIMIT}</span>}
        >
          {(a11y) => <Textarea {...a11y} rows={3} value={meta} onChange={(e) => onChange({ meta_description: e.target.value })} />}
        </Field>
        <div className="rounded-lg border border-black/[0.06] bg-mist/60 p-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Search preview</p>
          <p className="truncate text-xs text-slatey">{origin}/{page.slug}</p>
          <p className="truncate text-[15px] font-medium text-[#1a0dab]">{page.title ? `${page.title} — Onction Energy` : "Untitled page"}</p>
          <p className="line-clamp-2 text-xs text-slatey">{meta || "No description yet — search engines will pick text from the page."}</p>
        </div>
      </div>
    </Panel>
  );
}

// --- Page --------------------------------------------------------------------

export default function PageBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const [page, setPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [saved, setSaved] = useState({ meta: "", blocks: "" });
  const [loadError, setLoadError] = useState("");
  const [slugError, setSlugError] = useState("");
  const [saving, setSaving] = useState(null); // null | "save" | "publish" | "unpublish"
  const [expanded, setExpanded] = useState(() => new Set());
  const [picker, setPicker] = useState(null); // null | { index }
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("content");

  useEffect(() => {
    adminApi
      .get(`/api/pages/${id}`)
      .then((p) => {
        const withIds = withClientIds(p.blocks);
        setPage(p);
        setBlocks(withIds);
        setSaved({ meta: metaSnapshot(p), blocks: blocksSnapshot(withIds) });
        // A short page opens fully expanded; a long one opens as an outline.
        setExpanded(new Set(withIds.length <= 2 ? withIds.map((b) => b.clientId) : []));
      })
      .catch((err) => setLoadError(err.message));
  }, [id]);

  const metaDirty = page ? metaSnapshot(page) !== saved.meta : false;
  const blocksDirty = blocksSnapshot(blocks) !== saved.blocks;
  const dirty = metaDirty || blocksDirty;
  const isPublished = page?.status === "published";

  const blockIssues = useMemo(
    () => blocks.map((b, i) => ({ block: b, index: i, issues: BLOCK_TYPES[b.type].check(b.data) })).filter((x) => x.issues.length > 0),
    [blocks]
  );

  // --- Unsaved-changes protection -------------------------------------------
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    function onBeforeUnload(e) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    // BrowserRouter has no navigation blocker, so intercept in-app link
    // clicks (sidebar, back link) while there are unsaved changes.
    async function onClick(e) {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = e.target.closest("a[href]");
      if (!anchor || anchor.target === "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      const leave = await confirm({
        title: "Leave without saving?",
        message: "You have unsaved changes on this page. They'll be lost if you leave now.",
        confirmLabel: "Discard changes",
        destructive: true,
      });
      if (leave) {
        dirtyRef.current = false;
        navigate(url.pathname + url.search);
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [confirm, navigate]);

  // --- Persistence -----------------------------------------------------------
  const persist = useCallback(
    async (status) => {
      const cleanSlug = slugify(page.slug);
      if (!page.title.trim()) {
        toast.error("Give the page a title before saving.");
        setMobileTab("settings");
        return false;
      }
      if (!cleanSlug) {
        setSlugError("Enter a URL for this page.");
        setMobileTab("settings");
        return false;
      }
      setSlugError("");
      let latestBlocks = blocks;
      if (blocksDirty) {
        const payload = blocks.map((b, i) => ({ type: b.type, position: i, data: b.data }));
        const updated = await adminApi.put(`/api/pages/${id}/blocks`, payload);
        // Keep client ids stable so expanded/collapsed state survives a save.
        latestBlocks = updated.blocks.map((b, i) => ({ ...b, clientId: blocks[i]?.clientId || newClientId() }));
        setBlocks(latestBlocks);
        setSaved((s) => ({ ...s, blocks: blocksSnapshot(latestBlocks) }));
      }
      const nextStatus = status || page.status;
      if (metaDirty || nextStatus !== page.status || cleanSlug !== page.slug) {
        try {
          const updated = await adminApi.put(`/api/pages/${id}`, {
            title: page.title.trim(),
            slug: cleanSlug,
            meta_description: page.meta_description,
            status: nextStatus,
          });
          setPage((prev) => ({ ...prev, ...updated }));
          setSaved((s) => ({ ...s, meta: metaSnapshot(updated) }));
        } catch (err) {
          if (/slug/i.test(err.message)) {
            setSlugError("Another page already uses this URL.");
            setMobileTab("settings");
          }
          throw err;
        }
      } else {
        setPage((prev) => ({ ...prev, updated_at: new Date().toISOString() }));
      }
      return true;
    },
    [blocks, blocksDirty, id, metaDirty, page]
  );

  const handleSave = useCallback(async () => {
    if (!dirty || saving) return;
    setSaving("save");
    try {
      if (await persist()) toast.success(isPublished ? "Changes are live." : "Draft saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  }, [dirty, isPublished, persist, saving]);

  async function handlePublish() {
    const ok = await confirm({
      title: "Publish this page?",
      message: (
        <>
          <p>
            It will be publicly visible at <span className="font-medium text-ink">/{slugify(page.slug) || "…"}</span>.
          </p>
          {blockIssues.length > 0 && (
            <p className="mt-2 text-amber-700">
              {blockIssues.length} block{blockIssues.length > 1 ? "s" : ""} still need{blockIssues.length > 1 ? "" : "s"} attention and may not display as expected.
            </p>
          )}
        </>
      ),
      confirmLabel: "Publish page",
    });
    if (!ok) return;
    setSaving("publish");
    try {
      if (await persist("published")) toast.success("Page published.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  }

  async function handleUnpublish() {
    const ok = await confirm({
      title: "Unpublish this page?",
      message: `Visitors to /${page.slug} will see a “page not found” message until you publish it again. Your content is kept as a draft.`,
      confirmLabel: "Unpublish",
      destructive: true,
    });
    if (!ok) return;
    setSaving("unpublish");
    try {
      if (await persist("draft")) toast.success("Page moved back to draft.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  }

  // Cmd/Ctrl+S saves.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleSave]);

  // --- Block operations -------------------------------------------------------
  function insertBlock(type, index) {
    const block = { clientId: newClientId(), type, data: structuredClone(BLOCK_TYPES[type].defaultData) };
    setBlocks((prev) => [...prev.slice(0, index), block, ...prev.slice(index)]);
    setExpanded((prev) => new Set(prev).add(block.clientId));
    setPicker(null);
    requestAnimationFrame(() => document.getElementById(`block-${block.clientId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function moveBlock(index, dir) {
    setBlocks((prev) => {
      const next = [...prev];
      [next[index], next[index + dir]] = [next[index + dir], next[index]];
      return next;
    });
  }

  function duplicateBlock(index) {
    const source = blocks[index];
    const copy = { clientId: newClientId(), type: source.type, data: structuredClone(source.data) };
    setBlocks((prev) => [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)]);
    setExpanded((prev) => new Set(prev).add(copy.clientId));
    toast.success(`${BLOCK_TYPES[source.type].label} block duplicated.`);
  }

  async function deleteBlock(index) {
    const block = blocks[index];
    const isEmpty = JSON.stringify(block.data) === JSON.stringify(BLOCK_TYPES[block.type].defaultData);
    if (!isEmpty) {
      const ok = await confirm({
        title: `Delete this ${BLOCK_TYPES[block.type].label.toLowerCase()} block?`,
        message: "Its content will be removed from the page when you save.",
        confirmLabel: "Delete block",
        destructive: true,
      });
      if (!ok) return;
    }
    setBlocks((prev) => prev.filter((b) => b.clientId !== block.clientId));
  }

  function toggleBlock(clientId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(clientId) ? next.delete(clientId) : next.add(clientId);
      return next;
    });
  }

  function jumpToBlock(clientId) {
    setMobileTab("content");
    setExpanded((prev) => new Set(prev).add(clientId));
    requestAnimationFrame(() => document.getElementById(`block-${clientId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  // --- Render -------------------------------------------------------------------
  if (loadError && !page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert tone="danger" title="This page couldn't be loaded" action={<Button size="sm" to="/admin/pages">Back to pages</Button>}>
          {loadError}
        </Alert>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const allExpanded = blocks.length > 0 && blocks.every((b) => expanded.has(b.clientId));
  const checklist = [
    { done: !!page.title.trim(), label: "Page has a title" },
    { done: !!(page.meta_description || "").trim(), label: "Meta description written" },
    { done: blocks.length > 0, label: "At least one content block" },
  ];

  const saveState = saving ? (
    <span className="text-xs text-slatey">Saving…</span>
  ) : dirty ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" /> Unsaved changes
    </span>
  ) : (
    <span className="hidden items-center gap-1.5 text-xs text-slatey sm:inline-flex">
      <LuCircleCheck size={13} className="text-teal-600" aria-hidden="true" /> Saved {relativeTime(page.updated_at)}
    </span>
  );

  return (
    <div className="min-h-full">
      {confirmDialog}
      {picker && <BlockPicker position={picker.index === blocks.length ? "end" : "middle"} onPick={(type) => insertBlock(type, picker.index)} onClose={() => setPicker(null)} />}
      {previewOpen && <PagePreview page={page} blocks={blocks} dirty={dirty} onClose={() => setPreviewOpen(false)} />}

      {/* Toolbar */}
      <div className="sticky top-0 z-30 border-b border-black/[0.07] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/admin/pages" aria-label="All pages" title="All pages" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slatey transition hover:bg-black/5 hover:text-ink">
            <LuArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-body text-base font-semibold text-ink">{page.title || "Untitled page"}</h1>
              <Badge tone={isPublished ? "success" : "neutral"} className="hidden sm:inline-flex">{isPublished ? "Published" : "Draft"}</Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={cx("text-xs font-medium sm:hidden", isPublished ? "text-teal-700" : "text-slatey")}>{isPublished ? "Published" : "Draft"}</span>
              {saveState}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" icon={LuEye} onClick={() => setPreviewOpen(true)} className="hidden sm:inline-flex">
              Preview
            </Button>
            <IconButton icon={LuEye} label="Preview" onClick={() => setPreviewOpen(true)} className="sm:hidden" />
            {isPublished ? (
              <>
                <Button variant="primary" icon={LuSave} onClick={handleSave} disabled={!dirty} loading={saving === "save"}>
                  <span className="hidden sm:inline">Update live page</span>
                  <span className="sm:hidden">Update</span>
                </Button>
                <Menu
                  items={[
                    { label: "View live page", icon: LuExternalLink, onClick: () => window.open(`/${page.slug}`, "_blank", "noopener") },
                    { divider: true },
                    { label: "Unpublish", icon: LuEyeOff, danger: true, onClick: handleUnpublish },
                  ]}
                />
              </>
            ) : (
              <>
                <Button variant="secondary" icon={LuSave} onClick={handleSave} disabled={!dirty} loading={saving === "save"} className="hidden sm:inline-flex">
                  Save draft
                </Button>
                <IconButton icon={LuSave} label="Save draft" variant="secondary" onClick={handleSave} disabled={!dirty} className="sm:hidden" />
                <Button variant="primary" icon={LuRocket} onClick={handlePublish} loading={saving === "publish"}>
                  Publish
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs
          className="mb-5 lg:hidden"
          value={mobileTab}
          onChange={setMobileTab}
          items={[
            { value: "content", label: "Content", count: blocks.length },
            { value: "settings", label: "Settings" },
          ]}
        />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Content column */}
          <div className={cx(mobileTab !== "content" && "hidden lg:block")}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="hidden lg:block">
                <h2 className="font-body text-sm font-semibold text-ink">Content</h2>
                <p className="text-xs text-slatey">Blocks appear on the page in this order, top to bottom.</p>
              </div>
              {blocks.length > 1 && (
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setExpanded(allExpanded ? new Set() : new Set(blocks.map((b) => b.clientId)))}>
                  {allExpanded ? "Collapse all" : "Expand all"}
                </Button>
              )}
            </div>

            {blocks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/15 bg-white">
                <EmptyState
                  icon={LuFileText}
                  title="This page is empty"
                  description="Pages are built from blocks — start with a Hero for the top of the page, then add text, images and more."
                  action={
                    <Button variant="primary" icon={LuPlus} onClick={() => setPicker({ index: 0 })}>
                      Add first block
                    </Button>
                  }
                />
              </div>
            ) : (
              <div>
                {blocks.map((block, i) => (
                  <div key={block.clientId}>
                    {i > 0 ? <InsertHere onClick={() => setPicker({ index: i })} /> : <div className="h-0" />}
                    <BlockCard
                      block={block}
                      index={i}
                      total={blocks.length}
                      expanded={expanded.has(block.clientId)}
                      onToggle={() => toggleBlock(block.clientId)}
                      onChange={(data) => setBlocks((prev) => prev.map((b) => (b.clientId === block.clientId ? { ...b, data } : b)))}
                      onMove={(dir) => moveBlock(i, dir)}
                      onDuplicate={() => duplicateBlock(i)}
                      onDelete={() => deleteBlock(i)}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPicker({ index: blocks.length })}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-white/60 py-4 text-sm font-semibold text-slatey transition hover:border-teal-500 hover:bg-white hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  <LuPlus size={16} aria-hidden="true" /> Add block
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className={cx("space-y-4", mobileTab !== "settings" && "hidden lg:block")}>
            <SettingsPanel
              page={page}
              slugError={slugError}
              onChange={(patch) => {
                if ("slug" in patch) setSlugError("");
                setPage((prev) => ({ ...prev, ...patch }));
              }}
              onSlugBlur={() => setPage((prev) => ({ ...prev, slug: slugify(prev.slug) }))}
            />

            <Panel title={isPublished ? "Live page" : "Before you publish"}>
              {isPublished && (
                <a
                  href={`/${page.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-black/[0.08] px-3 py-2 text-sm font-medium text-teal-700 transition hover:border-teal-500"
                >
                  <span className="truncate">/{page.slug}</span>
                  <LuExternalLink size={15} className="shrink-0" aria-hidden="true" />
                </a>
              )}
              <ul>
                {checklist.map((item) => (
                  <ChecklistItem key={item.label} done={item.done}>
                    {item.label}
                  </ChecklistItem>
                ))}
                <ChecklistItem
                  done={blockIssues.length === 0}
                  action={
                    blockIssues.length > 0 && (
                      <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                        {blockIssues.map(({ block, index }) => (
                          <button key={block.clientId} type="button" onClick={() => jumpToBlock(block.clientId)} className="text-xs font-medium text-teal-700 hover:underline">
                            {BLOCK_TYPES[block.type].label} #{index + 1}
                          </button>
                        ))}
                      </span>
                    )
                  }
                >
                  {blockIssues.length === 0 ? "All blocks complete" : `${blockIssues.length} block${blockIssues.length > 1 ? "s" : ""} need${blockIssues.length > 1 ? "" : "s"} attention`}
                </ChecklistItem>
              </ul>
              <p className="mt-3 border-t border-black/[0.06] pt-3 text-xs text-slatey">
                {isPublished
                  ? "Edits stay private until you click “Update live page”."
                  : "Drafts are only visible here. Publishing makes the page public at its URL."}{" "}
                <kbd className="rounded border border-black/10 bg-mist px-1 font-mono text-[10px]">⌘S</kbd> saves.
              </p>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}
