import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { logActivity } from "../lib/logActivity";
import {
  LayoutGrid, Calendar, Users, Phone, MapPin, AlertTriangle,
  PlusCircle, Upload, Settings, LogOut, Search, Bell,
} from "lucide-react";
import { Logo } from "./ui";

// Sidebar nav — MENU + WORKSPACE groups (handoff). Routes unchanged.
const MENU = [
  { path: "/",        label: "Overview",  icon: LayoutGrid },
  { path: "/daily",   label: "Daily",     icon: Calendar },
  { path: "/leads",   label: "Leads",     icon: Users },
  { path: "/agents",  label: "Agents",    icon: Phone },
  { path: "/markets", label: "Markets",   icon: MapPin },
  { path: "/insights", label: "Attention", icon: AlertTriangle, alert: true },
];
const WORKSPACE = [
  { path: "/log-call", label: "Add Call", icon: PlusCircle, roles: ["admin", "agent"] },
  { path: "/import",   label: "Import",   icon: Upload, roles: ["admin"] },
  { path: "/admin",    label: "Admin",    icon: Settings, roles: ["admin"] },
];

const PAGE_NAMES = {
  "/": "Overview", "/leads": "Leads", "/log-call": "Add Call", "/agents": "Agents",
  "/markets": "Markets", "/daily": "Daily", "/insights": "Attention", "/import": "Import", "/admin": "Admin",
};

function initials(profile) {
  const n = (profile?.full_name || profile?.email || "").trim();
  if (!n) return "—";
  const parts = n.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || n[0].toUpperCase();
}

function NavItem({ item, active }) {
  const Icon = item.icon;
  return (
    <Link to={item.path}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-[14.5px] transition-colors ${
        active ? "bg-accent-50 text-accent font-semibold" : "text-ink-500 font-medium hover:bg-ink-50 hover:text-ink-900"
      }`}>
      <Icon size={20} strokeWidth={active ? 2 : 1.8} className="shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.alert && <span className="h-2 w-2 rounded-full bg-critical shrink-0" title="Items need attention" />}
    </Link>
  );
}

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    logActivity("page_view", PAGE_NAMES[location.pathname] || location.pathname);
  }, [location.pathname]);

  const canSee = (item) => !item.roles || item.roles.includes(profile?.role);
  const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
  const ini = initials(profile);

  return (
    <div className="flex min-h-screen w-full bg-canvas text-ink-900">
      {/* ============ SIDEBAR ============ */}
      <aside className="hidden lg:flex w-[266px] shrink-0 flex-col bg-white border-r border-ink-100 sticky top-0 h-screen">
        {/* brand */}
        <div className="flex items-center gap-3 px-[22px] pt-6 pb-[18px]">
          <Logo size={40} />
          <div className="flex flex-col leading-tight">
            <span className="text-[17px] font-bold tracking-[-0.2px] text-ink-900">LSA Operations</span>
            <span className="text-[11px] font-medium text-ink-400 tracking-[0.3px]">Call &amp; Lead Console</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3.5 pb-3.5 flex flex-col gap-[22px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold tracking-[1px] text-ink-300 px-2.5 pt-1.5 pb-1">MENU</span>
            {MENU.map((item) => <NavItem key={item.path} item={item} active={isActive(item.path)} />)}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold tracking-[1px] text-ink-300 px-2.5 pt-1.5 pb-1">WORKSPACE</span>
            {WORKSPACE.filter(canSee).map((item) => <NavItem key={item.path} item={item} active={isActive(item.path)} />)}
          </div>
        </nav>

        {/* user card */}
        <div className="p-3.5 border-t border-ink-50">
          <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl bg-ink-50">
            <div className="w-[38px] h-[38px] rounded-full bg-accent-50 text-accent flex items-center justify-center text-[14px] font-bold shrink-0">{ini}</div>
            <div className="flex-1 leading-tight min-w-0">
              <div className="text-[13.5px] font-semibold text-ink-900 truncate">{profile?.full_name || profile?.email || "User"}</div>
              <div className="text-[11.5px] font-semibold text-accent tracking-[0.4px] uppercase">{profile?.role}</div>
            </div>
            <button onClick={signOut} title="Sign out"
              className="w-8 h-8 rounded-[9px] flex items-center justify-center text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors shrink-0">
              <LogOut size={18} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* topbar */}
        <header className="h-[70px] shrink-0 bg-white border-b border-ink-100 flex items-center gap-[18px] px-5 sm:px-7 sticky top-0 z-20">
          {/* mobile brand (sidebar hidden < lg) */}
          <div className="lg:hidden flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-[15px] font-bold text-ink-900">LSA</span>
          </div>
          <label className="hidden sm:flex items-center gap-2.5 bg-ink-50 border border-ink-200 rounded-[11px] px-3 h-[42px] w-[380px] max-w-[42vw]">
            <Search size={18} className="text-ink-400 shrink-0" />
            <input placeholder="Search leads, agents, markets…"
              className="border-none bg-transparent outline-none text-sm text-ink-600 flex-1 min-w-0" />
            <span className="text-[11.5px] font-semibold text-ink-400 bg-white border border-ink-200 rounded-md px-1.5 py-0.5 shrink-0">⌘K</span>
          </label>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 text-[13px] font-medium text-ink-500 bg-ink-50 border border-ink-200 rounded-[10px] px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-positive shadow-[0_0_0_3px_#d1fadf]" />
            Synced
          </div>
          <button className="relative w-[42px] h-[42px] rounded-[11px] border border-ink-200 bg-white flex items-center justify-center text-ink-500 hover:bg-ink-50 transition-colors" title="Notifications">
            <Bell size={19} strokeWidth={1.9} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-critical border-2 border-white" />
          </button>
          <div className="w-[42px] h-[42px] rounded-full bg-accent text-white flex items-center justify-center text-[14px] font-bold shrink-0">{ini}</div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 sm:px-7 pt-[26px] pb-10 flex flex-col gap-[22px]">{children}</main>
      </div>
    </div>
  );
}
