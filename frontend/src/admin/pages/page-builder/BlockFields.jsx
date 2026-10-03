import { useState } from "react";
import { LuArrowDown, LuArrowUp, LuImage, LuPlus, LuTrash2, LuVideo, LuX } from "react-icons/lu";
import { BLOCK_TYPES } from "../../../blocks/blockTypes.js";
import MediaPicker from "../../components/MediaPicker.jsx";
import { Button, Field, IconButton, Input, Textarea, cx } from "../../components/ui.jsx";

function MediaField({ field, value, onChange, a11y }) {
  const [picking, setPicking] = useState(false);
  const isVideo = field.media === "video";
  const Icon = isVideo ? LuVideo : LuImage;
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setPicking(true)}
        className="group grid h-[72px] w-[96px] shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-black/15 bg-mist text-slatey transition hover:border-teal-500 hover:text-teal-600"
        aria-label={`Choose ${field.label.toLowerCase()} from media library`}
      >
        {value && !isVideo ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Icon size={20} aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <Input {...a11y} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="https://… or choose from library" />
        <div className="flex flex-wrap gap-1.5">
          <Button size="xs" variant="secondary" onClick={() => setPicking(true)}>
            Browse library
          </Button>
          {value && (
            <Button size="xs" variant="ghost" icon={LuX} onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>
      </div>
      {picking && (
        <MediaPicker
          kind={field.media}
          currentUrl={value}
          onClose={() => setPicking(false)}
          onSelect={(url) => {
            onChange(url);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

function FieldControl({ field, value, onChange }) {
  return (
    <Field label={field.label} required={field.required} optional={field.optional} hint={field.hint} className={field.half ? "" : "sm:col-span-2"}>
      {(a11y) =>
        field.media ? (
          <MediaField field={field} value={value} onChange={onChange} a11y={a11y} />
        ) : field.type === "textarea" ? (
          <Textarea {...a11y} rows={field.rows || 3} value={value || ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <Input {...a11y} value={value || ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </Field>
  );
}

function FieldGrid({ fields, data, onChange }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <FieldControl key={field.key} field={field} value={data[field.key]} onChange={(v) => onChange({ ...data, [field.key]: v })} />
      ))}
    </div>
  );
}

function ListEditor({ spec, items, onChange }) {
  function update(i, next) {
    onChange(items.map((it, idx) => (idx === i ? next : it)));
  }
  function move(i, dir) {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-ink">
          {spec.itemLabel}s <span className="font-normal text-slatey">({items.length})</span>
        </p>
      </div>
      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-black/15 px-4 py-6 text-center text-sm text-slatey">
          No {spec.itemLabel.toLowerCase()}s yet.
        </div>
      )}
      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="rounded-lg border border-black/[0.08] bg-mist/50">
            <div className="flex items-center justify-between border-b border-black/[0.06] py-1 pl-3 pr-1">
              <span className="text-xs font-semibold text-slatey">
                {spec.itemLabel} {i + 1}
              </span>
              <div className="flex items-center">
                <IconButton icon={LuArrowUp} size="sm" label={`Move ${spec.itemLabel.toLowerCase()} up`} disabled={i === 0} onClick={() => move(i, -1)} />
                <IconButton icon={LuArrowDown} size="sm" label={`Move ${spec.itemLabel.toLowerCase()} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)} />
                <IconButton
                  icon={LuTrash2}
                  size="sm"
                  variant="danger-ghost"
                  label={`Remove ${spec.itemLabel.toLowerCase()} ${i + 1}`}
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                />
              </div>
            </div>
            <div className="p-3">
              <FieldGrid fields={spec.fields} data={item} onChange={(next) => update(i, next)} />
            </div>
          </li>
        ))}
      </ol>
      <Button size="sm" variant="secondary" icon={LuPlus} className="mt-3" onClick={() => onChange([...items, { ...spec.newItem }])}>
        Add {spec.itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}

export default function BlockEditor({ type, data, onChange }) {
  const def = BLOCK_TYPES[type];
  const list = def.list;
  return (
    <div className={cx("space-y-5")}>
      {def.fields.length > 0 && <FieldGrid fields={def.fields} data={data} onChange={onChange} />}
      {list && <ListEditor spec={list} items={data[list.key] || []} onChange={(items) => onChange({ ...data, [list.key]: items })} />}
    </div>
  );
}
