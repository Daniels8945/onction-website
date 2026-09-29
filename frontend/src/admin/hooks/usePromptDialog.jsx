import { useCallback, useRef, useState } from "react";
import InputDialog from "../components/InputDialog.jsx";

// Async, styled replacement for window.prompt(). Usage:
//   const { prompt, dialog } = usePromptDialog();
//   const title = await prompt({ title: "New page", label: "Page title" });
//   if (!title) return; // cancelled
// Render {dialog} once anywhere in the component tree.
export function usePromptDialog() {
  const [config, setConfig] = useState(null);
  const resolverRef = useRef(null);

  const prompt = useCallback((options) => {
    const opts = typeof options === "string" ? { title: options } : options;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfig(opts);
    });
  }, []);

  const handleConfirm = useCallback((value) => {
    resolverRef.current?.(value);
    setConfig(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolverRef.current?.(null);
    setConfig(null);
  }, []);

  const dialog = config ? (
    <InputDialog
      title={config.title}
      label={config.label}
      placeholder={config.placeholder}
      defaultValue={config.defaultValue}
      confirmLabel={config.confirmLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { prompt, dialog };
}
