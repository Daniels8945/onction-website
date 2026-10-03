// Registry of block types the page builder can add, edit, and the public
// site can render. Each entry has:
//   label        - shown in the "add block" picker
//   description  - one line in the picker explaining what the block is for
//   defaultData  - initial `data` payload when a block of this type is added
//   fields       - simple field list driving the generic edit form
//                  (`media: "image" | "video"` adds a media-library picker)
//   list         - optional repeatable-items spec: { key, itemLabel, fields, newItem }
//   summary      - one-line preview of the block's content for the collapsed card
//   check        - returns human-readable problems; mirrors the cases where
//                  blocks/BlockRenderer.jsx would render nothing or drop a button
// Render lives in blocks/BlockRenderer.jsx (keeps this file JSX-free).

const filled = (v) => typeof v === "string" && v.trim() !== "";
const firstFilled = (...values) => values.find(filled) || "";
const countLabel = (n, one) => `${n} ${one}${n === 1 ? "" : "s"}`;

function buttonCheck(label, href, what = "Button") {
  if (filled(label) !== filled(href)) return [`${what} needs both a label and a link to appear`];
  return [];
}

function listCheck(items, one, requiredKey) {
  const list = items || [];
  if (list.length === 0) return [`Add at least one ${one} — empty blocks aren't shown`];
  if (requiredKey && list.some((it) => !filled(it[requiredKey]))) return [`Every ${one} needs a ${requiredKey === "url" ? "file" : requiredKey}`];
  return [];
}

export const BLOCK_TYPES = {
  hero: {
    label: "Hero",
    description: "Full-width banner with headline, background image and button.",
    defaultData: { eyebrow: "", headline: "New headline", subheadline: "", imageUrl: "", ctaLabel: "", ctaHref: "" },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Short label above the headline" },
      { key: "headline", label: "Headline", type: "text", required: true },
      { key: "subheadline", label: "Subheadline", type: "textarea" },
      { key: "imageUrl", label: "Background image", type: "url", media: "image" },
      { key: "ctaLabel", label: "Button label", type: "text", half: true },
      { key: "ctaHref", label: "Button link", type: "text", half: true, placeholder: "/contact or https://…" },
    ],
    summary: (d) => d.headline,
    check: (d) => [...(filled(d.headline) ? [] : ["Headline is empty"]), ...buttonCheck(d.ctaLabel, d.ctaHref)],
  },
  richtext: {
    label: "Text",
    description: "A heading and paragraphs of body copy.",
    defaultData: { heading: "", body: "" },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Body", type: "textarea", rows: 6, hint: "Each new line becomes its own paragraph." },
    ],
    summary: (d) => firstFilled(d.heading, d.body),
    check: (d) => (filled(d.heading) || filled(d.body) ? [] : ["Add a heading or body text"]),
  },
  image: {
    label: "Image",
    description: "A single full-width image with optional caption.",
    defaultData: { url: "", alt: "", caption: "" },
    fields: [
      { key: "url", label: "Image", type: "url", media: "image", required: true },
      { key: "alt", label: "Alt text", type: "text", hint: "Describes the image for screen readers and search engines." },
      { key: "caption", label: "Caption", type: "text" },
    ],
    summary: (d) => firstFilled(d.caption, d.alt, d.url),
    check: (d) => [...(filled(d.url) ? [] : ["Choose an image — this block is hidden until it has one"]), ...(filled(d.url) && !filled(d.alt) ? ["Alt text is missing"] : [])],
  },
  video: {
    label: "Video",
    description: "Uploaded video file, or a YouTube / Vimeo embed.",
    defaultData: { url: "", caption: "" },
    fields: [
      { key: "url", label: "Video", type: "url", media: "video", required: true, hint: "Upload an .mp4/.webm, or paste a YouTube/Vimeo embed URL." },
      { key: "caption", label: "Caption", type: "text" },
    ],
    summary: (d) => firstFilled(d.caption, d.url),
    check: (d) => (filled(d.url) ? [] : ["Add a video — this block is hidden until it has one"]),
  },
  testimonial: {
    label: "Testimonial",
    description: "A pull quote with the person's name and role.",
    defaultData: { quote: "", author: "", role: "" },
    fields: [
      { key: "quote", label: "Quote", type: "textarea", required: true },
      { key: "author", label: "Author name", type: "text", half: true },
      { key: "role", label: "Role / company", type: "text", half: true },
    ],
    summary: (d) => (filled(d.quote) ? `“${d.quote}”` : ""),
    check: (d) => (filled(d.quote) ? [] : ["Quote is empty"]),
  },
  cta: {
    label: "Call to action",
    description: "Dark banner prompting visitors to take the next step.",
    defaultData: { heading: "", body: "", buttonLabel: "", buttonHref: "" },
    fields: [
      { key: "heading", label: "Heading", type: "text", required: true },
      { key: "body", label: "Body", type: "textarea" },
      { key: "buttonLabel", label: "Button label", type: "text", half: true },
      { key: "buttonHref", label: "Button link", type: "text", half: true, placeholder: "/contact or https://…" },
    ],
    summary: (d) => firstFilled(d.heading, d.body),
    check: (d) => [...(filled(d.heading) || filled(d.body) ? [] : ["Add a heading or body text"]), ...buttonCheck(d.buttonLabel, d.buttonHref)],
  },
  gallery: {
    label: "Gallery",
    description: "A grid of square images.",
    defaultData: { images: [] }, // [{url, alt}]
    fields: [],
    list: {
      key: "images",
      itemLabel: "Image",
      newItem: { url: "", alt: "" },
      fields: [
        { key: "url", label: "Image", type: "url", media: "image" },
        { key: "alt", label: "Alt text", type: "text" },
      ],
    },
    summary: (d) => countLabel((d.images || []).length, "image"),
    check: (d) => listCheck(d.images, "image", "url"),
  },
  metrics: {
    label: "Metrics",
    description: "Big headline numbers, e.g. “240MW — installed capacity”.",
    defaultData: { items: [] }, // [{value, label}]
    fields: [],
    list: {
      key: "items",
      itemLabel: "Metric",
      newItem: { value: "", label: "" },
      fields: [
        { key: "value", label: "Value", type: "text", placeholder: "240MW", half: true },
        { key: "label", label: "Label", type: "text", placeholder: "Installed capacity", half: true },
      ],
    },
    summary: (d) => (d.items || []).map((i) => i.value).filter(filled).join(" · ") || countLabel((d.items || []).length, "metric"),
    check: (d) => listCheck(d.items, "metric", "value"),
  },
  quickLinks: {
    label: "Quick links bar",
    description: "A horizontal row of links, e.g. to sections further down.",
    defaultData: { items: [] }, // [{label, href}]
    fields: [],
    list: {
      key: "items",
      itemLabel: "Link",
      newItem: { label: "", href: "" },
      fields: [
        { key: "label", label: "Label", type: "text", half: true },
        { key: "href", label: "Link", type: "text", placeholder: "#section or /page", half: true },
      ],
    },
    summary: (d) => (d.items || []).map((i) => i.label).filter(filled).join(" · ") || countLabel((d.items || []).length, "link"),
    check: (d) => listCheck(d.items, "link", "label"),
  },
  badges: {
    label: "Achievement badges",
    description: "Checkmarked highlights with short descriptions.",
    defaultData: { heading: "", items: [] }, // items: [{title, description}]
    fields: [{ key: "heading", label: "Heading", type: "text", optional: true }],
    list: {
      key: "items",
      itemLabel: "Badge",
      newItem: { title: "", description: "" },
      fields: [
        { key: "title", label: "Title", type: "text" },
        { key: "description", label: "Description", type: "text", optional: true },
      ],
    },
    summary: (d) => firstFilled(d.heading) || countLabel((d.items || []).length, "badge"),
    check: (d) => listCheck(d.items, "badge", "title"),
  },
  featureCards: {
    // Alternating image + heading + description cards — covers both
    // "initiative" style sections and "impact/stat" style sections, since
    // structurally they're the same pattern with different copy.
    label: "Feature cards",
    description: "Alternating image-and-text rows for initiatives or highlights.",
    defaultData: { heading: "", intro: "", items: [] }, // items: [{title, description, imageUrl, linkLabel, linkHref}]
    fields: [
      { key: "heading", label: "Heading", type: "text", optional: true },
      { key: "intro", label: "Intro text", type: "textarea", optional: true },
    ],
    list: {
      key: "items",
      itemLabel: "Card",
      newItem: { title: "", description: "", imageUrl: "", linkLabel: "", linkHref: "" },
      fields: [
        { key: "title", label: "Title", type: "text" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "imageUrl", label: "Image", type: "url", media: "image", optional: true },
        { key: "linkLabel", label: "Link label", type: "text", placeholder: "Learn more", half: true, optional: true },
        { key: "linkHref", label: "Link URL", type: "text", half: true, optional: true },
      ],
    },
    summary: (d) => firstFilled(d.heading) || countLabel((d.items || []).length, "card"),
    check: (d) => [
      ...listCheck(d.items, "card", "title"),
      ...((d.items || []).some((it) => filled(it.linkLabel) !== filled(it.linkHref)) ? ["A card link needs both a label and a URL to appear"] : []),
    ],
  },
};

export const BLOCK_TYPE_KEYS = Object.keys(BLOCK_TYPES);
