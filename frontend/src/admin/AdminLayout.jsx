import { NavLink, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/admin", label: "Analytics", end: true },
  { to: "/admin/tasks", label: "Tasks" },
  { to: "/admin/enquiries", label: "Enquiries" },
  { to: "/admin/pages", label: "Pages" },
  { to: "/admin/news", label: "News" },
  { to: "/admin/events", label: "Events" },
  { to: "/admin/newsletter", label: "Newsletter" },
  { to: "/admin/media", label: "Media" },
  { to: "/admin/team", label: "Team" },
];

const VENDOR_PLATFORM_NAV_ITEMS = [
  { to: "/admin/vendors", label: "Vendors" },
  { to: "/admin/invoices", label: "Invoices" },
  { to: "/admin/documents", label: "Documents" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/audit-log", label: "Audit Log" },
  { to: "/admin/vendor-settings", label: "Vendor Settings" },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();

  return (
    <div className="flex h-screen bg-mist">
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: 0,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "#06121F",
            color: "#fff",
            fontSize: "0.875rem",
            padding: "10px 14px",
          },
          success: { iconTheme: { primary: "#13C2B6", secondary: "#06121F" } },
          error: { iconTheme: { primary: "#EF4444", secondary: "#06121F" } },
        }}
      />
      <aside className="flex h-full w-60 flex-col bg-navy-950 text-white">
        <div className="shrink-0 px-6 py-6">
          <p className="eyebrow-light">Onction Energy</p>
          <p className="font-syne text-lg font-semibold">Dashboard</p>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-none px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-teal-500 text-navy-950" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <p className="px-3 pt-4 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-white/30">Vendor Platform</p>
          {VENDOR_PLATFORM_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-none px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-teal-500 text-navy-950" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 border-t border-white/10 px-6 py-4">
          <p className="truncate text-xs text-white/50">{admin?.email}</p>
          <button onClick={logout} className="mt-2 text-xs font-semibold text-teal-400 hover:text-teal-300">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
