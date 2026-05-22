import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const nav = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/leads", label: "Lead Explorer", icon: "🔍" },
  { path: "/log-call", label: "Log Call", icon: "📞", roles: ["admin", "agent"] },
  { path: "/agents", label: "Agent Performance", icon: "👥" },
  { path: "/markets", label: "Market Reports", icon: "📈" },
  { path: "/daily", label: "Daily Report", icon: "📅" },
];

const adminNav = [
  { path: "/admin", label: "Admin", icon: "⚙️" },
];

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                LSA Performance Platform
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                CRM
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                {profile?.full_name || profile?.email}
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {profile?.role}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 -mb-px">
            {nav
              .filter((item) => !item.roles || item.roles.includes(profile?.role))
              .map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    location.pathname === item.path
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            {profile?.role === "admin" &&
              adminNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    location.pathname === item.path
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
