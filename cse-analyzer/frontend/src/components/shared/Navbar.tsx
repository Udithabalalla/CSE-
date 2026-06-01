import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/stocks", label: "Stocks" },
  { to: "/analysis", label: "Analysis" },
  { to: "/predictions", label: "Predictions" },
  { to: "/upload", label: "Upload" },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <nav style={{ background: "#1e293b", padding: "0 1.5rem", display: "flex", alignItems: "center", height: 56 }}>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginRight: "2rem" }}>CSE Analyzer</span>
      <div style={{ display: "flex", gap: "0.25rem", flex: 1 }}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            style={({ isActive }) => ({
              padding: "0.4rem 0.75rem", borderRadius: 4, textDecoration: "none",
              color: isActive ? "#fff" : "#94a3b8",
              background: isActive ? "#334155" : "transparent",
              fontSize: 14,
            })}
          >
            {l.label}
          </NavLink>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ color: "#94a3b8", fontSize: 13 }}>{user?.username}</span>
        <button onClick={handleLogout} style={{ padding: "0.3rem 0.75rem", background: "#475569", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
