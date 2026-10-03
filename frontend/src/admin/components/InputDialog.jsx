import { useEffect, useRef, useState } from "react";
import { Button, Field, Input, Modal, Textarea } from "./ui.jsx";

// A styled stand-in for window.prompt(), rendered via usePromptDialog().
// Submits on Enter (Cmd/Ctrl+Enter when multiline), cancels on Escape or
// backdrop click.
export default function InputDialog({
  title,
  message,
  label,
  placeholder,
  defaultValue,
  confirmLabel = "Create",
  destructive = false,
  multiline = false,
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState(defaultValue || "");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
  }

  return (
    <Modal
      title={title}
      size="sm"
      onClose={onCancel}
      as="form"
      formProps={{ onSubmit: handleSubmit }}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant={destructive ? "danger" : "primary"} disabled={!value.trim()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <div className="mb-4 text-sm leading-relaxed text-slatey">{message}</div>}
      <Field label={label} required={!!label}>
        {(a11y) =>
          multiline ? (
            <Textarea
              {...a11y}
              ref={inputRef}
              rows={4}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
              }}
              placeholder={placeholder}
            />
          ) : (
            <Input {...a11y} ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
          )
        }
      </Field>
    </Modal>
  );
}
