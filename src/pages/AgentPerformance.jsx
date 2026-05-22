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

export default function AgentPerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => { fetchData(); }, [month]);

  async function fetchData() {
    setLoading(true);
    const { data: agents, error } = await supabase
      .from("v_agent_performance")
      .select("*")
      .eq("month", month)
      .eq("year", 2026)
      .order("total_calls", { ascending: false });
    if (error) console.error("Agent fetch error:", error);
    setData(agents || []);
    setLoading(false);
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const totals = data.reduce((acc, a) => ({
    calls: acc.calls + (a.total_calls || 0),
    booked: acc.booked + (a.booked || 0),
    revenue: acc.revenue + parseFloat(a.total_revenue || 0),
    bot: acc.bot + (a.bot_calls || 0),
    human: acc.human + (a.human_calls || 0),
  }), { calls: 0, booked: 0, revenue: 0, bot: 0, human: 0 });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Agent Performance</h1>
        <div className="flex gap-1">
          {months.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                month === i + 1 ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}>{m}</button>
          ))}
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Total Calls" value={totals.calls} />
        <KpiCard label="Booked" value={totals.booked} />
        <KpiCard label="Revenue" value={`$${totals.revenue.toLocaleString()}`} />
        <KpiCard label="Bot Calls" value={totals.bot} />
        <KpiCard label="Human Calls" value={totals.human} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Agent Breakdown — {months[month - 1]} 2026</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2 font-medium text-slate-500">Agent</th>
                  <th className="px-4 py-2 font-medium text-slate-500">Team</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Calls</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Booked</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Booking Rate</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Revenue</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Avg Job</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Bot</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Human</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.agent_id + a.month} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{a.agent_name}</td>
                    <td className="px-4 py-2 text-slate-500">{a.team || "—"}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{a.total_calls}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{a.booked}</td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {a.booking_rate ? (a.booking_rate * 100).toFixed(1) + "%" : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {a.total_revenue ? "$" + parseFloat(a.total_revenue).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {a.avg_job_size ? "$" + parseFloat(a.avg_job_size).toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">{a.bot_calls || 0}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{a.human_calls || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
