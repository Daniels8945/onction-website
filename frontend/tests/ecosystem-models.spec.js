// End-to-end checks for the EcosystemStory miniature infrastructure models.
//
//   BASE=http://localhost:5173 BASELINE=http://localhost:8080 npx playwright test
//
// BASE is the build under test. BASELINE (optional) is a build from before the
// models were added; when set, section geometry is compared against it to
// prove the layout of this and every other section is unchanged.
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:5173";
const BASELINE = process.env.BASELINE;
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};

async function open(page, url, mode = "night") {
  const problems = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`failed: ${r.url()}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));
  await page.addInitScript((m) => localStorage.setItem("onction:scene", m), mode);
  const glb = page.waitForResponse((r) => r.url().endsWith("/models/eco-infrastructure.glb"), { timeout: 20000 }).catch(() => null);
  await page.goto(url, { waitUntil: "networkidle" });
  return { problems, glb };
}

async function enterSection(page) {
  // Centre the map so screenshot clips stay inside the viewport.
  await page.$eval("#ecosystem .relative.mt-10 > div", (el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(6500); // full staged entrance (last stage ~4.6s) + model rise
}

// Geometry of every <section> on the page, in document coordinates.
async function sectionBoxes(page) {
  return page.$$eval("main section, body > div section", (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.id || el.className.slice(0, 40), top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width) };
    }),
  );
}

// Freeze SVG SMIL + CSS loops so two screenshots differ only by what we toggle.
async function freeze(page) {
  await page.evaluate(() => {
    document.querySelectorAll("#ecosystem svg").forEach((s) => s.pauseAnimations?.());
    document.querySelector("#ecosystem").classList.add("eco-paused");
  });
}

// Fraction of differing pixels between two PNG screenshots inside each box.
async function diffInBoxes(page, a, b, boxes, dpr) {
  return page.evaluate(
    async ({ a, b, boxes, dpr }) => {
      const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const px = (img) => {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const da = px(ia), db = px(ib), W = ia.width;
      return boxes.map(({ x, y, w, h }) => {
        let diff = 0, n = 0;
        for (let yy = Math.round(y * dpr); yy < Math.round((y + h) * dpr); yy++) {
          for (let xx = Math.round(x * dpr); xx < Math.round((x + w) * dpr); xx++) {
            if (xx < 0 || yy < 0 || xx >= W || yy >= ia.height) continue;
            const k = (yy * W + xx) * 4;
            n++;
            if (Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]) > 30) diff++;
          }
        }
        return n ? diff / n : 0;
      });
    },
    { a: `data:image/png;base64,${a.toString("base64")}`, b: `data:image/png;base64,${b.toString("base64")}`, boxes, dpr },
  );
}

// Screen position of every model's base, from the data attributes on its hit area.
async function nodePoints(page) {
  return page.evaluate(() => {
    const svg = document.querySelector("#ecosystem canvas.eco-models + svg");
    const ctm = svg.getScreenCTM();
    const pts = [...svg.querySelectorAll("[data-model]")].map((c) => {
      const p = svg.createSVGPoint();
      p.x = +c.dataset.x; p.y = +c.dataset.y;
      const sp = p.matrixTransform(ctm);
      const [prefix, i] = c.dataset.model.split(":");
      const kind = prefix.replace(/^w/, "");
      return { id: c.dataset.model, kind, regional: prefix.startsWith("w"), i: +i, x: sp.x, y: sp.y };
    });
    return { pts, scale: ctm.a };
  });
}

for (const [name, vp] of Object.entries(VIEWPORTS)) {
  test.describe(`${name} ${vp.width}×${vp.height}`, () => {
    test.use({ viewport: vp, deviceScaleFactor: 2 });

    test("models load, align with nodes, and nothing else changes", async ({ page }) => {
      const { problems, glb } = await open(page, BASE);
      await enterSection(page);

      // 1 & 4: section renders, models loaded (the GLB answered 200 and the section switched over)
      await expect(page.locator("#ecosystem")).toBeVisible();
      const glbRes = await glb;
      expect(glbRes, "GLB requested").not.toBeNull();
      expect(glbRes.status()).toBe(200);
      await expect(page.locator("#ecosystem .eco-modeled")).toHaveCount(1);
      await expect(page.locator("#ecosystem canvas.eco-models")).toHaveCount(1);

      // 3: connecting lines drawn and particles still moving
      const dash = await page.$$eval("#ecosystem .eco-in-line, #ecosystem .eco-out-line, #ecosystem .eco-mesh-line", (els) => els.map((e) => parseFloat(getComputedStyle(e).strokeDashoffset)));
      expect(dash.length).toBeGreaterThan(20);
      expect(Math.max(...dash.map(Math.abs))).toBeLessThan(0.01);
      const particle = async () => page.$eval("#ecosystem .eco-p-in", (c) => { const b = c.getBoundingClientRect(); return [b.x, b.y]; });
      const p0 = await particle();
      await page.waitForTimeout(400);
      expect(await particle()).not.toEqual(p0);

      // 5–7: a model is drawn at every node (canvas on vs off), and nowhere else
      await freeze(page);
      const comp = await page.locator("#ecosystem .relative.mt-10 > div").first().boundingBox();
      const shot = () => page.screenshot({ clip: comp });
      const on = await shot();
      await page.$eval("#ecosystem canvas.eco-models", (c) => (c.style.visibility = "hidden"));
      const off = await shot();
      await page.$eval("#ecosystem canvas.eco-models", (c) => (c.style.visibility = ""));
      const { pts } = await nodePoints(page);
      const kinds = new Set(pts.map((p) => p.kind));
      expect([...kinds].sort()).toEqual(["demand", "gen", "tower"]);
      expect(pts.filter((p) => p.regional).map((p) => p.kind).sort().filter((k, i, a) => a.indexOf(k) === i)).toEqual(["demand", "gen", "tower"]);
      // Skip points hidden under the explore card overlay (desktop/tablet), as the original dots were.
      const card = await page.locator("#ecosystem .relative.mt-10 > div > .absolute.left-4.top-4").boundingBox();
      const underCard = (p) => card && card.width > 0 && p.x > card.x - 20 && p.x < card.x + card.width + 20 && p.y > card.y - 30 && p.y < card.y + card.height + 20;
      const visiblePts = pts.filter((p) => !underCard(p) && p.x > comp.x + 10 && p.x < comp.x + comp.width - 10 && p.y > comp.y + 10 && p.y < comp.y + comp.height - 10);
      const boxes = visiblePts.map((p) => ({ x: p.x - comp.x - 8, y: p.y - comp.y - (p.kind === "tower" ? 26 : 12), w: 16, h: p.kind === "tower" ? 26 : 14 }));
      const atNodes = await diffInBoxes(page, on, off, boxes, 2);
      const missing = visiblePts.filter((_, k) => atNodes[k] < 0.08).map((p) => p.id);
      expect(missing, "nodes with no model drawn over them").toEqual([]);
      // away from every model (open sea, far corners) the canvas must draw nothing
      const clear = (b) => pts.every((p) => p.x - comp.x < b.x - 30 || p.x - comp.x > b.x + b.w + 30 || p.y - comp.y < b.y - 30 || p.y - comp.y > b.y + b.h + 50);
      const candidates = [];
      for (let y = 0; y + 30 <= comp.height; y += 20) for (let x = 0; x + 60 <= comp.width; x += 30) candidates.push({ x, y, w: 60, h: 30 });
      const emptyBoxes = candidates.filter(clear).slice(0, 40);
      expect(emptyBoxes.length).toBeGreaterThan(0);
      const empty = Math.max(...(await diffInBoxes(page, on, off, emptyBoxes, 2)));
      expect(empty).toBeLessThan(0.002);

      // 11 & 12: no console errors, failed requests or HTTP errors
      expect(problems).toEqual([]);

      // 13 & 14: no horizontal overflow at this width
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);

      await page.screenshot({ path: `test-results/eco-${name}.png`, clip: comp });
    });

    test("hover lifts the model, names it, and shifts nothing", async ({ page }) => {
      const { problems } = await open(page, BASE);
      await enterSection(page);
      const { pts } = await nodePoints(page);
      const comp = await page.locator("#ecosystem .relative.mt-10 > div").first().boundingBox();
      const inside = (p) => p.x > comp.x + 40 && p.x < comp.x + comp.width - 40 && p.y > comp.y + 60 && p.y < comp.y + comp.height - 20;

      for (const [kind, label, card] of [
        ["tower", "330kV transmission line", "330kV transmission line"],
        ["gen", "Power station", "Power producers"],
        ["demand", "Transmission substation", "Utilities & large consumers"],
      ]) {
        const p = pts.find((q) => q.kind === kind && !q.regional && inside(q));
        expect(p, `a visible ${kind} model`).toBeTruthy();
        const mapBox = () => page.locator("#ecosystem .relative.mt-10 > div").first().boundingBox();
        const before = { doc: await page.evaluate(() => document.documentElement.scrollHeight), map: await mapBox() };
        await page.mouse.move(comp.x + 5, comp.y + comp.height - 5);
        await page.waitForTimeout(350);
        await freeze(page);
        const area = { x: p.x - 40, y: p.y - 70, width: 80, height: 90 };
        const idle = await page.screenshot({ clip: area });
        const target = { x: p.x, y: p.y - (kind === "tower" ? 18 : 6) };
        await page.mouse.move(target.x, target.y);
        await page.waitForTimeout(450); // 260ms hover ease
        // 8: name label + explore card + visual response
        await expect(page.locator("#ecosystem .eco-model-label")).toHaveText(label);
        await expect(page.locator("#ecosystem .eco-card-title").first()).toHaveText(card);
        const hot = await page.screenshot({ clip: area });
        const [changed] = await diffInBoxes(page, idle, hot, [{ x: 0, y: 0, w: 80, h: 90 }], 2);
        expect(changed, `${kind} hover changes the model`).toBeGreaterThan(0.03);
        // 9: no layout shift. (On phones the explore card sits below the map and
        // resizes with its text — the original build does the same — so page
        // height is only checked where the card overlays the map.)
        expect(await mapBox()).toEqual(before.map);
        if (vp.width >= 768) expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(before.doc);
        await page.screenshot({ path: `test-results/eco-${name}-hover-${kind}.png`, clip: { x: p.x - 120, y: p.y - 110, width: 240, height: 150 } });
        await page.evaluate(() => document.querySelector("#ecosystem").classList.remove("eco-paused"));
      }
      // WAPP region: same models, regional card, interconnector label
      if (vp.width >= 1024) {
        for (const [kind, label] of [["tower", "WAPP interconnector"], ["demand", "Transmission substation"], ["gen", "Power station"]]) {
          const p = pts.find((q) => q.kind === kind && q.regional && inside(q));
          expect(p, `a visible regional ${kind}`).toBeTruthy();
          await page.mouse.move(p.x, p.y - (kind === "tower" ? 15 : 5));
          await page.waitForTimeout(400);
          await expect(page.locator("#ecosystem .eco-model-label")).toHaveText(label);
          await expect(page.locator("#ecosystem .eco-card-title").first()).toHaveText("West African Power Pool");
        }
      }
      await page.mouse.move(2, 2);
      await page.waitForTimeout(400);
      await expect(page.locator("#ecosystem .eco-model-label")).toHaveCount(0);
      expect(problems).toEqual([]);
    });

    test("animation stays smooth during entrance and hover", async ({ browser }) => {
      // Frame times through the entrance + a hover. Headless Chromium renders on
      // the CPU, so absolute numbers are pessimistic; with BASELINE set, the
      // same run on the pre-change build is the yardstick.
      const sample = async (url) => {
        const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
        const page = await ctx.newPage();
        const { problems } = await open(page, url);
        await page.evaluate(() => {
          window.__frames = [];
          let last = performance.now();
          const loop = (t) => { window.__frames.push(t - last); last = t; requestAnimationFrame(loop); };
          requestAnimationFrame(loop);
        });
        await enterSection(page);
        const box = await page.locator("#ecosystem .eco-gen > g").first().boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await page.waitForTimeout(600);
        const frames = await page.evaluate(() => window.__frames.slice(5));
        await ctx.close();
        const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
        const p95 = [...frames].sort((a, b) => a - b)[Math.floor(frames.length * 0.95)];
        return { avg, p95, problems };
      };
      const now = await sample(BASE);
      console.log(`${name} models:   avg ${now.avg.toFixed(1)}ms  p95 ${now.p95.toFixed(1)}ms`);
      expect(now.problems).toEqual([]);
      if (BASELINE) {
        const then = await sample(BASELINE);
        console.log(`${name} baseline: avg ${then.avg.toFixed(1)}ms  p95 ${then.p95.toFixed(1)}ms`);
        expect(now.avg).toBeLessThan(then.avg * 1.25 + 2);
        expect(now.p95).toBeLessThan(then.p95 * 1.35 + 4);
      } else {
        expect(now.avg).toBeLessThan(40);
      }
    });

    if (BASELINE) {
      test("section geometry matches the pre-change build", async ({ browser }) => {
        const measure = async (url) => {
          const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
          const page = await ctx.newPage();
          await page.addInitScript(() => localStorage.setItem("onction:scene", "night"));
          await page.goto(url, { waitUntil: "networkidle" });
          await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
          await page.waitForTimeout(800);
          const boxes = await sectionBoxes(page);
          const eco = await page.$eval("#ecosystem .relative.mt-10 > div", (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
          await ctx.close();
          return { boxes, eco };
        };
        const [now, then] = [await measure(BASE), await measure(BASELINE)];
        expect(now.eco).toEqual(then.eco);
        expect(now.boxes).toEqual(then.boxes);
      });
    }
  });
}

test.describe("day mode", () => {
  test.use({ viewport: VIEWPORTS.desktop, deviceScaleFactor: 2 });
  test("models render on the light background", async ({ page }) => {
    const { problems } = await open(page, BASE, "day");
    await enterSection(page);
    await expect(page.locator("#ecosystem[data-mode='day'] .eco-modeled")).toHaveCount(1);
    const comp = await page.locator("#ecosystem .relative.mt-10 > div").first().boundingBox();
    await page.screenshot({ path: "test-results/eco-desktop-day.png", clip: comp });
    expect(problems).toEqual([]);
  });
});

test.describe("software WebGL fallback", () => {
  // Default headless Chromium = SwiftShader (CPU). The models must stay off and
  // the original approved dots must remain, with no errors.
  test.use({ viewport: VIEWPORTS.desktop });
  test("keeps the original dots", async ({ page }) => {
    const { problems } = await open(page, BASE);
    await enterSection(page);
    await expect(page.locator("#ecosystem .eco-modeled")).toHaveCount(0);
    await expect(page.locator("#ecosystem .eco-gen-ring").first()).toBeVisible();
    await expect(page.locator("#ecosystem .eco-demand-node").first()).toBeVisible();
    expect(problems).toEqual([]);
  });
});
