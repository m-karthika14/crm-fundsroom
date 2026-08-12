// Sidebar: the app's visual signature -- deep ink background instead
// of the usual white-sidebar-plus-blue-accent pattern most dashboards
// use. Nav items are filtered per the logged-in user's role so people
// never see links to sections they can't open.

import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { navItems } from "./navItems";

export function Sidebar() {
  const { user } = useAuth();
  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-ink text-paper">
      <div className="px-6 py-7">
        <span className="font-display text-xl font-semibold tracking-tight text-paper">
          Fundsroom
        </span>
        <p className="mt-0.5 text-xs text-paper/50">ERP &amp; CRM</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-forest-500/20 text-white"
                  : "text-paper/60 hover:bg-white/5 hover:text-paper/90"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-5 text-xs text-paper/40">
        Mini ERP + CRM Portal
      </div>
    </aside>
  );
}
