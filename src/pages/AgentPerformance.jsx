import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function RateBadge({ rate, thresholds }) {
  if (!rate && rate !== 0) return <span className="text-slate-300">—</span>;
  const pct = (rate * 100).toFixed(1);
  const [high, mid, low] = thresholds || [0.50, 0.35, 0.20];
  const cls = rate >= high ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : rate >= mid ? "bg-blue-50 text-blue-700 border-blue-200"
    : rate >= low ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>{pct}%</span>;
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

export default function AgentPerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const navigate = useNavigate();

  useEffect(() => { fetchData(); }, [month]);

  async function fetchData() {
    setLoading(true);
    const { data: agents } = await supabase
      .from("v_agent_performance").select("*")
      .eq("month", month).eq("year", 2026)
      .order("total_calls", { ascending: false });
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

  const bookingRate = totals.calls > 0 ? ((totals.booked / totals.calls) * 100).toFixed(1) : "0";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Performance</h1>
          <p className="text-sm text-slate-400 mt-0.5">{months[month - 1]} 2026 — {data.length} agents</p>
        </div>
        <div className="flex gap-0.5 bg-white rounded-lg border border-slate-200 p-0.5">
          {months.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                month === i + 1 ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}>{m}</button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Total Calls", value: totals.calls.toLocaleString(), icon: "📞", accent: "bg-blue-50" },
            { label: "Booked", value: totals.booked.toLocaleString(), icon: "✅", accent: "bg-emerald-50" },
            { label: "Booking Rate", value: bookingRate + "%", icon: "📊", accent: parseFloat(bookingRate) >= 40 ? "bg-emerald-50" : "bg-amber-50" },
            { label: "Revenue", value: "$" + totals.revenue.toLocaleString(), icon: "💰", accent: "bg-emerald-50" },
            { label: "Bot Calls", value: totals.bot.toLocaleString(), icon: "🤖", accent: "bg-blue-50" },
            { label: "Human Calls", value: totals.human.toLocaleString(), icon: "👤", accent: "bg-slate-50" },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{k.label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${k.accent}`}>{k.icon}</div>
              </div>
              <p className="text-[28px] font-bold text-slate-900 mt-2 tracking-tight leading-none">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          <div className="grid grid-cols-6 gap-3 mb-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-slate-400 text-sm">No agent data for {months[month - 1]} 2026</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-[13px] font-semibold text-slate-800">Agent Breakdown — {months[month - 1]} 2026</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80">
                  {["Agent", "Team", "Calls", "Booked", "Booking Rate", "Revenue", "Avg Job", "Bot", "Human"].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((a, i) => (
                  <tr key={a.agent_id + a.month}
                    onClick={() => navigate(`/agents/${a.agent_id}`)}
                    className={`border-t border-slate-50 cursor-pointer transition-colors hover:bg-blue-50/40 ${i % 2 ? "bg-slate-50/30" : ""} ${a.bot_calls > 0 && a.human_calls === 0 ? "bg-blue-50/20" : ""}`}>
                    <td className="px-5 py-3 font-semibold text-slate-800 text-[13px]">
                      {a.agent_name}
                      {a.bot_calls > 0 && a.human_calls === 0 && (
                        <span className="ml-2 text-[10px] font-medium text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">BOT</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{a.team || "—"}</td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums font-medium">{a.total_calls}</td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{a.booked}</td>
                    <td className="px-5 py-3 text-right">
                      <RateBadge rate={a.booking_rate} thresholds={[0.50, 0.35, 0.20]} />
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums">
                      {a.total_revenue ? "$" + parseFloat(a.total_revenue).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums">
                      {a.avg_job_size ? "$" + parseFloat(a.avg_job_size).toFixed(0) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{a.bot_calls || 0}</td>
                    <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{a.human_calls || 0}</td>
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
