import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function RateBadge({ rate }) {
  if (!rate && rate !== 0) return <span className="text-slate-300">—</span>;
  const pct = (rate * 100).toFixed(1);
  const cls = rate >= 0.98 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : rate >= 0.95 ? "bg-blue-50 text-blue-700 border-blue-200"
    : rate >= 0.90 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>{pct}%</span>;
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

export default function MarketReports() {
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("markets").select("id, name").eq("active", true).order("name")
      .then(({ data }) => {
        setMarkets(data || []);
        if (data?.length > 0) setSelectedMarket(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (selectedMarket) fetchMarketData();
  }, [selectedMarket]);

  async function fetchMarketData() {
    setLoading(true);
    // Read live agent_calls (the legacy v_market_performance view was built on
    // the retired `leads` table and froze on 2026-06-08). Spend/CPL still comes
    // from lead_costs. Classification mirrors the Dashboard.
    let rows = [];
    let from = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("agent_calls")
        .select("month, source_classification, result")
        .eq("market_id", selectedMarket).eq("year", 2026)
        .range(from, from + 999);
      if (!batch || batch.length === 0) break;
      rows = rows.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }

    const { data: costs } = await supabase
      .from("lead_costs").select("month, total_spend")
      .eq("market_id", selectedMarket).eq("year", 2026);
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
      return {
        ...o,
        charged_leads,
        connection_rate: denom > 0 ? o.connected / denom : null,
        total_spend: spend,
        cpl: charged_leads > 0 && spend > 0 ? spend / charged_leads : null,
      };
    }).sort((a, b) => a.month - b.month);
    setMonthlyData(out);
    setLoading(false);
  }

  const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const marketName = markets.find(m => m.id === selectedMarket)?.name || "";

  const latest = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;
  const prev = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
  const leadDelta = latest && prev ? latest.total_leads - prev.total_leads : null;
  const rateDelta = latest && prev && latest.connection_rate && prev.connection_rate
    ? ((latest.connection_rate - prev.connection_rate) * 100).toFixed(1) : null;

  // YTD totals
  const ytd = monthlyData.reduce((acc, r) => ({
    leads: acc.leads + (r.total_leads || 0),
    charged: acc.charged + (r.charged_leads || 0),
    connected: acc.connected + (r.connected || 0),
    missed: acc.missed + (r.missed || 0),
    spend: acc.spend + parseFloat(r.total_spend || 0),
  }), { leads: 0, charged: 0, connected: 0, missed: 0, spend: 0 });
  const ytdRate = ytd.charged > 0 ? ((ytd.connected / ytd.charged) * 100).toFixed(1) : "—";
  const ytdCpl = ytd.charged > 0 && ytd.spend > 0 ? (ytd.spend / ytd.charged).toFixed(2) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Market Reports</h1>
          <p className="text-sm text-slate-400 mt-0.5">{marketName} — 2026</p>
        </div>
        <select value={selectedMarket || ""} onChange={(e) => setSelectedMarket(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none">
          {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Latest ({months[latest.month]})</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-blue-50">📊</div>
                </div>
                <p className="text-[28px] font-bold text-slate-900 mt-2 tracking-tight leading-none">{latest.total_leads}</p>
                {leadDelta != null && (
                  <p className={`text-[11px] mt-2.5 font-medium ${leadDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {leadDelta >= 0 ? "↑" : "↓"} {leadDelta >= 0 ? "+" : ""}{leadDelta} vs {months[prev.month]}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Conn. Rate</p>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${latest.connection_rate >= 0.95 ? "bg-emerald-50" : "bg-amber-50"}`}>📈</div>
                </div>
                <p className="text-[28px] font-bold text-slate-900 mt-2 tracking-tight leading-none">
                  {latest.connection_rate ? (latest.connection_rate * 100).toFixed(1) + "%" : "—"}
                </p>
                {rateDelta != null && (
                  <p className={`text-[11px] mt-2.5 font-medium ${parseFloat(rateDelta) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {parseFloat(rateDelta) >= 0 ? "↑" : "↓"} {rateDelta} pts vs {months[prev.month]}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">CPL</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-emerald-50">💰</div>
                </div>
                <p className="text-[28px] font-bold text-slate-900 mt-2 tracking-tight leading-none">
                  {latest.cpl ? "$" + Number(latest.cpl).toFixed(2) : "—"}
                </p>
                <p className="text-[11px] mt-2.5 text-slate-400">{latest.cpl ? "per charged lead" : "No spend data"}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">YTD Leads</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-slate-50">📋</div>
                </div>
                <p className="text-[28px] font-bold text-slate-900 mt-2 tracking-tight leading-none">{ytd.leads}</p>
                <p className="text-[11px] mt-2.5 text-slate-400">{ytd.charged} charged</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">YTD Rate</p>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${parseFloat(ytdRate) >= 95 ? "bg-emerald-50" : "bg-amber-50"}`}>🎯</div>
                </div>
                <p className="text-[28px] font-bold text-slate-900 mt-2 tracking-tight leading-none">{ytdRate}%</p>
                <p className="text-[11px] mt-2.5 text-slate-400">{ytdCpl ? "CPL $" + ytdCpl : ""}</p>
              </div>
            </div>
          )}

          {/* Monthly table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-[13px] font-semibold text-slate-800">{marketName} — Monthly Trend (2026)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80">
                    {["Month", "Total", "Charged", "Connected", "Missed", "Conn. Rate", "CPL"].map((h, i) => (
                      <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((row, i) => (
                    <tr key={row.month} className={`border-t border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 ? "bg-slate-50/30" : ""}`}>
                      <td className="px-5 py-3 font-semibold text-slate-800 text-[13px]">{months[row.month]} 2026</td>
                      <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{row.total_leads}</td>
                      <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{row.charged_leads}</td>
                      <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{row.connected}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        <span className={row.missed > 0 ? "text-red-600 font-semibold" : "text-slate-600"}>{row.missed}</span>
                      </td>
                      <td className="px-5 py-3 text-right"><RateBadge rate={row.connection_rate} /></td>
                      <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{row.cpl ? "$" + Number(row.cpl).toFixed(2) : "—"}</td>
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
