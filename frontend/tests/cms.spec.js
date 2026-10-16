// End-to-end: the dashboard's draft → preview → review → publish workflow
// against a real backend, across different kinds of page content.
//
//   (backend on :8000 with a throwaway database and three logins — see the
//    note at the end of this file), then:
//   npm run build && npx vite preview --port 4173 &
//   BASE=http://localhost:4173 npx playwright test tests/cms.spec.js --project=gpu
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:4173";
const API = process.env.API || BASE;
const PASSWORD = process.env.E2E_PASSWORD || "e2e-password-123";
const USERS = { super: "e2e-super@example.com", admin: "e2e-admin@example.com", viewer: "e2e-viewer@example.com" };

test.describe.configure({ mode: "default" }); // one worker: tests share the backend (each resets it first)

async function token(request, who) {
  const r = await request.post(`${API}/api/auth/login`, { data: { email: USERS[who], password: PASSWORD } });
  expect(r.ok(), await r.text()).toBeTruthy();
  return (await r.json()).access_token;
}

async function signIn(page, request, who) {
  const t = await token(request, who);
  await page.addInitScript((tk) => localStorage.setItem("onction_admin_token", tk), t);
  return t;
}

// Publish content straight through the API (used to set up scenarios).
async function publishVia(request, t, key, data) {
  const h = { Authorization: `Bearer ${t}` };
  const doc = await (await request.get(`${API}/api/content/docs/${key}`, { headers: h })).json();
  const saved = await request.put(`${API}/api/content/docs/${key}/draft`, { headers: h, data: { data, rev: doc.rev } });
  expect(saved.ok(), await saved.text()).toBeTruthy();
  const pub = await request.post(`${API}/api/content/docs/${key}/publish`, { headers: h, data: { rev: (await saved.json()).rev, confirm: true } });
  expect(pub.ok(), await pub.text()).toBeTruthy();
}

// Every test starts from the built-in website.
test.beforeEach(async ({ request }) => {
  const t = await token(request, "super");
  const h = { Authorization: `Bearer ${t}` };
  for (const d of await (await request.get(`${API}/api/content/docs`, { headers: h })).json()) {
    if (d.status === "built-in") continue;
    const doc = await (await request.get(`${API}/api/content/docs/${d.key}`, { headers: h })).json();
    let rev = doc.rev;
    if (doc.draft) rev = (await (await request.post(`${API}/api/content/docs/${d.key}/discard`, { headers: h, data: { rev } })).json()).rev;
    if (doc.published) await request.post(`${API}/api/content/docs/${d.key}/unpublish`, { headers: h, data: { rev, confirm: true } });
  }
});

const heroTitle = (page) => page.locator("#top h1").first();

test("homepage hero: draft stays private, preview shows it, publish puts it live, built-in restores it", async ({ page, request, context }) => {
  await signIn(page, request, "admin");
  await page.goto(`${BASE}/admin/content/home.hero`);
  await page.getByRole("button", { name: "Fully charged, for a sustainable future.", exact: true }).click();
  const headline = page.getByLabel("Headline").first();
  await headline.fill("Powering West Africa, every hour.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved. The website hasn't changed.")).toBeVisible();

  // Public visitors (no staff session) still see the approved hero.
  const visitor = await context.browser().newPage();
  await visitor.goto(`${BASE}/`);
  await expect(heroTitle(visitor)).toHaveText("Fully charged, for a sustainable future.");
  // …even if they guess the preview link.
  await visitor.goto(`${BASE}/?preview`);
  await expect(heroTitle(visitor)).toHaveText("Fully charged, for a sustainable future.");
  await visitor.close();

  // Staff preview shows the draft on the real page.
  const [preview] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Preview" }).first().click()]);
  await expect(heroTitle(preview)).toHaveText("Powering West Africa, every hour.");
  await expect(preview.getByText("unpublished changes")).toBeVisible();
  await preview.close();

  // Review: the change is listed and publishing needs the confirmation tick.
  await page.getByRole("button", { name: "Review & publish" }).click();
  const modal = page.getByRole("dialog", { name: "Review changes" });
  await expect(modal.getByText("Powering West Africa, every hour.")).toBeVisible();
  await expect(modal.getByText("Homepage ↗")).toBeVisible();
  const publish = modal.getByRole("button", { name: "Publish to website" });
  await expect(publish).toBeDisabled();
  await modal.getByLabel(/previewed these changes/).check();
  await publish.click();
  await expect(page.getByText("Published — the website now shows these changes.")).toBeVisible();

  const visitor2 = await context.browser().newPage();
  await visitor2.goto(`${BASE}/`);
  await expect(heroTitle(visitor2)).toHaveText("Powering West Africa, every hour.");

  // Back to the built-in content.
  await page.getByRole("button", { name: "Use built-in content" }).click();
  await page.getByRole("button", { name: "Use built-in content" }).last().click();
  await expect(page.getByText("built-in content for this area")).toBeVisible();
  await visitor2.goto(`${BASE}/`);
  await expect(heroTitle(visitor2)).toHaveText("Fully charged, for a sustainable future.");
  await visitor2.close();
});

test("invalid content is blocked with a reason", async ({ page, request }) => {
  await signIn(page, request, "admin");
  await page.goto(`${BASE}/admin/content/page.market`);
  const title = page.getByRole("group", { name: "Page hero" }).getByLabel("Headline");
  await title.fill("<b>Bold</b> market");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Headline can't contain HTML").first()).toBeVisible();
  await page.getByRole("button", { name: "Review & publish" }).click();
  await expect(page.getByText(/must be fixed first/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish to website" })).toBeDisabled();
});

test("protected contact details: an Admin drafts, only a Super Admin publishes; every page updates", async ({ page, request }) => {
  await signIn(page, request, "admin");
  await page.goto(`${BASE}/admin/content/site.company`);
  await expect(page.getByText("This area is protected")).toBeVisible();
  await page.getByLabel("Phone (as displayed)").fill("+234 800 000 0000");
  await page.getByLabel(/Phone \(for dialling/).fill("+2348000000000");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByRole("button", { name: "Review & publish" }).click();
  await expect(page.getByText("Only a Super Admin can publish")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish to website" })).toBeDisabled();

  // The Super Admin publishes the Admin's draft.
  const sup = await token(request, "super");
  const h = { Authorization: `Bearer ${sup}` };
  const doc = await (await request.get(`${API}/api/content/docs/site.company`, { headers: h })).json();
  expect((await request.post(`${API}/api/content/docs/site.company/publish`, { headers: h, data: { rev: doc.rev, confirm: true } })).ok()).toBeTruthy();

  // the closing panel of every inner page, and the contact page itself
  await page.goto(`${BASE}/about`);
  await expect(page.locator('main a[href="tel:+2348000000000"]').getByText("+234 800 000 0000")).toBeVisible();
  await page.goto(`${BASE}/contact`);
  await expect(page.locator('main a[href="tel:+2348000000000"]').first()).toBeVisible();
  // the footer still lists the (unchanged) offices
  await expect(page.locator("footer").getByText("Lagos (Head Office)")).toBeVisible();
});

test("inner page copy and shared lists update their pages", async ({ page, request }) => {
  const t = await token(request, "admin");
  const h = { Authorization: `Bearer ${t}` };
  const market = (await (await request.get(`${API}/api/content/docs/page.market`, { headers: h })).json()).published;
  expect(market).toBeNull(); // built-in until now
  await publishVia(request, t, "page.market", {
    hero: { title: "Fourteen nations, one market", accent: "one market", intro: "An edited introduction.", image: "" },
    network: { eyebrow: "The WAPP network", title: "How the region's grids connect", accent: "connect", intro: "x" },
    corridors: { eyebrow: "Cross-border trading", title: "Why power should cross borders", accent: "cross borders" },
    reasons: [{ title: "A", body: "a" }, { title: "B", body: "b" }, { title: "C", body: "c" }],
    participants: { eyebrow: "Market participants", title: "Who takes part", accent: "takes part", intro: "" },
    participantList: [1, 2, 3, 4, 5].map((n) => ({ title: `Participant ${n}`, body: "Body." })),
    next: { title: "Sustainability", summary: "" },
  });
  await page.goto(`${BASE}/market`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Fourteen nations, one market");
  await expect(page.getByText("An edited introduction.")).toBeVisible();
  await expect(page.getByText("Participant 5")).toBeVisible();

  // Case studies are shared: home carousel + the case-studies page.
  await publishVia(request, t, "home.caseStudies", {
    items: [{ slug: "", category: "Advisory", title: "A newly published study", body: "What we did.", result: { prefix: "", value: 3, suffix: " wks", label: "to signature" } }],
  });
  await page.goto(`${BASE}/case-studies`);
  await expect(page.getByRole("heading", { name: "A newly published study" })).toBeVisible();
  await expect(page.locator("#a-newly-published-study")).toBeVisible(); // permanent address generated
});

test("leadership: only verified profiles go public, and the menu links the page once one exists", async ({ page, request, context }) => {
  const t = await token(request, "admin");
  const visitor = await context.browser().newPage();
  await visitor.goto(`${BASE}/sitemap`);
  await expect(visitor.locator('main a[href="/leadership"]')).toHaveCount(0);

  await publishVia(request, t, "leadership.people", {
    items: [
      { id: "ada-test", group: "chairman", name: "Ada Example", title: "Chairman of the Board", portrait: "/favicon.png", bio: ["Approved biography."], verified: true },
      { id: "pending", group: "board", name: "Not Yet Approved", title: "Director", verified: false },
    ],
  });
  await visitor.goto(`${BASE}/leadership`);
  await expect(visitor.getByRole("heading", { name: "Ada Example" })).toBeVisible();
  await expect(visitor.getByText("Approved biography.")).toBeVisible();
  await expect(visitor.getByText("Not Yet Approved")).toHaveCount(0);
  await visitor.goto(`${BASE}/sitemap`);
  await expect(visitor.locator('main a[href="/leadership"]').first()).toBeVisible();
  await visitor.close();
});

test("partners: a verified organisation appears in the directory under its role", async ({ page, request }) => {
  const t = await token(request, "admin");
  await publishVia(request, t, "partners.organisations", {
    items: [{ id: "acme", name: "Acme Generation Ltd", logo: "", ecosystem: "generation", relationship: "generation", description: "Supplies power under a bilateral contract.", url: "https://example.com", highlight: false, verified: true }],
  });
  await page.goto(`${BASE}/partners`);
  await expect(page.locator("#directory").getByText("Acme Generation Ltd")).toBeVisible();
  await expect(page.locator("#directory").getByText("Generation company")).toBeVisible();
});

test("navigation: links can be hidden, but Contact can't be", async ({ page, request }) => {
  const t = await token(request, "super");
  const h = { Authorization: `Bearer ${t}` };
  // start from what the site has, via the editor's own built-in content
  await signIn(page, request, "super");
  await page.goto(`${BASE}/admin/content/site.navigation`);
  await page.getByRole("button", { name: "Contact", exact: true }).click();
  const contactSection = page.locator("div.rounded-lg", { has: page.getByRole("button", { name: "Contact", exact: true }) }).first();
  for (const sw of await contactSection.getByRole("switch", { name: "Hide this link" }).all()) await sw.click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/link to \/contact can't be removed/).first()).toBeVisible();

  // Hiding a non-critical link is fine.
  const doc = await (await request.get(`${API}/api/content/docs/site.navigation`, { headers: h })).json();
  const nav = doc.draft;
  nav.sections.forEach((s) => s.items.forEach((i) => (i.hidden = i.to === "/sustainability#net-zero")));
  const saved = await request.put(`${API}/api/content/docs/site.navigation/draft`, { headers: h, data: { data: nav, rev: doc.rev } });
  expect((await saved.json()).issues.filter((i) => i.level === "error")).toEqual([]);
  expect((await request.post(`${API}/api/content/docs/site.navigation/publish`, { headers: h, data: { rev: (await saved.json()).rev, confirm: true } })).ok()).toBeTruthy();
  await page.goto(`${BASE}/sitemap`);
  await expect(page.locator('main a[href="/sustainability#net-zero"]')).toHaveCount(0);
  await expect(page.locator('main a[href="/contact"]').first()).toBeVisible();
});

test("viewers can look but not change", async ({ page, request }) => {
  await signIn(page, request, "viewer");
  await page.goto(`${BASE}/admin/content/home.sdg`);
  await expect(page.getByText("You have view-only access.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);
  await expect(page.getByLabel("Heading")).toBeDisabled();
});

test("history: a previous version can be restored through review", async ({ page, request }) => {
  const t = await token(request, "admin");
  const v1 = { eyebrow: "SDG 7", heading: "Version one heading", body: "", goals: ["Goal."] };
  await publishVia(request, t, "home.sdg", v1);
  await publishVia(request, t, "home.sdg", { ...v1, heading: "Version two heading" });
  await signIn(page, request, "admin");
  await page.goto(`${BASE}/admin/content/home.sdg`);
  await page.getByRole("button", { name: "History" }).click();
  const drawer = page.getByRole("dialog", { name: "History" });
  await drawer.getByRole("button", { name: "Load into draft" }).nth(1).click();
  await expect(page.getByText("Loaded into the draft.")).toBeVisible();
  await expect(page.getByLabel("Heading")).toHaveValue("Version one heading");
  await page.goto(`${BASE}/`);
  await expect(page.getByText("Version two heading")).toBeVisible(); // still live until published
});

test("the coverage report is built from the running site", async ({ page, request }) => {
  await signIn(page, request, "viewer");
  await page.goto(`${BASE}/admin/content/coverage`);
  await expect(page.getByText("31 / 31")).toBeVisible();
  await expect(page.getByText("Kept in code, on purpose")).toBeVisible();
});

// Throwaway backend for these tests (from backend/):
//   DATABASE_URL=sqlite:////tmp/e2e.db JWT_SECRET=<40+ chars> uvicorn app.main:app --port 8000
// with three AdminUser rows (Super Admin / Admin / Viewer) using the emails
// above and E2E_PASSWORD.
