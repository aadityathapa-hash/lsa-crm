import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { logActivity } from "../lib/logActivity";
import {
  LayoutGrid, CalendarClock, ListFilter, Users, Map, AlertTriangle,
  PhoneOutgoing, Upload, Settings2,
} from "lucide-react";
import { Logo } from "./ui";

// Grouped by the operator's workflow: Monitor → Investigate → Manage.
// Routes are unchanged; labels + icons are the redesign.
const groups = [
  { name: "Monitor", items: [
    { path: "/",       label: "Overview",  icon: LayoutGrid },
    { path: "/daily",  label: "Daily",     icon: CalendarClock },
  ]},
  { name: "Investigate", items: [
    { path: "/leads",   label: "Leads",   icon: ListFilter },
    { path: "/agents",  label: "Agents",  icon: Users },
    { path: "/markets", label: "Markets", icon: Map },
  ]},
  { name: "Manage", items: [
    { path: "/insights", label: "Attention", icon: AlertTriangle },
    { path: "/log-call", label: "Add Call",  icon: PhoneOutgoing, roles: ["admin", "agent"] },
    { path: "/import",   label: "Import",    icon: Upload, roles: ["admin"] },
    { path: "/admin",    label: "Admin",     icon: Settings2, roles: ["admin"] },
  ]},
];

const PAGE_NAMES = {
  "/": "Overview", "/leads": "Leads", "/log-call": "Add Call", "/agents": "Agents",
  "/markets": "Markets", "/daily": "Daily", "/insights": "Attention", "/import": "Import", "/admin": "Admin",
};

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    logActivity("page_view", PAGE_NAMES[location.pathname] || location.pathname);
  }, [location.pathname]);

  const canSee = (item) => !item.roles || item.roles.includes(profile?.role);

  return (
    <div className="min-h-screen bg-canvas text-ink-900">
      {/* Header */}
      <header className="bg-white border-b border-ink-100 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-2.5">
              <Logo size={26} />
              <span className="text-[15px] tracking-tight text-ink-900"><span className="font-bold">LSA</span> Operations</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-ink-500">{profile?.full_name || profile?.email}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500 bg-ink-50 border border-ink-200 px-2 py-0.5 rounded">{profile?.role}</span>
              <button onClick={signOut} className="text-ink-400 hover:text-ink-700 transition-colors">Sign out</button>
            </div>
          </div>
        </div>
      </header>

      {/* Nav — workflow groups with subtle dividers */}
      <nav className="bg-white border-b border-ink-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-stretch gap-1 -mb-px overflow-x-auto">
            {groups.map((group, gi) => {
              const items = group.items.filter(canSee);
              if (!items.length) return null;
              return (
                <div key={group.name} className="flex items-stretch">
                  {gi > 0 && <span className="self-center mx-2 h-4 w-px bg-ink-100" aria-hidden />}
                  {items.map((item) => {
                    const active = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path}
                        className={`flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors ${
                          active
                            ? "border-accent text-accent"
                            : "border-transparent text-ink-500 hover:text-ink-800"
                        }`}>
                        <Icon size={15} strokeWidth={2} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}
