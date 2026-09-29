import { useCallback, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

// Async, styled replacement for window.confirm(). Usage:
//   const { confirm, dialog } = useConfirmDialog();
//   if (!(await confirm({ title: "Delete this page?", destructive: true }))) return;
// Render {dialog} once anywhere in the component tree.
export function useConfirmDialog() {
  const [config, setConfig] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === "string" ? { title: options } : options;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfig(opts);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    setConfig(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolverRef.current?.(false);
    setConfig(null);
  }, []);

  const dialog = config ? (
    <ConfirmDialog
      title={config.title}
      message={config.message}
      confirmLabel={config.confirmLabel}
      destructive={config.destructive}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, dialog };
}
