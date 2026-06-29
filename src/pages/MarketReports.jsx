import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { BarChart3, Activity, DollarSign, ListChecks, Target } from "lucide-react";
import { KpiCard, RateChip, SourceTag, Caveat, Skeleton } from "../components/ui";

export default function MarketReports() {
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  useEffect(() => {
    supabase.from("markets").select("id, name").eq("active", true).order("name")
      .then(({ data }) => { setMarkets(data || []); if (data?.length > 0) setSelectedMarket(data[0].id); });
  }, []);

  useEffect(() => { if (selectedMarket) fetchMarketData(); }, [selectedMarket]);

  async function fetchMarketData() {
    setLoading(true);
    let rows = [], from = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("agent_calls").select("month, source_classification, result")
        .eq("market_id", selectedMarket).eq("year", 2026).range(from, from + 999);
      if (!batch || batch.length === 0) break;
      rows = rows.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }
    const { data: costs } = await supabase.from("lead_costs").select("month, total_spend").eq("market_id", selectedMarket).eq("year", 2026);
    const spendByMonth = {};
    (costs || []).forEach(c => { spendByMonth[c.month] = (spendByMonth[c.month] || 0) + parseFloat(c.total_spend || 0); });
    const byMonth = {};
    rows.forEach(r => {
      const m = r.month;
      if (!byMonth[m]) byMonth[m] = { month: m, total_leads: 0, connected: 0, missed: 0, disputes: 0 };
      const o = byMonth[m];
      o.total_leads++;
      if (r.source_classification === "Charged Call - Connected") o.connected++;
      else if (r.source_classification === "Charged Call - Missed") o.missed++;
      if (r.result === "Dispute - Approved") o.disputes++;
    });
    const out = Object.values(byMonth).map(o => {
      const charged_leads = o.connected + o.missed - o.disputes;
      const denom = o.connected + o.missed;
      const spend = spendByMonth[o.month] || 0;
      return { ...o, charged_leads, connection_rate: denom > 0 ? o.connected / denom : null, total_spend: spend, cpl: charged_leads > 0 && spend > 0 ? spend / charged_leads : null };
    }).sort((a, b) => a.month - b.month);
    setMonthlyData(out);
    setLoading(false);
  }

  const marketName = markets.find(m => m.id === selectedMarket)?.name || "";
  const latest = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;
  const prev = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
  const leadDelta = latest && prev ? latest.total_leads - prev.total_leads : null;
  const rateDelta = latest && prev && latest.connection_rate && prev.connection_rate ? +((latest.connection_rate - prev.connection_rate) * 100).toFixed(1) : null;
  const ytd = monthlyData.reduce((acc, r) => ({
    leads: acc.leads + (r.total_leads || 0), charged: acc.charged + (r.charged_leads || 0),
    connected: acc.connected + (r.connected || 0), spend: acc.spend + parseFloat(r.total_spend || 0),
  }), { leads: 0, charged: 0, connected: 0, spend: 0 });
  const ytdRate = ytd.charged > 0 ? ((ytd.connected / ytd.charged) * 100).toFixed(1) : "—";
  const ytdCpl = ytd.charged > 0 && ytd.spend > 0 ? (ytd.spend / ytd.charged).toFixed(2) : null;
  const noSpend = monthlyData.length > 0 && ytd.spend === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink-900">Markets</h1>
          <p className="text-[13px] text-ink-500 mt-1">Monthly trend, connection, and cost per market.</p>
          <div className="flex items-center gap-2 mt-3"><SourceTag source="call" /><span className="text-[12px] text-ink-400">{marketName} · 2026</span></div>
        </div>
        <select value={selectedMarket || ""} onChange={(e) => setSelectedMarket(e.target.value)}
          className="text-[13px] border border-ink-200 rounded-lg px-3 h-9 text-ink-700 bg-surface outline-none focus:border-accent shrink-0">
          {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {noSpend && <Caveat>No marketing spend entered for {marketName} in 2026, so CPL is unavailable. Add it in Admin → Marketing spend.</Caveat>}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KpiCard label={`Leads (${months[latest.month]})`} value={latest.total_leads} icon={BarChart3}
                delta={leadDelta} deltaLabel={prev ? `vs ${months[prev.month]}` : ""} />
              <KpiCard label="Conn. rate" value={latest.connection_rate ? (latest.connection_rate * 100).toFixed(1) : "—"} unit={latest.connection_rate ? "%" : ""} icon={Activity}
                delta={rateDelta} deltaLabel={prev ? `pts vs ${months[prev.month]}` : ""} />
              <KpiCard label="CPL" value={latest.cpl ? "$" + Number(latest.cpl).toFixed(2) : "—"} icon={DollarSign}
                sub={latest.cpl ? "per billable lead" : "no spend data"} />
              <KpiCard label="YTD leads" value={ytd.leads} icon={ListChecks} sub={`${ytd.charged} billable`} />
              <KpiCard label="YTD rate" value={ytdRate} unit={ytdRate !== "—" ? "%" : ""} icon={Target} sub={ytdCpl ? `CPL $${ytdCpl}` : null} />
            </div>
          )}

          <div className="bg-surface rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-ink-100 flex items-center gap-2">
              <h2 className="text-[13px] font-semibold text-ink-800">{marketName} — monthly trend</h2><SourceTag source="call" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100">
                    {["Month", "Leads", "Billable", "Connected", "Missed", "Conn. rate", "CPL"].map((h, i) => (
                      <th key={h} className={`px-5 py-2.5 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider bg-ink-50/60 ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((row) => (
                    <tr key={row.month} className="border-t border-ink-50 hover:bg-ink-50/60 transition-colors">
                      <td className="px-5 py-3 font-semibold text-ink-800 text-[13px]">{months[row.month]} 2026</td>
                      <td className="px-5 py-3 text-right text-ink-600 tnum">{row.total_leads}</td>
                      <td className="px-5 py-3 text-right text-ink-600 tnum">{row.charged_leads}</td>
                      <td className="px-5 py-3 text-right text-ink-600 tnum">{row.connected}</td>
                      <td className="px-5 py-3 text-right tnum"><span className={row.missed > 0 ? "text-critical font-semibold" : "text-ink-600"}>{row.missed}</span></td>
                      <td className="px-5 py-3 text-right">{row.connection_rate != null ? <RateChip value={row.connection_rate} target={0.95} /> : <span className="text-ink-300">—</span>}</td>
                      <td className="px-5 py-3 text-right text-ink-600 tnum">{row.cpl ? "$" + Number(row.cpl).toFixed(2) : <span className="text-ink-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
