import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { KpiCard, StatusChip, RateChip, SourceTag, Caveat, Skeleton, EmptyState } from "../components/ui";

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function resultTone(result) {
  if (result === "Booked" || result === "FU Booked") return "positive";
  if (result === "No Answer") return "caution";
  return "neutral";
}

export default function AgentDetail() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [tab, setTab] = useState("calls");

  useEffect(() => { loadAgent(); loadMonthlyStats(); }, [agentId]);
  useEffect(() => { loadCalls(); }, [agentId, month]);

  async function loadAgent() {
    const { data } = await supabase.from("agents").select("*").eq("id", agentId).single();
    setAgent(data);
  }
  async function loadMonthlyStats() {
    const { data } = await supabase.from("v_agent_performance").select("*").eq("agent_id", agentId).eq("year", 2026).order("month");
    setMonthlyStats(data || []);
  }
  async function loadCalls() {
    setLoading(true);
    const { data } = await supabase.from("agent_calls").select("*, markets(name)")
      .eq("agent_id", agentId).eq("month", month).eq("year", 2026).eq("is_deleted", false)
      .order("created_at", { ascending: false }).limit(200);
    setCalls(data || []);
    setLoading(false);
  }

  if (!agent) {
    return <div className="space-y-3"><Skeleton className="h-8 w-64" /><div className="grid grid-cols-2 md:grid-cols-7 gap-3">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div></div>;
  }

  const currentStats = monthlyStats.find(s => s.month === month);
  const prevStats = monthlyStats.find(s => s.month === month - 1);
  const callDelta = currentStats && prevStats ? (currentStats.total_calls || 0) - (prevStats.total_calls || 0) : null;

  const resultDist = calls.reduce((acc, c) => { acc[c.result] = (acc[c.result] || 0) + 1; return acc; }, {});
  const marketDist = calls.reduce((acc, c) => { const name = c.markets?.name || c.location || "Unknown"; acc[name] = (acc[name] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-400 mb-2">
            <Link to="/agents" className="inline-flex items-center gap-1 hover:text-ink-700 transition-colors"><ArrowLeft size={13} /> Agents</Link>
            <ChevronRight size={13} />
            <span className="text-ink-500">{agent.name}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink-900">{agent.name}</h1>
            {agent.team && <StatusChip tone="neutral">{agent.team}</StatusChip>}
            {currentStats?.bot_calls > 0 && <StatusChip tone="info">Bot</StatusChip>}
          </div>
          <div className="flex items-center gap-2 mt-3"><SourceTag source="lsa" /><span className="text-[12px] text-ink-400">{months[month - 1]} 2026</span></div>
        </div>
        <div className="flex flex-wrap justify-end gap-0.5 bg-white rounded-lg border border-ink-200 p-1 shrink-0">
          {months.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${month === i + 1 ? "bg-accent text-white" : "text-ink-400 hover:text-ink-800 hover:bg-ink-50"}`}>{m}</button>
          ))}
        </div>
      </div>

      <Caveat>Booked, revenue and rates here are LSA-attributed from the call system, not the same as Salesforce bookings.</Caveat>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard label="Total calls" value={currentStats?.total_calls || 0} delta={callDelta} deltaLabel={prevStats ? `vs ${months[month - 2]}` : ""} />
        <KpiCard label="Booked" value={currentStats?.booked || 0} />
        <KpiCard label="Archived" value={currentStats?.archived || 0} />
        <KpiCard label="No answer" value={currentStats?.no_answer || 0} />
        <KpiCard label="Booking rate" value={currentStats?.booking_rate ? (currentStats.booking_rate * 100).toFixed(1) : "—"} unit={currentStats?.booking_rate ? "%" : ""} />
        <KpiCard label="Revenue" value={currentStats?.total_revenue ? "$" + parseFloat(currentStats.total_revenue).toLocaleString() : "—"} />
        <KpiCard label="Avg job" value={currentStats?.avg_job_size ? "$" + parseFloat(currentStats.avg_job_size).toFixed(0) : "—"} />
      </div>

      <div className="flex gap-1">
        {[{ key: "calls", label: "Call log" }, { key: "trend", label: "Monthly trend" }, { key: "breakdown", label: "Breakdown" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-[13px] font-semibold rounded-lg transition-colors ${tab === t.key ? "bg-ink-900 text-white" : "bg-white text-ink-500 hover:text-ink-800 border border-ink-200"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "calls" && (
        <div className="bg-white rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-ink-100"><h2 className="text-[13px] font-semibold text-ink-800">{months[month - 1]} 2026 · {calls.length} calls</h2></div>
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
          ) : calls.length === 0 ? (
            <EmptyState title={`No calls for ${months[month - 1]} 2026`} hint="Pick another month." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100">
                    {["Date", "Client", "Phone", "Market", "Result", "Revenue", "TTM", "Notes"].map((h, i) => (
                      <th key={h} className={`px-4 py-2.5 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider bg-ink-50/60 ${i >= 5 && i <= 5 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.id} className="border-t border-ink-50 hover:bg-ink-50/60 transition-colors">
                      <td className="px-4 py-2.5 text-ink-600 whitespace-nowrap tnum">{c.lead_creation_date || "—"}</td>
                      <td className="px-4 py-2.5 text-ink-800 font-medium">{c.client_name || "—"}</td>
                      <td className="px-4 py-2.5 text-ink-500 font-mono text-xs tnum">{c.phone || "—"}</td>
                      <td className="px-4 py-2.5 text-ink-600">{c.markets?.name || c.location || "—"}</td>
                      <td className="px-4 py-2.5"><StatusChip tone={resultTone(c.result)}>{c.result}</StatusChip></td>
                      <td className="px-4 py-2.5 text-right text-ink-600 tnum">{c.revenue ? "$" + parseFloat(c.revenue).toLocaleString() : "—"}</td>
                      <td className="px-4 py-2.5 text-ink-500 text-xs">{c.ttm_result || "—"}</td>
                      <td className="px-4 py-2.5 text-ink-400 text-xs max-w-[150px] truncate">{c.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "trend" && (
        <div className="bg-white rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-ink-100"><h2 className="text-[13px] font-semibold text-ink-800">Monthly trend · 2026</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100">
                  {["Month", "Calls", "Booked", "Booking rate", "Revenue", "Avg job", "Bot", "Human"].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider bg-ink-50/60 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((s) => (
                  <tr key={s.month} className="border-t border-ink-50 hover:bg-ink-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-ink-800 text-[13px]">{months[s.month - 1]} 2026</td>
                    <td className="px-4 py-2.5 text-right text-ink-600 tnum">{s.total_calls}</td>
                    <td className="px-4 py-2.5 text-right text-ink-600 tnum">{s.booked}</td>
                    <td className="px-4 py-2.5 text-right">{s.booking_rate ? <RateChip value={s.booking_rate} target={0.30} /> : <span className="text-ink-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-right text-ink-600 tnum">{s.total_revenue ? "$" + parseFloat(s.total_revenue).toLocaleString() : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-ink-600 tnum">{s.avg_job_size ? "$" + parseFloat(s.avg_job_size).toFixed(0) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-ink-500 tnum">{s.bot_calls || 0}</td>
                    <td className="px-4 py-2.5 text-right text-ink-500 tnum">{s.human_calls || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "breakdown" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-ink-100"><h2 className="text-[13px] font-semibold text-ink-800">Result distribution · {months[month - 1]}</h2></div>
            <div className="p-5 space-y-2">
              {Object.entries(resultDist).sort((a, b) => b[1] - a[1]).map(([result, count]) => {
                const pct = calls.length > 0 ? ((count / calls.length) * 100).toFixed(1) : 0;
                return (
                  <div key={result} className="flex items-center justify-between gap-3 py-0.5">
                    <StatusChip tone={resultTone(result)}>{result}</StatusChip>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-ink-100 rounded-full h-1.5"><div className="bg-accent h-1.5 rounded-full" style={{ width: `${pct}%` }} /></div>
                      <span className="text-[13px] text-ink-600 w-20 text-right tnum">{count} · {pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-ink-100"><h2 className="text-[13px] font-semibold text-ink-800">Market distribution · {months[month - 1]}</h2></div>
            <div className="p-5 space-y-2">
              {Object.entries(marketDist).sort((a, b) => b[1] - a[1]).map(([market, count]) => {
                const pct = calls.length > 0 ? ((count / calls.length) * 100).toFixed(1) : 0;
                return (
                  <div key={market} className="flex items-center justify-between gap-3 py-0.5">
                    <span className="text-[13px] text-ink-700">{market}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-ink-100 rounded-full h-1.5"><div className="bg-accent h-1.5 rounded-full" style={{ width: `${pct}%` }} /></div>
                      <span className="text-[13px] text-ink-600 w-20 text-right tnum">{count} · {pct}%</span>
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
