// Field-by-field differences between what the website shows now and the
// draft, in words an editor can review before publishing.

function labelPath(fields, parts) {
  const out = [];
  let fs = fields;
  let node = null;
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      out.push(`#${Number(part) + 1}`);
      continue;
    }
    node = fs?.find((f) => f.name === part);
    out.push(node ? node.label : part);
    fs = node?.fields;
  }
  return out.join(" › ");
}

function flatten(value, prefix, out) {
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== "object" || v === null)) out[prefix] = value.join("\n");
    else value.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : String(i), out));
    if (!value.length) out[prefix] = "";
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k, out));
  } else {
    out[prefix] = value === null || value === undefined ? "" : String(value);
  }
  return out;
}

export function diffContent(before, after, fields) {
  const a = flatten(before ?? {}, "", {});
  const b = flatten(after ?? {}, "", {});
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys
    .filter((k) => (a[k] ?? "") !== (b[k] ?? ""))
    .map((k) => ({ path: k, label: labelPath(fields, k.split(".")), before: a[k] ?? "", after: b[k] ?? "" }))
    .sort((x, y) => x.path.localeCompare(y.path, undefined, { numeric: true }));
}
