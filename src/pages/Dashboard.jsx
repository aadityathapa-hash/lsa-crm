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
