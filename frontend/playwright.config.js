import { defineConfig } from "@playwright/test";

// Runs against an already-running build (see tests/ecosystem-models.spec.js).
export default defineConfig({
  testDir: "tests",
  timeout: 90_000,
  workers: 2,
  reporter: "list",
  use: { browserName: "chromium" },
  projects: [
    // Real GPU (as visitors have). Without these flags headless Chromium
    // rasterises WebGL in software, where the models deliberately stay off
    // (see hasFastWebGL in EcoModels.jsx) — the "software" project checks that.
    { name: "gpu", grepInvert: /software WebGL/, use: { launchOptions: { args: ["--enable-gpu", "--use-angle=metal", "--ignore-gpu-blocklist"] } } },
    { name: "software", grep: /software WebGL/ },
  ],
});
