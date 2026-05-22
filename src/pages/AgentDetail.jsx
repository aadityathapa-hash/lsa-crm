import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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

export default function AgentDetail() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [tab, setTab] = useState("calls");

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  useEffect(() => {
    loadAgent();
    loadMonthlyStats();
  }, [agentId]);

  useEffect(() => {
    loadCalls();
  }, [agentId, month]);

  async function loadAgent() {
    const { data } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();
    setAgent(data);
  }

  async function loadMonthlyStats() {
    const { data } = await supabase
      .from("v_agent_performance")
      .select("*")
      .eq("agent_id", agentId)
      .eq("year", 2026)
      .order("month");
    setMonthlyStats(data || []);
  }

  async function loadCalls() {
    setLoading(true);
    const { data } = await supabase
      .from("agent_calls")
      .select("*, markets(name)")
      .eq("agent_id", agentId)
      .eq("month", month)
      .eq("year", 2026)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(200);
    setCalls(data || []);
    setLoading(false);
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentStats = monthlyStats.find(s => s.month === month);
  const prevStats = monthlyStats.find(s => s.month === month - 1);

  // Result distribution for current month
  const resultDist = calls.reduce((acc, c) => {
    acc[c.result] = (acc[c.result] || 0) + 1;
    return acc;
  }, {});

  // Market distribution for current month
  const marketDist = calls.reduce((acc, c) => {
    const name = c.markets?.name || c.location || "Unknown";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to="/agents" className="text-slate-400 hover:text-slate-600 text-sm">← Agents</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-bold text-slate-900">{agent.name}</h1>
        {agent.team && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{agent.team}</span>}
        {currentStats?.bot_calls > 0 && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Bot</span>}
      </div>

      {/* Month selector */}
      <div className="flex gap-1 mb-4">
        {months.map((m, i) => (
          <button key={m} onClick={() => setMonth(i + 1)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              month === i + 1 ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
            }`}>{m}</button>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <KpiCard label="Total Calls" value={currentStats?.total_calls || 0}
          sub={prevStats ? `${currentStats?.total_calls - prevStats.total_calls >= 0 ? "+" : ""}${(currentStats?.total_calls || 0) - prevStats.total_calls} vs ${months[month - 2]}` : null} />
        <KpiCard label="Booked" value={currentStats?.booked || 0} />
        <KpiCard label="Archived" value={currentStats?.archived || 0} />
        <KpiCard label="No Answer" value={currentStats?.no_answer || 0} />
        <KpiCard label="Booking Rate" value={currentStats?.booking_rate ? (currentStats.booking_rate * 100).toFixed(1) + "%" : "—"} />
        <KpiCard label="Revenue" value={currentStats?.total_revenue ? "$" + parseFloat(currentStats.total_revenue).toLocaleString() : "—"} />
        <KpiCard label="Avg Job" value={currentStats?.avg_job_size ? "$" + parseFloat(currentStats.avg_job_size).toFixed(0) : "—"} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {[
          { key: "calls", label: "Call Log" },
          { key: "trend", label: "Monthly Trend" },
          { key: "breakdown", label: "Breakdown" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.key ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "calls" && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">{agent.name}'s Calls — {months[month - 1]} 2026 ({calls.length} calls)</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-3 py-2 font-medium text-slate-500">Date</th>
                    <th className="px-3 py-2 font-medium text-slate-500">Client</th>
                    <th className="px-3 py-2 font-medium text-slate-500">Phone</th>
                    <th className="px-3 py-2 font-medium text-slate-500">Market</th>
                    <th className="px-3 py-2 font-medium text-slate-500">Result</th>
                    <th className="px-3 py-2 font-medium text-slate-500">Revenue</th>
                    <th className="px-3 py-2 font-medium text-slate-500">TTM</th>
                    <th className="px-3 py-2 font-medium text-slate-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                        {c.lead_creation_date || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-800 font-medium">{c.client_name || "—"}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-xs">{c.phone || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{c.markets?.name || c.location || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.result === "Booked" ? "bg-green-100 text-green-700" :
                          c.result === "Archived" ? "bg-slate-100 text-slate-600" :
                          c.result === "No Answer" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>{c.result}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{c.revenue ? "$" + parseFloat(c.revenue).toLocaleString() : "—"}</td>
                      <td className="px-3 py-2 text-slate-600 text-xs">{c.ttm_result || "—"}</td>
                      <td className="px-3 py-2 text-slate-400 text-xs max-w-[150px] truncate">{c.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "trend" && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">{agent.name} — Monthly Trend (2026)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2 font-medium text-slate-500">Month</th>
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
                {monthlyStats.map((s) => (
                  <tr key={s.month} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{months[s.month - 1]} 2026</td>
                    <td className="px-4 py-2 text-right text-slate-600">{s.total_calls}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{s.booked}</td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {s.booking_rate ? (s.booking_rate * 100).toFixed(1) + "%" : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {s.total_revenue ? "$" + parseFloat(s.total_revenue).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {s.avg_job_size ? "$" + parseFloat(s.avg_job_size).toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">{s.bot_calls || 0}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{s.human_calls || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "breakdown" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Result distribution */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Result Distribution — {months[month - 1]}</h2>
            </div>
            <div className="p-4">
              {Object.entries(resultDist).sort((a, b) => b[1] - a[1]).map(([result, count]) => {
                const pct = calls.length > 0 ? ((count / calls.length) * 100).toFixed(1) : 0;
                return (
                  <div key={result} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        result === "Booked" ? "bg-green-100 text-green-700" :
                        result === "Archived" ? "bg-slate-100 text-slate-600" :
                        result === "No Answer" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>{result}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-sm text-slate-600 w-16 text-right">{count} ({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market distribution */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Market Distribution — {months[month - 1]}</h2>
            </div>
            <div className="p-4">
              {Object.entries(marketDist).sort((a, b) => b[1] - a[1]).map(([market, count]) => {
                const pct = calls.length > 0 ? ((count / calls.length) * 100).toFixed(1) : 0;
                return (
                  <div key={market} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-slate-700">{market}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-sm text-slate-600 w-16 text-right">{count} ({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
