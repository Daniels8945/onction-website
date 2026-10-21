// End-to-end: Events, News and Newsletter management, image uploads and the
// Help Centre, against the running Docker stack (real backend + storage).
//
//   docker compose up -d --build
//   E2E_EMAIL=admin@onctionenergy.com E2E_PASSWORD=… BASE=http://localhost:8080 \
//     npx playwright test tests/content-management.spec.js --project=gpu
//
// Everything a test creates (events, articles, campaigns, subscribers,
// uploaded files) is deleted again at the end of that test.
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:8080";
const EMAIL = process.env.E2E_EMAIL || "admin@onctionenergy.com";
const PASSWORD = process.env.E2E_PASSWORD || "testpass123";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// A real 1×1 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const tag = () => Math.random().toString(36).slice(2, 8);

test.use({ userAgent: UA });
test.describe.configure({ mode: "serial" });

let token;
const auth = () => ({ Authorization: `Bearer ${token}` });

test.beforeAll(async ({ request }) => {
  const r = await request.post(`${BASE}/api/auth/login`, { data: { email: EMAIL, password: PASSWORD } });
  expect(r.ok(), await r.text()).toBeTruthy();
  token = (await r.json()).access_token;
});

// Uploads made during a test, removed from storage afterwards.
async function cleanupUploads(request, since) {
  const assets = await (await request.get(`${BASE}/api/media`, { headers: auth() })).json();
  for (const a of assets.filter((a) => a.id > since)) await request.delete(`${BASE}/api/media/${a.id}`, { headers: auth() });
}
async function lastAssetId(request) {
  const assets = await (await request.get(`${BASE}/api/media`, { headers: auth() })).json();
  return assets.reduce((m, a) => Math.max(m, a.id), 0);
}

function watch(page) {
  const problems = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    // 404s for drafts on public endpoints are expected; anything 5xx is not.
    if (r.status() >= 500) problems.push(`${r.status()} ${r.url()}`);
  });
  return problems;
}

async function signIn(page) {
  await page.addInitScript((t) => window === window.top && localStorage.setItem("onction_admin_token", t), token);
}

async function uploadInto(page, buffer, name = "cover.png", mimeType = "image/png") {
  await page.locator('input[type="file"]').first().setInputFiles({ name, mimeType, buffer });
}

test("events: create, upload cover, preview draft privately, edit, publish, unpublish, delete", async ({ page, request, browser }) => {
  const problems = watch(page);
  const since = await lastAssetId(request);
  await signIn(page);
  const title = `E2E Forum ${tag()}`;

  await page.goto(`${BASE}/admin/events`);
  await page.getByRole("button", { name: "New event" }).first().click();
  await page.getByLabel("Event title").fill(title);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/events\/\d+$/);
  const id = page.url().split("/").pop();

  // Validation: an end before the start is caught before saving.
  await page.getByLabel("Starts").fill("2026-12-03T10:00");
  await page.getByLabel("Ends").fill("2026-12-03T09:00");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("The end must be after the start.")).toBeVisible();

  await page.getByLabel("Ends").fill("2026-12-03T16:00");
  await page.getByLabel("Location").fill("Eko Hotel, Lagos");
  await page.getByLabel("Description").fill("Line one of the description.\nLine two.");

  // Wrong file type and oversized file are rejected before upload.
  await uploadInto(page, Buffer.from("not an image"), "notes.txt", "text/plain");
  await expect(page.getByRole("alert").filter({ hasText: "isn't a supported image" })).toBeVisible();
  await uploadInto(page, Buffer.alloc(11 * 1024 * 1024, 1), "huge.png");
  await expect(page.getByRole("alert").filter({ hasText: "the limit is 10 MB" })).toBeVisible();

  await uploadInto(page, PNG);
  await expect(page.getByAltText("Current cover image")).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved. It isn't on the website yet.")).toBeVisible();

  // Persisted, with the local time round-tripping exactly.
  let ev = await (await request.get(`${BASE}/api/events/${id}`, { headers: auth() })).json();
  expect(ev.location).toBe("Eko Hotel, Lagos");
  expect(ev.cover_image_url).toMatch(/^\/api\/files\/uploads\/[0-9a-f]{32}\.png$/);
  expect((await request.get(`${BASE}${ev.cover_image_url}`)).status()).toBe(200);
  await page.reload();
  await expect(page.getByLabel("Starts")).toHaveValue("2026-12-03T10:00");

  // Preview: staff see the draft on the real public page; visitors don't.
  const [preview] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Preview" }).first().click()]);
  await expect(preview.getByText("Draft preview.")).toBeVisible();
  await expect(preview.getByRole("heading", { name: title })).toBeVisible();
  await expect(preview.getByText("The registration form appears here once the event is published.")).toBeVisible();
  await expect(preview.locator("main img")).toBeVisible();
  await preview.close();
  const visitor = await browser.newPage({ userAgent: UA });
  await visitor.goto(`${BASE}/events/${ev.slug}?preview`);
  await expect(visitor.getByText("Event not found")).toBeVisible();

  // Publish → public.
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published — the event is on the website.")).toBeVisible();
  await visitor.goto(`${BASE}/events`);
  await expect(visitor.getByRole("heading", { name: title })).toBeVisible();
  await visitor.goto(`${BASE}/events/${ev.slug}`);
  await expect(visitor.getByRole("button", { name: "Register" })).toBeVisible();
  // Shown at the local time it was entered — not shifted by the UTC offset.
  await expect(visitor.getByText(/Thursday, (December 3, 2026|3 December 2026) at 10:00/)).toBeVisible();

  // Edit one field; the image is kept.
  await page.getByLabel("Capacity").fill("50");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved — the live page is updated.")).toBeVisible();
  const after = await (await request.get(`${BASE}/api/events/${id}`, { headers: auth() })).json();
  expect(after.capacity).toBe(50);
  expect(after.cover_image_url).toBe(ev.cover_image_url);

  // Unpublish and delete from the list, which shows the thumbnail.
  await page.goto(`${BASE}/admin/events`);
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row.locator("img")).toBeVisible();
  await row.getByRole("button", { name: `More actions for ${title}` }).click();
  await page.getByRole("menuitem", { name: "Unpublish" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Unpublish" }).click();
  await expect(row.getByText("Draft").filter({ visible: true })).toBeVisible();
  await visitor.goto(`${BASE}/events/${ev.slug}`);
  await expect(visitor.getByText("Event not found")).toBeVisible();

  await row.getByRole("button", { name: `More actions for ${title}` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("dialog").getByText(`Delete “${title}”?`)).toBeVisible();
  await page.getByRole("button", { name: "Delete event" }).click();
  await expect(page.getByText("Event deleted.")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);
  expect((await request.get(`${BASE}/api/events/${id}`, { headers: auth() })).status()).toBe(404);

  await visitor.close();
  await cleanupUploads(request, since);
  expect(problems.filter((p) => !/404/.test(p))).toEqual([]);
});

test("news: create, write, upload, preview, publish, edit live, legacy image address, delete", async ({ page, request, browser }) => {
  const problems = watch(page);
  const since = await lastAssetId(request);
  await signIn(page);
  const title = `E2E Market Update ${tag()}`;

  await page.goto(`${BASE}/admin/news`);
  await page.getByRole("button", { name: "New article" }).first().click();
  await page.getByLabel("Article title").fill(title);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/news\/\d+$/);
  const id = page.url().split("/").pop();

  await page.getByLabel("Summary").fill("Prices eased across the pool this week.");
  await page.getByLabel("Body").fill("First paragraph of the article.\nSecond paragraph of the article.");
  await uploadInto(page, PNG, "chart.png");
  await expect(page.getByAltText("Current cover image")).toBeVisible();

  // Preview saves first, then shows the draft in the public article layout.
  const [preview] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Preview" }).first().click()]);
  await expect(preview.getByText("Draft preview.")).toBeVisible();
  await expect(preview.getByRole("heading", { name: title })).toBeVisible();
  await expect(preview.getByText("Second paragraph of the article.")).toBeVisible();
  await preview.close();
  const post = await (await request.get(`${BASE}/api/news/${id}`, { headers: auth() })).json();
  expect(post.body).toContain("Second paragraph");

  const visitor = await browser.newPage({ userAgent: UA });
  await visitor.goto(`${BASE}/news/${post.slug}?preview`);
  await expect(visitor.getByText("Post not found")).toBeVisible();
  expect((await request.get(`${BASE}/api/news/preview/${post.slug}`)).status()).toBe(401);

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published — the article is on the website.")).toBeVisible();
  await visitor.goto(`${BASE}/news`);
  const card = visitor.getByRole("link").filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toBeVisible();

  // Edit the live article.
  await page.getByLabel("Summary").fill("Updated summary.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved — the live article is updated.")).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByText("Updated summary.")).toBeVisible();

  // An older-style image address still works.
  await page.getByRole("button", { name: "Remove" }).click();
  await page.getByRole("button", { name: "Use an image address instead" }).click();
  await page.getByLabel("Cover image address").fill(`${BASE}/api/files/${post.cover_image_url.replace("/api/files/", "")}`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved — the live article is updated.")).toBeVisible();
  await expect(page.getByAltText("Current cover image")).toBeVisible();

  // Stale edit: someone else saves first.
  const fresh = await (await request.get(`${BASE}/api/news/${id}`, { headers: auth() })).json();
  await request.put(`${BASE}/api/news/${id}`, { headers: auth(), data: { summary: "Changed elsewhere" } });
  await page.getByLabel("Summary").fill("My change");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Someone else changed this article")).toBeVisible();
  expect((await (await request.get(`${BASE}/api/news/${id}`, { headers: auth() })).json()).summary).toBe("Changed elsewhere");
  expect(fresh.id).toBe(post.id);

  await page.getByRole("button", { name: "Reload" }).click();
  await page.getByRole("button", { name: "Delete article" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete article" }).click();
  await expect(page).toHaveURL(/\/admin\/news$/);
  await visitor.goto(`${BASE}/news/${post.slug}`);
  await expect(visitor.getByText("Post not found")).toBeVisible();

  await visitor.close();
  await cleanupUploads(request, since);
  expect(problems.filter((p) => !/404|409/.test(p))).toEqual([]);
});

test("newsletter: draft with image, preview without sending, edit, subscribers search/unsubscribe/delete", async ({ page, request }) => {
  const problems = watch(page);
  const since = await lastAssetId(request);
  await signIn(page);
  const subject = `E2E Campaign ${tag()}`;
  const email = `e2e-${tag()}@example.com`;
  const sub = await (await request.post(`${BASE}/api/newsletter/subscribe`, { data: { email } })).json();

  await page.goto(`${BASE}/admin/newsletter`);
  await expect(page.getByText("Email sending isn't set up on this server")).toBeVisible(); // local SMTP is empty
  await page.getByRole("button", { name: "New campaign" }).first().click();
  await page.getByLabel("Subject line").fill(subject);
  await page.getByLabel("Message").fill("Hello subscribers.\nSecond line.");
  await uploadInto(page, PNG, "header.png");
  await expect(page.getByAltText("Current header image")).toBeVisible();
  await page.getByRole("button", { name: "Save and preview" }).click();

  const dialog = page.getByRole("dialog", { name: "Email preview" });
  await expect(dialog.getByText(subject).first()).toBeVisible();
  const frame = page.frameLocator('iframe[title="Email preview"]');
  await expect(frame.getByText("Second line.")).toBeVisible();
  await expect(frame.locator("img").first()).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Send to/ })).toHaveCount(0); // can't send without SMTP
  await dialog.getByRole("button", { name: "Edit" }).click();

  await page.getByLabel("Subject line").fill(`${subject} (edited)`);
  await page.getByRole("button", { name: "Save draft" }).click();
  const item = page.getByRole("listitem").filter({ hasText: `${subject} (edited)` });
  await expect(item.getByText("Draft")).toBeVisible();
  await expect(item.getByRole("button", { name: "Send" })).toBeDisabled();
  const campaigns = await (await request.get(`${BASE}/api/newsletter/campaigns`, { headers: auth() })).json();
  const c = campaigns.find((x) => x.subject === `${subject} (edited)`);
  expect(c.status).toBe("draft");
  expect(c.sent_count).toBe(0);
  expect(c.image_url).toMatch(/^\/api\/files\//);

  await item.getByRole("button", { name: `More actions for ${subject} (edited)` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Campaign deleted.")).toBeVisible();

  // Subscribers.
  await page.getByRole("tab", { name: /Subscribers/ }).click();
  await page.getByPlaceholder("Search by email or name…").fill(email);
  const subRow = page.getByRole("row").filter({ hasText: email });
  await expect(subRow.getByText("Subscribed")).toBeVisible();
  await subRow.getByRole("button", { name: `Actions for ${email}` }).click();
  await page.getByRole("menuitem", { name: "Unsubscribe" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Unsubscribe" }).click();
  await expect(subRow.getByText("Unsubscribed")).toBeVisible();
  await subRow.getByRole("button", { name: `Actions for ${email}` }).click();
  await page.getByRole("menuitem", { name: "Delete permanently" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByRole("row").filter({ hasText: email })).toHaveCount(0);
  const left = await (await request.get(`${BASE}/api/newsletter/subscribers`, { headers: auth() })).json();
  expect(left.some((s) => s.id === sub.id)).toBe(false);

  await cleanupUploads(request, since);
  expect(problems).toEqual([]);
});

test("help centre: navigation, search, walkthrough, links to real screens, mobile", async ({ page, browser }) => {
  const problems = watch(page);
  await signIn(page);
  await page.goto(`${BASE}/admin/events`);
  await page.getByRole("link", { name: "Help", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/help\/events$/);
  await expect(page.getByRole("heading", { name: "Events", level: 2 })).toBeVisible();

  // Walkthrough: one step at a time.
  await expect(page.getByText("Step 1 of 7")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Step 2 of 7")).toBeVisible();
  await page.getByRole("button", { name: "Show all steps" }).click();
  await expect(page.getByText("Follow sign-ups")).toBeVisible();

  // Common problems expand.
  await page.getByText("“The event can't end before it starts”").click();
  await expect(page.getByText("Check the Ends date and time.")).toBeVisible();

  // Sidebar nav from the menu, search, and a link into a real screen.
  await page.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Help & guides" }).click();
  await expect(page.getByText("New here? Start with these")).toBeVisible();
  await page.getByPlaceholder("Search the guides…").fill("payment");
  await expect(page.getByText(/guides? mention “payment”/)).toBeVisible();
  await page.getByRole("link", { name: "Invoices · Vendor platform" }).click();
  await expect(page).toHaveURL(/\/admin\/help\/invoices$/);
  await page.getByRole("link", { name: "Open Invoices" }).click();
  await expect(page).toHaveURL(/\/admin\/invoices$/);

  await page.goto(`${BASE}/admin/help?q=zzzznothing`);
  await expect(page.getByText("No guides match")).toBeVisible();

  // Mobile.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent: UA });
  await phone.addInitScript((t) => window === window.top && localStorage.setItem("onction_admin_token", t), token);
  await phone.goto(`${BASE}/admin/help`);
  await phone.getByRole("button", { name: "Browse all guides" }).click();
  await phone.getByRole("navigation", { name: "Guides" }).getByRole("link", { name: "Newsletter" }).click();
  await expect(phone.getByRole("heading", { name: "Newsletter", level: 2 })).toBeVisible();
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await phone.close();
  expect(problems).toEqual([]);
});

test("viewers see the screens but can't change anything", async ({ page, request }) => {
  const email = `e2e-viewer-${tag()}@example.com`;
  const created = await request.post(`${BASE}/api/admin/users`, { headers: auth(), data: { email, full_name: "E2E Viewer", password: "viewer-pass-123", role: "Viewer" } });
  expect(created.ok(), await created.text()).toBeTruthy();
  const viewerId = (await created.json()).id;
  const vt = (await (await request.post(`${BASE}/api/auth/login`, { data: { email, password: "viewer-pass-123" } })).json()).access_token;
  try {
    await page.addInitScript((t) => window === window.top && localStorage.setItem("onction_admin_token", t), vt);
    await page.goto(`${BASE}/admin/events`);
    await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New event" })).toHaveCount(0);
    await page.goto(`${BASE}/admin/newsletter`);
    await expect(page.getByRole("button", { name: "New campaign" })).toHaveCount(0);
    const h = { Authorization: `Bearer ${vt}` };
    expect((await request.post(`${BASE}/api/news`, { headers: h, data: { slug: "x-viewer", title: "x" } })).status()).toBe(403);
    expect((await request.post(`${BASE}/api/media`, { headers: h, multipart: { file: { name: "a.png", mimeType: "image/png", buffer: PNG } } })).status()).toBe(403);
  } finally {
    await request.delete(`${BASE}/api/admin/users/${viewerId}`, { headers: auth() });
  }
});

test("server rejects a file whose contents don't match its type", async ({ request }) => {
  const r = await request.post(`${BASE}/api/media`, { headers: auth(), multipart: { file: { name: "fake.jpg", mimeType: "image/jpeg", buffer: Buffer.from("MZ this is not a jpeg") } } });
  expect(r.status()).toBe(415);
});
