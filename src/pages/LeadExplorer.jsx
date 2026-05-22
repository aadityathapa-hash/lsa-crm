import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function LeadExplorer() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [market, setMarket] = useState("all");
  const [classification, setClassification] = useState("all");
  const [search, setSearch] = useState("");
  const [markets, setMarkets] = useState([]);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    supabase.from("markets").select("id, name").order("name").then(({ data }) => setMarkets(data || []));
  }, []);

  useEffect(() => {
    fetchLeads();
    setPage(0);
  }, [month, market, classification, search]);

  async function fetchLeads() {
    setLoading(true);
    let query = supabase
      .from("leads")
      .select("*, markets(name)")
      .eq("year", 2026)
      .eq("month", month)
      .eq("is_deleted", false)
      .order("lead_creation_timestamp", { ascending: false })
      .range(0, 999);

    if (market !== "all") query = query.eq("market_id", market);
    if (classification !== "all") query = query.eq("classification", classification);
    if (search) query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) console.error("Lead fetch error:", error);
    setLeads(data || []);
    setLoading(false);
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const paged = leads.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(leads.length / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Lead Explorer</h1>
        <span className="text-sm text-slate-400">{leads.length} leads</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {months.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                month === i + 1 ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}>{m}</button>
          ))}
        </div>
        <select value={market} onChange={(e) => setMarket(e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-3 py-1.5 text-slate-600 bg-white">
          <option value="all">All Markets</option>
          {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={classification} onChange={(e) => setClassification(e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-3 py-1.5 text-slate-600 bg-white">
          <option value="all">All Classifications</option>
          <option value="Connected">Connected</option>
          <option value="Missed">Missed</option>
          <option value="Non-Charged">Non-Charged</option>
        </select>
        <input type="text" placeholder="Search name or phone..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-3 py-1.5 text-slate-600 bg-white w-52" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-3 py-2 font-medium text-slate-500">Date</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Market</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Customer</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Phone</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Classification</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Duration</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Job Type</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Verified</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((lead) => (
                  <tr key={lead.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                      {lead.lead_creation_timestamp ? new Date(lead.lead_creation_timestamp).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-800 font-medium">{lead.markets?.name || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{lead.customer_name || "—"}</td>
                    <td className="px-3 py-2 text-slate-600 font-mono text-xs">{lead.phone || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        lead.classification === "Connected" ? "bg-green-100 text-green-700" :
                        lead.classification === "Missed" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>{lead.classification || "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{lead.duration_seconds ? `${lead.duration_seconds}s` : "—"}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{lead.job_type || "—"}</td>
                    <td className="px-3 py-2">{lead.agent_verified ? "✅" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30">← Previous</button>
            <span className="text-xs text-slate-400">Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
