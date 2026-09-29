import { NavLink, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useVendorAuth } from "./VendorAuthContext.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/invoices", label: "Invoices" },
  { to: "/documents", label: "Documents" },
  { to: "/profile", label: "Profile" },
  { to: "/notifications", label: "Notifications" },
];

const STATUS_BADGE = {
  Approved: "bg-teal-500 text-navy-950",
  "Pending Review": "bg-amber-400 text-navy-950",
  Rejected: "bg-red-500 text-white",
  Inactive: "bg-white/10 text-white/60",
};

export default function VendorLayout() {
  const { vendor, logout } = useVendorAuth();

  return (
    <div className="flex h-screen bg-mist">
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: 0, border: "1px solid rgba(0,0,0,0.08)", background: "#06121F", color: "#fff", fontSize: "0.875rem", padding: "10px 14px" },
          success: { iconTheme: { primary: "#13C2B6", secondary: "#06121F" } },
          error: { iconTheme: { primary: "#EF4444", secondary: "#06121F" } },
        }}
      />
      <aside className="flex h-full w-60 flex-col bg-navy-950 text-white">
        <div className="shrink-0 px-6 py-6">
          <p className="eyebrow-light">Onction Energy</p>
          <p className="font-syne text-lg font-semibold">Vendor Portal</p>
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
        </nav>
        <div className="shrink-0 border-t border-white/10 px-6 py-4">
          <p className="truncate text-sm font-medium text-white">{vendor?.company_name}</p>
          <p className="text-xs text-white/40">{vendor?.vendor_code}</p>
          {vendor?.status && (
            <span className={`mt-2 inline-block px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[vendor.status] || "bg-white/10 text-white/60"}`}>
              {vendor.status}
            </span>
          )}
          <button onClick={logout} className="mt-3 block text-xs font-semibold text-teal-400 hover:text-teal-300">
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
