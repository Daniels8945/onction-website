// End-to-end: the public site's tracking and the Analytics dashboard, against
// a throwaway backend (see tests/cms.spec.js for how to run one). Real browser
// visits generate the data; the dashboard must show exactly what the API says.
//
//   BASE=http://localhost:4173 npx playwright test tests/analytics.spec.js --project=gpu --workers=1
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:4173";
const PASSWORD = process.env.E2E_PASSWORD || "e2e-password-123";
const today = () => new Date(Date.now() + 3600_000).toISOString().slice(0, 10); // WAT

async function token(request, email = "e2e-viewer@example.com") {
  const r = await request.post(`${BASE}/api/auth/login`, { data: { email, password: PASSWORD } });
  return (await r.json()).access_token;
}
async function report(request, extra = "") {
  const t = await token(request);
  const r = await request.get(`${BASE}/api/analytics/report?start=${today()}&end=${today()}&host=localhost${extra}`, { headers: { Authorization: `Bearer ${t}` } });
  expect(r.ok()).toBeTruthy();
  return r.json();
}
// A fresh browser that has accepted analytics. Headless browsers announce
// themselves ("HeadlessChrome") and the server drops them as automated
// traffic, so test visitors present an ordinary desktop Chrome identity.
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
async function visitor(browser, opts = {}) {
  const ctx = await browser.newContext({ userAgent: CHROME, ...opts });
  await ctx.addInitScript(() => localStorage.setItem("onction:consent", JSON.stringify({ analytics: true, at: Date.now() })));
  return ctx;
}
const settle = (page) => page.waitForTimeout(700);

test.describe.configure({ mode: "serial" });

test("a consenting visit is recorded as one session with engagement time", async ({ browser, request }) => {
  const before = (await report(request)).summary;
  const ctx = await visitor(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.mouse.move(200, 200);
  await page.waitForTimeout(2500);
  await page.mouse.move(300, 300);
  await page.goto(`${BASE}/solutions`); // full navigation also flushes engagement
  await settle(page);
  await page.evaluate(() => document.querySelector('a[href="/about"]')?.click());
  await settle(page);
  await ctx.close(); // pagehide flushes the last page
  await new Promise((r) => setTimeout(r, 500));
  const after = await report(request);
  expect(after.summary.pageviews - before.pageviews).toBeGreaterThanOrEqual(3);
  expect(after.summary.visitors - before.visitors).toBe(1);
  expect(after.summary.sessions - before.sessions).toBe(1); // one visit, not one per tab or page
  const home = after.pages.find((p) => p.path === "/");
  expect(home.avg_engagement_s).toBeGreaterThan(1); // visible time was measured
  expect(home.avg_engagement_s).toBeLessThan(60); // and not the gap to the next event
});

test("no tracking without consent, for staff, or on previews", async ({ browser, request }) => {
  const before = (await report(request)).summary.pageviews;
  const anon = await browser.newContext({ userAgent: CHROME }); // never answered the banner
  await (await anon.newPage()).goto(`${BASE}/about`);
  const staff = await visitor(browser);
  const t = await token(request);
  await staff.addInitScript((tk) => localStorage.setItem("onction_admin_token", tk), t);
  await (await staff.newPage()).goto(`${BASE}/market`);
  const preview = await visitor(browser);
  await (await preview.newPage()).goto(`${BASE}/partners?preview`);
  await new Promise((r) => setTimeout(r, 1200));
  await Promise.all([anon.close(), staff.close(), preview.close()]);
  expect((await report(request)).summary.pageviews).toBe(before);
});

const CAMPAIGN = `e2e-campaign-${Date.now()}`; // unique per run: the test database keeps earlier runs

test("campaign tags attribute the whole visit; enquiries link to it once", async ({ browser, request }) => {
  const ctx = await visitor(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?utm_source=linkedin&utm_medium=social&utm_campaign=${CAMPAIGN}`);
  await settle(page);
  await page.goto(`${BASE}/contact`); // later pages don't carry the tags
  const form = page.locator("#enquire");
  await form.scrollIntoViewIfNeeded();
  await page.getByLabel(/Full name/).fill("E2E Analytics");
  await page.getByLabel(/Email address/).fill("e2e-analytics@example.com");
  await page.getByLabel(/^Phone/).fill("+2348000000001");
  await page.getByLabel(/your message/i).fill("Testing analytics attribution.");
  await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByText("Your details have been captured")).toBeVisible();
  await settle(page);
  await ctx.close();

  const d = await report(request);
  const camp = d.campaigns.find((c) => c.campaign === CAMPAIGN);
  expect(camp).toBeTruthy();
  expect(camp.sessions).toBe(1);
  expect(camp.conversions).toBe(1);
  expect(camp.medium).toBe("social");
  expect(d.channels.find((c) => c.channel === "Organic social").conversions).toBeGreaterThanOrEqual(1);
  const landing = d.conversions.by_landing.find((r) => r.path === "/");
  expect(landing.conversions).toBeGreaterThanOrEqual(1);
  const [view, start, done] = d.conversions.funnel.enquiry;
  expect(view.sessions).toBeGreaterThanOrEqual(1);
  expect(start.sessions).toBeGreaterThanOrEqual(1);
  expect(done.sessions).toBeGreaterThanOrEqual(1);
  // the server's record, not the click: one enquiry
  const enquiriesNow = d.summary.enquiries;
  expect(enquiriesNow).toBeGreaterThanOrEqual(1);
});

test("the dashboard shows the API's numbers and reacts to the period", async ({ page, request }) => {
  const d = await report(request);
  await page.addInitScript((tk) => localStorage.setItem("onction_admin_token", tk), await token(request));
  await page.goto(`${BASE}/admin`);
  const traffic = page.getByRole("region", { name: "Traffic" });
  await expect(traffic.getByText("Sessions", { exact: true })).toBeVisible();
  // last 30 days includes today, so today's sessions are a lower bound
  const sessions = Number((await traffic.locator("span.font-syne").first().textContent()).replace(/,/g, ""));
  expect(sessions).toBeGreaterThanOrEqual(d.summary.sessions);

  const reqs = [];
  page.on("request", (r) => r.url().includes("/api/analytics/report") && reqs.push(r.url()));
  await page.getByRole("button", { name: "Last 7 days" }).click();
  await expect.poll(() => reqs.length).toBeGreaterThan(0);
  const u = new URL(reqs.at(-1));
  const days = (new Date(u.searchParams.get("end")) - new Date(u.searchParams.get("start"))) / 86400000 + 1;
  expect(days).toBe(7);

  await page.getByRole("tab", { name: "Acquisition" }).click();
  await expect(page.getByText(CAMPAIGN)).toBeVisible();
  await page.getByRole("tab", { name: /Data health/ }).click();
  await expect(page.getByText("Tracking health")).toBeVisible();
  await expect(page.getByText("Dashboard & preview traffic excluded")).toBeVisible();

  // CSV export uses the same filters
  await page.getByRole("tab", { name: "Content" }).click();
  await page.getByRole("button", { name: "Export CSV" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Pages" }).click()]);
  const csv = await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c).toString());
  expect(csv).toContain("path,pageviews,visitors");
  expect(csv).toContain("host=localhost");
  expect(csv).not.toMatch(/e2e-analytics@example\.com/);
});

test("a failed report shows an error, not zeros", async ({ page, request }) => {
  await page.addInitScript((tk) => localStorage.setItem("onction_admin_token", tk), await token(request));
  await page.route("**/api/analytics/report**", (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"detail":"Database unavailable"}' }));
  await page.goto(`${BASE}/admin`);
  await expect(page.getByText("The report couldn't be loaded")).toBeVisible();
  await expect(page.getByRole("region", { name: "Traffic" })).toHaveCount(0);
  await page.unroute("**/api/analytics/report**");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("region", { name: "Traffic" })).toBeVisible();
});

test("the dashboard fits a phone screen", async ({ browser, request }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript((tk) => localStorage.setItem("onction_admin_token", tk), await token(request));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin`);
  await expect(page.getByRole("region", { name: "Traffic" })).toBeVisible();
  for (const tab of ["Overview", "Content", "Acquisition"]) {
    await page.getByRole("tab", { name: new RegExp(tab) }).click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
  // definitions open by tap, not hover
  await page.getByRole("tab", { name: "Overview" }).click();
  await page.getByRole("button", { name: "What sessions means" }).tap();
  await expect(page.getByRole("tooltip")).toContainText("30 minutes");
  await ctx.close();
});
