import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Phone, CalendarCheck, Activity, DollarSign, Bot, User } from "lucide-react";
import { KpiCard, StatusChip, SourceTag, Caveat, Skeleton, EmptyState } from "../components/ui";

function RateChip({ value, median }) {
  if (value == null) return <span className="text-ink-300">—</span>;
  const pct = (value * 100).toFixed(1);
  const below = median != null && value < median - 0.001;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${below ? "text-caution bg-caution-50 border-caution/20" : "text-ink-600 bg-ink-50 border-ink-200"}`} title={median != null ? `Team median ${(median * 100).toFixed(1)}%` : undefined}>
      {pct}%
    </span>
  );
}

export default function AgentPerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const navigate = useNavigate();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  useEffect(() => { fetchData(); }, [month]);

  async function fetchData() {
    setLoading(true);
    const { data: agents } = await supabase
      .from("v_agent_performance").select("*")
      .eq("month", month).eq("year", 2026).order("total_calls", { ascending: false });
    setData(agents || []);
    setLoading(false);
  }

  const totals = data.reduce((acc, a) => ({
    calls: acc.calls + (a.total_calls || 0),
    booked: acc.booked + (a.booked || 0),
    revenue: acc.revenue + parseFloat(a.total_revenue || 0),
    bot: acc.bot + (a.bot_calls || 0),
    human: acc.human + (a.human_calls || 0),
  }), { calls: 0, booked: 0, revenue: 0, bot: 0, human: 0 });
  const bookingRate = totals.calls > 0 ? ((totals.booked / totals.calls) * 100).toFixed(1) : "0";

  const humans = data.filter((a) => !(a.bot_calls > 0 && a.human_calls === 0));
  const rates = humans.filter((a) => a.total_calls >= 10 && a.booking_rate != null).map((a) => a.booking_rate).sort((x, y) => x - y);
  const median = rates.length ? rates[Math.floor(rates.length / 2)] : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink-900">Agents</h1>
          <p className="text-[13px] text-ink-500 mt-1">Per-agent call handling and booking conversion.</p>
          <div className="flex items-center gap-2 mt-3">
            <SourceTag source="lsa" /><span className="text-[12px] text-ink-400">{data.length} agents · {months[month - 1]} 2026</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-0.5 bg-surface rounded-lg border border-ink-200 p-1 shrink-0">
          {months.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${month === i + 1 ? "bg-accent text-white" : "text-ink-400 hover:text-ink-800 hover:bg-ink-50"}`}>{m}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : data.length === 0 ? (
        <div className="bg-surface rounded-[12px] border border-ink-100"><EmptyState title={`No agent data for ${months[month - 1]} 2026`} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Total calls" value={totals.calls.toLocaleString()} icon={Phone} />
            <KpiCard label="Booked" value={totals.booked.toLocaleString()} icon={CalendarCheck} />
            <KpiCard label="Booking rate" value={bookingRate} unit="%" icon={Activity} />
            <KpiCard label="Revenue" value={"$" + Math.round(totals.revenue).toLocaleString()} icon={DollarSign} />
            <KpiCard label="Bot calls" value={totals.bot.toLocaleString()} icon={Bot} />
            <KpiCard label="Human calls" value={totals.human.toLocaleString()} icon={User} />
          </div>

          <Caveat>Booking and revenue are LSA-attributed (bookings tied to an LSA lead). Rates are shaded only when below the team median, not against a fixed target — call mix differs by agent.</Caveat>

          <div className="bg-surface rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-ink-100 flex items-center gap-2">
              <h2 className="text-[13px] font-semibold text-ink-800">Agent breakdown</h2>
              <SourceTag source="lsa" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100">
                    {["Agent", "Team", "Calls", "Booked", "Booking rate", "Revenue", "Avg job", "Bot", "Human"].map((h, i) => (
                      <th key={h} className={`px-5 py-2.5 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider bg-ink-50/60 ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((a) => {
                    const isBot = a.bot_calls > 0 && a.human_calls === 0;
                    return (
                      <tr key={a.agent_id + a.month} onClick={() => navigate(`/agents/${a.agent_id}`)}
                        className={`border-t border-ink-50 cursor-pointer transition-colors hover:bg-ink-50/60 ${isBot ? "bg-steel-50/30" : ""}`}>
                        <td className="px-5 py-3 font-semibold text-ink-800 text-[13px]">
                          <span className="inline-flex items-center gap-2">{a.agent_name}{isBot && <StatusChip tone="info">Bot</StatusChip>}</span>
                        </td>
                        <td className="px-5 py-3 text-ink-500">{a.team || "—"}</td>
                        <td className="px-5 py-3 text-right text-ink-700 tnum font-medium">{a.total_calls}</td>
                        <td className="px-5 py-3 text-right text-ink-600 tnum">{a.booked}</td>
                        <td className="px-5 py-3 text-right">{isBot ? <span className="text-ink-300 text-[11px]">n/a</span> : <RateChip value={a.booking_rate} median={median} />}</td>
                        <td className="px-5 py-3 text-right text-ink-600 tnum">{a.total_revenue ? "$" + parseFloat(a.total_revenue).toLocaleString() : "—"}</td>
                        <td className="px-5 py-3 text-right text-ink-600 tnum">{a.avg_job_size ? "$" + parseFloat(a.avg_job_size).toFixed(0) : "—"}</td>
                        <td className="px-5 py-3 text-right text-ink-500 tnum">{a.bot_calls || 0}</td>
                        <td className="px-5 py-3 text-right text-ink-500 tnum">{a.human_calls || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
