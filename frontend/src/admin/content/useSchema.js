import { useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi.js";

// The content schema (backend/app/cms_schema.py), fetched once per session.
let cache = null;

export function useSchema() {
  const [schema, setSchema] = useState(cache);
  const [error, setError] = useState("");
  useEffect(() => {
    if (cache) return;
    adminApi
      .get("/api/content/schema")
      .then((s) => {
        cache = s;
        setSchema(s);
      })
      .catch((e) => setError(e.message));
  }, []);
  return { schema, error };
}

export const STATUS = {
  "built-in": { tone: "neutral", label: "Built-in content", help: "The website shows its original content. Nothing has been published from the dashboard yet." },
  draft: { tone: "warning", label: "Draft — not live", help: "Saved changes that the public can't see yet." },
  published: { tone: "success", label: "Published", help: "The website shows the published version." },
  changes: { tone: "info", label: "Published · draft pending", help: "The website shows the published version; a newer draft is waiting for review." },
};
