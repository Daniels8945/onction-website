import { useEffect } from "react";

const SITE = "Onction Energy";
const DEFAULT_DESCRIPTION = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";

// Per-page <title> and meta description for the client-rendered site.
export function usePageMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | ${SITE}` : `${SITE} | Bulk Electricity Trading for West Africa`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute("content", description);
    return () => {
      document.title = prevTitle;
      if (meta) meta.setAttribute("content", DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
