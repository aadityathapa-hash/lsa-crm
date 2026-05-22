import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart
} from "recharts";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function KpiCard({ label, value, sub, trend, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1.5 tracking-tight">{value}</p>
        </div>
        {icon && <span className="text-2xl opacity-40">{icon}</span>}
      </div>
      {sub && (
        <p className={`text-xs mt-2 font-medium ${
          trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-slate-400"
        }`}>
          {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}{sub}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [allMonths, setAllMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year] = useState(2026);

  useEffect(() => { fetchDashboard(); }, [month]);
  useEffect(() => { fetchAllMonths(); }, []);

  async function fetchAllMonths() {
    const { data: marketData } = await supabase
      .from("v_market_performance")
      .select("*")
      .eq("year", 2026)
      .order("month");

    if (!marketData) return;

    // Aggregate by month
    const byMonth = {};
    marketData.forEach(row => {
      if (!byMonth[row.month]) {
        byMonth[row.month] = { month: row.month, total: 0, charged: 0, connected: 0, missed: 0, nonCharged: 0, spend: 0 };
      }
      byMonth[row.month].total += row.total_leads || 0;
      byMonth[row.month].charged += row.charged_leads || 0;
      byMonth[row.month].connected += row.connected || 0;
      byMonth[row.month].missed += row.missed || 0;
      byMonth[row.month].nonCharged += row.total_leads - (row.charged_leads || 0);
      byMonth[row.month].spend += parseFloat(row.total_spend || 0);
    });

    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trend = Object.values(byMonth).map(m => ({
      ...m,
      name: monthNames[m.month],
      connectionRate: m.charged > 0 ? parseFloat(((m.connected / m.charged) * 100).toFixed(1)) : 0,
      cpl: m.charged > 0 && m.spend > 0 ? parseFloat((m.spend / m.charged).toFixed(2)) : 0,
    }));
    setAllMonths(trend);
  }

  async function fetchDashboard() {
    setLoading(true);

    const { data: leads } = await supabase
      .from("leads")
      .select("classification, charged, market_id, duration_seconds, hour_of_day")
      .eq("month", month)
      .eq("year", year)
      .eq("is_deleted", false);

    if (!leads) { setLoading(false); return; }

    const total = leads.length;
    const charged = leads.filter(l => l.charged).length;
    const connected = leads.filter(l => l.classification === "Connected").length;
    const missed = leads.filter(l => l.classification === "Missed").length;
    const nonCharged = leads.filter(l => l.classification === "Non-Charged").length;
    const connectionRate = charged > 0 ? ((connected / charged) * 100).toFixed(1) : "0.0";

    // Hourly distribution
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
      hour: `${i}:00`,
      connected: hourly[i]?.connected || 0,
      missed: hourly[i]?.missed || 0,
      nonCharged: hourly[i]?.nonCharged || 0,
    })).filter(h => h.connected + h.missed + h.nonCharged > 0);

    // Classification pie
    const pieData = [
      { name: "Connected", value: connected, color: "#10b981" },
      { name: "Missed", value: missed, color: "#ef4444" },
      { name: "Non-Charged", value: nonCharged, color: "#94a3b8" },
    ].filter(d => d.value > 0);

    // Market data
    const { data: marketData } = await supabase
      .from("v_market_performance")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .order("total_leads", { ascending: false });

    // Previous month for comparison
    const prevMonth = month > 1 ? month - 1 : null;
    let prevTotal = null;
    let prevRate = null;
    if (prevMonth) {
      const { data: prevLeads } = await supabase
        .from("leads")
        .select("classification, charged")
        .eq("month", prevMonth)
        .eq("year", year)
        .eq("is_deleted", false);
      if (prevLeads) {
        prevTotal = prevLeads.length;
        const prevCharged = prevLeads.filter(l => l.charged).length;
        const prevConnected = prevLeads.filter(l => l.classification === "Connected").length;
        prevRate = prevCharged > 0 ? ((prevConnected / prevCharged) * 100).toFixed(1) : null;
      }
    }

    setData({
      total, charged, connected, missed, nonCharged, connectionRate,
      markets: marketData || [],
      hourlyData,
      pieData,
      prevTotal,
      prevRate,
    });
    setLoading(false);
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const leadDelta = data.prevTotal != null ? data.total - data.prevTotal : null;
  const rateDelta = data.prevRate != null ? (parseFloat(data.connectionRate) - parseFloat(data.prevRate)).toFixed(1) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">LSA Performance — {months[month - 1]} {year}</p>
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1">
          {months.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                month === i + 1
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}>{m}</button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <KpiCard label="Total Leads" value={data.total.toLocaleString()} icon="📊"
          sub={leadDelta != null ? `${leadDelta >= 0 ? "+" : ""}${leadDelta} vs ${months[month - 2]}` : null}
          trend={leadDelta > 0 ? "up" : leadDelta < 0 ? "down" : null} />
        <KpiCard label="Charged" value={data.charged.toLocaleString()} icon="💰" />
        <KpiCard label="Connected" value={data.connected.toLocaleString()} icon="✅" />
        <KpiCard label="Missed" value={data.missed.toLocaleString()} icon="📵" />
        <KpiCard label="Non-Charged" value={data.nonCharged.toLocaleString()} icon="🔕" />
        <KpiCard label="Connection Rate" value={`${data.connectionRate}%`} icon="📈"
          sub={rateDelta != null ? `${rateDelta >= 0 ? "+" : ""}${rateDelta}% vs ${months[month - 2]}` : null}
          trend={parseFloat(rateDelta) > 0 ? "up" : parseFloat(rateDelta) < 0 ? "down" : null} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Monthly trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Lead Volume Trend" subtitle="Monthly total leads (2026)" />
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={allMonths}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5}
                fill="url(#colorLeads)" name="Total Leads" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Classification pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Lead Classification" subtitle={`${months[month - 1]} breakdown`} />
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                paddingAngle={3} dataKey="value">
                {data.pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Second charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Connection rate trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Connection Rate Trend" subtitle="Monthly connection rate %" />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={allMonths}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis domain={[90, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(v) => [`${v}%`, "Connection Rate"]} />
              <Line type="monotone" dataKey="connectionRate" stroke="#10b981" strokeWidth={2.5}
                dot={{ r: 4, fill: "#10b981" }} name="Connection Rate" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Hourly Distribution" subtitle={`Leads by hour — ${months[month - 1]}`} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="connected" stackId="a" fill="#10b981" name="Connected" radius={[0, 0, 0, 0]} />
              <Bar dataKey="missed" stackId="a" fill="#ef4444" name="Missed" />
              <Bar dataKey="nonCharged" stackId="a" fill="#cbd5e1" name="Non-Charged" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Market table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <SectionHeader title="Market Performance" subtitle={`${months[month - 1]} ${year} — ${data.markets.length} markets`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-left">
                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Market</th>
                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Total</th>
                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Charged</th>
                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Connected</th>
                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Missed</th>
                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Conn. Rate</th>
                <th className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">CPL</th>
              </tr>
            </thead>
            <tbody>
              {data.markets.map((m, i) => (
                <tr key={m.market_name} className={`border-t border-slate-100 hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? "bg-slate-50/30" : ""}`}>
                  <td className="px-5 py-3 font-semibold text-slate-800">{m.market_name}</td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{m.total_leads}</td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{m.charged_leads}</td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{m.connected}</td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{m.missed}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      m.connection_rate >= 0.98 ? "bg-green-100 text-green-700" :
                      m.connection_rate >= 0.95 ? "bg-blue-100 text-blue-700" :
                      m.connection_rate >= 0.90 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {m.connection_rate ? (m.connection_rate * 100).toFixed(1) + "%" : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">
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
