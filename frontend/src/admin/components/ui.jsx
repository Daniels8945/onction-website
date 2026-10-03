// Shared dashboard primitives — one place for button, form, panel, badge,
// table and overlay treatment so every admin screen reads as one product.
// Brand tokens (navy/teal/ink/slatey/mist) come from tailwind.config.js.
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { LuArrowLeft, LuCircleAlert, LuCircleCheck, LuEllipsis, LuInfo, LuLoaderCircle, LuSearch, LuTriangleAlert, LuX } from "react-icons/lu";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

// --- Buttons ---------------------------------------------------------------

const BUTTON_VARIANTS = {
  primary: "bg-teal-500 text-navy-950 hover:bg-teal-400 shadow-sm",
  dark: "bg-navy-950 text-white hover:bg-navy-900 shadow-sm",
  secondary: "border border-black/10 bg-white text-ink hover:bg-mist hover:border-black/15 shadow-sm",
  ghost: "text-slatey hover:bg-black/5 hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  "danger-ghost": "text-red-600 hover:bg-red-50",
};

const BUTTON_SIZES = {
  xs: "h-7 gap-1 px-2 text-xs",
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-9 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
};

export const Button = forwardRef(function Button(
  { variant = "secondary", size = "md", icon: Icon, iconRight: IconRight, loading, to, href, className, children, disabled, ...props },
  ref
) {
  const classes = cx(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );
  const iconSize = size === "xs" || size === "sm" ? 14 : 16;
  const content = (
    <>
      {loading ? <LuLoaderCircle size={iconSize} className="animate-spin" /> : Icon && <Icon size={iconSize} aria-hidden="true" />}
      {children}
      {IconRight && <IconRight size={iconSize} aria-hidden="true" />}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={classes} {...props}>{content}</Link>;
  if (href) return <a ref={ref} href={href} className={classes} {...props}>{content}</a>;
  return (
    <button ref={ref} type="button" disabled={disabled || loading} className={classes} {...props}>
      {content}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton({ icon: Icon, label, size = "md", variant = "ghost", className, ...props }, ref) {
  const dims = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-35",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
        BUTTON_VARIANTS[variant],
        dims,
        className
      )}
      {...props}
    >
      <Icon size={size === "sm" ? 15 : 17} aria-hidden="true" />
    </button>
  );
});

// --- Badges ----------------------------------------------------------------

const TONES = {
  success: { badge: "bg-teal-50 text-teal-700 ring-teal-600/20", dot: "bg-teal-500" },
  warning: { badge: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  danger: { badge: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  info: { badge: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  neutral: { badge: "bg-slate-100 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" },
};

export function Badge({ tone = "neutral", dot = true, className, children }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", t.badge, className)}>
      {dot && <span className={cx("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden="true" />}
      {children}
    </span>
  );
}

// --- Page scaffolding -------------------------------------------------------

export function PageHeader({ title, description, back, actions, meta, className }) {
  return (
    <div className={cx("mb-6", className)}>
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slatey transition hover:text-ink">
          <LuArrowLeft size={14} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-slatey">{description}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, description, actions, children, className, bodyClassName, padded = true, id }) {
  return (
    <section id={id} className={cx("rounded-xl border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(10,31,60,0.04)]", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.06] px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="font-body text-sm font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slatey">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cx(padded && "p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

// --- Forms -----------------------------------------------------------------

export const inputClass = cx(
  "block w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-ink shadow-sm transition",
  "placeholder:text-slate-400 hover:border-black/20",
  "focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20",
  "disabled:cursor-not-allowed disabled:bg-mist disabled:text-slatey",
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-500/20"
);

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cx(inputClass, className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cx(inputClass, "resize-y", className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx(inputClass, "cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
});

// Label + control + hint/error. `children` may be a render function that
// receives { id, "aria-invalid", "aria-describedby" } to wire accessibility.
export function Field({ label, hint, error, required, optional, counter, className, children }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const controlProps = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-xs font-medium text-ink">
            {label}
            {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
            {optional && <span className="ml-1 font-normal text-slatey">(optional)</span>}
          </label>
          {counter}
        </div>
      )}
      {typeof children === "function" ? children(controlProps) : children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <LuCircleAlert size={12} aria-hidden="true" /> {error}
        </p>
      ) : (
        hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-slatey">{hint}</p>
      )}
    </div>
  );
}

// With `label` renders a settings row; with only `ariaLabel` renders the bare
// toggle (e.g. inside a table cell).
export function Switch({ checked, onChange, label, ariaLabel, description, disabled }) {
  const id = useId();
  const toggle = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-1 disabled:opacity-50",
        label && "mt-0.5",
        checked ? "bg-teal-500" : "bg-slate-300"
      )}
    >
      <span className={cx("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
  if (!label) return toggle;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        {description && <p className="mt-0.5 text-xs text-slatey">{description}</p>}
      </div>
      {toggle}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className }) {
  return (
    <div className={cx("relative", className)}>
      <LuSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cx(inputClass, "pl-9")}
      />
    </div>
  );
}

// --- Feedback --------------------------------------------------------------

const ALERT_TONES = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: LuInfo, iconColor: "text-sky-600" },
  success: { box: "border-teal-200 bg-teal-50 text-teal-900", icon: LuCircleCheck, iconColor: "text-teal-600" },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: LuTriangleAlert, iconColor: "text-amber-600" },
  danger: { box: "border-red-200 bg-red-50 text-red-900", icon: LuCircleAlert, iconColor: "text-red-600" },
};

export function Alert({ tone = "info", title, children, action, className }) {
  const t = ALERT_TONES[tone];
  const Icon = t.icon;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-3 rounded-lg border px-4 py-3 text-sm", t.box, className)}>
      <Icon size={17} className={cx("mt-0.5 shrink-0", t.iconColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, compact, className }) {
  return (
    <div className={cx("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      {Icon && (
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-mist text-slatey ring-1 ring-black/5">
          <Icon size={20} aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slatey">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx("animate-pulse rounded-md bg-black/[0.06]", className)} />;
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-black/[0.05]" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function StatCard({ label, value, title, hint, icon: Icon, tone, to, onClick, active }) {
  const accent = { warning: "text-amber-600 bg-amber-50", danger: "text-red-600 bg-red-50", success: "text-teal-700 bg-teal-50", info: "text-sky-700 bg-sky-50" }[tone] || "text-slatey bg-mist";
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slatey">{label}</p>
        {Icon && (
          <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-md", accent)}>
            <Icon size={15} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-1 truncate font-syne text-xl font-semibold sm:text-2xl tabular-nums text-ink" title={title}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-slatey">{hint}</p>}
    </>
  );
  const classes = cx(
    "block rounded-xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(10,31,60,0.04)] transition",
    active ? "border-teal-500 ring-1 ring-teal-500" : "border-black/[0.07]",
    (to || onClick) && "hover:border-black/15 hover:shadow-[0_4px_12px_rgba(10,31,60,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
  );
  if (to) return <Link to={to} className={classes}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cx(classes, "w-full")}>{body}</button>;
  return <div className={classes}>{body}</div>;
}

// Underline tabs with optional counts; scrolls horizontally on narrow screens.
export function Tabs({ items, value, onChange, className }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <div role="tablist" className="flex min-w-max gap-1 border-b border-black/[0.08]">
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange(item.value)}
              className={cx(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/50",
                active ? "border-teal-500 text-ink" : "border-transparent text-slatey hover:border-black/15 hover:text-ink"
              )}
            >
              {item.label}
              {typeof item.count === "number" && (
                <span className={cx("rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums", active ? "bg-teal-500/15 text-teal-700" : "bg-black/[0.06] text-slatey")}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Avatar({ name = "", size = "md", className }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
  const dims = size === "lg" ? "h-12 w-12 text-base" : size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs";
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-lg bg-navy-900 font-semibold text-teal-400", dims, className)} aria-hidden="true">
      {initials}
    </span>
  );
}

// --- Overlays --------------------------------------------------------------

function useLockBodyScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}

// Stacked overlays (e.g. a confirm dialog over a drawer): only the topmost
// one responds to Escape.
const overlayStack = [];

function useEscape(onClose) {
  const token = useRef({});
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const me = token.current;
    overlayStack.push(me);
    function handle(e) {
      if (e.key === "Escape" && overlayStack[overlayStack.length - 1] === me) {
        e.stopPropagation();
        onCloseRef.current?.();
      }
    }
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      overlayStack.splice(overlayStack.indexOf(me), 1);
    };
  }, []);
}

const MODAL_SIZES = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

// Centered dialog on desktop, bottom sheet on phones.
export function Modal({ title, description, children, footer, onClose, size = "md", as: As = "div", formProps }) {
  useLockBodyScroll();
  useEscape(onClose);
  const titleId = useId();
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <As
        {...formProps}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        className={cx("flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl", MODAL_SIZES[size])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slatey">{description}</p>}
          </div>
          <IconButton icon={LuX} label="Close" size="sm" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-black/[0.06] bg-mist/60 px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>}
      </As>
    </div>,
    document.body
  );
}

// Right-hand detail panel; full screen on phones.
export function Drawer({ title, subtitle, headerExtra, children, footer, onClose }) {
  useLockBodyScroll();
  useEscape(onClose);
  const titleId = useId();
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/40" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-lg font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slatey">{subtitle}</p>}
            {headerExtra && <div className="mt-2">{headerExtra}</div>}
          </div>
          <IconButton icon={LuX} label="Close" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-black/[0.06] bg-mist/60 px-5 py-3">{footer}</div>}
      </aside>
    </div>,
    document.body
  );
}

// Overflow/actions dropdown. items: [{ label, icon, onClick, danger, disabled, divider }]
export function Menu({ items, label = "More actions", trigger, align = "right" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = items.filter(Boolean);
  return (
    <div ref={rootRef} className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      {trigger ? (
        trigger({ open, toggle: () => setOpen((o) => !o) })
      ) : (
        <IconButton icon={LuEllipsis} label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      )}
      {open && (
        <div
          role="menu"
          className={cx(
            "absolute z-40 mt-1 min-w-[190px] overflow-hidden rounded-lg border border-black/10 bg-white py-1 shadow-lg",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {visible.map((item, i) =>
            item.divider ? (
              <div key={`d-${i}`} className="my-1 border-t border-black/[0.06]" />
            ) : (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cx(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition disabled:opacity-40",
                  item.danger ? "text-red-600 hover:bg-red-50" : "text-ink hover:bg-mist"
                )}
              >
                {item.icon && <item.icon size={15} className={item.danger ? "" : "text-slatey"} aria-hidden="true" />}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// --- Tables ----------------------------------------------------------------

export function Table({ children, className }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className, align }) {
  return (
    <th scope="col" className={cx("whitespace-nowrap border-b border-black/[0.07] bg-mist/70 px-4 py-2.5 text-xs font-medium text-slatey first:pl-5 last:pr-5", align === "right" && "text-right", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, align }) {
  return <td className={cx("px-4 py-3 align-middle first:pl-5 last:pr-5", align === "right" && "text-right", className)}>{children}</td>;
}
