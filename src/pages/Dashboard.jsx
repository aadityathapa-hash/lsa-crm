import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart
} from "recharts";

// ─── Skeleton loader ───
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><Skeleton className="h-7 w-40 mb-2" /><Skeleton className="h-4 w-56" /></div>
        <Skeleton className="h-9 w-96" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

// ─── KPI Card (clickable) ───
function KpiCard({ label, value, sub, trend, icon, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-5 transition-all ${
        onClick ? "cursor-pointer hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${accent || "bg-slate-50"}`}>
          {icon}
        </div>
      </div>
      <p className="text-[28px] font-bold text-slate-900 mt-2 tracking-tight leading-none">{value}</p>
      {sub && (
        <p className={`text-[11px] mt-2.5 font-medium flex items-center gap-1 ${
          trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-slate-400"
        }`}>
          {trend === "up" && <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12"><path d="M6 2v8M3 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          {trend === "down" && <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12"><path d="M6 10V2M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Alert strip ───
function AlertStrip({ markets, month, navigate }) {
  const lowRate = (markets || []).filter(m => m.connection_rate && m.connection_rate < 0.95 && m.charged_leads >= 5);
  const highMissed = (markets || []).filter(m => m.missed >= 3).sort((a, b) => b.missed - a.missed);

  if (lowRate.length === 0 && highMissed.length === 0) return null;

  const alerts = [];
  lowRate.slice(0, 2).forEach(m => {
    alerts.push({
      text: `${m.market_name} at ${(m.connection_rate * 100).toFixed(1)}% connection rate`,
      severity: m.connection_rate < 0.90 ? "red" : "amber",
    });
  });
  highMissed.slice(0, 2).forEach(m => {
    if (!lowRate.find(lr => lr.market_name === m.market_name)) {
      alerts.push({ text: `${m.market_name}: ${m.missed} missed calls`, severity: "amber" });
    }
  });

  if (alerts.length === 0) return null;

  return (
    <div
      onClick={() => navigate("/insights")}
      className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-amber-100/70 transition-colors"
    >
      <span className="text-amber-600 text-lg">⚠️</span>
      <div className="flex-1 flex flex-wrap gap-x-5 gap-y-1">
        {alerts.map((a, i) => (
          <span key={i} className={`text-xs font-medium ${a.severity === "red" ? "text-red-700" : "text-amber-700"}`}>
            {a.text}
          </span>
        ))}
      </div>
      <span className="text-xs font-medium text-amber-600 whitespace-nowrap">View all →</span>
    </div>
  );
}

// ─── Section header ───
function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-3">
      <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Connection rate badge ───
function RateBadge({ rate }) {
  if (!rate && rate !== 0) return <span className="text-slate-300">—</span>;
  const pct = (rate * 100).toFixed(1);
  const cls = rate >= 0.98 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : rate >= 0.95 ? "bg-blue-50 text-blue-700 border-blue-200"
    : rate >= 0.90 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>{pct}%</span>;
}

// ─── Custom tooltip ───
function ChartTooltip({ active, payload, label, suffix }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] font-semibold text-slate-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[12px]" style={{ color: p.color }}>
          <span className="font-semibold">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
          <span className="text-slate-400 ml-1">{p.name}{suffix || ""}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [allMonths, setAllMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year] = useState(2026);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { fetchDashboard(); }, [month]);
  useEffect(() => { fetchAllMonths(); }, []);

  async function fetchAllMonths() {
    const { data: marketData } = await supabase
      .from("v_market_performance").select("*").eq("year", 2026).order("month");
    if (!marketData) return;
    const byMonth = {};
    marketData.forEach(row => {
      if (!byMonth[row.month]) byMonth[row.month] = { month: row.month, total: 0, charged: 0, connected: 0, missed: 0, nonCharged: 0, spend: 0 };
      byMonth[row.month].total += row.total_leads || 0;
      byMonth[row.month].charged += row.charged_leads || 0;
      byMonth[row.month].connected += row.connected || 0;
      byMonth[row.month].missed += row.missed || 0;
      byMonth[row.month].nonCharged += row.total_leads - (row.charged_leads || 0);
      byMonth[row.month].spend += parseFloat(row.total_spend || 0);
    });
    const mn = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    setAllMonths(Object.values(byMonth).map(m => ({
      ...m, name: mn[m.month],
      connectionRate: m.charged > 0 ? parseFloat(((m.connected / m.charged) * 100).toFixed(1)) : 0,
      cpl: m.charged > 0 && m.spend > 0 ? parseFloat((m.spend / m.charged).toFixed(2)) : 0,
    })));
  }

  async function fetchDashboard() {
    setLoading(true);
    let leads = [];
    let from = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("leads")
        .select("classification, charged, market_id, duration_seconds, hour_of_day")
        .eq("month", month).eq("year", year).eq("is_deleted", false)
        .range(from, from + 999);
      if (!batch || batch.length === 0) break;
      leads = leads.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }
    if (!leads.length) { setLoading(false); return; }

    const total = leads.length;
    const charged = leads.filter(l => l.charged).length;
    const connected = leads.filter(l => l.classification === "Connected").length;
    const missed = leads.filter(l => l.classification === "Missed").length;
    const nonCharged = leads.filter(l => l.classification === "Non-Charged").length;
    const connectionRate = charged > 0 ? ((connected / charged) * 100).toFixed(1) : "0.0";

    // Hourly
    const hourly = {};
    leads.forEach(l => {
      if (l.hour_of_day != null) {
        if (!hourly[l.hour_of_day]) hourly[l.hour_of_day] = { hour: l.hour_of_day, connected: 0, missed: 0, nonCharged: 0 };
        if (l.classification === "Connected") hourly[l.hour_of_day].connected++;
        else if (l.classification === "Missed") hourly[l.hour_of_day].missed++;
        else hourly[l.hour_of_day].nonCharged++;
      }
    });
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`, connected: hourly[i]?.connected || 0, missed: hourly[i]?.missed || 0, nonCharged: hourly[i]?.nonCharged || 0,
    })).filter(h => h.connected + h.missed + h.nonCharged > 0);

    const pieData = [
      { name: "Connected", value: connected, color: "#10b981" },
      { name: "Missed", value: missed, color: "#ef4444" },
      { name: "Non-Charged", value: nonCharged, color: "#94a3b8" },
    ].filter(d => d.value > 0);

    const { data: marketData } = await supabase
      .from("v_market_performance").select("*")
      .eq("month", month).eq("year", year).order("total_leads", { ascending: false });

    const prevMonth = month > 1 ? month - 1 : null;
    let prevTotal = null, prevRate = null, prevCharged = null, prevConnected = null, prevMissed = null;
    if (prevMonth) {
      let prev = [];
      let pf = 0;
      while (true) {
        const { data: pb } = await supabase.from("leads")
          .select("classification, charged").eq("month", prevMonth).eq("year", year).eq("is_deleted", false)
          .range(pf, pf + 999);
        if (!pb || pb.length === 0) break;
        prev = prev.concat(pb);
        if (pb.length < 1000) break;
        pf += 1000;
      }
      if (prev.length) {
        prevTotal = prev.length;
        prevCharged = prev.filter(l => l.charged).length;
        prevConnected = prev.filter(l => l.classification === "Connected").length;
        prevMissed = prev.filter(l => l.classification === "Missed").length;
        prevRate = prevCharged > 0 ? ((prevConnected / prevCharged) * 100).toFixed(1) : null;
      }
    }

    setData({
      total, charged, connected, missed, nonCharged, connectionRate,
      markets: marketData || [], hourlyData, pieData,
      prevTotal, prevRate, prevCharged, prevConnected, prevMissed,
    });
    setLastUpdated(new Date());
    setLoading(false);
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (loading) return <DashboardSkeleton />;
  if (!data) return <p className="text-center text-slate-400 py-20">No data for this month</p>;

  const leadDelta = data.prevTotal != null ? data.total - data.prevTotal : null;
  const rateDelta = data.prevRate != null ? (parseFloat(data.connectionRate) - parseFloat(data.prevRate)).toFixed(1) : null;
  const chargedDelta = data.prevCharged != null ? data.charged - data.prevCharged : null;
  const missedDelta = data.prevMissed != null ? data.missed - data.prevMissed : null;
  const pm = month > 1 ? months[month - 2] : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-400">LSA Performance — {months[month - 1]} {year}</p>
            {lastUpdated && (
              <span className="text-[10px] text-slate-300 border border-slate-200 rounded-full px-2 py-0.5">
                Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 bg-white rounded-lg border border-slate-200 p-0.5">
          {months.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                month === i + 1
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}>{m}</button>
          ))}
        </div>
      </div>

      {/* Alert strip */}
      <AlertStrip markets={data.markets} month={month} navigate={navigate} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <KpiCard label="Total Leads" value={data.total.toLocaleString()} icon="📊" accent="bg-blue-50"
          sub={leadDelta != null ? `${leadDelta >= 0 ? "+" : ""}${leadDelta} vs ${pm}` : null}
          trend={leadDelta > 0 ? "up" : leadDelta < 0 ? "down" : null}
          onClick={() => navigate(`/leads?month=${month}`)} />
        <KpiCard label="Charged" value={data.charged.toLocaleString()} icon="💰" accent="bg-emerald-50"
          sub={chargedDelta != null ? `${chargedDelta >= 0 ? "+" : ""}${chargedDelta} vs ${pm}` : null}
          trend={chargedDelta > 0 ? "up" : chargedDelta < 0 ? "down" : null}
          onClick={() => navigate(`/leads?month=${month}&charged=true`)} />
        <KpiCard label="Connected" value={data.connected.toLocaleString()} icon="✅" accent="bg-emerald-50"
          onClick={() => navigate(`/leads?month=${month}&classification=Connected`)} />
        <KpiCard label="Missed" value={data.missed.toLocaleString()} icon="📵" accent="bg-red-50"
          sub={missedDelta != null ? `${missedDelta >= 0 ? "+" : ""}${missedDelta} vs ${pm}` : null}
          trend={missedDelta != null ? (missedDelta > 0 ? "down" : missedDelta < 0 ? "up" : null) : null}
          onClick={() => navigate(`/leads?month=${month}&classification=Missed`)} />
        <KpiCard label="Non-Charged" value={data.nonCharged.toLocaleString()} icon="🔕" accent="bg-slate-50"
          onClick={() => navigate(`/leads?month=${month}&classification=Non-Charged`)} />
        <KpiCard label="Conn. Rate" value={`${data.connectionRate}%`} icon="📈"
          accent={parseFloat(data.connectionRate) >= 95 ? "bg-emerald-50" : "bg-amber-50"}
          sub={rateDelta != null ? `${rateDelta >= 0 ? "+" : ""}${rateDelta} pts vs ${pm}` : null}
          trend={parseFloat(rateDelta) > 0 ? "up" : parseFloat(rateDelta) < 0 ? "down" : null} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Lead Volume Trend" subtitle="Monthly total leads — 2026" />
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={allMonths}>
              <defs>
                <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gLeads)" name="Leads" dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Classification" subtitle={`${months[month - 1]} breakdown`} />
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {data.pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {data.pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-[11px] text-slate-500">{d.name}</span>
                <span className="text-[11px] font-bold text-slate-700">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Connection Rate Trend" subtitle="Monthly %" />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={allMonths}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={["dataMin - 2", "dataMax + 1"]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip suffix="%" />} />
              <Line type="monotone" dataKey="connectionRate" stroke="#10b981" strokeWidth={2.5} name="Rate"
                dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Hourly Distribution" subtitle={`Leads by hour — ${months[month - 1]} CST`} />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.hourlyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="connected" stackId="a" fill="#10b981" name="Connected" radius={[0, 0, 0, 0]} />
              <Bar dataKey="missed" stackId="a" fill="#ef4444" name="Missed" />
              <Bar dataKey="nonCharged" stackId="a" fill="#e2e8f0" name="Non-Charged" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Market table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <SectionHeader title="Market Performance" subtitle={`${months[month - 1]} ${year} — ${data.markets.length} markets`} />
          <button onClick={() => navigate("/markets")} className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors">
            View all →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80">
                {["Market", "Total", "Charged", "Connected", "Missed", "Conn. Rate", "CPL"].map((h, i) => (
                  <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.markets.map((m, i) => (
                <tr key={m.market_name}
                  onClick={() => navigate(`/markets?market=${encodeURIComponent(m.market_name)}`)}
                  className={`border-t border-slate-50 cursor-pointer transition-colors hover:bg-blue-50/40 ${i % 2 ? "bg-slate-50/30" : ""}`}>
                  <td className="px-5 py-3 font-semibold text-slate-800 text-[13px]">{m.market_name}</td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{m.total_leads}</td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{m.charged_leads}</td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{m.connected}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className={m.missed > 0 ? "text-red-600 font-semibold" : "text-slate-600"}>{m.missed}</span>
                  </td>
                  <td className="px-5 py-3 text-right"><RateBadge rate={m.connection_rate} /></td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{m.cpl ? "$" + Number(m.cpl).toFixed(2) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
