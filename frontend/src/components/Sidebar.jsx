import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, LayoutDashboard, ScrollText, Zap, BookLock, UploadCloud, Globe2, LogOut } from "lucide-react";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", testid: "nav-dashboard" },
  { to: "/logs", icon: ScrollText, label: "Threat Logs", testid: "nav-logs" },
  { to: "/simulator", icon: Zap, label: "Attack Simulator", testid: "nav-simulator" },
  { to: "/rules", icon: BookLock, label: "Rules", testid: "nav-rules" },
  { to: "/ip-reputation", icon: Globe2, label: "IP Reputation", testid: "nav-ips" },
  { to: "/upload", icon: UploadCloud, label: "File Validator", testid: "nav-upload" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 border-r border-sentinel-border bg-[#0A0810] flex flex-col" data-testid="sidebar">
      <div className="px-5 py-5 border-b border-sentinel-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 grid place-items-center bg-sentinel-blue/10 border border-sentinel-blue/40 rounded-sm">
            <ShieldAlert className="w-4 h-4 text-sentinel-blue" />
          </div>
          <div>
            <div className="font-heading font-black tracking-tight text-sm leading-none">SENTINEL<span className="text-sentinel-red">SHIELD</span></div>
            <div className="text-[10px] font-mono text-sentinel-muted mt-1">v1.0 — SOC Console</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="overline px-2 mb-2">// MODULES</div>
        {nav.map(({ to, icon: Icon, label, testid }) => (
          <NavLink
            key={to} to={to} end={to === "/"} data-testid={testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm rounded-sm border border-transparent transition-colors ${
                isActive
                  ? "bg-sentinel-blue/10 border-sentinel-blue/40 text-sentinel-blue"
                  : "text-sentinel-secondary hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sentinel-border">
        <div className="text-[10px] font-mono text-sentinel-muted mb-2">{user?.email}</div>
        <button
          onClick={async () => { await logout(); navigate("/login"); }}
          data-testid="logout-button"
          className="w-full flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sentinel-secondary hover:text-sentinel-red border border-sentinel-border hover:border-sentinel-red/40 px-3 py-2 transition-colors rounded-sm"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
