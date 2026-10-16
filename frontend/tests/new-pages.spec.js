// End-to-end checks for /leadership, /media and the partner ecosystem on
// /partners, against a production build:
//
//   npm run build && npx vite preview --port 4173 &
//   BASE=http://localhost:4173 npx playwright test tests/new-pages.spec.js --project=gpu
//
// "?preview" shows the unverified placeholder content (lib/contentStatus.js);
// without it, the public site must never show a draft.
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:4173";
const PAGES = ["/leadership", "/media", "/partners"];

function watch(page) {
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/status of (404|500|502)/.test(m.text()) && problems.push(`console: ${m.text()}`));
  page.on("response", (r) => r.status() >= 400 && !r.url().includes("/api/") && problems.push(`HTTP ${r.status()}: ${r.url()}`));
  return problems;
}

test.describe("public (no preview)", () => {
  for (const path of PAGES) {
    test(`${path} shows no drafts`, async ({ page }) => {
      const problems = watch(page);
      await page.goto(BASE + path, { waitUntil: "load" });
      await page.locator("main h1").first().waitFor(); // rendered, so the checks below mean something
      await expect(page.locator("text=Draft").first()).toHaveCount(0);
      await expect(page.getByRole("note")).toHaveCount(0);
      expect(problems).toEqual([]);
    });
  }

  test("leadership: honest empty state, no nav link until verified", async ({ page }) => {
    await page.goto(BASE + "/leadership", { waitUntil: "load" });
    await expect(page.getByText("Profiles of our Board and leadership team are being prepared.")).toBeVisible();
    await page.goto(BASE + "/sitemap", { waitUntil: "load" });
    await expect(page.locator('main a[href="/leadership"]')).toHaveCount(0);
  });

  test("partners: ecosystem shown, directory hidden while empty", async ({ page }) => {
    await page.goto(BASE + "/partners", { waitUntil: "load" });
    await expect(page.locator("#ecosystem")).toBeVisible();
    await expect(page.locator("#directory")).toHaveCount(0);
    await expect(page.locator("#who")).toBeVisible(); // approved section untouched
  });
});

test.describe("preview", () => {
  test("leadership hierarchy and profile dialog", async ({ page }) => {
    const problems = watch(page);
    await page.goto(BASE + "/leadership?preview", { waitUntil: "load" });
    await page.locator("#management").waitFor(); // page chunks load lazily
    const order = await page.$$eval("main section[id]", (els) => els.map((e) => e.id));
    expect(order).toEqual(["chairman", "board", "executive", "management"]);

    const opener = page.getByRole("button", { name: /View profile/ }).first();
    await opener.click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("1 / ").or(dialog.getByText("2 / "))).toBeVisible();
    const first = await dialog.locator("h3").textContent();
    await dialog.getByRole("button", { name: "Next profile" }).click();
    await expect(dialog.locator(".eyebrow")).not.toHaveText("");
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(first).toBeTruthy();
    expect(problems).toEqual([]);
  });

  test("leadership profile deep link", async ({ page }) => {
    await page.goto(BASE + "/leadership?preview#head-finance", { waitUntil: "load" });
    await expect(page.locator("dialog[open]")).toContainText("Head of Finance");
  });

  test("media: filters, lightbox, keyboard", async ({ page }) => {
    const problems = watch(page);
    await page.goto(BASE + "/media?preview", { waitUntil: "load" });
    const tiles = page.locator("#gallery ul > li");
    await tiles.first().waitFor(); // page chunks load lazily
    const all = await tiles.count();
    expect(all).toBeGreaterThan(4);
    await page.locator("#gallery").getByRole("button", { name: /^Videos/ }).click();
    await expect(tiles).toHaveCount(2);
    await page.locator("#gallery").getByRole("button", { name: /^All/ }).click();
    await expect(tiles).toHaveCount(all);

    await tiles.first().getByRole("button").click();
    const viewer = page.locator("dialog[open]");
    await expect(viewer).toContainText(`1 / ${all}`);
    await page.keyboard.press("ArrowRight");
    await expect(viewer).toContainText(`2 / ${all}`);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(viewer).toContainText(`${all} / ${all}`);
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test("partners: choosing a role filters the directory", async ({ page }) => {
    await page.goto(BASE + "/partners?preview", { waitUntil: "load" });
    const cards = page.locator("#directory li, #directory article");
    await cards.first().waitFor(); // page chunks load lazily
    const all = await cards.count();
    await page.locator("#ecosystem li button", { hasText: "Finance" }).click();
    await expect(page.locator('#ecosystem [aria-live="polite"] h3')).toHaveText("Finance");
    const finance = await cards.count();
    expect(finance).toBeGreaterThan(0);
    expect(finance).toBeLessThan(all);
    // the same role, chosen from the map with the keyboard, toggles it off
    await page.locator('#ecosystem g[role="button"][aria-pressed="true"]').focus();
    await page.keyboard.press("Enter");
    await expect(cards).toHaveCount(all);
  });

  test("phones: no horizontal overflow", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    for (const path of PAGES) {
      await page.goto(BASE + path + "?preview", { waitUntil: "load" });
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBe(0);
    }
    await ctx.close();
  });

  test("reduced motion: everything visible without scrolling animations", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    for (const path of PAGES) {
      await page.goto(BASE + path + "?preview", { waitUntil: "load" });
      const hidden = await page.$$eval(".rv, .ir", (els) => els.filter((e) => e.offsetHeight && parseFloat(getComputedStyle(e).opacity) < 0.99).length);
      expect(hidden, path).toBe(0);
    }
    await ctx.close();
  });
});
