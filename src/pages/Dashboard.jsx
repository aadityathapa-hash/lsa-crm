import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Phone, Activity, DollarSign, Info, ChevronRight,
  Calendar, CheckCircle2, Clock, XCircle, SlidersHorizontal,
  PhoneCall, PhoneMissed, Receipt, BellOff, Scale, X,
} from "lucide-react";
import { HeroKpi, Gauge, TargetBar, Avatar, RateChip, Skeleton, EmptyState } from "../components/ui";

const C = { accent: "#465fff", spark: "#bcc9ff", missed: "#f97066", neutral: "#d0d5dd", ink100: "#e9ecf3", ink400: "#98a2b3" };
const CONN_TARGET = 95;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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

const fmtPhone = (p) => {
  const d = String(p || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (p || "—");
};
const fmtDur = (s) => (s ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : "—");
const fmtHour = (h) => (h == null ? "" : `${((h % 12) || 12)} ${h < 12 ? "AM" : "PM"}`);
const fmtDateTime = (date, hour, createdAt) => {
  let d = null;
  if (date) d = new Date(date + "T00:00:00");
  else if (createdAt) d = new Date(createdAt);
  if (!d || isNaN(d)) return "—";
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = hour != null ? fmtHour(hour) : (date ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
  return time ? `${day} · ${time}` : day;
};
const shortClass = (sc) => sc?.includes("Connected") ? "Connected" : sc?.includes("Missed") ? "Missed" : "Non-billable";
const STATUS_TONE = { Connected: ["#027a48", "#ecfdf3"], Missed: ["#b42318", "#fef3f2"], "Non-billable": ["#475467", "#f4f6fa"] };

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-ink-200 rounded-lg px-3 py-2 shadow-[0_10px_30px_-12px_rgba(16,24,40,.18)]">
      <p className="text-[11px] font-semibold text-ink-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[12px] tnum" style={{ color: p.color }}>
          <span className="font-semibold">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
          <span className="text-ink-400 ml-1">{p.name}</span>
        </p>
      ))}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-[22px]">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      <div className="grid lg:grid-cols-3 gap-5"><Skeleton className="h-72 lg:col-span-2" /><Skeleton className="h-72" /></div>
    </div>
  );
}

const Card = ({ className = "", children }) => (
  <div className={`bg-surface border border-ink-100 rounded-[16px] shadow-[0_1px_2px_rgba(16,24,40,.04)] ${className}`}>{children}</div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [prev, setPrev] = useState(null);
  const [sf, setSf] = useState(null);
  const [sfPrev, setSfPrev] = useState(null);
  const [allMonths, setAllMonths] = useState([]);
  const [recent, setRecent] = useState([]);
  const [agentMap, setAgentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() === 0 ? 12 : new Date().getMonth() + 1);
  const [year] = useState(2026);
  const [updated, setUpdated] = useState(null);
  const [detail, setDetail] = useState(null);
  const navigate = useNavigate();
  const currentMonthNum = new Date().getMonth() + 1;
  const isCurrent = month === currentMonthNum;

  useEffect(() => { load(); }, [month]);
  useEffect(() => { loadAllMonths(); }, []);

  async function loadAllMonths() {
    const out = [];
    for (let m = 1; m <= 12; m++) {
      const s = await fetchAgentCallStats(m, 2026);
      if (s && s.total > 0) out.push({ month: m, name: MONTHS[m - 1], total: s.total, connected: s.connected, booked: s.booked, connectionRate: +s.connRate.toFixed(1) });
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
    const { data: rl } = await supabase.from("agent_calls")
      .select("id, client_name, phone, market_name, agent_id, is_bot, source_classification, duration_seconds, lead_creation_date, hour_of_day, created_at")
      .eq("month", month).eq("year", year).eq("is_deleted", false)
      .order("lead_creation_date", { ascending: false }).limit(6);
    setRecent(rl || []);
    const { data: ag } = await supabase.from("agents").select("id, name");
    setAgentMap(Object.fromEntries((ag || []).map(a => [a.id, a.name])));
    setUpdated(rl?.[0]?.created_at ? new Date(rl[0].created_at) : null);
    setData(stats); setPrev(pstats); setSf(sfb); setSfPrev(psfb);
    setLoading(false);
  }

  if (loading) return <OverviewSkeleton />;
  if (!data) return <Card className="p-6"><EmptyState title={`No data for ${MONTHS[month - 1]} ${year}`} hint="Pick another month, or check that the pipeline has run." /></Card>;

  const pm = month > 1 ? MONTHS[month - 2] : null;
  const totalDelta = prev ? data.total - prev.total : null;
  const rateDelta = prev ? +(data.connRate - prev.connRate).toFixed(1) : null;
  const bookingsDelta = sfPrev ? (sf.booked - sfPrev.booked) : null;

  const below = (data.marketData || [])
    .filter(m => m.market_name !== "Unattributed" && m.market_name !== "Out of Area" && m.charged >= 5 && m.connRate < CONN_TARGET)
    .sort((a, b) => a.connRate - b.connRate);
  const unattributed = (data.marketData || []).find(m => m.market_name === "Unattributed");
  const attributionCount = unattributed?.total || 0;
  const moreCount = Math.max(0, below.length - 3);

  const total = data.total || 1;
  const donut = [
    { name: "Connected", value: data.connected, color: C.accent },
    { name: "Missed", value: data.missed, color: C.missed },
    { name: "Non-billable", value: data.nonCharged, color: C.neutral },
  ];
  const pct = (v) => Math.round((v / total) * 100);

  const belowTarget = +(CONN_TARGET - data.connRate).toFixed(1);
  const ltied = data.booked;                       // bookings tied to an LSA lead
  const otherChannels = sf ? Math.max(0, sf.booked - ltied) : 0;

  // ----- metric detail drawer -----
  const realMarkets = (data.marketData || []).filter(m => m.market_name !== "Unattributed" && m.market_name !== "Out of Area");
  function buildDrawer(dt) {
    if (dt.kind === "cs") {
      const M = {
        total:     { label: "Total calls", def: "Every LSA call logged this month.", get: m => m.total, leads: "" },
        rate:      { label: "Connect rate", def: "Connected ÷ (Connected + Missed), billable calls only.", rate: true },
        connected: { label: "Connected", def: "Charged calls that connected to an agent.", get: m => m.connected, leads: "Connected" },
        missed:    { label: "Missed", def: "Charged calls that rang out or were missed.", get: m => m.missed, leads: "Missed" },
        billable:  { label: "Billable", def: "Charged calls, with approved disputes backed out.", get: m => m.charged, leads: "Billable" },
        nonbill:   { label: "Non-billable", def: "Calls Google did not charge for.", get: m => Math.max(0, m.total - m.connected - m.missed), leads: "Non-billable" },
        disputes:  { label: "Disputes", def: "Charges disputed and approved (credited back).", get: m => m.disputes },
      }[dt.key];
      const value = dt.key === "rate" ? `${data.connRate.toFixed(1)}%`
        : dt.key === "billable" ? data.charged.toLocaleString()
        : dt.key === "nonbill" ? data.nonCharged.toLocaleString()
        : (data[dt.key] ?? 0).toLocaleString();
      const rows = M.rate
        ? realMarkets.filter(m => m.connected + m.missed > 0).sort((a, b) => a.connRate - b.connRate).map(m => ({ name: m.market_name, rate: m.connRate }))
        : realMarkets.map(m => ({ name: m.market_name, v: M.get(m) })).filter(r => r.v > 0).sort((a, b) => b.v - a.v);
      const leadsHref = M.leads !== undefined ? `/leads?month=${month}${M.leads ? `&classification=${encodeURIComponent(M.leads)}` : ""}` : null;
      return { label: M.label, value, def: M.def, source: "call", rate: !!M.rate, rows, leadsHref };
    }
    const M = {
      bookings:  { label: "Bookings", val: (sf?.booked || 0).toLocaleString(), def: "All Salesforce opps created this month (any lead source)." },
      completed: { label: "Completed", val: (sf?.completed || 0).toLocaleString(), def: "Paid or invoiced opportunities." },
      pending:   { label: "Pending", val: (sf?.pending || 0).toLocaleString(), def: "Booked or estimate stage, awaiting close." },
      canceled:  { label: "Canceled", val: (sf?.canceled || 0).toLocaleString(), def: "Opportunities that were canceled." },
      revenue:   { label: "Completed revenue", val: `$${Math.round(sf?.completedRevenue || 0).toLocaleString()}`, def: "Sum of completed opportunity amounts." },
    }[dt.key];
    const funnel = [
      { name: "Bookings", v: sf?.booked || 0 }, { name: "Completed", v: sf?.completed || 0 },
      { name: "Pending", v: sf?.pending || 0 }, { name: "Canceled", v: sf?.canceled || 0 },
    ];
    return { label: M.label, value: M.val, def: M.def, source: "sf", sfFunnel: funnel };
  }
  const drawer = detail ? buildDrawer(detail) : null;

  return (
    <div className="flex flex-col gap-[22px]">

      {/* ---------- header ---------- */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[27px] font-bold tracking-[-0.5px] text-ink-900">Overview</h1>
          <p className="text-[14.5px] text-ink-500 max-w-[520px]">The month at a glance — what's happening, what changed, and what needs attention.</p>
          <div className="flex items-center gap-2.5 flex-wrap">
            {isCurrent && <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-caution bg-caution-50 border border-[#fedf89] rounded-full px-2.5 py-1">In progress · settles after month end</span>}
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-500">
              <span className="w-[7px] h-[7px] rounded-full bg-positive" />
              {updated ? `Synced ${updated.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "No sync data"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 bg-surface border border-ink-100 rounded-[13px] p-[5px]">
          {MONTHS.map((m, i) => {
            const future = i + 1 > currentMonthNum;
            const active = month === i + 1;
            return (
              <button key={m} disabled={future} onClick={() => setMonth(i + 1)}
                className={`text-[13px] rounded-lg transition-colors ${active ? "font-bold text-white bg-accent px-3 py-1.5 shadow-[0_4px_10px_-3px_#465fff]" : future ? "font-medium text-ink-300 px-2.5 py-1.5 cursor-not-allowed" : "font-medium text-ink-400 hover:text-ink-900 hover:bg-ink-50 px-2.5 py-1.5"}`}>{m}</button>
            );
          })}
        </div>
      </div>

      {/* ---------- insight summary ---------- */}
      <Card className="flex gap-4 border-l-4 border-l-accent p-[18px_22px]">
        <span className="shrink-0 w-9 h-9 rounded-[10px] bg-accent-50 text-accent flex items-center justify-center"><Info size={20} strokeWidth={1.9} /></span>
        <p className="text-[15px] leading-relaxed text-ink-700">
          <b className="font-semibold text-ink-900">{MONTHS[month - 1]} {year}:</b> {data.total.toLocaleString()} leads, <b className="font-semibold text-ink-900">{data.connRate.toFixed(1)}% connected</b>{pm && rateDelta != null && <> ({rateDelta >= 0 ? "up" : "down"} {Math.abs(rateDelta)} pts vs {pm})</>}. Salesforce shows <b className="font-semibold text-ink-900">{(sf?.booked || 0).toLocaleString()} bookings</b> this month. {below.length > 0 ? <><b className="font-semibold text-critical">{below.length} market{below.length > 1 ? "s" : ""}</b> below the {CONN_TARGET}% target</> : "all markets at or above target"}{attributionCount > 0 && <>, and <b className="font-semibold text-ink-900">{attributionCount} leads</b> need market attribution</>}.
        </p>
      </Card>

      {/* ---------- Call System KPIs (all metrics, clickable) ---------- */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[13px] font-semibold text-ink-700">Call System (LSA)</h2>
          <span className="text-[11px] font-bold tracking-[0.5px] text-steel bg-steel-50 rounded-md px-2 py-[3px]">CALL SYSTEM</span>
          <span className="text-[12px] text-ink-400">click any card for details</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <HeroKpi label="Total Calls" value={data.total.toLocaleString()} icon={Phone}
            deltaValue={totalDelta != null ? Math.abs(totalDelta).toLocaleString() : null} deltaGood={totalDelta >= 0} deltaNote={pm ? `vs ${pm}` : ""}
            onClick={() => setDetail({ kind: "cs", key: "total" })} />
          <HeroKpi label="Connect Rate" value={`${data.connRate.toFixed(1)}%`} icon={Activity}
            deltaValue={rateDelta != null ? Math.abs(rateDelta) : null} deltaGood={rateDelta >= 0} deltaSuffix=" pts" deltaNote={pm ? `vs ${pm}` : ""}
            onClick={() => setDetail({ kind: "cs", key: "rate" })} />
          <HeroKpi label="Connected" value={data.connected.toLocaleString()} icon={PhoneCall}
            deltaValue={prev ? Math.abs(data.connected - prev.connected).toLocaleString() : null} deltaGood={!prev || data.connected >= prev.connected} deltaNote={pm ? `vs ${pm}` : ""}
            onClick={() => setDetail({ kind: "cs", key: "connected" })} />
          <HeroKpi label="Missed" value={data.missed.toLocaleString()} icon={PhoneMissed}
            deltaValue={prev ? Math.abs(data.missed - prev.missed).toLocaleString() : null} deltaGood={!!prev && data.missed <= prev.missed} deltaNote={pm ? `vs ${pm}` : ""}
            onClick={() => setDetail({ kind: "cs", key: "missed" })} />
          <HeroKpi label="Billable" value={data.charged.toLocaleString()} icon={Receipt}
            deltaValue={prev ? Math.abs(data.charged - prev.charged).toLocaleString() : null} deltaGood={!prev || data.charged >= prev.charged} deltaNote={pm ? `vs ${pm}` : ""}
            onClick={() => setDetail({ kind: "cs", key: "billable" })} />
          <HeroKpi label="Non-billable" value={data.nonCharged.toLocaleString()} icon={BellOff}
            deltaValue={prev ? Math.abs(data.nonCharged - prev.nonCharged).toLocaleString() : null} deltaGood={!!prev && data.nonCharged <= prev.nonCharged} deltaNote={pm ? `vs ${pm}` : ""}
            onClick={() => setDetail({ kind: "cs", key: "nonbill" })} />
          <HeroKpi label="Disputes" value={data.disputes.toLocaleString()} icon={Scale}
            deltaValue={prev ? Math.abs(data.disputes - prev.disputes).toLocaleString() : null} deltaGood={!!prev && data.disputes <= prev.disputes} deltaNote={pm ? `vs ${pm}` : ""}
            onClick={() => setDetail({ kind: "cs", key: "disputes" })} />
        </div>
      </div>

      {/* ---------- area chart + gauge ---------- */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6 flex flex-col gap-[18px]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-[17px] font-bold text-ink-900">Call Volume</h3>
              <p className="text-[13px] text-ink-400 mt-1">Calls placed vs connected, by month</p>
            </div>
            <div className="flex gap-[18px] items-center">
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] text-ink-400 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-accent" />Total calls</span>
                <span className="text-[21px] font-bold text-ink-900 tracking-[-0.5px] tnum">{data.total.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] text-ink-400 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: C.spark }} />Connected</span>
                <span className="text-[21px] font-bold text-ink-900 tracking-[-0.5px] tnum">{data.connected.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={allMonths} margin={{ left: -14, right: 8, top: 8 }}>
              <defs><linearGradient id="lsaArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity={0.22} /><stop offset="100%" stopColor={C.accent} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="0" stroke="var(--color-ink-100)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: C.ink400 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.ink400 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="total" stroke={C.accent} strokeWidth={3} fill="url(#lsaArea)" name="Total calls" dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="connected" stroke={C.spark} strokeWidth={3} name="Connected" dot={false} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 flex flex-col">
          <div>
            <h3 className="text-[17px] font-bold text-ink-900">Connect Rate</h3>
            <p className="text-[13px] text-ink-400 mt-1">Against the {CONN_TARGET}% market target</p>
          </div>
          <div className="relative flex-1 flex items-start justify-center pt-2.5">
            <Gauge value={data.connRate} />
            <div className="absolute top-[74px] left-0 right-0 flex flex-col items-center gap-0.5">
              <span className="text-[38px] font-bold tracking-[-1.5px] text-ink-900 leading-none tnum">{data.connRate.toFixed(1)}%</span>
              <span className="text-[12.5px] font-medium text-ink-400">connected</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-ink-50 pt-3.5 mt-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] text-ink-400">Target</span>
              <span className="text-[15px] font-bold text-ink-900 tnum">{CONN_TARGET.toFixed(1)}%</span>
            </div>
            <span className={`inline-flex items-center gap-1 text-[12.5px] font-semibold rounded-lg px-2.5 py-1.5 ${belowTarget > 0 ? "text-critical bg-critical-50" : "text-positive bg-positive-50"}`}>
              {belowTarget > 0 ? "▼" : "▲"} {Math.abs(belowTarget)} pts {belowTarget > 0 ? "below" : "above"} target
            </span>
          </div>
        </Card>
      </div>

      {/* ---------- donut + markets ---------- */}
      <div className="grid lg:grid-cols-[1fr_1.45fr] gap-5">
        <Card className="p-6 flex flex-col gap-[18px]">
          <h3 className="text-[17px] font-bold text-ink-900">Call Mix</h3>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="relative w-[180px] h-[180px] shrink-0">
              <PieChart width={180} height={180}>
                <Pie data={donut} dataKey="value" cx="50%" cy="50%" innerRadius={68} outerRadius={90} startAngle={90} endAngle={-270} stroke="none">
                  {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[13px] text-ink-400">Total</span>
                <span className="text-[28px] font-bold tracking-[-1px] text-ink-900 tnum">{data.total.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3.5 flex-1 min-w-[150px]">
              {donut.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-[4px] shrink-0" style={{ background: d.color }} />
                  <span className="flex-1 text-[14px] font-medium text-ink-700">{d.name}</span>
                  <span className="text-[14px] font-bold text-ink-900 tnum">{d.value.toLocaleString()}</span>
                  <span className="text-[12.5px] text-ink-400 w-9 text-right tnum">{pct(d.value)}%</span>
                </div>
              ))}
              <div className="border-t border-ink-50 pt-3 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-[4px] bg-accent-50 border-[1.5px] border-accent shrink-0" />
                <span className="flex-1 text-[14px] font-medium text-ink-700">Billable</span>
                <span className="text-[14px] font-bold text-ink-900 tnum">{data.charged.toLocaleString()}</span>
                <span className="text-[12.5px] text-ink-400 w-9 text-right tnum">{pct(data.charged)}%</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-[18px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[17px] font-bold text-ink-900">Markets Need Attention</h3>
              <p className="text-[13px] text-ink-400 mt-1">{below.length} market{below.length === 1 ? "" : "s"} below the {CONN_TARGET}% connect target</p>
            </div>
            <button onClick={() => navigate("/markets")} className="text-[13px] font-semibold text-accent inline-flex items-center gap-1 hover:text-accent-600">View all <ChevronRight size={15} strokeWidth={2.2} /></button>
          </div>
          {below.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-6"><span className="text-[14px] text-ink-400">All markets at or above target.</span></div>
          ) : (
            <div className="flex flex-col gap-4">
              {below.slice(0, 3).map((m) => (
                <button key={m.market_name} onClick={() => navigate(`/markets?market=${encodeURIComponent(m.market_name)}`)} className="text-left">
                  <TargetBar name={m.market_name} value={m.connRate} target={CONN_TARGET} />
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 border-t border-ink-50 pt-4 mt-auto">
            <div className="flex-1 flex items-center gap-3 bg-critical-50 rounded-[11px] px-3.5 py-3">
              <span className="text-[22px] font-bold text-critical tracking-[-0.5px] tnum">{moreCount}</span>
              <span className="text-[12.5px] text-critical leading-tight">more markets<br />below target</span>
            </div>
            <button onClick={() => navigate("/insights")} className="flex-1 flex items-center gap-3 bg-caution-50 rounded-[11px] px-3.5 py-3 text-left hover:brightness-[0.98] transition">
              <span className="text-[22px] font-bold text-caution tracking-[-0.5px] tnum">{attributionCount}</span>
              <span className="text-[12.5px] text-caution leading-tight">leads need<br />attribution</span>
            </button>
          </div>
        </Card>
      </div>

      {/* ---------- Salesforce ---------- */}
      <Card className="p-6 flex flex-col gap-[18px]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h3 className="text-[17px] font-bold text-ink-900">Salesforce — Bookings &amp; Revenue</h3>
            <span className="text-[11px] font-bold tracking-[0.5px] text-steel bg-steel-50 rounded-md px-2 py-[3px]">SALESFORCE</span>
          </div>
          <span className="text-[13px] text-ink-400">Opps created this month · updates hourly</span>
        </div>
        {isCurrent && (
          <div className="flex items-start gap-2.5 bg-caution-50 border border-[#fef0c7] rounded-[12px] px-4 py-3">
            <Info size={18} className="text-caution shrink-0 mt-px" strokeWidth={2} />
            <span className="text-[13.5px] text-caution leading-relaxed">Salesforce figures cover the LSA lead source only and may understate this month until it settles after month end.</span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <SfTile icon={Calendar} chip="accent" label="Bookings" value={(sf?.booked || 0).toLocaleString()} badge={bookingsDelta != null ? `▲ ${Math.abs(bookingsDelta).toLocaleString()} vs ${pm}` : null} badgeGood={bookingsDelta >= 0} onClick={() => setDetail({ kind: "sf", key: "bookings" })} />
          <SfTile icon={CheckCircle2} chip="positive" label="Completed" value={(sf?.completed || 0).toLocaleString()} sub={sf?.booked ? `${Math.round((sf.completed / sf.booked) * 100)}% of bookings` : "—"} onClick={() => setDetail({ kind: "sf", key: "completed" })} />
          <SfTile icon={Clock} chip="caution" label="Pending" value={(sf?.pending || 0).toLocaleString()} sub="awaiting close" onClick={() => setDetail({ kind: "sf", key: "pending" })} />
          <SfTile icon={XCircle} chip="critical" label="Canceled" value={(sf?.canceled || 0).toLocaleString()} sub={sf?.booked ? `${Math.round((sf.canceled / sf.booked) * 100)}% of bookings` : "—"} onClick={() => setDetail({ kind: "sf", key: "canceled" })} />
          <SfTile icon={DollarSign} chip="accent" emphasized label="Revenue" value={`$${Math.round(sf?.completedRevenue || 0).toLocaleString()}`} sub="completed bookings" onClick={() => setDetail({ kind: "sf", key: "revenue" })} />
        </div>
        <div className="text-[13.5px] text-ink-600 bg-ink-50 rounded-[11px] px-4 py-3 leading-relaxed">
          Salesforce shows <b className="font-semibold text-ink-900">{(sf?.booked || 0).toLocaleString()}</b> bookings this month; <b className="font-semibold text-ink-900">{ltied.toLocaleString()}</b> tie to an LSA lead{otherChannels > 0 && <> — <b className="font-semibold text-ink-900">{otherChannels.toLocaleString()}</b> were booked through other channels</>}.
        </div>
      </Card>

      {/* ---------- recent leads ---------- */}
      <Card className="p-6 flex flex-col gap-[18px]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-[17px] font-bold text-ink-900">Recent Leads</h3>
            <p className="text-[13px] text-ink-400 mt-1">Latest calls this month</p>
          </div>
          <button onClick={() => navigate(`/leads?month=${month}`)} className="flex items-center gap-1.5 bg-surface border border-ink-200 rounded-[10px] px-3.5 h-[38px] text-[13.5px] font-semibold text-ink-600 hover:bg-ink-50 transition-colors">
            <SlidersHorizontal size={16} /> View all
          </button>
        </div>
        <div className="grid grid-cols-[1.5fr_1.1fr_1fr_1.1fr_0.8fr_0.9fr] gap-3 px-1.5 pb-3 border-b border-ink-50">
          {["Lead", "Market", "Agent", "Date / time", "Duration", "Status"].map((h, i) => (
            <span key={h} className={`text-[12px] font-semibold tracking-[0.4px] text-ink-400 uppercase ${i === 5 ? "text-right" : ""}`}>{h}</span>
          ))}
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No leads yet this month" />
        ) : (
          <div className="flex flex-col">
            {recent.map((r, idx) => {
              const cls = shortClass(r.source_classification);
              const [fg, bg] = STATUS_TONE[cls] || STATUS_TONE["Non-billable"];
              const name = (r.client_name || "").trim() || "Unknown caller";
              return (
                <button key={r.id} onClick={() => navigate(`/leads?month=${month}&lead=${r.id}`)} title="Open lead to adjust status or follow up"
                  className={`grid grid-cols-[1.5fr_1.1fr_1fr_1.1fr_0.8fr_0.9fr] gap-3 items-center px-1.5 py-3 text-left hover:bg-ink-50/60 transition-colors ${idx < recent.length - 1 ? "border-b border-ink-50" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={name} i={idx} />
                    <div className="leading-tight min-w-0">
                      <div className="text-[14px] font-semibold text-ink-900 truncate">{name}</div>
                      <div className="text-[12.5px] text-ink-400 tnum">{fmtPhone(r.phone)}</div>
                    </div>
                  </div>
                  <span className="text-[14px] text-ink-600 truncate">{r.market_name || "—"}</span>
                  <span className="text-[14px] text-ink-600 truncate">{r.is_bot ? "Avoca bot" : (agentMap[r.agent_id] || "—")}</span>
                  <span className="text-[13px] text-ink-600 tnum">{fmtDateTime(r.lead_creation_date, r.hour_of_day, r.created_at)}</span>
                  <span className="text-[14px] text-ink-600 tnum">{fmtDur(r.duration_seconds)}</span>
                  <span className="justify-self-end text-[12.5px] font-semibold rounded-full px-3 py-1" style={{ color: fg, background: bg }}>{cls}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* ---------- metric detail drawer ---------- */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setDetail(null)} className="absolute inset-0 bg-ink-900/30" style={{ animation: "overlay-in .15s ease-out" }} />
          <div className="relative h-full w-full max-w-[460px] bg-surface shadow-[0_0_40px_-8px_rgba(16,24,40,.3)] overflow-y-auto" style={{ animation: "drawer-in .18s ease-out" }}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-surface z-10">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-bold text-ink-900">{drawer.label}</h2>
                  <span className={`text-[10px] font-bold tracking-[0.5px] rounded px-1.5 py-0.5 ${drawer.source === "sf" ? "bg-steel-50 text-steel" : "bg-accent-50 text-accent"}`}>{drawer.source === "sf" ? "SALESFORCE" : "CALL SYSTEM"}</span>
                </div>
                <div className="text-[30px] font-bold text-ink-900 tracking-[-1px] tnum mt-2">{drawer.value}</div>
                <p className="text-[12.5px] text-ink-500 mt-1.5 max-w-[360px] leading-relaxed">{drawer.def}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-ink-400 hover:text-ink-700 p-1 -mr-1 -mt-1 shrink-0"><X size={20} /></button>
            </div>
            <div className="px-6 py-5">
              {drawer.source === "call" ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">By market</h3>
                    {drawer.leadsHref && (
                      <button onClick={() => { const h = drawer.leadsHref; setDetail(null); navigate(h); }}
                        className="text-[12.5px] font-semibold text-accent inline-flex items-center gap-1 hover:text-accent-600">View leads <ChevronRight size={14} /></button>
                    )}
                  </div>
                  {drawer.rows.length === 0 ? (
                    <p className="text-[13px] text-ink-400">No market breakdown for this metric.</p>
                  ) : (
                    <div className="flex flex-col">
                      {drawer.rows.map((r, i) => (
                        <div key={r.name + i} className="flex items-center justify-between py-2 border-b border-ink-50 last:border-0">
                          <span className="text-[13.5px] text-ink-700 truncate pr-3">{r.name}</span>
                          {drawer.rate ? <RateChip value={r.rate / 100} target={0.95} /> : <span className="text-[13.5px] font-semibold text-ink-900 tnum">{r.v.toLocaleString()}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-400 mb-3">Bookings funnel</h3>
                  <div className="flex flex-col">
                    {drawer.sfFunnel.map((r) => (
                      <div key={r.name} className="flex items-center justify-between py-2 border-b border-ink-50 last:border-0">
                        <span className="text-[13.5px] text-ink-700">{r.name}</span>
                        <span className="text-[13.5px] font-semibold text-ink-900 tnum">{r.v.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[12.5px] text-ink-500 bg-ink-50 rounded-lg px-3 py-2.5 mt-4 leading-relaxed">Salesforce records aren't listed individually in the CRM yet — figures cover the LSA lead source and update hourly.</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SfTile({ icon: Icon, chip, label, value, sub, badge, badgeGood = true, emphasized, onClick }) {
  const CHIP = {
    accent: "bg-accent-50 text-accent", positive: "bg-positive-50 text-positive",
    caution: "bg-caution-50 text-caution", critical: "bg-critical-50 text-critical",
  };
  const clickable = typeof onClick === "function";
  const Cmp = clickable ? "button" : "div";
  return (
    <Cmp {...(clickable ? { type: "button", onClick } : {})}
      className={`w-full text-left border rounded-[13px] p-[18px] flex flex-col gap-3 transition-shadow ${emphasized ? "border-accent bg-accent-50" : "border-ink-50"} ${clickable ? "cursor-pointer hover:shadow-[0_6px_18px_-8px_rgba(16,24,40,.18)]" : ""}`}>
      <div className="flex items-center gap-2.5">
        <span className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0 ${emphasized ? "bg-surface text-accent" : CHIP[chip]}`}><Icon size={17} strokeWidth={1.9} /></span>
        <span className={`text-[13px] font-medium ${emphasized ? "text-accent font-semibold" : "text-ink-500"}`}>{label}</span>
      </div>
      <span className="text-[25px] font-bold text-ink-900 tracking-[-0.5px] tnum">{value}</span>
      {badge ? (
        <span className={`self-start inline-flex items-center gap-1 text-[12px] font-semibold rounded-[7px] px-1.5 py-0.5 ${badgeGood ? "text-positive bg-positive-50" : "text-critical bg-critical-50"}`}>{badge}</span>
      ) : sub ? (
        <span className={`text-[12px] ${emphasized ? "text-accent font-medium" : "text-ink-400"}`}>{sub}</span>
      ) : null}
    </Cmp>
  );
}
