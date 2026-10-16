// The bridge between dashboard-managed content (backend/app/cms_schema.py)
// and the site's data modules.
//
// For each content area:
//   builtIn  the approved content shipped with the site, in the CMS's shape —
//            what the website shows until something is published, and what an
//            editor starts from
//   apply    writes published (or previewed) content into the data modules,
//            in place, before the site renders — so components keep reading
//            the same objects and the design is untouched
//
// Structural parts (slugs, icons, keys, which page a card links to) are kept
// from the built-in data by position and never taken from the CMS.
import * as content from "../data/content.js";
import { pageCopy } from "../data/pages.js";
import { footerSource, menuSource, rebuildSite } from "../data/site.js";
import { people } from "../data/leadership.js";
import { gallery, milestones, stories } from "../data/media.js";
import { ECOSYSTEM, ORGANISATIONS } from "../data/partners.js";

const clone = (x) => JSON.parse(JSON.stringify(x));
const replaceArray = (arr, items) => arr.splice(0, arr.length, ...items);
const assignObject = (obj, data) => Object.assign(obj, data);
// Overlay CMS items onto built-in ones by position, keeping fields the CMS
// doesn't manage (slugs, keys, icons…).
const overlay = (base, items, keep = []) =>
  items.map((it, i) => {
    const kept = Object.fromEntries(keep.filter((k) => base[i] && base[i][k] !== undefined).map((k) => [k, base[i][k]]));
    return { ...it, ...kept };
  });

const strip = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

const AREAS = {
  "site.company": {
    get: () => strip(content.company, []),
    apply: (d) => assignObject(content.company, d),
  },
  "site.navigation": {
    get: () => ({ sections: menuSource.map((s) => ({ label: s.label, blurb: s.blurb, items: s.items.map((i) => ({ label: i.label, to: i.to || i.href, hidden: !!i.hidden })) })) }),
    apply: (d) => {
      const base = clone(menuSource);
      d.sections.forEach((s, si) => {
        const b = base[si] || {};
        menuSource[si] = {
          key: b.key,
          label: s.label,
          blurb: s.blurb,
          items: s.items.map((i) => {
            const same = (b.items || []).find((x) => (x.to || x.href) === i.to);
            const vendor = i.to === "vendor-portal";
            return { label: i.label, ...(vendor ? { href: i.to, external: true } : { to: i.to }), illus: same?.illus || "story", hidden: !!i.hidden };
          }),
        };
      });
    },
  },
  "site.footer": {
    get: () => clone(footerSource),
    apply: (d) => {
      replaceArray(footerSource.companyLinks, d.companyLinks);
      replaceArray(footerSource.resourceLinks, d.resourceLinks || []);
    },
  },
  "home.hero": {
    get: () => ({ slides: content.heroSlides.map((s) => ({ kicker: s.kicker || "", title: s.title, body: s.body, cta: { ...s.cta }, image: s.image || "" })) }),
    apply: (d) => replaceArray(content.heroSlides, d.slides),
  },
  "home.panel": {
    get: () => ({ quickLinks: clone(content.quickLinks), badges: [...content.badges], credentials: [...content.credentials] }),
    apply: (d) => {
      replaceArray(content.quickLinks, d.quickLinks);
      replaceArray(content.badges, d.badges);
      replaceArray(content.credentials, d.credentials);
    },
  },
  "home.metrics": {
    get: () => ({ items: clone(content.metrics) }),
    apply: (d) => replaceArray(content.metrics, d.items),
  },
  "home.about": {
    get: () => ({ eyebrow: content.about.eyebrow, heading: content.about.heading, tabs: content.about.tabs.map((t) => strip(t, ["key"])), strengths: clone(content.about.strengths) }),
    apply: (d) => assignObject(content.about, { ...d, tabs: overlay(content.about.tabs, d.tabs, ["key"]) }),
  },
  "home.solutions": {
    get: () => ({ eyebrow: content.solutions.eyebrow, heading: content.solutions.heading, intro: content.solutions.intro, items: content.solutions.items.map((i) => ({ title: i.title, body: i.body, image: i.image || "" })) }),
    apply: (d) => assignObject(content.solutions, { ...d, items: overlay(content.solutions.items, d.items, ["slug"]) }),
  },
  "home.capability": { get: () => clone(content.capability), apply: (d) => assignObject(content.capability, d) },
  "home.grow": { get: () => clone(content.grow), apply: (d) => assignObject(content.grow, d) },
  "home.highlights": { get: () => clone(content.highlights), apply: (d) => assignObject(content.highlights, d) },
  "home.sdg": { get: () => clone(content.sdg), apply: (d) => assignObject(content.sdg, d) },
  "home.ecosystem": { get: () => clone(content.ecosystemStory), apply: (d) => assignObject(content.ecosystemStory, d) },
  "home.caseStudies": {
    get: () => ({ items: clone(content.caseStudies) }),
    apply: (d) =>
      replaceArray(
        content.caseStudies,
        // keep each study's permanent address; new studies get one from their title
        d.items.map((c) => ({ ...c, slug: c.slug || c.title.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }))
      ),
  },
  "home.testimonials": { get: () => ({ items: clone(content.testimonials) }), apply: (d) => replaceArray(content.testimonials, d.items) },
  "leadership.people": {
    get: () => ({ items: clone(people) }),
    apply: (d) => replaceArray(people, d.items.map((p) => ({ summary: "", bio: [], experience: [], ...p, portrait: p.portrait || null, name: p.name || null }))),
  },
  "media.library": {
    get: () => ({ stories: clone(stories), milestones: clone(milestones), gallery: clone(gallery) }),
    apply: (d) => {
      replaceArray(stories, d.stories || []);
      replaceArray(milestones, d.milestones || []);
      // the editor stores a video file under `video`; the gallery plays `src`
      replaceArray(gallery, (d.gallery || []).map((g) => (g.type === "video" ? { ...g, poster: g.src || g.poster, src: g.video || null } : g)));
    },
  },
  "partners.organisations": { get: () => ({ items: clone(ORGANISATIONS) }), apply: (d) => replaceArray(ORGANISATIONS, d.items) },
  "partners.ecosystem": {
    get: () => ({ items: ECOSYSTEM.map((e) => ({ label: e.label, role: e.role, onction: e.onction })) }),
    apply: (d) => replaceArray(ECOSYSTEM, overlay(ECOSYSTEM, d.items, ["key", "side", "flow"])),
  },
};

// Every inner page's copy object is managed whole.
for (const slug of Object.keys(pageCopy)) {
  AREAS[`page.${slug}`] = { get: () => clone(pageCopy[slug]), apply: (d) => assignObject(pageCopy[slug], d) };
}

// The approved content, captured before anything is applied.
const BUILT_IN = Object.fromEntries(Object.entries(AREAS).map(([k, a]) => [k, a.get()]));

export const managedKeys = Object.keys(AREAS);

/** The site's own content for an area, in the CMS's shape. */
export function builtIn(key) {
  return BUILT_IN[key] ? clone(BUILT_IN[key]) : null;
}

/** Writes CMS content into the site. Unknown areas and bad data are skipped. */
export function applyContent(docs) {
  const applied = [];
  for (const [key, data] of Object.entries(docs || {})) {
    const area = AREAS[key];
    if (!area || !data || typeof data !== "object") continue;
    try {
      area.apply(data);
      applied.push(key);
    } catch (err) {
      console.warn(`Skipped content for ${key}:`, err);
    }
  }
  rebuildSite();
  return applied;
}
