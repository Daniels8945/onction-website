import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi } from "../lib/adminApi.js";
import { BLOCK_TYPES, BLOCK_TYPE_KEYS } from "../../blocks/blockTypes.js";

function newClientId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;
}

// --- Field-driven edit form for simple (text/textarea/url) block types ---
function FieldsEditor({ type, data, onChange }) {
  const fields = BLOCK_TYPES[type].fields;
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="mb-1 block text-xs font-medium text-slatey">{field.label}</label>
          {field.type === "textarea" ? (
            <textarea
              rows={3}
              value={data[field.key] || ""}
              onChange={(e) => onChange({ ...data, [field.key]: e.target.value })}
              className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          ) : (
            <input
              type="text"
              value={data[field.key] || ""}
              onChange={(e) => onChange({ ...data, [field.key]: e.target.value })}
              className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// --- Dedicated editors for the two list-shaped block types ---
function GalleryEditor({ data, onChange }) {
  const images = data.images || [];
  function update(i, patch) {
    const next = images.map((img, idx) => (idx === i ? { ...img, ...patch } : img));
    onChange({ images: next });
  }
  function remove(i) {
    onChange({ images: images.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="space-y-3">
      {images.map((img, i) => (
        <div key={i} className="flex gap-2">
          <input
            placeholder="Image URL"
            value={img.url || ""}
            onChange={(e) => update(i, { url: e.target.value })}
            className="flex-1 border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <input
            placeholder="Alt text"
            value={img.alt || ""}
            onChange={(e) => update(i, { alt: e.target.value })}
            className="w-32 border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <button onClick={() => remove(i)} className="px-2 text-xs text-red-600">
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange({ images: [...images, { url: "", alt: "" }] })}
        className="text-xs font-medium text-teal-600 hover:text-teal-700"
      >
        + Add image
      </button>
    </div>
  );
}

function MetricsEditor({ data, onChange }) {
  const items = data.items || [];
  function update(i, patch) {
    const next = items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange({ items: next });
  }
  function remove(i) {
    onChange({ items: items.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            placeholder="Value (e.g. 240MW)"
            value={item.value || ""}
            onChange={(e) => update(i, { value: e.target.value })}
            className="w-32 border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <input
            placeholder="Label"
            value={item.label || ""}
            onChange={(e) => update(i, { label: e.target.value })}
            className="flex-1 border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <button onClick={() => remove(i)} className="px-2 text-xs text-red-600">
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange({ items: [...items, { value: "", label: "" }] })}
        className="text-xs font-medium text-teal-600 hover:text-teal-700"
      >
        + Add metric
      </button>
    </div>
  );
}

function QuickLinksEditor({ data, onChange }) {
  const items = data.items || [];
  function update(i, patch) {
    onChange({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  }
  function remove(i) {
    onChange({ items: items.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            placeholder="Label"
            value={item.label || ""}
            onChange={(e) => update(i, { label: e.target.value })}
            className="flex-1 border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <input
            placeholder="Link (e.g. #section or /page)"
            value={item.href || ""}
            onChange={(e) => update(i, { href: e.target.value })}
            className="flex-1 border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <button onClick={() => remove(i)} className="px-2 text-xs text-red-600">
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange({ items: [...items, { label: "", href: "" }] })}
        className="text-xs font-medium text-teal-600 hover:text-teal-700"
      >
        + Add link
      </button>
    </div>
  );
}

function BadgesEditor({ data, onChange }) {
  const items = data.items || [];
  function update(i, patch) {
    onChange({ ...data, items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  }
  function remove(i) {
    onChange({ ...data, items: items.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slatey">Heading (optional)</label>
        <input
          value={data.heading || ""}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 border border-black/10 p-3">
            <div className="flex-1 space-y-2">
              <input
                placeholder="Title"
                value={item.title || ""}
                onChange={(e) => update(i, { title: e.target.value })}
                className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
              <input
                placeholder="Description (optional)"
                value={item.description || ""}
                onChange={(e) => update(i, { description: e.target.value })}
                className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
            <button onClick={() => remove(i)} className="self-start px-2 text-xs text-red-600">
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ ...data, items: [...items, { title: "", description: "" }] })}
          className="text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          + Add badge
        </button>
      </div>
    </div>
  );
}

function FeatureCardsEditor({ data, onChange }) {
  const items = data.items || [];
  function update(i, patch) {
    onChange({ ...data, items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  }
  function remove(i) {
    onChange({ ...data, items: items.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slatey">Heading (optional)</label>
        <input
          value={data.heading || ""}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slatey">Intro text (optional)</label>
        <textarea
          rows={2}
          value={data.intro || ""}
          onChange={(e) => onChange({ ...data, intro: e.target.value })}
          className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </div>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="space-y-2 border border-black/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slatey">Card {i + 1}</span>
              <button onClick={() => remove(i)} className="text-xs text-red-600">
                Remove
              </button>
            </div>
            <input
              placeholder="Title"
              value={item.title || ""}
              onChange={(e) => update(i, { title: e.target.value })}
              className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
            <textarea
              placeholder="Description"
              rows={2}
              value={item.description || ""}
              onChange={(e) => update(i, { description: e.target.value })}
              className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
            <input
              placeholder="Image URL (paste from Media library)"
              value={item.imageUrl || ""}
              onChange={(e) => update(i, { imageUrl: e.target.value })}
              className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
            <div className="flex gap-2">
              <input
                placeholder="Link label (optional, e.g. Learn more)"
                value={item.linkLabel || ""}
                onChange={(e) => update(i, { linkLabel: e.target.value })}
                className="flex-1 border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
              <input
                placeholder="Link URL"
                value={item.linkHref || ""}
                onChange={(e) => update(i, { linkHref: e.target.value })}
                className="flex-1 border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>
        ))}
        <button
          onClick={() =>
            onChange({ ...data, items: [...items, { title: "", description: "", imageUrl: "", linkLabel: "", linkHref: "" }] })
          }
          className="text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          + Add card
        </button>
      </div>
    </div>
  );
}

function BlockEditor({ type, data, onChange }) {
  if (type === "gallery") return <GalleryEditor data={data} onChange={onChange} />;
  if (type === "metrics") return <MetricsEditor data={data} onChange={onChange} />;
  if (type === "quickLinks") return <QuickLinksEditor data={data} onChange={onChange} />;
  if (type === "badges") return <BadgesEditor data={data} onChange={onChange} />;
  if (type === "featureCards") return <FeatureCardsEditor data={data} onChange={onChange} />;
  return <FieldsEditor type={type} data={data} onChange={onChange} />;
}

function BlockCard({ block, index, total, onEdit, onMove, onDelete }) {
  return (
    <div className="border border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/5 bg-mist px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink">{BLOCK_TYPES[block.type].label}</span>
        <div className="flex items-center gap-3 text-xs">
          <button disabled={index === 0} onClick={() => onMove(-1)} className="disabled:opacity-30">
            ↑ Up
          </button>
          <button disabled={index === total - 1} onClick={() => onMove(1)} className="disabled:opacity-30">
            ↓ Down
          </button>
          <button onClick={onDelete} className="text-red-600">
            Remove
          </button>
        </div>
      </div>
      <div className="p-4">
        <BlockEditor type={block.type} data={block.data} onChange={(data) => onEdit(data)} />
      </div>
    </div>
  );
}

export default function PageBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [error, setError] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingBlocks, setSavingBlocks] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    adminApi
      .get(`/api/pages/${id}`)
      .then((p) => {
        setPage(p);
        setBlocks(p.blocks.map((b) => ({ ...b, clientId: newClientId() })));
      })
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleSaveMeta() {
    setSavingMeta(true);
    try {
      const updated = await adminApi.put(`/api/pages/${id}`, {
        slug: page.slug,
        title: page.title,
        meta_description: page.meta_description,
        status: page.status,
      });
      setPage((prev) => ({ ...prev, ...updated }));
      toast.success("Page details saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleSaveBlocks() {
    setSavingBlocks(true);
    try {
      const payload = blocks.map((b, i) => ({ type: b.type, position: i, data: b.data }));
      const updated = await adminApi.put(`/api/pages/${id}/blocks`, payload);
      setBlocks(updated.blocks.map((b) => ({ ...b, clientId: newClientId() })));
      toast.success("Content saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingBlocks(false);
    }
  }

  function addBlock(type) {
    setBlocks((prev) => [...prev, { clientId: newClientId(), type, data: { ...BLOCK_TYPES[type].defaultData } }]);
    setShowAddMenu(false);
  }

  function moveBlock(index, dir) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function deleteBlock(index) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateBlockData(index, data) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, data } : b)));
  }

  if (error && !page) {
    return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }
  if (!page) return <p className="text-sm text-slatey">Loading…</p>;

  return (
    <div>
      <Link to="/admin/pages" className="mb-4 inline-block text-xs font-medium text-slatey hover:text-ink">
        ← All pages
      </Link>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <section className="card">
          <p className="eyebrow mb-4">Page details</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slatey">Title</label>
              <input
                value={page.title}
                onChange={(e) => setPage({ ...page, title: e.target.value })}
                className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slatey">URL slug</label>
              <div className="flex items-center border border-black/10 px-3 py-2 text-sm focus-within:border-teal-500">
                <span className="text-slatey">/</span>
                <input
                  value={page.slug}
                  onChange={(e) => setPage({ ...page, slug: e.target.value })}
                  className="w-full outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slatey">Meta description</label>
              <textarea
                rows={2}
                value={page.meta_description || ""}
                onChange={(e) => setPage({ ...page, meta_description: e.target.value })}
                className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slatey">Status</label>
              <select
                value={page.status}
                onChange={(e) => setPage({ ...page, status: e.target.value })}
                className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
              >
                <option value="draft">Draft (not publicly visible)</option>
                <option value="published">Published</option>
              </select>
            </div>
            <button onClick={handleSaveMeta} disabled={savingMeta} className="btn-primary disabled:opacity-60">
              {savingMeta ? "Saving…" : "Save details"}
            </button>
            {page.status === "published" && (
              <a
                href={`/${page.slug}`}
                target="_blank"
                rel="noreferrer"
                className="ml-3 text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                View live page ↗
              </a>
            )}
          </div>
        </section>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Content blocks</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowAddMenu((v) => !v)} className="btn-ghost !text-ink !border-black/15">
              + Add block
            </button>
            {showAddMenu && (
              <div className="absolute right-0 z-10 mt-1 w-44 border border-black/10 bg-white shadow-lg">
                {BLOCK_TYPE_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => addBlock(key)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-mist"
                  >
                    {BLOCK_TYPES[key].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleSaveBlocks} disabled={savingBlocks} className="btn-primary disabled:opacity-60">
            {savingBlocks ? "Saving…" : "Save content"}
          </button>
        </div>
      </div>

      {blocks.length === 0 && <div className="card text-sm text-slatey">No blocks yet — add one to start building.</div>}

      <div className="space-y-4">
        {blocks.map((block, i) => (
          <BlockCard
            key={block.clientId}
            block={block}
            index={i}
            total={blocks.length}
            onEdit={(data) => updateBlockData(i, data)}
            onMove={(dir) => moveBlock(i, dir)}
            onDelete={() => deleteBlock(i)}
          />
        ))}
      </div>
    </div>
  );
}
