import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function RateBadge({ rate }) {
  if (!rate || rate === "—") return <span className="text-slate-300">—</span>;
  const pct = typeof rate === "string" ? parseFloat(rate) : rate;
  const cls = pct >= 98 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : pct >= 95 ? "bg-blue-50 text-blue-700 border-blue-200"
    : pct >= 90 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>{pct}%</span>;
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

export default function DailyReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [market, setMarket] = useState("all");
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    supabase.from("markets").select("id, name").eq("active", true).order("name")
      .then(({ data }) => setMarkets(data || []));
  }, []);

  useEffect(() => { fetchData(); }, [month, market]);

  async function fetchData() {
    setLoading(true);
    // Read live agent_calls (the legacy v_daily_report view was built on the
    // retired `leads` table and froze on 2026-06-08). Classification mirrors
    // the Dashboard exactly: source_classification + result.
    const marketName = market !== "all" ? markets.find(m => m.id === market)?.name : null;
    let rows = [];
    let from = 0;
    while (true) {
      let q = supabase
        .from("agent_calls")
        .select("lead_creation_date, source_classification, result, market_name")
        .eq("month", month).eq("year", 2026)
        .range(from, from + 999);
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
    const out = Object.values(byKey)
      .map(o => ({ ...o, charged_leads: o.connected + o.missed - o.disputes }))
      .sort((a, b) => b.lead_date.localeCompare(a.lead_date));
    setData(out);
    setLoading(false);
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const aggregated = market === "all"
    ? Object.values(data.reduce((acc, row) => {
        const d = row.lead_date;
        if (!acc[d]) acc[d] = { lead_date: d, total_leads: 0, charged_leads: 0, connected: 0, missed: 0 };
        acc[d].total_leads += row.total_leads || 0;
        acc[d].charged_leads += row.charged_leads || 0;
        acc[d].connected += row.connected || 0;
        acc[d].missed += row.missed || 0;
        return acc;
      }, {})).sort((a, b) => b.lead_date.localeCompare(a.lead_date))
    : data;

  // Summary KPIs
  const totalLeads = aggregated.reduce((s, r) => s + (r.total_leads || 0), 0);
  const totalCharged = aggregated.reduce((s, r) => s + (r.charged_leads || 0), 0);
  const totalConnected = aggregated.reduce((s, r) => s + (r.connected || 0), 0);
  const totalMissed = aggregated.reduce((s, r) => s + (r.missed || 0), 0);
  const avgRate = totalCharged > 0 ? ((totalConnected / totalCharged) * 100).toFixed(1) : "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Report</h1>
          <p className="text-sm text-slate-400 mt-0.5">{months[month - 1]} 2026 — {market === "all" ? "All Markets" : markets.find(m => m.id === market)?.name}</p>
        </div>
        <select value={market} onChange={(e) => setMarket(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none">
          <option value="all">All Markets</option>
          {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div className="flex gap-0.5 bg-white rounded-lg border border-slate-200 p-0.5 mb-6 w-fit">
        {months.map((m, i) => (
          <button key={m} onClick={() => setMonth(i + 1)}
            className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
              month === i + 1 ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}>{m}</button>
        ))}
      </div>

      {/* Summary strip */}
      {!loading && aggregated.length > 0 && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total Leads", value: totalLeads.toLocaleString(), accent: "bg-blue-50" },
            { label: "Charged", value: totalCharged.toLocaleString(), accent: "bg-emerald-50" },
            { label: "Connected", value: totalConnected.toLocaleString(), accent: "bg-emerald-50" },
            { label: "Missed", value: totalMissed.toLocaleString(), accent: totalMissed > 0 ? "bg-red-50" : "bg-slate-50" },
            { label: "Conn. Rate", value: avgRate + (avgRate !== "—" ? "%" : ""), accent: parseFloat(avgRate) >= 95 ? "bg-emerald-50" : "bg-amber-50" },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{k.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      ) : aggregated.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-slate-400 text-sm">No leads found for {months[month - 1]} 2026</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-[13px] font-semibold text-slate-800">
              {aggregated.length} days with leads
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-left">Date</th>
                  {market !== "all" && <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-left">Market</th>}
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Total</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Charged</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Connected</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Missed</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Conn. Rate</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map((row, i) => {
                  const cr = row.charged_leads > 0 ? ((row.connected / row.charged_leads) * 100).toFixed(1) : null;
                  return (
                    <tr key={i} className={`border-t border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 ? "bg-slate-50/30" : ""}`}>
                      <td className="px-5 py-3 font-semibold text-slate-800 text-[13px]">{row.lead_date}</td>
                      {market !== "all" && <td className="px-5 py-3 text-slate-600">{row.market_name}</td>}
                      <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{row.total_leads}</td>
                      <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{row.charged_leads}</td>
                      <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{row.connected}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        <span className={row.missed > 0 ? "text-red-600 font-semibold" : "text-slate-600"}>{row.missed}</span>
                      </td>
                      <td className="px-5 py-3 text-right"><RateBadge rate={cr} /></td>
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
