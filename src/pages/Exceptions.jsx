import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Badge({ color, children }) {
  const colors = {
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    gray: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

function Card({ title, icon, count, severity, children }) {
  const borderColor = severity === "high" ? "border-l-red-500" : severity === "medium" ? "border-l-amber-500" : "border-l-blue-500";
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${borderColor} hover:shadow-md transition-shadow`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        {count > 0 && (
          <Badge color={severity === "high" ? "red" : severity === "medium" ? "amber" : "blue"}>
            {count} {count === 1 ? "issue" : "issues"}
          </Badge>
        )}
        {count === 0 && <Badge color="green">All clear</Badge>}
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

function IssueRow({ market, metric, value, context, severity, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 ${onClick ? "cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${severity === "high" ? "bg-red-500" : severity === "medium" ? "bg-amber-500" : "bg-blue-500"}`} />
          <span className="text-sm font-medium text-slate-800 truncate">{market}</span>
        </div>
        {context && <p className="text-xs text-slate-400 mt-0.5 ml-3.5">{context}</p>}
      </div>
      <div className="text-right ml-4 flex-shrink-0">
        <span className={`text-sm font-semibold ${severity === "high" ? "text-red-600" : severity === "medium" ? "text-amber-600" : "text-blue-600"}`}>
          {value}
        </span>
        <p className="text-xs text-slate-400">{metric}</p>
      </div>
    </div>
  );
}

export default function Exceptions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year] = useState(2026);
  const navigate = useNavigate();

  useEffect(() => { fetchExceptions(); }, [month]);

  async function fetchExceptions() {
    setLoading(true);

    // Fetch current month market performance
    const { data: currentMarkets } = await supabase
      .from("v_market_performance")
      .select("*")
      .eq("month", month)
      .eq("year", year);

    // Fetch previous month for comparison
    const prevMonth = month > 1 ? month - 1 : 12;
    const prevYear = month > 1 ? year : year - 1;
    const { data: prevMarkets } = await supabase
      .from("v_market_performance")
      .select("*")
      .eq("month", prevMonth)
      .eq("year", prevYear);

    // Fetch leads for missed call analysis
    let leads = [];
    let from = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("leads")
        .select("classification, charged, market_id, hour_of_day, lead_creation_cst, phone, customer_name")
        .eq("month", month)
        .eq("year", year)
        .eq("is_deleted", false)
        .range(from, from + 999);
      if (!batch || batch.length === 0) break;
      leads = leads.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }

    // Fetch agent performance
    const { data: agentCalls } = await supabase
      .from("agent_calls")
      .select("agent_id, result, is_bot, market_id")
      .eq("month", month)
      .eq("year", year);

    // Fetch agents
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name");

    // Fetch lead costs for missing spend detection
    const { data: leadCosts } = await supabase
      .from("lead_costs")
      .select("market_id, month, year, total_spend")
      .eq("month", month)
      .eq("year", year);

    // Fetch markets
    const { data: markets } = await supabase
      .from("markets")
      .select("id, name")
      .eq("active", true);

    const marketMap = {};
    (markets || []).forEach(m => { marketMap[m.id] = m.name; });

    const agentMap = {};
    (agents || []).forEach(a => { agentMap[a.id] = a.name; });

    // ——— ANALYSIS ———

    // 1. Markets below connection rate target (< 95%)
    const lowConnRate = (currentMarkets || [])
      .filter(m => m.connection_rate !== null && m.connection_rate < 0.95 && m.charged_leads >= 5)
      .sort((a, b) => a.connection_rate - b.connection_rate)
      .map(m => ({
        market: m.market_name,
        value: `${(m.connection_rate * 100).toFixed(1)}%`,
        metric: "connection rate",
        context: `${m.missed} missed of ${m.charged_leads} charged`,
        severity: m.connection_rate < 0.90 ? "high" : "medium",
        marketId: m.market_id,
      }));

    // 2. Markets with biggest MoM decline
    const prevMap = {};
    (prevMarkets || []).forEach(m => { prevMap[m.market_name] = m; });

    const momDecline = (currentMarkets || [])
      .filter(m => prevMap[m.market_name] && m.connection_rate !== null && prevMap[m.market_name].connection_rate !== null)
      .map(m => {
        const prev = prevMap[m.market_name];
        const delta = (m.connection_rate - prev.connection_rate) * 100;
        return { ...m, delta, prevRate: prev.connection_rate };
      })
      .filter(m => m.delta < -3)
      .sort((a, b) => a.delta - b.delta)
      .map(m => ({
        market: m.market_name,
        value: `${m.delta.toFixed(1)} pts`,
        metric: `vs ${MONTHS[prevMonth]}`,
        context: `${(m.connection_rate * 100).toFixed(1)}% now, was ${(m.prevRate * 100).toFixed(1)}%`,
        severity: m.delta < -5 ? "high" : "medium",
      }));

    // 3. Missed call spikes by hour
    const missedByHour = {};
    leads.filter(l => l.classification === "Missed").forEach(l => {
      const h = l.hour_of_day;
      if (h != null) missedByHour[h] = (missedByHour[h] || 0) + 1;
    });
    const totalMissed = leads.filter(l => l.classification === "Missed").length;
    const missedSpikes = Object.entries(missedByHour)
      .filter(([_, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([hour, count]) => ({
        market: `${hour}:00 CST`,
        value: `${count} missed`,
        metric: `${((count / totalMissed) * 100).toFixed(0)}% of all missed`,
        context: null,
        severity: count >= 5 ? "high" : "medium",
      }));

    // 4. Agents below booking benchmark (< 30% booking rate)
    const agentStats = {};
    (agentCalls || []).forEach(c => {
      const key = c.agent_id || (c.is_bot ? "bot" : "unknown");
      if (!agentStats[key]) agentStats[key] = { calls: 0, booked: 0, isBot: c.is_bot };
      agentStats[key].calls++;
      if (c.result && c.result.toLowerCase().includes("book")) agentStats[key].booked++;
    });

    const lowBooking = Object.entries(agentStats)
      .filter(([_, s]) => s.calls >= 10)
      .map(([id, s]) => ({
        id,
        name: agentMap[id] || (s.isBot ? "Avoca (bot)" : "Unknown"),
        rate: s.calls > 0 ? s.booked / s.calls : 0,
        calls: s.calls,
        booked: s.booked,
      }))
      .filter(a => a.rate < 0.30)
      .sort((a, b) => a.rate - b.rate)
      .map(a => ({
        market: a.name,
        value: `${(a.rate * 100).toFixed(1)}%`,
        metric: "booking rate",
        context: `${a.booked} booked of ${a.calls} calls`,
        severity: a.rate < 0.20 ? "high" : "medium",
      }));

    // 5. Markets missing spend data
    const marketsWithSpend = new Set((leadCosts || []).filter(c => c.total_spend > 0).map(c => c.market_id));
    const marketsWithLeads = new Set((currentMarkets || []).map(m => m.market_id));
    const missingSpend = [...marketsWithLeads]
      .filter(id => !marketsWithSpend.has(id))
      .map(id => ({
        market: marketMap[id] || `Market ${id}`,
        value: "No data",
        metric: "spend missing",
        context: `CPL cannot be calculated for ${MONTHS[month]}`,
        severity: "medium",
      }));

    // 6. Summary stats
    const totalLeads = leads.length;
    const totalConnected = leads.filter(l => l.classification === "Connected").length;
    const totalMissedCount = leads.filter(l => l.classification === "Missed").length;
    const totalCharged = leads.filter(l => l.charged).length;
    const connRate = totalCharged > 0 ? (totalConnected / totalCharged * 100).toFixed(1) : "0";

    const totalIssues = lowConnRate.length + momDecline.length + missedSpikes.length + lowBooking.length + missingSpend.length;

    setData({
      lowConnRate,
      momDecline,
      missedSpikes,
      lowBooking,
      missingSpend,
      totalIssues,
      totalLeads,
      totalMissedCount,
      connRate,
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insights &amp; Exceptions</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {MONTHS[month]} {year} — {data.totalIssues === 0
              ? "No issues detected"
              : `${data.totalIssues} item${data.totalIssues > 1 ? "s" : ""} need attention`}
          </p>
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1">
          {MONTHS.slice(1).map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                month === i + 1
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}>{m}</button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{data.totalLeads.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Total leads</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{data.connRate}%</p>
          <p className="text-xs text-slate-400 mt-1">Connection rate</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className={`text-2xl font-bold ${data.totalMissedCount > 30 ? "text-red-600" : "text-slate-900"}`}>
            {data.totalMissedCount}
          </p>
          <p className="text-xs text-slate-400 mt-1">Missed calls</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className={`text-2xl font-bold ${data.totalIssues > 0 ? "text-amber-600" : "text-green-600"}`}>
            {data.totalIssues}
          </p>
          <p className="text-xs text-slate-400 mt-1">Issues found</p>
        </div>
      </div>

      {/* Exception cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Markets below target */}
        <Card title="Markets Below Target" icon="🎯" count={data.lowConnRate.length} severity="high">
          {data.lowConnRate.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">All markets above 95% connection rate</p>
          ) : (
            data.lowConnRate.map((item, i) => (
              <IssueRow key={i} {...item} onClick={() => navigate(`/markets?market=${encodeURIComponent(item.market)}`)} />
            ))
          )}
        </Card>

        {/* MoM decline */}
        <Card title="Month-over-Month Decline" icon="📉" count={data.momDecline.length} severity="medium">
          {data.momDecline.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No significant connection rate drops vs {MONTHS[month > 1 ? month - 1 : 12]}</p>
          ) : (
            data.momDecline.map((item, i) => (
              <IssueRow key={i} {...item} onClick={() => navigate(`/markets?market=${encodeURIComponent(item.market)}`)} />
            ))
          )}
        </Card>

        {/* Missed call spikes */}
        <Card title="Missed Call Concentrations" icon="📵" count={data.missedSpikes.length} severity={data.missedSpikes.some(s => s.severity === "high") ? "high" : "medium"}>
          {data.missedSpikes.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No significant missed call concentrations</p>
          ) : (
            data.missedSpikes.map((item, i) => (
              <IssueRow key={i} {...item} onClick={() => navigate(`/leads?classification=Missed&month=${month}`)} />
            ))
          )}
        </Card>

        {/* Agents below benchmark */}
        <Card title="Agents Below Booking Benchmark" icon="👤" count={data.lowBooking.length} severity={data.lowBooking.some(s => s.severity === "high") ? "high" : "medium"}>
          {data.lowBooking.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">All agents above 30% booking rate</p>
          ) : (
            data.lowBooking.map((item, i) => (
              <IssueRow key={i} {...item} onClick={() => navigate("/agents")} />
            ))
          )}
        </Card>

        {/* Missing spend data */}
        <Card title="Missing Spend Data" icon="💰" count={data.missingSpend.length} severity="medium">
          {data.missingSpend.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">All markets have spend data for {MONTHS[month]}</p>
          ) : (
            <div>
              {data.missingSpend.slice(0, 8).map((item, i) => (
                <IssueRow key={i} {...item} onClick={() => navigate("/admin")} />
              ))}
              {data.missingSpend.length > 8 && (
                <p className="text-xs text-slate-400 mt-2">+ {data.missingSpend.length - 8} more markets</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
