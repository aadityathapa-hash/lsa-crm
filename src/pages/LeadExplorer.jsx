import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Search, X, Bot, User, Users } from "lucide-react";
import { StatusChip, SourceTag, Skeleton, EmptyState } from "../components/ui";
import { handledLabel } from "../lib/leadHandler";

const HANDLER_ICON = { bot: Bot, avoca: Bot, agent: User, queue: Users, unattr: User };
const HANDLER_CLS = { bot: "text-steel", avoca: "text-steel", agent: "text-ink-500", queue: "text-ink-500", unattr: "text-ink-400" };

const shortClass = (sc) => {
  if (!sc) return null;
  if (sc.includes("Connected")) return "Connected";
  if (sc.includes("Missed")) return "Missed";
  if (sc.toLowerCase().includes("non")) return "Non-billable";
  return sc;
};
const CLASS_TO_SC = {
  Connected: "Charged Call - Connected",
  Missed: "Charged Call - Missed",
  "Non-billable": "Non Charged Call",
};
const fmtDate = (s) => (s ? new Date(s).toLocaleString() : null);
const fmtPhone = (p) => {
  const d = String(p || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (p || "—");
};
const JOB_STATUSES = ["Booked", "Pending", "Completed", "Canceled", "No-show", "Rescheduled"];

const CLASS_TONE = { Connected: "positive", Missed: "critical", "Non-billable": "neutral" };
const STATUS_TONE = { Completed: "positive", Booked: "info", Pending: "info", Rescheduled: "caution", Canceled: "critical", "No-show": "critical" };

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider">{label}</p>
      <p className="text-[13px] text-ink-800 break-words mt-0.5">{value || <span className="text-ink-300">—</span>}</p>
    </div>
  );
}

export default function LeadExplorer() {
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const m = parseInt(searchParams.get("month"), 10);
    return m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
  });
  const [market, setMarket] = useState(() => searchParams.get("market") || "all");
  const [classification, setClassification] = useState(() => searchParams.get("classification") || "all");
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [markets, setMarkets] = useState([]);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [sfDetail, setSfDetail] = useState(null);
  const [agentMap, setAgentMap] = useState({});
  const pageSize = 50;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  useEffect(() => {
    supabase.from("markets").select("id, name").order("name").then(({ data }) => setMarkets(data || []));
    supabase.from("agents").select("id, name").then(({ data }) =>
      setAgentMap(Object.fromEntries((data || []).map((a) => [a.id, a.name]))));
  }, []);

  async function openLead(lead) {
    setSelected(lead);
    setSfDetail(null);
    if (lead.phone) {
      const { data } = await supabase
        .from("sf_opportunities")
        .select("status, initial_scheduled_start, last_scheduled_date, last_modified_date, created_by, amount, cancellation_source, franchise, contact_name, opportunity_id")
        .eq("phone", lead.phone).order("last_modified_date", { ascending: false }).limit(1);
      setSfDetail(data && data[0] ? data[0] : null);
    }
  }

  useEffect(() => { fetchLeads(); setPage(0); }, [month, market, classification, search]);

  // Auto-open a specific lead when arriving from a deep link (?lead=<id>).
  const openedLeadRef = useRef(null);
  useEffect(() => {
    const leadId = searchParams.get("lead");
    if (!leadId || leads.length === 0 || openedLeadRef.current === leadId) return;
    const found = leads.find((l) => String(l.id) === String(leadId));
    if (found) { openedLeadRef.current = leadId; openLead(found); }
  }, [leads, searchParams]);

  async function fetchLeads() {
    setLoading(true);
    let rows = [], from = 0;
    while (true) {
      let query = supabase
        .from("agent_calls")
        .select("id, lead_creation_date, market_name, client_name, phone, source_classification, duration_seconds, job_type, agent_id, result, revenue, notes, is_bot, op_id, hour_of_day")
        .eq("year", 2026).eq("month", month).eq("is_deleted", false)
        .order("lead_creation_date", { ascending: false })
        .range(from, from + 999);
      if (market !== "all") query = query.eq("market_name", market);
      if (classification === "Billable") query = query.in("source_classification", ["Charged Call - Connected", "Charged Call - Missed"]);
      else if (classification !== "all") query = query.eq("source_classification", CLASS_TO_SC[classification]);
      if (search) query = query.or(`client_name.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data: batch } = await query;
      if (!batch || batch.length === 0) break;
      rows = rows.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }
    const { data: statuses } = await supabase.from("lead_status").select("op_id, status");
    const smap = Object.fromEntries((statuses || []).map((s) => [s.op_id, s.status]));
    setLeads(rows.map((r) => ({ ...r, _status: smap[r.op_id] || null })));
    setLoading(false);
  }

  async function saveStatus(opId, status) {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("lead_status").upsert(
      { op_id: opId, status: status || null, updated_by: auth?.user?.email || null, updated_at: new Date().toISOString() },
      { onConflict: "op_id" }
    );
    setLeads((prev) => prev.map((l) => (l.op_id === opId ? { ...l, _status: status || null } : l)));
    setSelected((prev) => (prev ? { ...prev, _status: status || null } : prev));
  }

  const paged = leads.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(leads.length / pageSize);
  const connected = leads.filter((l) => shortClass(l.source_classification) === "Connected").length;
  const missed = leads.filter((l) => shortClass(l.source_classification) === "Missed").length;
  const nonbill = leads.filter((l) => shortClass(l.source_classification) === "Non-billable").length;

  const selectCls = "text-[13px] border border-ink-200 rounded-lg px-3 h-9 text-ink-700 bg-surface outline-none focus:border-accent";

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink-900">Leads</h1>
          <p className="text-[13px] text-ink-500 mt-1">Search and investigate individual LSA leads.</p>
          <div className="flex items-center gap-2 mt-3">
            <SourceTag source="call" />
            <span className="text-[12px] text-ink-400">{leads.length.toLocaleString()} leads · {months[month - 1]} 2026</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-0.5 bg-surface rounded-lg border border-ink-200 p-1 shrink-0">
          {months.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${month === i + 1 ? "bg-accent text-white" : "text-ink-400 hover:text-ink-800 hover:bg-ink-50"}`}>{m}</button>
          ))}
        </div>
      </div>

      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input type="text" placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)}
            className="text-[13px] border border-ink-200 rounded-lg pl-9 pr-3 h-9 text-ink-700 bg-surface w-64 outline-none focus:border-accent" />
        </div>
        <select value={market} onChange={(e) => setMarket(e.target.value)} className={selectCls}>
          <option value="all">All markets</option>
          {markets.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
        <select value={classification} onChange={(e) => setClassification(e.target.value)} className={selectCls}>
          <option value="all">All classifications</option>
          <option value="Billable">Billable (connected + missed)</option>
          <option value="Connected">Connected</option>
          <option value="Missed">Missed</option>
          <option value="Non-billable">Non-billable</option>
        </select>
        <div className="ml-auto flex items-center gap-2 text-[12px] text-ink-500">
          <StatusChip tone="positive">{connected.toLocaleString()} connected</StatusChip>
          <StatusChip tone="critical">{missed} missed</StatusChip>
          <StatusChip tone="neutral">{nonbill} non-billable</StatusChip>
        </div>
      </div>

      {/* table */}
      {loading ? (
        <div className="space-y-2">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : leads.length === 0 ? (
        <div className="bg-surface rounded-[12px] border border-ink-100">
          <EmptyState title="No leads match these filters" hint="Try a different month, market, or classification."
            action={<button onClick={() => { setMarket("all"); setClassification("all"); setSearch(""); }} className="text-[13px] font-medium text-accent hover:text-accent-600">Clear filters</button>} />
        </div>
      ) : (
        <div className="bg-surface rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100">
                  {["Date", "Market", "Customer", "Phone", "Class", "Handled", "Duration", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider text-left bg-ink-50/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((lead) => {
                  const cls = shortClass(lead.source_classification);
                  const named = (lead.client_name || "").trim();
                  return (
                    <tr key={lead.id} onClick={() => openLead(lead)}
                      className="border-t border-ink-50 hover:bg-ink-50/60 cursor-pointer transition-colors">
                      <td className="px-4 py-2.5 text-ink-500 whitespace-nowrap text-[13px]">
                        {lead.lead_creation_date ? new Date(lead.lead_creation_date + "T00:00:00").toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-ink-800 font-medium text-[13px]">{lead.market_name || <span className="text-ink-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-[13px]">{named || <span className="text-ink-400 italic">Unknown caller</span>}</td>
                      <td className="px-4 py-2.5 text-ink-500 font-mono text-[12px] whitespace-nowrap">{fmtPhone(lead.phone)}</td>
                      <td className="px-4 py-2.5">{cls ? <StatusChip tone={CLASS_TONE[cls]}>{cls}</StatusChip> : <span className="text-ink-300">—</span>}</td>
                      <td className="px-4 py-2.5">
                        {(() => {
                          const h = handledLabel({ is_bot: lead.is_bot, agentName: agentMap[lead.agent_id], source_classification: lead.source_classification, notes: lead.notes });
                          const Icon = HANDLER_ICON[h.kind] || User;
                          return <span className={`inline-flex items-center gap-1 text-[12px] ${HANDLER_CLS[h.kind] || "text-ink-500"}`}><Icon size={13} />{h.text}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-2.5 text-ink-600 tnum text-[13px]">{lead.duration_seconds ? `${lead.duration_seconds}s` : <span className="text-ink-300">—</span>}</td>
                      <td className="px-4 py-2.5">{lead._status ? <StatusChip tone={STATUS_TONE[lead._status] || "neutral"}>{lead._status}</StatusChip> : <span className="text-ink-400 text-[12px]">{lead.result || "—"}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-ink-100">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="text-[13px] font-medium text-ink-500 hover:text-ink-800 disabled:opacity-30">← Previous</button>
              <span className="text-[12px] text-ink-400">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="text-[13px] font-medium text-ink-500 hover:text-ink-800 disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setSelected(null)} className="absolute inset-0 bg-ink-900/30" style={{ animation: "overlay-in .15s ease-out" }} />
          <div className="relative h-full w-full max-w-[480px] bg-surface shadow-[0_0_40px_-8px_rgba(20,24,31,.3)] overflow-y-auto" style={{ animation: "drawer-in .18s ease-out" }}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-surface z-10">
              <div className="min-w-0">
                <h2 className="text-[17px] font-bold text-ink-900 truncate">{(selected.client_name || "").trim() || <span className="italic text-ink-500">Unknown caller</span>}</h2>
                <p className="text-[12px] text-ink-400 font-mono mt-0.5">{fmtPhone(selected.phone)}</p>
                <div className="flex items-center gap-2 mt-2">
                  {shortClass(selected.source_classification) && <StatusChip tone={CLASS_TONE[shortClass(selected.source_classification)]}>{shortClass(selected.source_classification)}</StatusChip>}
                  {selected.is_bot ? <StatusChip tone="info">Bot</StatusChip> : <StatusChip tone="neutral">Human</StatusChip>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-ink-400 hover:text-ink-800 -mr-1 -mt-1 p-1"><X size={20} /></button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <p className="text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Job status {selected._status && <span className="text-ink-400 normal-case font-normal">· manual override</span>}</p>
                {selected.op_id ? (
                  <select value={selected._status || ""} onChange={(e) => saveStatus(selected.op_id, e.target.value)}
                    className="text-[13px] border border-ink-200 rounded-lg px-3 h-10 w-full bg-surface outline-none focus:border-accent">
                    <option value="">Not set — source result: {selected.result || "—"}</option>
                    {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <p className="text-[12px] text-ink-400">No opportunity ID — status can't be tracked for this lead.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Market" value={selected.market_name} />
                <Field label="Date" value={selected.lead_creation_date ? new Date(selected.lead_creation_date + "T00:00:00").toLocaleDateString() : null} />
                <Field label="Handled by" value={handledLabel({ is_bot: selected.is_bot, agentName: agentMap[selected.agent_id], source_classification: selected.source_classification, notes: selected.notes }).text} />
                <Field label="Result" value={selected.result} />
                <Field label="Duration" value={selected.duration_seconds ? selected.duration_seconds + "s" : null} />
                <Field label="Revenue" value={selected.revenue != null ? "$" + Number(selected.revenue).toLocaleString() : null} />
                <Field label="Opportunity ID" value={selected.op_id} />
                <Field label="Job type" value={selected.job_type} />
              </div>

              <div className="pt-4 border-t border-ink-100">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider">Salesforce</p>
                  <SourceTag source="sf" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="SF status" value={sfDetail?.status} />
                  <Field label="Booked by" value={sfDetail?.created_by} />
                  <Field label="Last contacted" value={fmtDate(sfDetail?.last_modified_date)} />
                  <Field label="Scheduled start" value={fmtDate(sfDetail?.initial_scheduled_start)} />
                  <Field label="Last scheduled" value={fmtDate(sfDetail?.last_scheduled_date)} />
                  <Field label="Cancellation" value={sfDetail?.cancellation_source} />
                </div>
              </div>

              {selected.notes && (
                <div className="pt-4 border-t border-ink-100">
                  <p className="text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Notes</p>
                  <p className="text-[13px] text-ink-700 leading-relaxed">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
