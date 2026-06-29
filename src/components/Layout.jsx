import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { logActivity } from "../lib/logActivity";
import { supabase } from "../lib/supabase";
import {
  LayoutGrid, Calendar, Users, Phone, MapPin, AlertTriangle,
  PlusCircle, Upload, Settings, LogOut, Search, Bell, Sun, Moon, X,
} from "lucide-react";
import { Logo, StatusChip } from "./ui";

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

const EVENT_TONE = { login: "positive", logout: "neutral", page_view: "neutral", action: "info" };
const EVENT_LABEL = { login: "Login", logout: "Logout", page_view: "Viewed", action: "Action" };

function initials(profile) {
  const n = (profile?.full_name || profile?.email || "").trim();
  if (!n) return "—";
  const parts = n.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || n[0].toUpperCase();
}

function timeAgo(ts) {
  if (!ts) return "";
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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

// Bell → activity-log popover.
function ActivityBell() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLogs(null);
    supabase.from("activity_log").select("user_name, event_type, event_detail, created_at")
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (alive) setLogs(data || []); });
    return () => { alive = false; };
  }, [open]);

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} title="Activity"
        className={`relative w-[42px] h-[42px] rounded-[11px] border flex items-center justify-center transition-colors ${open ? "border-accent text-accent bg-accent-50" : "border-ink-200 text-ink-500 bg-surface hover:bg-ink-50"}`}>
        <Bell size={19} strokeWidth={1.9} />
        <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-critical border-2 border-surface" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[52px] z-40 w-[380px] max-w-[calc(100vw-32px)] bg-surface border border-ink-100 rounded-[14px] shadow-[0_16px_48px_-12px_rgba(16,24,40,.28)] overflow-hidden">
            <div className="flex items-center justify-between px-4 h-12 border-b border-ink-50">
              <span className="text-[14px] font-bold text-ink-900">Activity</span>
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-700 p-1 -mr-1"><X size={16} /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {logs === null ? (
                <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-9 rounded-lg bg-ink-50 animate-pulse" />)}</div>
              ) : logs.length === 0 ? (
                <p className="text-[13px] text-ink-400 text-center py-10">No activity yet.</p>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-ink-50 last:border-0">
                    <StatusChip tone={EVENT_TONE[l.event_type] || "neutral"} className="mt-0.5 shrink-0">{EVENT_LABEL[l.event_type] || l.event_type}</StatusChip>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-ink-700 truncate">
                        <span className="font-semibold text-ink-900">{l.user_name || "Someone"}</span>
                        {l.event_detail ? <> · {l.event_detail}</> : null}
                      </div>
                      <div className="text-[11.5px] text-ink-400">{timeAgo(l.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link to="/admin" onClick={() => setOpen(false)}
              className="block text-center text-[12.5px] font-semibold text-accent hover:bg-ink-50 py-2.5 border-t border-ink-50">View full log</Link>
          </div>
        </>
      )}
    </div>
  );
}

function ThemeToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle} title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-[42px] h-[42px] rounded-[11px] border border-ink-200 bg-surface flex items-center justify-center text-ink-500 hover:bg-ink-50 transition-colors">
      {dark ? <Sun size={19} strokeWidth={1.9} /> : <Moon size={19} strokeWidth={1.9} />}
    </button>
  );
}

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("lsa-theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("lsa-theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);

  useEffect(() => {
    logActivity("page_view", PAGE_NAMES[location.pathname] || location.pathname);
  }, [location.pathname]);

  const canSee = (item) => !item.roles || item.roles.includes(profile?.role);
  const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
  const ini = initials(profile);

  return (
    <div className="flex min-h-screen w-full bg-canvas text-ink-900">
      {/* ============ SIDEBAR ============ */}
      <aside className="hidden lg:flex w-[266px] shrink-0 flex-col bg-surface border-r border-ink-100 sticky top-0 h-screen">
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
        <header className="h-[70px] shrink-0 bg-surface border-b border-ink-100 flex items-center gap-3 sm:gap-[18px] px-5 sm:px-7 sticky top-0 z-20">
          <div className="lg:hidden flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-[15px] font-bold text-ink-900">LSA</span>
          </div>
          <label className="hidden sm:flex items-center gap-2.5 bg-ink-50 border border-ink-200 rounded-[11px] px-3 h-[42px] w-[380px] max-w-[42vw]">
            <Search size={18} className="text-ink-400 shrink-0" />
            <input placeholder="Search leads, agents, markets…"
              className="border-none bg-transparent outline-none text-sm text-ink-600 flex-1 min-w-0" />
            <span className="text-[11.5px] font-semibold text-ink-400 bg-surface border border-ink-200 rounded-md px-1.5 py-0.5 shrink-0">⌘K</span>
          </label>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 text-[13px] font-medium text-ink-500 bg-ink-50 border border-ink-200 rounded-[10px] px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-positive shadow-[0_0_0_3px_#d1fadf]" />
            Synced
          </div>
          <ThemeToggle dark={dark} onToggle={() => setDark((v) => !v)} />
          <ActivityBell />
          <div className="w-[42px] h-[42px] rounded-full bg-accent text-white flex items-center justify-center text-[14px] font-bold shrink-0">{ini}</div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 sm:px-7 pt-[26px] pb-10 flex flex-col gap-[22px]">{children}</main>
      </div>
    </div>
  );
}
