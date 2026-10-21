// Shared bits for content with a draft/published status (news, events).

export const STATUS_TONE = { published: "success", draft: "neutral" };
export const STATUS_LABEL = { published: "Published", draft: "Draft" };

// Opens the real public page in a new tab. `?preview` lets signed-in staff
// see a draft there; anyone else gets the normal (published-only) page.
export function openPreview(path) {
  window.open(`${path}?preview`, "_blank", "noopener");
}

export function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
