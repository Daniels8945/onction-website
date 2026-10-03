import { useEffect } from "react";
import { Button, Modal } from "./ui.jsx";

// A styled stand-in for window.confirm(), rendered via useConfirmDialog().
// Confirms on Enter, cancels on Escape or backdrop click.
export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", destructive = false, onConfirm, onCancel }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Enter") onConfirm();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm]);

  return (
    <Modal
      title={title}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message ? <div className="text-sm leading-relaxed text-slatey">{message}</div> : <p className="text-sm text-slatey">Are you sure?</p>}
    </Modal>
  );
}
