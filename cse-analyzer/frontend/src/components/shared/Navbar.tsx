import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";

const links = [
  { to: "/dashboard",   label: "Dashboard" },
  { to: "/stocks",      label: "Markets" },
  { to: "/watchlist",   label: "Watchlist" },
  { to: "/screener",    label: "Screener" },
  { to: "/news",        label: "News" },
  { to: "/analysis",    label: "Analysis" },
  { to: "/predictions", label: "Predictions" },
  { to: "/upload",      label: "Upload" },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const navigate = useNavigate();

  return (
    <nav className="bg-slate-900 dark:bg-slate-950 border-b border-slate-700 px-6 flex items-center h-14 gap-6 sticky top-0 z-50">
      <span className="text-white font-bold text-lg tracking-tight shrink-0">
        CSE <span className="text-blue-400">Analyzer</span>
      </span>

      <div className="flex items-center gap-1 flex-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base"
          title={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? "☀️" : "🌙"}
        </button>
        <span className="text-slate-400 text-sm hidden sm:block">{user?.username}</span>
        <button
          onClick={() => { logout(); navigate("/auth"); }}
          className="text-sm px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
