import { useState } from "react";
import { LuArrowDown, LuArrowUp, LuChevronDown, LuImage, LuPlus, LuTrash2, LuVideo } from "react-icons/lu";
import MediaPicker from "../components/MediaPicker.jsx";
import { Button, Field, IconButton, Input, Select, Switch, Textarea, cx } from "../components/ui.jsx";

// Renders a form for one field of a content area's schema (cms_schema.py),
// recursively for groups and lists. Every input is plain text — no HTML,
// scripts or styles can be entered anywhere. Problems reported by the server
// are shown beside the field they belong to (matched by `path`).

const OPTION_LABELS = {
  chairman: "Chairman", board: "Board of Directors", executive: "Executive leadership", management: "Senior management",
  milestones: "Milestones", leadership: "Leadership engagements", industry: "Industry & events", stakeholders: "Stakeholder visits",
  sites: "Site & infrastructure visits", team: "Our people", community: "Community",
  generation: "Generation", infrastructure: "Market infrastructure", finance: "Finance", distribution: "Distribution", customers: "Commercial & industrial customers", collaboration: "Technology & strategic collaboration",
  strategic: "Strategic partner", customer: "Customer / offtaker", technology: "Technology or service provider", stakeholder: "Industry stakeholder",
  photo: "Photo", video: "Video", normal: "Normal", wide: "Wide", tall: "Tall",
};
const optionLabel = (o, field) => (field.name === "relationship" && o === "generation" ? "Generation company" : field.name === "relationship" && o === "distribution" ? "Distribution company" : field.name === "relationship" && o === "finance" ? "Financial institution" : OPTION_LABELS[o] || o);

const emptyFor = (field) => {
  switch (field.type) {
    case "group":
      return Object.fromEntries(field.fields.map((f) => [f.name, emptyFor(f)]));
    case "list":
    case "paragraphs":
    case "strings":
      return [];
    case "bool":
      return false;
    case "select":
      return field.options[0];
    case "number":
      return null;
    default:
      return "";
  }
};

export function newItem(field) {
  return emptyFor({ type: "group", fields: field.fields });
}

function messagesFor(issues, path) {
  return issues.filter((i) => i.path === path);
}
function nestedCount(issues, path) {
  return issues.filter((i) => i.path === path || i.path.startsWith(`${path}.`)).length;
}

function Counter({ value, max }) {
  if (!max) return null;
  const n = (value || "").length;
  return <span className={cx("text-[11px] tabular-nums", n > max ? "font-semibold text-red-600" : "text-slatey")}>{n}/{max}</span>;
}

function ErrorList({ issues }) {
  if (!issues.length) return null;
  return (
    <ul className="mt-1.5 space-y-0.5">
      {issues.map((i, k) => (
        <li key={k} className={cx("text-xs", i.level === "error" ? "text-red-600" : "text-amber-700")}>{i.message}</li>
      ))}
    </ul>
  );
}

function MediaField({ field, value, onChange, disabled }) {
  const [picking, setPicking] = useState(false);
  const kind = field.type === "video" ? "video" : "image";
  const Icon = kind === "video" ? LuVideo : LuImage;
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-md bg-mist ring-1 ring-black/5">
        {value ? (kind === "image" ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Icon size={20} className="text-slatey" />) : <span className="px-1 text-center text-[10px] leading-tight text-slatey">Built-in</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={Icon} onClick={() => setPicking(true)} disabled={disabled}>{value ? "Replace" : "Choose"}</Button>
        {value && <Button size="sm" variant="ghost" onClick={() => onChange("")} disabled={disabled}>{field.required_if_verified ? "Remove" : "Use built-in"}</Button>}
      </div>
      {picking && <MediaPicker kind={kind} currentUrl={value} onClose={() => setPicking(false)} onSelect={(url) => { onChange(url); setPicking(false); }} />}
    </div>
  );
}

function TextList({ field, value = [], onChange, issues, path, disabled }) {
  const multiline = field.type === "paragraphs";
  const set = (i, v) => onChange(value.map((x, k) => (k === i ? v : x)));
  const move = (i, d) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const atMax = field.max_items && value.length >= field.max_items;
  return (
    <div className="space-y-2">
      {value.map((v, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {multiline ? (
              <Textarea rows={4} value={v} disabled={disabled} onChange={(e) => set(i, e.target.value)} aria-label={`${field.label} ${i + 1}`} aria-invalid={messagesFor(issues, `${path}.${i}`).length ? true : undefined} />
            ) : (
              <Input value={v} disabled={disabled} onChange={(e) => set(i, e.target.value)} aria-label={`${field.label} ${i + 1}`} aria-invalid={messagesFor(issues, `${path}.${i}`).length ? true : undefined} />
            )}
            <div className="mt-0.5 flex justify-between">
              <ErrorList issues={messagesFor(issues, `${path}.${i}`)} />
              <Counter value={v} max={field.max} />
            </div>
          </div>
          <div className="flex shrink-0 flex-col">
            <IconButton icon={LuArrowUp} size="sm" label="Move up" disabled={disabled || i === 0} onClick={() => move(i, -1)} />
            <IconButton icon={LuArrowDown} size="sm" label="Move down" disabled={disabled || i === value.length - 1} onClick={() => move(i, 1)} />
            <IconButton icon={LuTrash2} size="sm" label="Remove" disabled={disabled} onClick={() => onChange(value.filter((_, k) => k !== i))} />
          </div>
        </div>
      ))}
      {!atMax && (
        <Button size="sm" variant="ghost" icon={LuPlus} disabled={disabled} onClick={() => onChange([...value, ""])}>
          Add {multiline ? "paragraph" : "line"}
        </Button>
      )}
    </div>
  );
}

function ListField({ field, value = [], onChange, issues, path, ctx, disabled }) {
  const [open, setOpen] = useState(() => new Set(value.length <= 3 ? value.map((_, i) => i) : []));
  const fixed = !!field.fixed;
  const toggle = (i) => setOpen((s) => {
    const n = new Set(s);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });
  const move = (i, d) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const label = (it, i) => (field.item_label && it?.[field.item_label]) || `${field.label} ${i + 1}`;
  const atMax = field.max && value.length >= field.max;
  return (
    <div className="space-y-2">
      {fixed && <p className="text-xs text-slatey">The design uses exactly {field.fixed} — you can reword them, not add or remove.</p>}
      {value.map((it, i) => {
        const p = `${path}.${i}`;
        const errs = nestedCount(issues, p);
        const isOpen = open.has(i);
        return (
          <div key={i} className={cx("rounded-lg border bg-white", errs ? "border-red-200" : "border-black/10")}>
            <div className="flex items-center gap-2 px-3 py-2">
              <button type="button" onClick={() => toggle(i)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-ink">
                <LuChevronDown size={15} className={cx("shrink-0 text-slatey transition-transform", isOpen ? "" : "-rotate-90")} aria-hidden="true" />
                <span className="truncate">{label(it, i)}</span>
                {it?.verified === false && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold uppercase text-amber-800">Hidden</span>}
                {it?.verified === true && <span className="rounded bg-teal-50 px-1.5 text-[10px] font-semibold uppercase text-teal-700">On website</span>}
                {it?.hidden && <span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold uppercase text-slate-600">Hidden</span>}
                {errs > 0 && <span className="rounded-full bg-red-50 px-1.5 text-[11px] font-semibold text-red-700">{errs}</span>}
              </button>
              {!fixed && (
                <div className="flex shrink-0">
                  <IconButton icon={LuArrowUp} size="sm" label="Move up" disabled={disabled || i === 0} onClick={() => move(i, -1)} />
                  <IconButton icon={LuArrowDown} size="sm" label="Move down" disabled={disabled || i === value.length - 1} onClick={() => move(i, 1)} />
                  <IconButton icon={LuTrash2} size="sm" label={`Remove ${label(it, i)}`} disabled={disabled || value.length <= (field.min || 0)} onClick={() => ctx.confirmRemove(label(it, i)).then((ok) => ok && onChange(value.filter((_, k) => k !== i)))} />
                </div>
              )}
            </div>
            {isOpen && (
              <div className="space-y-4 border-t border-black/[0.06] px-4 py-4">
                {field.fields.map((f) => (
                  <FieldEditor key={f.name} field={f} value={it?.[f.name]} onChange={(v) => onChange(value.map((x, k) => (k === i ? { ...x, [f.name]: v } : x)))} issues={issues} path={`${p}.${f.name}`} ctx={ctx} disabled={disabled} isNew={!ctx.savedIds?.has(it?.id || it?.slug)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {!fixed && !atMax && (
        <Button size="sm" icon={LuPlus} disabled={disabled} onClick={() => { onChange([...value, newItem(field)]); setOpen((s) => new Set(s).add(value.length)); }}>
          Add {field.label.toLowerCase().replace(/s$/, "")}
        </Button>
      )}
    </div>
  );
}

export default function FieldEditor({ field, value, onChange, issues = [], path, ctx, disabled, isNew }) {
  const own = messagesFor(issues, path);
  const err = own.find((i) => i.level === "error")?.message;
  const common = { label: field.label, hint: field.help, required: field.required };

  switch (field.type) {
    case "group":
      return (
        <fieldset className="rounded-lg border border-black/[0.08] bg-mist/40 px-4 pb-4 pt-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slatey">{field.label}</legend>
          <div className="space-y-4">
            {field.fields.map((f) => (
              <FieldEditor key={f.name} field={f} value={value?.[f.name]} onChange={(v) => onChange({ ...(value || {}), [f.name]: v })} issues={issues} path={`${path}.${f.name}`} ctx={ctx} disabled={disabled} />
            ))}
          </div>
          <ErrorList issues={own} />
        </fieldset>
      );
    case "list":
      return (
        <div>
          <p className="mb-2 text-xs font-medium text-ink">{field.label}</p>
          <ListField field={field} value={value || []} onChange={onChange} issues={issues} path={path} ctx={ctx} disabled={disabled} />
          <ErrorList issues={own} />
        </div>
      );
    case "paragraphs":
    case "strings":
      return (
        <Field {...common}>
          <TextList field={field} value={value || []} onChange={onChange} issues={issues} path={path} disabled={disabled} />
          <ErrorList issues={own} />
        </Field>
      );
    case "bool":
      return (
        <div>
          <Switch label={field.label} description={field.help} checked={!!value} onChange={onChange} disabled={disabled} />
          <ErrorList issues={own} />
        </div>
      );
    case "select":
      return (
        <Field {...common} error={err}>
          {(p) => (
            <Select {...p} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
              {!field.required && <option value="">—</option>}
              {field.options.map((o) => <option key={o} value={o}>{optionLabel(o, field)}</option>)}
            </Select>
          )}
        </Field>
      );
    case "image":
    case "video":
      return (
        <Field {...common} error={err}>
          <MediaField field={field} value={value || ""} onChange={onChange} disabled={disabled} />
        </Field>
      );
    case "textarea":
      return (
        <Field {...common} error={err} counter={<Counter value={value} max={field.max} />}>
          {(p) => <Textarea {...p} rows={field.max > 300 ? 5 : 3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />}
        </Field>
      );
    case "number":
      return (
        <Field {...common} error={err}>
          {(p) => <Input {...p} type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} disabled={disabled} />}
        </Field>
      );
    case "date":
      return (
        <Field {...common} error={err}>
          {(p) => <Input {...p} type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />}
        </Field>
      );
    case "slug":
      // Addresses are permanent once saved: other pages and shared links use them.
      return (
        <Field {...common} error={err} hint={isNew ? field.help : "Fixed once saved, so links keep working."}>
          {(p) => <Input {...p} value={value ?? ""} onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} disabled={disabled || !isNew} placeholder="set automatically" />}
        </Field>
      );
    default: {
      const listId = field.type === "link" || field.type === "route" ? `routes-${field.type}` : undefined;
      return (
        <Field {...common} error={err} counter={<Counter value={value} max={field.max} />}>
          {(p) => (
            <Input
              {...p}
              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
              list={listId}
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder={field.type === "link" ? "/page or https://…" : field.type === "route" ? "/page" : undefined}
            />
          )}
        </Field>
      );
    }
  }
}
