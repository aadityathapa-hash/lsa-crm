import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Phone, CalendarCheck, Activity, Receipt, DollarSign, Bot } from "lucide-react";
import { KpiCard, StatusChip, SourceTag, Caveat, Skeleton, EmptyState } from "../components/ui";

// Holistic agent view — aggregates agent_calls directly (all sources), so agents
// get credit for every booking they converted, LSA or not.
//
// Definitions:
//   booked          = result Booked / FU Booked (any source)
//   sales calls     = conversations that were real sales opportunities:
//                     everything except Excused (out of area / not a fit),
//                     Missed (never spoke), Archived (bad lead / cust. service)
//                     and Disputes. SF-only bookings count — a booking implies
//                     a sales conversation.
//   charged calls   = Google-billable calls (Charged Call - Connected/Missed)
//   sales conv      = booked ÷ sales calls
//   charged conv    = booked ÷ charged calls (LSA billable efficiency)
const NON_SALES = new Set(["Excused", "Missed", "Archived"]);
const isSales = (r) => !NON_SALES.has(r.result) && !(r.result || "").startsWith("Dispute");
const isBooked = (r) => r.result === "Booked" || r.result === "FU Booked";
const isCharged = (r) => r.source_classification === "Charged Call - Connected" || r.source_classification === "Charged Call - Missed";

function ConvChip({ value }) {
  if (value == null) return <span className="text-ink-300">—</span>;
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border text-ink-600 bg-ink-50 border-ink-200 tnum">
      {(value * 100).toFixed(1)}%
    </span>
  );
}

export default function AgentPerformance() {
  const [rows, setRows] = useState([]);
  const [agentMeta, setAgentMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [srcView, setSrcView] = useState("all"); // all | LSA | SF
  const navigate = useNavigate();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  useEffect(() => {
    supabase.from("agents").select("id, name, team").then(({ data }) =>
      setAgentMeta(Object.fromEntries((data || []).map((a) => [a.id, a]))));
  }, []);
  useEffect(() => { fetchData(); }, [month]);

  async function fetchData() {
    setLoading(true);
    let out = [], from = 0;
    while (true) {
      const { data: batch } = await supabase.from("agent_calls")
        .select("agent_id, result, source_classification, revenue, is_bot, source")
        .eq("month", month).eq("year", 2026).eq("is_deleted", false)
        .range(from, from + 999);
      if (!batch || batch.length === 0) break;
      out = out.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }
    setRows(out);
    setLoading(false);
  }

  const view = srcView === "all" ? rows
    : srcView === "SF" ? rows.filter((r) => r.source === "SF" || r.source === "Dialpad")
    : rows.filter((r) => r.source !== "SF" && r.source !== "Dialpad" && r.source !== "Manual");

  // per-agent aggregation
  const byAgent = {};
  view.forEach((r) => {
    const id = r.agent_id || "unattributed";
    const a = (byAgent[id] ||= { agent_id: id, calls: 0, sales: 0, charged: 0, booked: 0, bookedLsa: 0, bookedOther: 0, revenue: 0, bot: 0, human: 0 });
    a.calls++;
    if (isSales(r)) a.sales++;
    if (isCharged(r)) a.charged++;
    if (isBooked(r)) { a.booked++; (r.source === "SF" || r.source === "Dialpad") ? a.bookedOther++ : a.bookedLsa++; }
    a.revenue += Number(r.revenue) || 0;
    r.is_bot ? a.bot++ : a.human++;
  });
  const data = Object.values(byAgent)
    .map((a) => ({
      ...a,
      name: agentMeta[a.agent_id]?.name || "Unattributed",
      team: agentMeta[a.agent_id]?.team || null,
      salesConv: a.sales > 0 ? a.booked / a.sales : null,
      chargedConv: a.charged > 0 ? a.booked / a.charged : null,
      avgJob: a.booked > 0 && a.revenue > 0 ? a.revenue / a.booked : null,
    }))
    .sort((x, y) => y.calls - x.calls);

  const totals = data.reduce((acc, a) => ({
    calls: acc.calls + a.calls, sales: acc.sales + a.sales, charged: acc.charged + a.charged,
    booked: acc.booked + a.booked, bookedOther: acc.bookedOther + a.bookedOther,
    revenue: acc.revenue + a.revenue, bot: acc.bot + a.bot,
  }), { calls: 0, sales: 0, charged: 0, booked: 0, bookedOther: 0, revenue: 0, bot: 0 });
  const totSalesConv = totals.sales > 0 ? ((totals.booked / totals.sales) * 100).toFixed(1) : "—";
  const totChargedConv = totals.charged > 0 ? ((totals.booked / totals.charged) * 100).toFixed(1) : "—";

  const srcBtn = (key, label) => (
    <button key={key} onClick={() => setSrcView(key)}
      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${srcView === key ? "bg-ink-900 text-white" : "text-ink-400 hover:text-ink-800 hover:bg-ink-50"}`}>{label}</button>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink-900">Agents</h1>
          <p className="text-[13px] text-ink-500 mt-1">Everything agents received and booked — LSA and other channels.</p>
          <div className="flex items-center gap-2 mt-3">
            <SourceTag source={srcView === "SF" ? "sf" : srcView === "LSA" ? "call" : "lsa"} />
            <span className="text-[12px] text-ink-400">{data.length} agents · {months[month - 1]} 2026</span>
            <span className="flex gap-0.5 bg-surface rounded-lg border border-ink-200 p-0.5 ml-1">
              {srcBtn("all", "All sources")}{srcBtn("LSA", "LSA")}{srcBtn("SF", "Other")}
            </span>
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
            <KpiCard label="Total calls" value={totals.calls.toLocaleString()} icon={Phone} sub={totals.bookedOther > 0 ? `incl. ${totals.bookedOther} other-channel` : null} />
            <KpiCard label="Booked" value={totals.booked.toLocaleString()} icon={CalendarCheck} sub={totals.bookedOther > 0 ? `${(totals.booked - totals.bookedOther).toLocaleString()} LSA · ${totals.bookedOther} other` : null} />
            <KpiCard label="Sales conversion" value={totSalesConv} unit={totSalesConv !== "—" ? "%" : ""} icon={Activity} definition="Booked ÷ sales calls (excludes excused, missed, archived, disputes)." />
            <KpiCard label="Charged conversion" value={totChargedConv} unit={totChargedConv !== "—" ? "%" : ""} icon={Receipt} definition="Booked ÷ charged (Google-billable) calls." />
            <KpiCard label="Revenue" value={"$" + Math.round(totals.revenue).toLocaleString()} icon={DollarSign} />
            <KpiCard label="Bot calls" value={totals.bot.toLocaleString()} icon={Bot} />
          </div>

          <Caveat>
            Booked and revenue now include non-LSA (Salesforce-only) bookings, tagged "Other". Sales conversion = booked ÷ sales calls
            (excludes excused / missed / archived / disputes). Charged conversion = booked ÷ Google-billable calls.
          </Caveat>

          <div className="bg-surface rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-ink-100 flex items-center gap-2">
              <h2 className="text-[13px] font-semibold text-ink-800">Agent breakdown</h2>
              <SourceTag source={srcView === "SF" ? "sf" : "lsa"} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100">
                    {["Agent", "Calls", "Sales calls", "Charged", "Booked", "LSA / Other", "Sales conv", "Charged conv", "Revenue", "Avg job"].map((h, i) => (
                      <th key={h} className={`px-4 py-2.5 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider bg-ink-50/60 ${i >= 1 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((a) => {
                    const isBotRow = a.bot > 0 && a.human === 0;
                    return (
                      <tr key={a.agent_id} onClick={() => a.agent_id !== "unattributed" && navigate(`/agents/${a.agent_id}`)}
                        className={`border-t border-ink-50 cursor-pointer transition-colors hover:bg-ink-50/60 ${isBotRow ? "bg-steel-50/30" : ""}`}>
                        <td className="px-4 py-3 font-semibold text-ink-800 text-[13px]">
                          <span className="inline-flex items-center gap-2">{a.name}{isBotRow && <StatusChip tone="info">Bot</StatusChip>}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-ink-700 tnum font-medium">{a.calls}</td>
                        <td className="px-4 py-3 text-right text-ink-600 tnum">{a.sales}</td>
                        <td className="px-4 py-3 text-right text-ink-600 tnum">{a.charged || "—"}</td>
                        <td className="px-4 py-3 text-right text-ink-700 tnum font-medium">{a.booked}</td>
                        <td className="px-4 py-3 text-right text-ink-500 tnum text-[12px]">{a.bookedLsa} / {a.bookedOther}</td>
                        <td className="px-4 py-3 text-right"><ConvChip value={a.salesConv} /></td>
                        <td className="px-4 py-3 text-right"><ConvChip value={a.chargedConv} /></td>
                        <td className="px-4 py-3 text-right text-ink-600 tnum">{a.revenue ? "$" + Math.round(a.revenue).toLocaleString() : "—"}</td>
                        <td className="px-4 py-3 text-right text-ink-600 tnum">{a.avgJob ? "$" + a.avgJob.toFixed(0) : "—"}</td>
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
