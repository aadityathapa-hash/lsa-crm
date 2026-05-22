import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
    const { data, error } = await supabase
      .from("v_market_performance")
      .select("*")
      .eq("market_id", selectedMarket)
      .eq("year", 2026)
      .order("month");
    if (error) console.error("Market report error:", error);
    setMonthlyData(data || []);
    setLoading(false);
  }

  const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const marketName = markets.find(m => m.id === selectedMarket)?.name || "";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Market Reports</h1>
        <select value={selectedMarket || ""} onChange={(e) => setSelectedMarket(e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-3 py-1.5 text-slate-600 bg-white">
          {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Trend cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {monthlyData.length > 0 && (() => {
              const latest = monthlyData[monthlyData.length - 1];
              const prev = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
              const delta = prev ? latest.total_leads - prev.total_leads : 0;
              const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
              return (
                <>
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase">Latest Month ({months[latest.month]})</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{latest.total_leads} leads</p>
                    <p className="text-xs text-slate-400 mt-0.5">{deltaStr} vs prior month</p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase">Connection Rate</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {latest.connection_rate ? (latest.connection_rate * 100).toFixed(1) + "%" : "—"}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase">CPL</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {latest.cpl ? "$" + Number(latest.cpl).toFixed(2) : "No spend data"}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Monthly trend table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">{marketName} — Monthly Trend (2026)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-2 font-medium text-slate-500">Month</th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-right">Total</th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-right">Charged</th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-right">Connected</th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-right">Missed</th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-right">Conn. Rate</th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-right">CPL</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((row) => (
                    <tr key={row.month} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{months[row.month]} 2026</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.total_leads}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.charged_leads}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.connected}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{row.missed}</td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {row.connection_rate ? (row.connection_rate * 100).toFixed(1) + "%" : "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {row.cpl ? "$" + Number(row.cpl).toFixed(2) : "—"}
                      </td>
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
