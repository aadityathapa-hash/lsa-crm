import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ListChecks, Receipt, PhoneCall, PhoneMissed, Activity } from "lucide-react";
import { KpiCard, RateChip, SourceTag, Skeleton, EmptyState } from "../components/ui";

export default function DailyReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [market, setMarket] = useState("all");
  const [markets, setMarkets] = useState([]);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  useEffect(() => {
    supabase.from("markets").select("id, name").eq("active", true).order("name").then(({ data }) => setMarkets(data || []));
  }, []);
  useEffect(() => { fetchData(); }, [month, market]);

  async function fetchData() {
    setLoading(true);
    const marketName = market !== "all" ? markets.find(m => m.id === market)?.name : null;
    let rows = [], from = 0;
    while (true) {
      let q = supabase.from("agent_calls").select("lead_creation_date, source_classification, result, market_name")
        .eq("month", month).eq("year", 2026).range(from, from + 999);
      if (marketName) q = q.eq("market_name", marketName);
      const { data: batch } = await q;
      if (!batch || batch.length === 0) break;
      rows = rows.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }
    const byKey = {};
    rows.forEach(r => {
      const d = (r.lead_creation_date || "").slice(0, 10);
      if (!d) return;
      const key = marketName ? `${d}|${r.market_name}` : d;
      if (!byKey[key]) byKey[key] = { lead_date: d, market_name: r.market_name, total_leads: 0, connected: 0, missed: 0, disputes: 0 };
      const o = byKey[key];
      o.total_leads++;
      if (r.source_classification === "Charged Call - Connected") o.connected++;
      else if (r.source_classification === "Charged Call - Missed") o.missed++;
      if (r.result === "Dispute - Approved") o.disputes++;
    });
    setData(Object.values(byKey).map(o => ({ ...o, charged_leads: o.connected + o.missed - o.disputes })).sort((a, b) => b.lead_date.localeCompare(a.lead_date)));
    setLoading(false);
  }

  const aggregated = market === "all"
    ? Object.values(data.reduce((acc, row) => {
        const d = row.lead_date;
        if (!acc[d]) acc[d] = { lead_date: d, total_leads: 0, charged_leads: 0, connected: 0, missed: 0 };
        acc[d].total_leads += row.total_leads || 0; acc[d].charged_leads += row.charged_leads || 0;
        acc[d].connected += row.connected || 0; acc[d].missed += row.missed || 0;
        return acc;
      }, {})).sort((a, b) => b.lead_date.localeCompare(a.lead_date))
    : data;

  const totalLeads = aggregated.reduce((s, r) => s + (r.total_leads || 0), 0);
  const totalCharged = aggregated.reduce((s, r) => s + (r.charged_leads || 0), 0);
  const totalConnected = aggregated.reduce((s, r) => s + (r.connected || 0), 0);
  const totalMissed = aggregated.reduce((s, r) => s + (r.missed || 0), 0);
  const avgRate = totalCharged > 0 ? (totalConnected / totalCharged) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink-900">Daily activity</h1>
          <p className="text-[13px] text-ink-500 mt-1">Day-by-day call volume and connection for the month.</p>
          <div className="flex items-center gap-2 mt-3"><SourceTag source="call" /><span className="text-[12px] text-ink-400">{months[month - 1]} 2026 · {market === "all" ? "all markets" : markets.find(m => m.id === market)?.name}</span></div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <select value={market} onChange={(e) => setMarket(e.target.value)}
            className="text-[13px] border border-ink-200 rounded-lg px-3 h-9 text-ink-700 bg-surface outline-none focus:border-accent">
            <option value="all">All markets</option>
            {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="flex flex-wrap justify-end gap-0.5 bg-surface rounded-lg border border-ink-200 p-1">
            {months.map((m, i) => (
              <button key={m} onClick={() => setMonth(i + 1)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${month === i + 1 ? "bg-accent text-white" : "text-ink-400 hover:text-ink-800 hover:bg-ink-50"}`}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      {!loading && aggregated.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Total leads" value={totalLeads.toLocaleString()} icon={ListChecks} />
          <KpiCard label="Billable" value={totalCharged.toLocaleString()} icon={Receipt} />
          <KpiCard label="Connected" value={totalConnected.toLocaleString()} icon={PhoneCall} />
          <KpiCard label="Missed" value={totalMissed.toLocaleString()} icon={PhoneMissed} />
          <KpiCard label="Conn. rate" value={avgRate != null ? (avgRate * 100).toFixed(1) : "—"} unit={avgRate != null ? "%" : ""} icon={Activity} />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : aggregated.length === 0 ? (
        <div className="bg-surface rounded-[12px] border border-ink-100"><EmptyState title={`No leads for ${months[month - 1]} 2026`} hint="Pick another month or market." /></div>
      ) : (
        <div className="bg-surface rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-ink-100"><h2 className="text-[13px] font-semibold text-ink-800">{aggregated.length} days with leads</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="px-5 py-2.5 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider text-left bg-ink-50/60">Date</th>
                  {market !== "all" && <th className="px-5 py-2.5 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider text-left bg-ink-50/60">Market</th>}
                  {["Total", "Billable", "Connected", "Missed", "Conn. rate"].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider text-right bg-ink-50/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aggregated.map((row, i) => {
                  const cr = row.charged_leads > 0 ? row.connected / row.charged_leads : null;
                  return (
                    <tr key={i} className="border-t border-ink-50 hover:bg-ink-50/60 transition-colors">
                      <td className="px-5 py-3 font-semibold text-ink-800 text-[13px]">{row.lead_date}</td>
                      {market !== "all" && <td className="px-5 py-3 text-ink-600">{row.market_name}</td>}
                      <td className="px-5 py-3 text-right text-ink-600 tnum">{row.total_leads}</td>
                      <td className="px-5 py-3 text-right text-ink-600 tnum">{row.charged_leads}</td>
                      <td className="px-5 py-3 text-right text-ink-600 tnum">{row.connected}</td>
                      <td className="px-5 py-3 text-right tnum"><span className={row.missed > 0 ? "text-critical font-semibold" : "text-ink-600"}>{row.missed}</span></td>
                      <td className="px-5 py-3 text-right">{cr != null ? <RateChip value={cr} target={0.95} /> : <span className="text-ink-300">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
