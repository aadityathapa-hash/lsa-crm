import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// agent_calls.source_classification -> short label used by the UI
const shortClass = (sc) => {
  if (!sc) return null;
  if (sc.includes("Connected")) return "Connected";
  if (sc.includes("Missed")) return "Missed";
  if (sc.toLowerCase().includes("non")) return "Non-Charged";
  return sc;
};
const CLASS_TO_SC = {
  Connected: "Charged Call - Connected",
  Missed: "Charged Call - Missed",
  "Non-Charged": "Non Charged Call",
};

function ClassBadge({ classification }) {
  const cls = classification === "Connected" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : classification === "Missed" ? "bg-red-50 text-red-700 border-red-200"
    : classification === "Non-Charged" ? "bg-slate-100 text-slate-600 border-slate-200"
    : "bg-slate-50 text-slate-400 border-slate-200";
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>{classification || "—"}</span>;
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

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
    // Single source of truth: read from agent_calls (the source-built pipeline),
    // not the legacy `leads` table. Paginates past the 1000-row cap.
    let rows = [], from = 0;
    while (true) {
      let query = supabase
        .from("agent_calls")
        .select("id, lead_creation_date, market_name, client_name, phone, source_classification, duration_seconds, job_type")
        .eq("year", 2026).eq("month", month).eq("is_deleted", false)
        .order("lead_creation_date", { ascending: false })
        .range(from, from + 999);
      if (market !== "all") query = query.eq("market_name", market);
      if (classification !== "all") query = query.eq("source_classification", CLASS_TO_SC[classification]);
      if (search) query = query.or(`client_name.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data: batch } = await query;
      if (!batch || batch.length === 0) break;
      rows = rows.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }
    setLeads(rows);
    setLoading(false);
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const paged = leads.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(leads.length / pageSize);

  // Summary counts
  const connected = leads.filter(l => shortClass(l.source_classification) === "Connected").length;
  const missed = leads.filter(l => shortClass(l.source_classification) === "Missed").length;
  const nonCharged = leads.filter(l => shortClass(l.source_classification) === "Non-Charged").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lead Explorer</h1>
          <p className="text-sm text-slate-400 mt-0.5">{months[month - 1]} 2026 — {leads.length} leads found</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-bold">{connected}</span> Connected
          <span className="bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5 font-bold ml-2">{missed}</span> Missed
          <span className="bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2 py-0.5 font-bold ml-2">{nonCharged}</span> Non-Charged
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-0.5 bg-white rounded-lg border border-slate-200 p-0.5">
          {months.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                month === i + 1 ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}>{m}</button>
          ))}
        </div>
        <select value={market} onChange={(e) => setMarket(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none">
          <option value="all">All Markets</option>
          {markets.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
        <select value={classification} onChange={(e) => setClassification(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none">
          <option value="all">All Classifications</option>
          <option value="Connected">Connected</option>
          <option value="Missed">Missed</option>
          <option value="Non-Charged">Non-Charged</option>
        </select>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search name or phone..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-slate-600 bg-white w-56 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)}</div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-slate-400 text-sm">No leads match your filters</p>
          <p className="text-slate-300 text-xs mt-1">Try adjusting the month, market, or classification</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80">
                  {["Date", "Market", "Customer", "Phone", "Classification", "Duration", "Job Type"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((lead, i) => (
                  <tr key={lead.id} className={`border-t border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 ? "bg-slate-50/30" : ""}`}>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-[13px]">
                      {lead.lead_creation_date ? new Date(lead.lead_creation_date + "T00:00:00").toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-semibold text-[13px]">{lead.market_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.client_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{lead.phone || "—"}</td>
                    <td className="px-4 py-3"><ClassBadge classification={shortClass(lead.source_classification)} /></td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {lead.duration_seconds ? (
                        <span className="text-emerald-600 font-medium">{lead.duration_seconds}s</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{lead.job_type || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-30 transition-colors">← Previous</button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p;
                  if (totalPages <= 7) p = i;
                  else if (page < 3) p = i;
                  else if (page > totalPages - 4) p = totalPages - 7 + i;
                  else p = page - 3 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${
                        page === p ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100"
                      }`}>{p + 1}</button>
                  );
                })}
              </div>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-30 transition-colors">Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
