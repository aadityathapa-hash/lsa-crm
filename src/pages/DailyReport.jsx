import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
    let query = supabase
      .from("v_daily_report")
      .select("*")
      .eq("month", month)
      .eq("year", 2026)
      .order("lead_date", { ascending: false });

    if (market !== "all") query = query.eq("market_name", markets.find(m => m.id === market)?.name);

    const { data: rows, error } = await query;
    if (error) console.error("Daily report error:", error);
    setData(rows || []);
    setLoading(false);
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Aggregate by date if all markets
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Daily Report</h1>
        <div className="flex gap-3">
          <select value={market} onChange={(e) => setMarket(e.target.value)}
            className="text-sm border border-slate-200 rounded-md px-3 py-1.5 text-slate-600 bg-white">
            <option value="all">All Markets</option>
            {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {months.map((m, i) => (
          <button key={m} onClick={() => setMonth(i + 1)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              month === i + 1 ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
            }`}>{m}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">
              Daily Leads — {months[month - 1]} 2026 {market !== "all" ? `(${markets.find(m => m.id === market)?.name})` : "(All Markets)"}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2 font-medium text-slate-500">Date</th>
                  {market === "all" ? null : <th className="px-4 py-2 font-medium text-slate-500">Market</th>}
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Total</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Charged</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Connected</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Missed</th>
                  <th className="px-4 py-2 font-medium text-slate-500 text-right">Conn. Rate</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map((row, i) => {
                  const cr = row.charged_leads > 0 ? ((row.connected / row.charged_leads) * 100).toFixed(1) : "—";
                  return (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{row.lead_date}</td>
                      {market === "all" ? null : <td className="px-4 py-2 text-slate-600">{row.market_name}</td>}
                      <td className="px-4 py-2 text-right text-slate-600">{row.total_leads}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.charged_leads}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.connected}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.missed}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{cr}%</td>
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
