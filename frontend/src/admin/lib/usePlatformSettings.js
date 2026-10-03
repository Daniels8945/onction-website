import { useEffect, useState } from "react";
import { adminApi } from "./adminApi.js";

// Vendor-platform settings (currency, prefixes…) are read by most vendor
// pages but change rarely — fetch once per session and share the promise.
let cache = null;
let inflight = null;

export function invalidatePlatformSettings(next) {
  cache = next || null;
  inflight = null;
}

export function usePlatformSettings() {
  const [settings, setSettings] = useState(cache);
  useEffect(() => {
    if (cache) return;
    inflight = inflight || adminApi.get("/api/vendor-platform/settings").then((s) => (cache = s));
    inflight.then(setSettings).catch(() => {
      inflight = null;
    });
  }, []);
  return settings;
}

export function useCurrency() {
  return usePlatformSettings()?.currency || "NGN";
}
