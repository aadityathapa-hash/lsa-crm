#!/bin/bash
# LSA CRM — Frontend Setup Script
# Run from the lsa-crm project root

# Create directory structure
mkdir -p src/lib
mkdir -p src/hooks
mkdir -p src/components
mkdir -p src/pages
mkdir -p src/utils

# 1. Supabase client
cat > src/lib/supabase.js << 'EOF'
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
EOF

# 2. Auth context
cat > src/hooks/useAuth.jsx << 'EOF'
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) await fetchProfile(session.user.id);
        else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error("Login error:", error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  const value = {
    user,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    isAdmin: profile?.role === "admin",
    isAgent: profile?.role === "agent",
    isViewer: profile?.role === "viewer",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
EOF

# 3. Protected route component
cat > src/components/ProtectedRoute.jsx << 'EOF'
import { useAuth } from "../hooks/useAuth";
import Login from "../pages/Login";

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  if (roles && profile && !roles.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
EOF

# 4. Layout / Shell
cat > src/components/Layout.jsx << 'EOF'
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const nav = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/leads", label: "Lead Explorer", icon: "🔍" },
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
            {nav.map((item) => (
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
EOF

# 5. Login page
cat > src/pages/Login.jsx << 'EOF'
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          LSA Performance Platform
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          1-800-GOT-JUNK? CRM
        </p>
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>
        <p className="text-xs text-slate-400 mt-4">
          South Wind internal tool
        </p>
      </div>
    </div>
  );
}
EOF

# 6. Dashboard page (with live data from Supabase)
cat > src/pages/Dashboard.jsx << 'EOF'
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year] = useState(2026);

  useEffect(() => {
    fetchDashboard();
  }, [month]);

  async function fetchDashboard() {
    setLoading(true);

    // Get leads for selected month
    const { data: leads, error } = await supabase
      .from("leads")
      .select("classification, charged, market_id, duration_seconds")
      .eq("month", month)
      .eq("year", year)
      .eq("is_deleted", false);

    if (error) {
      console.error("Dashboard error:", error);
      setLoading(false);
      return;
    }

    const total = leads.length;
    const charged = leads.filter((l) => l.charged).length;
    const connected = leads.filter((l) => l.classification === "Connected").length;
    const missed = leads.filter((l) => l.classification === "Missed").length;
    const nonCharged = leads.filter((l) => l.classification === "Non-Charged").length;
    const connectionRate = charged > 0 ? ((connected / charged) * 100).toFixed(1) : "0.0";

    // Get market breakdown
    const { data: marketData } = await supabase
      .from("v_market_performance")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .order("total_leads", { ascending: false });

    setData({
      total,
      charged,
      connected,
      missed,
      nonCharged,
      connectionRate,
      markets: marketData || [],
    });
    setLoading(false);
  }

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Month selector */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex gap-1">
          {months.map((m, i) => (
            <button
              key={m}
              onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                month === i + 1
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Total Leads" value={data.total} />
        <KpiCard label="Charged" value={data.charged} />
        <KpiCard label="Connected" value={data.connected} />
        <KpiCard label="Missed" value={data.missed} />
        <KpiCard label="Non-Charged" value={data.nonCharged} />
        <KpiCard label="Connection Rate" value={`${data.connectionRate}%`} />
      </div>

      {/* Market table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Market Performance — {months[month - 1]} {year}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2 font-medium text-slate-500">Market</th>
                <th className="px-4 py-2 font-medium text-slate-500 text-right">Total</th>
                <th className="px-4 py-2 font-medium text-slate-500 text-right">Charged</th>
                <th className="px-4 py-2 font-medium text-slate-500 text-right">Connected</th>
                <th className="px-4 py-2 font-medium text-slate-500 text-right">Missed</th>
                <th className="px-4 py-2 font-medium text-slate-500 text-right">Conn. Rate</th>
                <th className="px-4 py-2 font-medium text-slate-500 text-right">CPL</th>
              </tr>
            </thead>
            <tbody>
              {data.markets.map((m) => (
                <tr key={m.market_name} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{m.market_name}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{m.total_leads}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{m.charged_leads}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{m.connected}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{m.missed}</td>
                  <td className="px-4 py-2 text-right text-slate-600">
                    {m.connection_rate ? (m.connection_rate * 100).toFixed(1) + "%" : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">
                    {m.cpl ? "$" + Number(m.cpl).toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
EOF

# 7. Placeholder pages
for page in LeadExplorer AgentPerformance MarketReports DailyReport Admin; do
  cat > "src/pages/${page}.jsx" << PAGEEOF
export default function ${page}() {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-4">${page}</h1>
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400">
        Coming soon
      </div>
    </div>
  );
}
PAGEEOF
done

# 8. App.jsx with routing
cat > src/App.jsx << 'EOF'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import LeadExplorer from "./pages/LeadExplorer";
import AgentPerformance from "./pages/AgentPerformance";
import MarketReports from "./pages/MarketReports";
import DailyReport from "./pages/DailyReport";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <Layout><LeadExplorer /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute>
                <Layout><AgentPerformance /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/markets"
            element={
              <ProtectedRoute>
                <Layout><MarketReports /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily"
            element={
              <ProtectedRoute>
                <Layout><DailyReport /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout><Admin /></Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
EOF

# 9. main.jsx
cat > src/main.jsx << 'EOF'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
EOF

# 10. index.css with Tailwind
cat > src/index.css << 'EOF'
@import "tailwindcss";
EOF

# 11. vite.config.js with Tailwind plugin
cat > vite.config.js << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
EOF

# 12. .env file (not committed — gitignored)
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://cmkmkqfnxrsuoteppcio.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xdynwgAp94lWXLsN0h-X2Q__KaIl
EOF

# 13. Update .gitignore
cat >> .gitignore << 'EOF'

# Environment variables
.env
.env.local
.env.production
EOF

# 14. Delete default files we don't need
rm -f src/App.css

echo "✅ LSA CRM frontend scaffolded!"
echo ""
echo "Files created:"
find src -type f | sort
echo ""
echo "⚠️  UPDATE .env with your actual Supabase anon key!"
echo "   Get it from: Supabase → Settings → API Keys → Publishable key"
