import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useMatch } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import {
  LuCalendar,
  LuChartLine,
  LuFileText,
  LuFolderOpen,
  LuHistory,
  LuImages,
  LuInbox,
  LuLogOut,
  LuMail,
  LuMenu,
  LuNewspaper,
  LuReceipt,
  LuSettings,
  LuSquareCheck,
  LuUserCog,
  LuUsers,
  LuWrench,
  LuX,
} from "react-icons/lu";
import { useAuth } from "./AuthContext.jsx";
import { cx } from "./components/ui.jsx";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Analytics", icon: LuChartLine, end: true },
      { to: "/admin/tasks", label: "Tasks", icon: LuSquareCheck },
      { to: "/admin/enquiries", label: "Enquiries", icon: LuInbox },
    ],
  },
  {
    label: "Website",
    items: [
      { to: "/admin/pages", label: "Pages", icon: LuFileText },
      { to: "/admin/news", label: "News", icon: LuNewspaper },
      { to: "/admin/events", label: "Events", icon: LuCalendar },
      { to: "/admin/newsletter", label: "Newsletter", icon: LuMail },
      { to: "/admin/media", label: "Media", icon: LuImages },
    ],
  },
  {
    label: "Vendor platform",
    items: [
      { to: "/admin/vendors", label: "Vendors", icon: LuUsers },
      { to: "/admin/invoices", label: "Invoices", icon: LuReceipt },
      { to: "/admin/documents", label: "Documents", icon: LuFolderOpen },
      { to: "/admin/services", label: "Services", icon: LuWrench },
      { to: "/admin/audit-log", label: "Audit log", icon: LuHistory },
      { to: "/admin/vendor-settings", label: "Settings", icon: LuSettings },
    ],
  },
  {
    label: "Workspace",
    items: [{ to: "/admin/team", label: "Team", icon: LuUserCog }],
  },
];

function SidebarContent({ admin, logout, onNavigate }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500 font-syne text-sm font-bold text-navy-950">O</span>
        <div className="leading-tight">
          <p className="font-syne text-sm font-semibold text-white">Onction Energy</p>
          <p className="text-[11px] text-white/45">Admin dashboard</p>
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-3" aria-label="Dashboard">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/35">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60",
                      isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={17} className={isActive ? "text-teal-400" : "text-white/40 group-hover:text-white/70"} aria-hidden="true" />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold uppercase text-white">
            {admin?.email?.[0] || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{admin?.email}</p>
            {admin?.role && <p className="text-[11px] text-white/45">{admin.role}</p>}
          </div>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <LuLogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  // The page builder is a full-bleed editor with its own toolbar and sidebar.
  const fullWidth = useMatch("/admin/pages/:id");

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="flex h-screen bg-mist">
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: 10,
            background: "#06121F",
            color: "#fff",
            fontSize: "0.875rem",
            padding: "10px 14px",
          },
          success: { iconTheme: { primary: "#13C2B6", secondary: "#06121F" } },
          error: { iconTheme: { primary: "#EF4444", secondary: "#06121F" } },
        }}
      />

      {/* Desktop sidebar */}
      <aside className="hidden h-full w-60 shrink-0 flex-col bg-navy-950 lg:flex">
        <SidebarContent admin={admin} logout={logout} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-navy-950 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            >
              <LuX size={18} />
            </button>
            <SidebarContent admin={admin} logout={logout} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-black/[0.07] bg-white px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-ink hover:bg-black/5"
          >
            <LuMenu size={20} />
          </button>
          <p className="font-syne text-sm font-semibold text-ink">Onction Energy</p>
        </header>
        <main id="admin-main" className="min-h-0 flex-1 overflow-y-auto">
          {fullWidth ? (
            <Outlet />
          ) : (
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
