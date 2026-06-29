import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { ArrowUpRight, ChevronRight, CircleAlert } from "lucide-react";
import {
  Metric, Section, SourceTag, RateChip, StatusChip, Caveat, Reconcile,
  Narrative, Skeleton, EmptyState,
} from "../components/ui";

const C = { accent: "#1f7a52", steel: "#2b5c8a", critical: "#b42318", ink300: "#b4bac6", ink100: "#e7e9ee", ink400: "#8a92a1" };
const CONN_TARGET = 95;

/* ---------------- data (unchanged logic) ---------------- */
async function fetchAgentCallStats(month, year) {
  let rows = [], from = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("agent_calls").select("source_classification, result, market_name, is_bot")
      .eq("month", month).eq("year", year).range(from, from + 999);
    if (!batch || batch.length === 0) break;
    rows = rows.concat(batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  if (!rows.length) return null;
  const total = rows.length;
  const connected = rows.filter(r => r.source_classification === "Charged Call - Connected").length;
  const missed = rows.filter(r => r.source_classification === "Charged Call - Missed").length;
  const nonCharged = rows.filter(r => r.source_classification === "Non Charged Call").length;
  const disputes = rows.filter(r => r.result === "Dispute - Approved").length;
  const charged = connected + missed - disputes;
  const booked = rows.filter(r => r.result === "Booked" || r.result === "FU Booked").length;
  const bot = rows.filter(r => r.is_bot).length;
  const connRate = (connected + missed) > 0 ? (connected / (connected + missed)) * 100 : 0;
  const byMarket = {};
  rows.forEach(r => {
    const m = r.market_name || "Unattributed";
    if (!byMarket[m]) byMarket[m] = { market_name: m, total: 0, connected: 0, missed: 0, booked: 0, disputes: 0 };
    byMarket[m].total++;
    if (r.source_classification === "Charged Call - Connected") byMarket[m].connected++;
    if (r.source_classification === "Charged Call - Missed") byMarket[m].missed++;
    if (r.result === "Booked" || r.result === "FU Booked") byMarket[m].booked++;
    if (r.result === "Dispute - Approved") byMarket[m].disputes++;
  });
  const marketData = Object.values(byMarket).map(m => ({
    ...m, charged: m.connected + m.missed - m.disputes,
    connRate: (m.connected + m.missed) > 0 ? (m.connected / (m.connected + m.missed)) * 100 : 0,
  }));
  return { total, connected, missed, nonCharged, charged, disputes, booked, bot, human: total - bot, connRate, marketData };
}

const SF_BUCKET = {
  "paid": "Completed", "invoiced": "Completed",
  "job booked": "Pending", "estimate presented": "Pending", "on-site estimate booked": "Pending",
  "canceled": "Canceled",
};
async function fetchSfBookings(month, year) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  let rows = [], from = 0;
  while (true) {
    const { data: batch } = await supabase.from("sf_opportunities").select("status, amount")
      .gte("create_datetime", start).lt("create_datetime", end).range(from, from + 999);
    if (!batch || batch.length === 0) break;
    rows = rows.concat(batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  let completed = 0, pending = 0, canceled = 0, completedRevenue = 0;
  rows.forEach(r => {
    const b = SF_BUCKET[(r.status || "").toLowerCase()];
    if (b === "Completed") { completed++; completedRevenue += Number(r.amount) || 0; }
    else if (b === "Pending") pending++;
    else if (b === "Canceled") canceled++;
  });
  return { count: rows.length, booked: completed + pending + canceled, completed, pending, canceled, completedRevenue };
}

/* ---------------- chart tooltip ---------------- */
function ChartTip({ active, payload, label, suffix }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-200 rounded-lg px-3 py-2 shadow-[0_10px_30px_-12px_rgba(20,24,31,.18)]">
      <p className="text-[11px] font-semibold text-ink-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[12px] tnum" style={{ color: p.color }}>
          <span className="font-semibold">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
          <span className="text-ink-400 ml-1">{p.name}{suffix || ""}</span>
        </p>
      ))}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid grid-cols-2 gap-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      <Skeleton className="h-80" />
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [prev, setPrev] = useState(null);
  const [sf, setSf] = useState(null);
  const [sfPrev, setSfPrev] = useState(null);
  const [allMonths, setAllMonths] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() === 0 ? 12 : new Date().getMonth() + 1);
  const [year] = useState(2026);
  const [updated, setUpdated] = useState(null);
  const navigate = useNavigate();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const isCurrent = month === (new Date().getMonth() + 1);

  useEffect(() => { load(); }, [month]);
  useEffect(() => { loadAllMonths(); }, []);

  async function loadAllMonths() {
    const mn = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const out = [];
    for (let m = 1; m <= 12; m++) {
      const s = await fetchAgentCallStats(m, 2026);
      if (s && s.total > 0) out.push({ month: m, name: mn[m], total: s.total, booked: s.booked, connectionRate: +s.connRate.toFixed(1) });
    }
    setAllMonths(out);
  }

  async function load() {
    setLoading(true);
    const [stats, pstats, sfb, psfb] = await Promise.all([
      fetchAgentCallStats(month, year),
      month > 1 ? fetchAgentCallStats(month - 1, year) : Promise.resolve(null),
      fetchSfBookings(month, year),
      month > 1 ? fetchSfBookings(month - 1, year) : Promise.resolve(null),
    ]);
    // hourly
    let hrows = [], from = 0;
    while (true) {
      const { data: batch } = await supabase.from("agent_calls").select("source_classification, hour_of_day")
        .eq("month", month).eq("year", year).eq("is_deleted", false).range(from, from + 999);
      if (!batch || batch.length === 0) break;
      hrows = hrows.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }
    const hr = {};
    hrows.forEach(l => {
      if (l.hour_of_day == null) return;
      hr[l.hour_of_day] ||= { hour: l.hour_of_day, connected: 0, missed: 0, nonCharged: 0 };
      const sc = l.source_classification || "";
      if (sc.includes("Connected")) hr[l.hour_of_day].connected++;
      else if (sc.includes("Missed")) hr[l.hour_of_day].missed++;
      else hr[l.hour_of_day].nonCharged++;
    });
    setHourly(Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`, connected: hr[i]?.connected || 0, missed: hr[i]?.missed || 0, nonCharged: hr[i]?.nonCharged || 0,
    })).filter(h => h.connected + h.missed + h.nonCharged > 0));

    const { data: fresh } = await supabase.from("agent_calls").select("created_at")
      .eq("month", month).eq("year", year).order("created_at", { ascending: false }).limit(1);
    setUpdated(fresh?.[0]?.created_at ? new Date(fresh[0].created_at) : null);
    setData(stats); setPrev(pstats); setSf(sfb); setSfPrev(psfb);
    setLoading(false);
  }

  if (loading) return <OverviewSkeleton />;
  if (!data) return <EmptyState title={`No data for ${months[month - 1]} ${year}`} hint="Pick another month, or check that the pipeline has run." />;

  const pm = month > 1 ? months[month - 2] : null;
  const delta = (a, b) => (b != null ? a - b : null);
  const rateDelta = prev ? +(data.connRate - prev.connRate).toFixed(1) : null;

  // attention items (markets below target)
  const below = (data.marketData || [])
    .filter(m => m.market_name !== "Unattributed" && m.market_name !== "Out of Area" && m.charged >= 5 && m.connRate < CONN_TARGET)
    .sort((a, b) => a.connRate - b.connRate);
  const unattributed = (data.marketData || []).find(m => m.market_name === "Unattributed");

  // ranked markets: worst-first among real markets with volume, then the rest
  const realMarkets = (data.marketData || []).filter(m => m.market_name !== "Unattributed" && m.market_name !== "Out of Area");
  const ranked = [...realMarkets].sort((a, b) => {
    const aOff = a.charged >= 5 && a.connRate < CONN_TARGET, bOff = b.charged >= 5 && b.connRate < CONN_TARGET;
    if (aOff !== bOff) return aOff ? -1 : 1;
    if (aOff && bOff) return a.connRate - b.connRate;
    return b.total - a.total;
  });

  const classTotal = data.connected + data.missed + data.nonCharged || 1;
  const segs = [
    { label: "Connected", value: data.connected, color: C.accent },
    { label: "Missed", value: data.missed, color: C.critical },
    { label: "Non-billable", value: data.nonCharged, color: C.ink300 },
  ];

  // narrative
  const dir = rateDelta == null ? "" : rateDelta >= 0 ? `up ${rateDelta} pts` : `down ${Math.abs(rateDelta)} pts`;
  const narrative = `${months[month - 1]} ${year}: ${data.total.toLocaleString()} leads, ${data.connRate.toFixed(1)}% connected${pm ? ` (${dir} vs ${pm})` : ""}. ` +
    `Salesforce shows ${(sf?.booked || 0).toLocaleString()} bookings this month. ` +
    `${below.length ? `${below.length} market${below.length > 1 ? "s" : ""} below the ${CONN_TARGET}% target` : "All markets at or above target"}` +
    `${unattributed ? `, ${unattributed.total} leads need market attribution` : ""}.`;

  const staleMs = updated ? Date.now() - updated.getTime() : 0;
  const stale = staleMs > 3 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      {/* page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink-900">Overview</h1>
          <p className="text-[13px] text-ink-500 mt-1">The month at a glance — what's happening, what changed, what needs attention.</p>
          <div className="flex items-center gap-2.5 mt-3">
            <StatusChip tone={isCurrent ? "info" : "neutral"}>
              {isCurrent ? "In progress · settles after month end" : "Final"}
            </StatusChip>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-400">
              <span className={`h-1.5 w-1.5 rounded-full ${stale ? "bg-caution" : "bg-accent"}`} />
              {updated ? `Synced ${updated.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "No sync data"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-0.5 bg-white rounded-lg border border-ink-200 p-1 shrink-0">
          {months.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${month === i + 1 ? "bg-accent text-white shadow-sm" : "text-ink-400 hover:text-ink-800 hover:bg-ink-50"}`}>{m}</button>
          ))}
        </div>
      </div>

      {/* narrative */}
      <Section className="border-l-[3px] border-l-accent"><Narrative>{narrative}</Narrative></Section>

      {/* needs attention strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mr-1">Needs attention</span>
        {below.slice(0, 3).map((m) => (
          <button key={m.market_name} onClick={() => navigate(`/markets?market=${encodeURIComponent(m.market_name)}`)}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium border-critical/20 bg-critical-50 text-critical hover:bg-critical-50/70 transition-colors">
            <CircleAlert size={13} /> {m.market_name} {m.connRate.toFixed(0)}%
          </button>
        ))}
        {unattributed && (
          <button onClick={() => navigate("/insights")}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium border-steel/20 bg-steel-50 text-steel hover:bg-steel-50/70 transition-colors">
            {unattributed.total} leads need attribution
          </button>
        )}
        {below.length === 0 && !unattributed && <StatusChip tone="positive">No issues need attention</StatusChip>}
        <button onClick={() => navigate("/insights")} className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-600">
          Attention <ChevronRight size={14} />
        </button>
      </div>

      {/* headline KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Section><Metric size="headline" label="Lead Volume" source="call" value={data.total.toLocaleString()}
          spark={allMonths.map(m => m.total)} sparkColor="#2b5c8a"
          delta={delta(data.total, prev?.total)} deltaLabel={pm ? `vs ${pm}` : ""} /></Section>
        <Section><Metric size="headline" label="Connection Rate" source="call" value={data.connRate.toFixed(1)} unit="%"
          spark={allMonths.map(m => m.connectionRate)} sparkColor="#1f7a52"
          sub={`target ${CONN_TARGET}%`} delta={rateDelta} deltaLabel={pm ? `pts vs ${pm}` : ""} definition="Connected ÷ (Connected + Missed), billable calls only." /></Section>
        <Section><Metric size="headline" label="Bookings" source="sf" value={(sf?.booked || 0).toLocaleString()}
          spark={allMonths.map(m => m.booked)} sparkColor="#2b5c8a"
          delta={delta(sf?.booked, sfPrev?.booked)} deltaLabel={pm ? `vs ${pm}` : ""} definition="All Salesforce opps created this month (any lead source)." /></Section>
      </div>

      {/* two truth blocks + reconcile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Call System (LSA)" source="call" accent="#1f7a52">
          <div className="grid grid-cols-3 gap-y-4">
            <Metric label="Billable" value={data.charged.toLocaleString()} definition="Charged calls, disputes backed out." />
            <Metric label="Connected" value={data.connected.toLocaleString()} />
            <Metric label="Missed" value={data.missed.toLocaleString()} delta={delta(data.missed, prev?.missed)} deltaLabel={pm ? `vs ${pm}` : ""} deltaGoodIsUp={false} />
            <Metric label="Non-billable" value={data.nonCharged.toLocaleString()} />
            <Metric label="Disputes" value={data.disputes.toLocaleString()} />
            <Metric label="LSA bookings" value={data.booked.toLocaleString()} definition="Bookings that tie to an LSA lead (attributable to an agent)." />
          </div>
          {/* classification 100% stacked bar */}
          <div className="mt-5">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full">
              {segs.map((s) => <div key={s.label} style={{ width: `${(s.value / classTotal) * 100}%`, background: s.color }} />)}
            </div>
            <div className="mt-2 flex gap-4">
              {segs.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] text-ink-500">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}
                  <span className="font-semibold text-ink-700 tnum">{s.value.toLocaleString()}</span>
                </span>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Salesforce — bookings & revenue" source="sf" accent="#2b5c8a"
          note={!isCurrent ? undefined : "Salesforce figures cover the LSA lead source only and update hourly; this month may understate until it settles."}>
          <div className="grid grid-cols-2 gap-y-4">
            <Metric label="Completed" value={(sf?.completed || 0).toLocaleString()} />
            <Metric label="Pending" value={(sf?.pending || 0).toLocaleString()} />
            <Metric label="Canceled" value={(sf?.canceled || 0).toLocaleString()} />
            <Metric label="Completed Revenue" value={`$${Math.round(sf?.completedRevenue || 0).toLocaleString()}`} />
          </div>
          <div className="mt-5">
            <Reconcile>
              Salesforce shows <b className="text-ink-700">{(sf?.booked || 0).toLocaleString()}</b> bookings this month;{" "}
              <b className="text-ink-700">{data.booked.toLocaleString()}</b> tie to an LSA lead
              {sf && sf.booked > data.booked && <> — {(sf.booked - data.booked).toLocaleString()} booked through other channels</>}.
            </Reconcile>
          </div>
        </Section>
      </div>

      {/* trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Connection rate — 2026" source="call" right={<span className="text-[11px] text-ink-400">dashed = {CONN_TARGET}% target</span>}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={allMonths} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.ink100} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.ink400 }} axisLine={false} tickLine={false} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 11, fill: C.ink400 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip suffix="%" />} />
              <ReferenceLine y={CONN_TARGET} stroke={C.ink300} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="connectionRate" stroke={C.accent} strokeWidth={2} name="Rate" dot={{ r: 3, fill: C.accent }} />
            </LineChart>
          </ResponsiveContainer>
        </Section>
        <Section title="Lead volume — 2026" source="call">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={allMonths} margin={{ left: -16, right: 8, top: 8 }}>
              <defs><linearGradient id="vol" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.steel} stopOpacity={0.14} /><stop offset="100%" stopColor={C.steel} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.ink100} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.ink400 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.ink400 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="total" stroke={C.steel} strokeWidth={2} fill="url(#vol)" name="Leads" dot={{ r: 3, fill: C.steel }} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* hourly */}
      {hourly.length > 0 && (
        <Section title={`Leads by hour — ${months[month - 1]} (CST)`} source="call">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourly} barCategoryGap="22%" margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.ink100} vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: C.ink400 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.ink400 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="connected" stackId="a" fill={C.accent} name="Connected" />
              <Bar dataKey="missed" stackId="a" fill={C.critical} name="Missed" />
              <Bar dataKey="nonCharged" stackId="a" fill={C.ink300} name="Non-billable" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* markets — ranked worst-first */}
      <Section title="Markets — ranked by need" source="call"
        right={<button onClick={() => navigate("/markets")} className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-600">All markets <ArrowUpRight size={14} /></button>}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {["Market","Leads","Billable","Connected","Missed","Conn. rate","Bookings"].map((h, i) => (
                  <th key={h} className={`pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400 ${i > 0 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((m) => (
                <tr key={m.market_name} onClick={() => navigate(`/markets?market=${encodeURIComponent(m.market_name)}`)}
                  className="border-t border-ink-50 cursor-pointer hover:bg-ink-50/60 transition-colors">
                  <td className="py-2.5 font-semibold text-ink-800 text-[13px]">{m.market_name}</td>
                  <td className="py-2.5 text-right text-ink-600 tnum">{m.total}</td>
                  <td className="py-2.5 text-right text-ink-600 tnum">{m.charged}</td>
                  <td className="py-2.5 text-right text-ink-600 tnum">{m.connected}</td>
                  <td className="py-2.5 text-right tnum"><span className={m.missed > 0 ? "text-critical font-semibold" : "text-ink-600"}>{m.missed}</span></td>
                  <td className="py-2.5 text-right"><RateChip value={m.connRate / 100} target={CONN_TARGET / 100} /></td>
                  <td className="py-2.5 text-right text-ink-700 tnum font-medium">{m.booked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {unattributed && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-steel-50 border border-steel/15 px-3 py-2">
            <span className="text-[12px] text-steel">
              <b>Unattributed</b> — {unattributed.total} leads with no market from the source (data issue, not a market).
            </span>
            <button onClick={() => navigate("/insights")} className="text-[12px] font-medium text-steel hover:underline">Why? →</button>
          </div>
        )}
      </Section>
    </div>
  );
}
