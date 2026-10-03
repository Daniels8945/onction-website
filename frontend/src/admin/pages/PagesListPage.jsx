import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LuExternalLink, LuFileText, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { adminApi } from "../lib/adminApi.js";
import { usePromptDialog } from "../hooks/usePromptDialog.jsx";
import { useConfirmDialog } from "../hooks/useConfirmDialog.jsx";
import { relativeTime, formatDateTime } from "../lib/format.js";
import { Alert, Badge, Button, EmptyState, ListSkeleton, Menu, PageHeader, Panel, SearchInput, Table, Tabs, Td, Th } from "../components/ui.jsx";

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PagesListPage() {
  const [pages, setPages] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { prompt, dialog: promptDialog } = usePromptDialog();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function loadPages() {
    adminApi
      .get("/api/pages")
      .then(setPages)
      .catch((err) => setError(err.message));
  }

  useEffect(loadPages, []);

  const counts = useMemo(
    () => ({
      all: pages?.length || 0,
      published: pages?.filter((p) => p.status === "published").length || 0,
      draft: pages?.filter((p) => p.status !== "published").length || 0,
    }),
    [pages]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (pages || []).filter(
      (p) =>
        (filter === "all" || (filter === "published" ? p.status === "published" : p.status !== "published")) &&
        (!term || p.title.toLowerCase().includes(term) || p.slug.includes(term))
    );
  }, [pages, filter, search]);

  async function handleCreate() {
    const title = await prompt({
      title: "New page",
      message: "Pages start as private drafts. You can add content and publish when it's ready.",
      label: "Page title",
      placeholder: 'e.g. "Our Services"',
      confirmLabel: "Create page",
    });
    if (!title) return;
    setCreating(true);
    try {
      const page = await adminApi.post("/api/pages", { slug: slugify(title), title, status: "draft" });
      navigate(`/admin/pages/${page.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(page) {
    const ok = await confirm({
      title: `Delete “${page.title}”?`,
      message:
        page.status === "published"
          ? `This page is live at /${page.slug}. Deleting it removes the page and all its content, and visitors will get a “page not found” message. This can't be undone.`
          : "This deletes the page and all its content. This can't be undone.",
      confirmLabel: "Delete page",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.del(`/api/pages/${page.id}`);
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      toast.success("Page deleted.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  const rowMenu = (p) => [
    { label: "Edit", icon: LuPencil, onClick: () => navigate(`/admin/pages/${p.id}`) },
    p.status === "published" && { label: "View live page", icon: LuExternalLink, onClick: () => window.open(`/${p.slug}`, "_blank", "noopener") },
    { divider: true },
    { label: "Delete", icon: LuTrash2, danger: true, onClick: () => handleDelete(p) },
  ];

  return (
    <div>
      {promptDialog}
      {confirmDialog}
      <PageHeader
        title="Pages"
        description="Build and publish pages beyond the landing page."
        actions={
          <Button variant="primary" icon={LuPlus} onClick={handleCreate} loading={creating}>
            New page
          </Button>
        }
      />

      {error && <Alert tone="danger" title="Pages couldn't be loaded" className="mb-4">{error}</Alert>}

      <Panel padded={false}>
        <div className="flex flex-col gap-3 border-b border-black/[0.06] px-5 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <Tabs
            className="sm:mb-[-1px]"
            value={filter}
            onChange={setFilter}
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "published", label: "Published", count: counts.published },
              { value: "draft", label: "Drafts", count: counts.draft },
            ]}
          />
          <div className="pb-3 sm:w-64">
            <SearchInput value={search} onChange={setSearch} placeholder="Search pages…" />
          </div>
        </div>

        {!pages && !error && <ListSkeleton rows={4} />}
        {pages && pages.length === 0 && (
          <EmptyState
            icon={LuFileText}
            title="No pages yet"
            description="Create a page like “About” or “Careers”, build it from content blocks, and publish it at its own URL."
            action={<Button variant="primary" icon={LuPlus} onClick={handleCreate}>Create your first page</Button>}
          />
        )}
        {pages && pages.length > 0 && visible.length === 0 && (
          <EmptyState compact icon={LuFileText} title="No pages match" description="Try a different search or filter." />
        )}

        {visible.length > 0 && (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th>Page</Th>
                  <Th>Status</Th>
                  <Th>Last edited</Th>
                  <Th align="right"><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {visible.map((p) => (
                  <tr key={p.id} className="group cursor-pointer transition hover:bg-mist/60" onClick={() => navigate(`/admin/pages/${p.id}`)}>
                    <Td>
                      <Link to={`/admin/pages/${p.id}`} className="font-medium text-ink group-hover:text-teal-700" onClick={(e) => e.stopPropagation()}>
                        {p.title}
                      </Link>
                      <p className="text-xs text-slatey">/{p.slug}</p>
                    </Td>
                    <Td>
                      <Badge tone={p.status === "published" ? "success" : "neutral"}>{p.status === "published" ? "Published" : "Draft"}</Badge>
                    </Td>
                    <Td className="text-slatey">
                      <span title={formatDateTime(p.updated_at)}>{relativeTime(p.updated_at)}</span>
                    </Td>
                    <Td align="right">
                      <Menu items={rowMenu(p)} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ul className="divide-y divide-black/[0.05] md:hidden">
              {visible.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <Link to={`/admin/pages/${p.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{p.title}</p>
                    <p className="truncate text-xs text-slatey">/{p.slug} · {relativeTime(p.updated_at)}</p>
                  </Link>
                  <Badge tone={p.status === "published" ? "success" : "neutral"}>{p.status === "published" ? "Published" : "Draft"}</Badge>
                  <Menu items={rowMenu(p)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
