import { NavLink, Outlet } from "react-router-dom";
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

export default function AdminLayout() {
  const { admin, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-mist">
      <aside className="flex w-60 flex-col bg-navy-950 text-white">
        <div className="px-6 py-6">
          <p className="eyebrow-light">Onction Energy</p>
          <p className="font-syne text-lg font-semibold">Dashboard</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
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
        <div className="border-t border-white/10 px-6 py-4">
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
