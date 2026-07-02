import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Target, TrendingDown, PhoneMissed, UserX, CircleDollarSign, MapPinOff, ChevronRight, ShieldCheck, PhoneOff, Unlink } from "lucide-react";
import { Skeleton } from "../components/ui";

// Not a real terminal disposition — a call sitting on one of these past its
// window means an agent never finished statusing it (Maddie's flow step:
// "Agent statuses call and completes lead"). "Not Booked" is deliberately
// excluded: Maddie's own flow lists it as a completed reason for not booking,
// not an open one.
const OPEN_RESULTS = new Set([null, "", "Pending", "Attempting Contact", "New"]);
const STALE_DAYS = 5;
const UNATTRIBUTED_NAME = "Unattributed";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CONN_TARGET = 0.95;

async function pull(month, year, cols) {
  let rows = [], from = 0;
  while (true) {
    const { data: batch } = await supabase.from("agent_calls").select(cols)
      .eq("month", month).eq("year", year).eq("is_deleted", false).range(from, from + 999);
    if (!batch || batch.length === 0) break;
    rows = rows.concat(batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return rows;
}
function marketsFrom(rows) {
  const by = {};
  rows.forEach((r) => {
    const name = r.market_name || "Unattributed";
    by[name] ||= { market_name: name, market_id: r.market_id, connected: 0, missed: 0, disputes: 0, total: 0 };
    by[name].total++;
    if (r.source_classification === "Charged Call - Connected") by[name].connected++;
    else if (r.source_classification === "Charged Call - Missed") by[name].missed++;
    if (r.result === "Dispute - Approved") by[name].disputes++;
  });
  return Object.values(by).map((m) => ({ ...m, charged: m.connected + m.missed - m.disputes, connRate: m.connected + m.missed > 0 ? m.connected / (m.connected + m.missed) : null }));
}

const SEV = {
  crit: { label: "Critical", chip: "bg-critical-50 text-critical", text: "text-critical", dot: "bg-critical" },
  warn: { label: "Warning", chip: "bg-caution-50 text-caution", text: "text-caution", dot: "bg-caution" },
  data: { label: "Data quality", chip: "bg-steel-50 text-steel", text: "text-steel", dot: "bg-steel" },
};

export default function Exceptions() {
  const [items, setItems] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const year = 2026;
  const navigate = useNavigate();

  useEffect(() => { load(); }, [month]);

  async function load() {
    setLoading(true);
    const prevMonth = month > 1 ? month - 1 : 12;
    const prevYear = month > 1 ? year : year - 1;
    const [cur, prv, agentCalls, agents, costs, sfBooked, curPhones] = await Promise.all([
      pull(month, year, "source_classification, result, market_id, market_name, hour_of_day"),
      pull(prevMonth, prevYear, "source_classification, result, market_name"),
      pull(month, year, "agent_id, result, is_bot"),
      supabase.from("agents").select("id, name").then((r) => r.data || []),
      supabase.from("lead_costs").select("market_id, total_spend").eq("month", month).eq("year", year).then((r) => r.data || []),
      supabase.from("sf_opportunities").select("phone, status, contact_name, opportunity_id")
        .gte("create_datetime", `${year}-${String(month).padStart(2, "0")}-01`)
        .lt("create_datetime", month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`)
        .then((r) => r.data || []),
      pull(month, year, "phone, op_id, agent_id, result, is_bot, lead_creation_date, client_name"),
    ]);
    const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));
    const curM = marketsFrom(cur);
    const prevM = Object.fromEntries(marketsFrom(prv).map((m) => [m.market_name, m]));
    const real = curM.filter((m) => m.market_name !== "Unattributed");
    const list = [];

    real.filter((m) => m.connRate != null && m.connRate < CONN_TARGET && m.charged >= 5)
      .forEach((m) => list.push({
        sev: m.connRate < 0.90 ? "crit" : "warn", icon: Target, title: m.market_name,
        detail: `Connection ${(m.connRate * 100).toFixed(1)}% · ${m.missed} missed of ${m.charged} billable`,
        metric: `${(m.connRate * 100).toFixed(0)}%`, owner: "Market lead", onClick: () => navigate(`/markets`),
      }));

    real.forEach((m) => {
      const p = prevM[m.market_name];
      if (p && m.connRate != null && p.connRate != null) {
        const d = (m.connRate - p.connRate) * 100;
        if (d < -3) list.push({
          sev: d < -5 ? "crit" : "warn", icon: TrendingDown, title: m.market_name,
          detail: `${(m.connRate * 100).toFixed(1)}% now, was ${(p.connRate * 100).toFixed(1)}% in ${MONTHS[prevMonth]}`,
          metric: `${d.toFixed(1)} pts`, owner: "Market lead", onClick: () => navigate(`/markets`),
        });
      }
    });

    const missedByHour = {};
    cur.filter((r) => r.source_classification === "Charged Call - Missed" && r.hour_of_day != null)
      .forEach((r) => { missedByHour[r.hour_of_day] = (missedByHour[r.hour_of_day] || 0) + 1; });
    const totalMissed = cur.filter((r) => r.source_classification === "Charged Call - Missed").length;
    Object.entries(missedByHour).filter(([, c]) => c >= 3).sort(([, a], [, b]) => b - a).slice(0, 5)
      .forEach(([hour, c]) => list.push({
        sev: c >= 5 ? "crit" : "warn", icon: PhoneMissed, title: `${hour}:00 CST`,
        detail: `${((c / totalMissed) * 100).toFixed(0)}% of all missed calls cluster in this hour`,
        metric: `${c} missed`, owner: "Floor manager", onClick: () => navigate(`/leads?classification=Missed`),
      }));

    const aStats = {};
    agentCalls.forEach((c) => {
      const key = c.agent_id || (c.is_bot ? "bot" : "unknown");
      aStats[key] ||= { calls: 0, booked: 0, isBot: c.is_bot };
      aStats[key].calls++;
      if (c.result === "Booked" || c.result === "FU Booked") aStats[key].booked++;
    });
    Object.entries(aStats).filter(([k, s]) => s.calls >= 10 && !s.isBot && k !== "bot" && k !== "unknown")
      .map(([id, s]) => ({ name: agentMap[id] || "Unknown", rate: s.booked / s.calls, ...s }))
      .filter((a) => a.rate < 0.30).sort((a, b) => a.rate - b.rate)
      .forEach((a) => list.push({
        sev: a.rate < 0.20 ? "crit" : "warn", icon: UserX, title: a.name,
        detail: `${a.booked} booked of ${a.calls} calls`, metric: `${(a.rate * 100).toFixed(1)}%`,
        owner: "Team lead", onClick: () => navigate("/agents"),
      }));

    // Maddie's flow, alert 1 — "agent statuses call and completes lead": a real
    // human-handled call sitting on a non-terminal result past STALE_DAYS means
    // nobody finished working it. Avoca auto-completes, so bot calls are exempt.
    const today = new Date();
    const staleByAgent = {};
    // Unassigned/unattributed calls have no agent to hold accountable — they're
    // already surfaced by the "Unattributed leads" data-quality item below.
    curPhones.filter((r) => !r.is_bot && r.agent_id && agentMap[r.agent_id] !== UNATTRIBUTED_NAME
      && OPEN_RESULTS.has(r.result) && r.lead_creation_date)
      .forEach((r) => {
        const days = (today - new Date(r.lead_creation_date + "T00:00:00")) / 86400000;
        if (days < STALE_DAYS) return;
        staleByAgent[r.agent_id] = (staleByAgent[r.agent_id] || 0) + 1;
      });
    Object.entries(staleByAgent).filter(([, c]) => c >= 3)
      .sort(([, a], [, b]) => b - a)
      .forEach(([id, c]) => list.push({
        sev: c >= 10 ? "crit" : "warn", icon: PhoneOff,
        title: agentMap[id] || "Unassigned", detail: `${c} calls left unstatused ${STALE_DAYS}+ days — never marked booked, not booked, or archived`,
        metric: `${c} open`, owner: "Team lead", onClick: () => navigate(`/leads?month=${month}&agent=${id}&status=Pending`),
      }));

    // Maddie's flow, alert 2 — SF cross-reference: a booked Salesforce opp with
    // NO matching agent_calls row at all (not even our own SF/Dialpad ingestion)
    // is a genuine pipeline gap, not just an "other channel" booking.
    const clean = (p) => String(p || "").replace(/\D/g, "").slice(-10);
    const knownPhones = new Set(curPhones.map((r) => clean(r.phone)).filter(Boolean));
    const knownOps = new Set(curPhones.map((r) => r.op_id).filter(Boolean));
    const BOOKED_SF = new Set(["paid", "invoiced", "job booked", "on-site estimate booked", "estimate presented", "canceled"]);
    const orphanSf = sfBooked.filter((r) => BOOKED_SF.has((r.status || "").toLowerCase())
      && !knownPhones.has(clean(r.phone)) && !knownOps.has(String(r.opportunity_id)));
    if (orphanSf.length > 0) list.push({
      sev: orphanSf.length >= 5 ? "crit" : "warn", icon: Unlink, title: "Salesforce bookings with no lead record",
      detail: `${orphanSf.length} booked opp${orphanSf.length > 1 ? "s" : ""} (e.g. ${orphanSf.slice(0, 2).map((r) => r.contact_name || "unknown").join(", ")}) have no matching row anywhere in the CRM`,
      metric: `${orphanSf.length}`, owner: "Admin", onClick: () => navigate("/admin"),
    });

    const spendMarkets = new Set(costs.filter((c) => c.total_spend > 0).map((c) => c.market_id));
    real.filter((m) => m.market_id && !spendMarkets.has(m.market_id)).forEach((m) => list.push({
      sev: "data", icon: CircleDollarSign, title: m.market_name,
      detail: "No marketing spend entered — CPL can't be calculated", metric: "no spend",
      owner: "Admin", onClick: () => navigate("/admin?tab=spend"),
    }));

    const unattr = curM.find((m) => m.market_name === "Unattributed");
    if (unattr) list.push({
      sev: "data", icon: MapPinOff, title: "Unattributed leads",
      detail: `${unattr.total} leads have no market from the source`, metric: `${unattr.total}`,
      owner: "Admin", onClick: () => navigate("/admin"),
    });

    const totalConnected = cur.filter((r) => r.source_classification === "Charged Call - Connected").length;
    const totalCharged = totalConnected + totalMissed;
    setSummary({ leads: cur.length, missed: totalMissed, connRate: totalCharged ? ((totalConnected / totalCharged) * 100).toFixed(1) : "—", issues: list.length });
    setItems(list);
    setLoading(false);
  }

  const groups = ["crit", "warn", "data"].map((sev) => ({ sev, rows: (items || []).filter((i) => i.sev === sev) })).filter((g) => g.rows.length);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink-900">Attention</h1>
          <p className="text-[13px] text-ink-500 mt-1">Ranked queue of what needs action this month.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-0.5 bg-surface rounded-lg border border-ink-200 p-1 shrink-0">
          {MONTHS.slice(1).map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${month === i + 1 ? "bg-accent text-white" : "text-ink-400 hover:text-ink-800 hover:bg-ink-50"}`}>{m}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { k: "Leads", v: summary.leads.toLocaleString() },
              { k: "Connection rate", v: summary.connRate + "%" },
              { k: "Missed calls", v: summary.missed },
              { k: "Open items", v: summary.issues },
            ].map((s) => (
              <div key={s.k} className="bg-surface rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] p-4">
                <div className="text-[12px] font-medium text-ink-500">{s.k}</div>
                <div className="text-[26px] font-bold tracking-[-0.02em] tnum mt-2 leading-none">{s.v}</div>
              </div>
            ))}
          </div>

          {groups.length === 0 ? (
            <div className="bg-surface rounded-[12px] border border-ink-100 py-14 text-center">
              <ShieldCheck size={28} className="mx-auto text-accent" />
              <p className="text-sm font-medium text-ink-700 mt-3">Nothing needs attention</p>
              <p className="text-[13px] text-ink-400 mt-1">All markets at target, no missed-call spikes, no data gaps for {MONTHS[month]}.</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.sev}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`h-2 w-2 rounded-full ${SEV[g.sev].dot}`} />
                  <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">{SEV[g.sev].label}</h2>
                  <span className="text-[11px] text-ink-400">{g.rows.length}</span>
                </div>
                <div className="bg-surface rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
                  {g.rows.map((it, i) => {
                    const Icon = it.icon;
                    return (
                      <button key={i} onClick={it.onClick}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left border-t border-ink-50 first:border-t-0 hover:bg-ink-50/60 transition-colors">
                        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${SEV[g.sev].chip}`}><Icon size={16} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-ink-800 truncate">{it.title}</div>
                          <div className="text-[12px] text-ink-500 truncate">{it.detail}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-[13px] font-semibold tnum ${SEV[g.sev].text}`}>{it.metric}</div>
                          <div className="text-[11px] text-ink-400">{it.owner}</div>
                        </div>
                        <ChevronRight size={16} className="text-ink-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
