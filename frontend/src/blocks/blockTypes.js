// Registry of block types the page builder can add, edit, and the public
// site can render. Each entry has:
//   label        - shown in the "add block" menu
//   defaultData  - initial `data` payload when a block of this type is added
//   fields       - simple field list driving the generic edit form
//   Render       - public-site JSX (kept in blocks/Render.jsx to avoid a
//                  JSX-in-.js file; this file stays plain data + field specs)
export const BLOCK_TYPES = {
  hero: {
    label: "Hero",
    defaultData: { eyebrow: "", headline: "New headline", subheadline: "", imageUrl: "", ctaLabel: "", ctaHref: "" },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "subheadline", label: "Subheadline", type: "textarea" },
      { key: "imageUrl", label: "Background image URL", type: "url" },
      { key: "ctaLabel", label: "Button label", type: "text" },
      { key: "ctaHref", label: "Button link", type: "text" },
    ],
  },
  richtext: {
    label: "Text",
    defaultData: { heading: "", body: "" },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Body (one paragraph per line)", type: "textarea" },
    ],
  },
  image: {
    label: "Image",
    defaultData: { url: "", alt: "", caption: "" },
    fields: [
      { key: "url", label: "Image URL", type: "url" },
      { key: "alt", label: "Alt text", type: "text" },
      { key: "caption", label: "Caption", type: "text" },
    ],
  },
  video: {
    label: "Video",
    defaultData: { url: "", caption: "" },
    fields: [
      { key: "url", label: "Video URL (.mp4/.webm, or YouTube/Vimeo link)", type: "url" },
      { key: "caption", label: "Caption", type: "text" },
    ],
  },
  testimonial: {
    label: "Testimonial",
    defaultData: { quote: "", author: "", role: "" },
    fields: [
      { key: "quote", label: "Quote", type: "textarea" },
      { key: "author", label: "Author name", type: "text" },
      { key: "role", label: "Author role / company", type: "text" },
    ],
  },
  cta: {
    label: "Call to action",
    defaultData: { heading: "", body: "", buttonLabel: "", buttonHref: "" },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "buttonLabel", label: "Button label", type: "text" },
      { key: "buttonHref", label: "Button link", type: "text" },
    ],
  },
  gallery: {
    label: "Gallery",
    defaultData: { images: [] }, // [{url, alt}] — edited via a dedicated list editor
    fields: [],
  },
  metrics: {
    label: "Metrics",
    defaultData: { items: [] }, // [{value, label}] — edited via a dedicated list editor
    fields: [],
  },
  quickLinks: {
    label: "Quick links bar",
    defaultData: { items: [] }, // [{label, href}] — edited via a dedicated list editor
    fields: [],
  },
  badges: {
    label: "Achievement badges",
    defaultData: { heading: "", items: [] }, // items: [{title, description}] — edited via a dedicated list editor
    fields: [{ key: "heading", label: "Heading (optional)", type: "text" }],
  },
  featureCards: {
    // Alternating image + heading + description cards — covers both
    // "initiative" style sections and "impact/stat" style sections, since
    // structurally they're the same pattern with different copy.
    label: "Feature cards (alternating)",
    defaultData: { heading: "", intro: "", items: [] }, // items: [{title, description, imageUrl, linkLabel, linkHref}]
    fields: [
      { key: "heading", label: "Heading (optional)", type: "text" },
      { key: "intro", label: "Intro text (optional)", type: "textarea" },
    ],
  },
};

export const BLOCK_TYPE_KEYS = Object.keys(BLOCK_TYPES);
