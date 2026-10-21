import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LuEye, LuEyeOff, LuExternalLink, LuNewspaper, LuPencil, LuPlus, LuSend, LuTrash2 } from "react-icons/lu";
import { adminApi } from "../lib/adminApi.js";
import { usePromptDialog } from "../hooks/usePromptDialog.jsx";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";
import { useCanManage } from "../lib/useCanManage.js";
import { STATUS_LABEL, STATUS_TONE, openPreview, slugify } from "../lib/publishing.js";
import { formatDate } from "../../lib/dates.js";
import HelpLink from "../components/HelpLink.jsx";
import Thumb, { RowMenu } from "../components/Thumb.jsx";
import { Alert, Badge, Button, EmptyState, ListSkeleton, PageHeader, Panel, SearchInput, Select, Table, Tabs, Td, Th } from "../components/ui.jsx";

export default function NewsListPage() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const canManage = useCanManage();
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function load() {
    setError("");
    adminApi.get("/api/news").then(setPosts).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  const categories = useMemo(() => [...new Set((posts || []).map((p) => p.category))].sort(), [posts]);
  const counts = useMemo(
    () => ({
      all: posts?.length || 0,
      published: posts?.filter((p) => p.status === "published").length || 0,
      draft: posts?.filter((p) => p.status === "draft").length || 0,
    }),
    [posts]
  );
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (posts || []).filter(
      (p) =>
        (tab === "all" || p.status === tab) &&
        (!category || p.category === category) &&
        (!q || [p.title, p.summary, p.slug].join(" ").toLowerCase().includes(q))
    );
  }, [posts, tab, category, search]);

  async function handleCreate() {
    const title = await prompt({
      title: "New article",
      label: "Article title",
      placeholder: 'e.g. "WAPP Market Update — August 2026"',
      confirmLabel: "Create draft",
    });
    if (!title) return;
    const slug = slugify(title);
    if (!slug) {
      toast.error("Use at least one letter or number in the title.");
      return;
    }
    try {
      const post = await adminApi.post("/api/news", { slug, title, status: "draft" });
      toast.success("Draft created — write the article, then publish.");
      navigate(`/admin/news/${post.id}`);
    } catch (err) {
      toast.error(/already exists/.test(err.message) ? "An article with that title already exists — choose a different title." : err.message);
    }
  }

  async function setStatus(post, status) {
    if (status === "draft") {
      const ok = await confirm({
        title: `Unpublish “${post.title}”?`,
        message: "It disappears from the public News page straight away. You can publish it again at any time.",
        confirmLabel: "Unpublish",
      });
      if (!ok) return;
    }
    try {
      const updated = await adminApi.put(`/api/news/${post.id}`, { status, expected_updated_at: post.updated_at });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...updated } : p)));
      toast.success(status === "published" ? "Published — it's on the website now." : "Unpublished — it's hidden from the website.");
    } catch (err) {
      toast.error(err.message);
      if (/someone else/i.test(err.message)) load();
    }
  }

  async function handleDelete(post) {
    const ok = await confirm({
      title: `Delete “${post.title}”?`,
      message: post.status === "published" ? "This permanently deletes the article and removes it from the website. If you only want to hide it, unpublish it instead." : "This permanently deletes the draft. It can't be undone.",
      confirmLabel: "Delete article",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/news/${post.id}`);
      toast.success("Article deleted.");
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
        title="News"
        description="Market news, company news and press releases. Published articles appear on the public News page."
        actions={
          <>
            <HelpLink topic="news" />
            {canManage && <Button variant="primary" icon={LuPlus} onClick={handleCreate}>New article</Button>}
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
            { value: "published", label: "Published", count: counts.published },
            { value: "draft", label: "Drafts", count: counts.draft },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          {categories.length > 1 && (
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className="sm:w-48">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          )}
          <SearchInput value={search} onChange={setSearch} placeholder="Search articles…" className="lg:w-72" />
        </div>
      </div>

      <Panel padded={false}>
        {!posts && !error ? (
          <ListSkeleton rows={4} />
        ) : posts && posts.length === 0 ? (
          <EmptyState
            icon={LuNewspaper}
            title="No articles yet"
            description="Write your first article — it stays a private draft until you publish it."
            action={canManage && <Button variant="primary" icon={LuPlus} onClick={handleCreate}>New article</Button>}
          />
        ) : shown.length === 0 ? (
          <EmptyState compact title="No articles match" description="Try another tab, category or search." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Article</Th>
                <Th className="hidden md:table-cell">Category</Th>
                <Th className="hidden lg:table-cell">Date</Th>
                <Th className="hidden sm:table-cell">Status</Th>
                <Th align="right"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {shown.map((p) => (
                <tr key={p.id} className="hover:bg-mist/60">
                  <Td>
                    <div className="flex items-center gap-3 sm:min-w-[220px]">
                      <Thumb url={p.cover_image_url} />
                      <div className="min-w-0">
                        <Link to={`/admin/news/${p.id}`} className="line-clamp-2 font-medium text-ink hover:text-teal-700">{p.title}</Link>
                        <Badge tone={STATUS_TONE[p.status]} className="mt-1 sm:hidden">{STATUS_LABEL[p.status] || p.status}</Badge>
                        <p className="line-clamp-1 text-xs text-slatey">{p.summary || <span className="italic">No summary yet</span>}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="hidden whitespace-nowrap text-slatey md:table-cell">{p.category}</Td>
                  <Td className="hidden whitespace-nowrap text-slatey lg:table-cell">
                    {p.status === "published" && p.published_at ? `Published ${formatDate(p.published_at)}` : `Edited ${formatDate(p.updated_at)}`}
                  </Td>
                  <Td className="hidden sm:table-cell"><Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status] || p.status}</Badge></Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                      <Button size="sm" variant="ghost" icon={LuEye} onClick={() => openPreview(`/news/${p.slug}`)} aria-label="Preview"><span className="hidden sm:inline">Preview</span></Button>
                      <Button size="sm" icon={LuPencil} to={`/admin/news/${p.id}`} aria-label={canManage ? "Edit" : "View"}><span className="hidden sm:inline">{canManage ? "Edit" : "View"}</span></Button>
                      <RowMenu
                        label={`More actions for ${p.title}`}
                        items={[
                          canManage && p.status === "draft" && { label: "Publish", icon: LuSend, onClick: () => setStatus(p, "published") },
                          canManage && p.status === "published" && { label: "Unpublish", icon: LuEyeOff, onClick: () => setStatus(p, "draft") },
                          p.status === "published" && { label: "View live page", icon: LuExternalLink, onClick: () => window.open(`/news/${p.slug}`, "_blank", "noopener") },
                          canManage && { divider: true },
                          canManage && { label: "Delete", icon: LuTrash2, danger: true, onClick: () => handleDelete(p) },
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
