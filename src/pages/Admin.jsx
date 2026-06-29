import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Plus, Save, Pencil, RefreshCw, Settings2 } from "lucide-react";
import { StatusChip, EmptyState } from "../components/ui";

const cardCls = "bg-white rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden";
const thCls = "px-4 py-2.5 text-[10.5px] font-semibold text-ink-400 uppercase tracking-wider bg-ink-50/60 text-left";
const inputCls = "border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-white outline-none focus:border-accent";
const primaryBtn = "inline-flex items-center gap-1.5 bg-accent text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50";
const linkBtn = "text-[13px] font-semibold text-accent hover:opacity-80 transition-opacity";

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 text-[13px] font-semibold rounded-lg transition-colors ${
        active ? "bg-ink-900 text-white" : "bg-white text-ink-500 hover:text-ink-800 border border-ink-200"
      }`}>{children}</button>
  );
}

// ============================================================
// USER MANAGEMENT
// ============================================================
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function updateRole(userId, newRole) {
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    setEditing(null);
    loadUsers();
  }

  const roleTone = (role) => role === "admin" ? "positive" : role === "agent" ? "info" : "neutral";

  return (
    <div className={cardCls}>
      <div className="px-5 py-3.5 border-b border-ink-50">
        <h2 className="text-[13px] font-semibold text-ink-800">Users & roles</h2>
        <p className="text-[12px] text-ink-400 mt-0.5">Manage who can access the CRM and what they can do.</p>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={thCls}>Name</th>
                <th className={thCls}>Email</th>
                <th className={thCls}>Role</th>
                <th className={thCls}>Joined</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-ink-50 hover:bg-ink-50/60 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-ink-800">{u.full_name || "—"}</td>
                  <td className="px-4 py-2.5 text-ink-600">{u.email}</td>
                  <td className="px-4 py-2.5">
                    {editing === u.id ? (
                      <select defaultValue={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        onBlur={() => setEditing(null)}
                        autoFocus
                        className={inputCls + " text-sm px-2 py-1"}>
                        <option value="admin">admin</option>
                        <option value="agent">agent</option>
                        <option value="viewer">viewer</option>
                      </select>
                    ) : (
                      <StatusChip tone={roleTone(u.role)}>{u.role}</StatusChip>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-ink-400 text-xs tnum">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => setEditing(u.id)} className={linkBtn}>Change role</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MARKET MANAGEMENT
// ============================================================
function MarketManagement() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMarket, setNewMarket] = useState({ name: "", account_id: "", timezone: "CST", cst_offset_hours: 0 });

  useEffect(() => { loadMarkets(); }, []);

  async function loadMarkets() {
    setLoading(true);
    const { data } = await supabase.from("markets").select("*").order("name");
    setMarkets(data || []);
    setLoading(false);
  }

  async function addMarket() {
    if (!newMarket.name || !newMarket.account_id) return;
    const { error } = await supabase.from("markets").insert([newMarket]);
    if (error) { alert(error.message); return; }
    setNewMarket({ name: "", account_id: "", timezone: "CST", cst_offset_hours: 0 });
    setShowAdd(false);
    loadMarkets();
  }

  async function toggleActive(id, active) {
    await supabase.from("markets").update({ active: !active }).eq("id", id);
    loadMarkets();
  }

  const tzOffsets = { PST: 2, MST: 1, CST: 0, EST: -1 };

  return (
    <div className={cardCls}>
      <div className="px-5 py-3.5 border-b border-ink-50 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-ink-800">Markets ({markets.length})</h2>
          <p className="text-[12px] text-ink-400 mt-0.5">Manage markets, account IDs, and timezones.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className={primaryBtn}>
          {showAdd ? "Cancel" : <><Plus size={15} /> Add market</>}
        </button>
      </div>

      {showAdd && (
        <div className="p-5 bg-ink-50/60 border-b border-ink-50 flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-[12px] font-medium text-ink-500 mb-1">Name</label>
            <input type="text" value={newMarket.name} onChange={(e) => setNewMarket({ ...newMarket, name: e.target.value })}
              className={inputCls + " w-40"} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-500 mb-1">Account ID</label>
            <input type="text" value={newMarket.account_id} onChange={(e) => setNewMarket({ ...newMarket, account_id: e.target.value })}
              className={inputCls + " w-36"} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-500 mb-1">Timezone</label>
            <select value={newMarket.timezone}
              onChange={(e) => setNewMarket({ ...newMarket, timezone: e.target.value, cst_offset_hours: tzOffsets[e.target.value] })}
              className={inputCls}>
              <option value="PST">PST</option>
              <option value="MST">MST</option>
              <option value="CST">CST</option>
              <option value="EST">EST</option>
            </select>
          </div>
          <button onClick={addMarket} className={primaryBtn}><Save size={15} /> Save</button>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={thCls}>Market</th>
                <th className={thCls}>Account ID</th>
                <th className={thCls}>Timezone</th>
                <th className={thCls}>CST Offset</th>
                <th className={thCls}>Brand</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.id} className={`border-t border-ink-50 hover:bg-ink-50/60 transition-colors ${!m.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 font-medium text-ink-800">{m.name}</td>
                  <td className="px-4 py-2.5 text-ink-600 font-mono text-xs tnum">{m.account_id}</td>
                  <td className="px-4 py-2.5 text-ink-600">{m.timezone}</td>
                  <td className="px-4 py-2.5 text-ink-600 tnum">{m.cst_offset_hours >= 0 ? "+" : ""}{m.cst_offset_hours}</td>
                  <td className="px-4 py-2.5 text-ink-400 text-xs">{m.brand}</td>
                  <td className="px-4 py-2.5">
                    <StatusChip tone={m.active ? "positive" : "neutral"}>{m.active ? "Active" : "Inactive"}</StatusChip>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleActive(m.id, m.active)} className={linkBtn}>
                      {m.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SPEND ENTRY
// ============================================================
function SpendEntry() {
  const [markets, setMarkets] = useState([]);
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  useEffect(() => {
    supabase.from("markets").select("id, name").eq("active", true).order("name")
      .then(({ data }) => setMarkets(data || []));
  }, []);

  useEffect(() => { loadCosts(); }, [month]);

  async function loadCosts() {
    setLoading(true);
    const { data } = await supabase.from("lead_costs").select("*").eq("month", month).eq("year", 2026);
    setCosts(data || []);
    setLoading(false);
  }

  function getSpend(marketId) {
    return costs.find(c => c.market_id === marketId);
  }

  async function saveSpend(marketId) {
    const val = parseFloat(editValue);
    if (isNaN(val)) return;

    const existing = getSpend(marketId);
    if (existing) {
      await supabase.from("lead_costs").update({ total_spend: val }).eq("id", existing.id);
    } else {
      await supabase.from("lead_costs").insert([{
        market_id: marketId, month, year: 2026, total_spend: val
      }]);
    }
    setEditing(null);
    setEditValue("");
    loadCosts();
  }

  return (
    <div className={cardCls}>
      <div className="px-5 py-3.5 border-b border-ink-50 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[13px] font-semibold text-ink-800">Marketing spend — {monthNames[month - 1]} 2026</h2>
          <p className="text-[12px] text-ink-400 mt-0.5">Enter per-market spend for CPL/ROAS calculations.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-0.5 bg-white rounded-lg border border-ink-200 p-1 shrink-0">
          {monthNames.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                month === i + 1 ? "bg-accent text-white" : "text-ink-400 hover:text-ink-800 hover:bg-ink-50"
              }`}>{m}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={thCls}>Market</th>
                <th className={thCls + " text-right"}>Total Spend</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => {
                const spend = getSpend(m.id);
                return (
                  <tr key={m.id} className="border-t border-ink-50 hover:bg-ink-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-ink-800">{m.name}</td>
                    <td className="px-4 py-2.5 text-right">
                      {editing === m.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-ink-400">$</span>
                          <input type="number" step="0.01" value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveSpend(m.id)}
                            autoFocus
                            className={inputCls + " w-28 text-right tnum px-2 py-1"} />
                          <button onClick={() => saveSpend(m.id)}
                            className="inline-flex items-center gap-1 bg-accent text-white px-2 py-1 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"><Save size={13} /> Save</button>
                          <button onClick={() => setEditing(null)}
                            className="text-xs text-ink-400 hover:text-ink-700 transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <span className={spend ? "text-ink-800 tnum" : "text-ink-300"}>
                          {spend ? "$" + parseFloat(spend.total_spend).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => { setEditing(m.id); setEditValue(spend?.total_spend?.toString() || ""); }}
                        className={linkBtn + " inline-flex items-center gap-1"}>
                        <Pencil size={13} /> {spend ? "Edit" : "Add spend"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// AGENT MANAGEMENT
// ============================================================
function AgentManagement() {
  const [agents, setAgents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", team: "" });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from("agents").select("*").order("name"),
      supabase.from("profiles").select("id, email, full_name").order("email"),
    ]);
    setAgents(a || []);
    setProfiles(p || []);
    setLoading(false);
  }

  async function addAgent() {
    if (!newAgent.name) return;
    await supabase.from("agents").insert([{ name: newAgent.name, team: newAgent.team || newAgent.name }]);
    setNewAgent({ name: "", team: "" });
    setShowAdd(false);
    loadData();
  }

  async function linkProfile(agentId, profileId) {
    await supabase.from("agents").update({ profile_id: profileId || null }).eq("id", agentId);
    loadData();
  }

  async function toggleActive(id, active) {
    await supabase.from("agents").update({ active: !active }).eq("id", id);
    loadData();
  }

  return (
    <div className={cardCls}>
      <div className="px-5 py-3.5 border-b border-ink-50 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-ink-800">Agents ({agents.length})</h2>
          <p className="text-[12px] text-ink-400 mt-0.5">Manage agent roster and link to user profiles.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className={primaryBtn}>
          {showAdd ? "Cancel" : <><Plus size={15} /> Add agent</>}
        </button>
      </div>

      {showAdd && (
        <div className="p-5 bg-ink-50/60 border-b border-ink-50 flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-[12px] font-medium text-ink-500 mb-1">Name</label>
            <input type="text" value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              className={inputCls + " w-40"} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-500 mb-1">Team</label>
            <input type="text" value={newAgent.team} onChange={(e) => setNewAgent({ ...newAgent, team: e.target.value })}
              className={inputCls + " w-40"} />
          </div>
          <button onClick={addAgent} className={primaryBtn}><Save size={15} /> Save</button>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={thCls}>Agent</th>
                <th className={thCls}>Team</th>
                <th className={thCls}>Linked Profile</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className={`border-t border-ink-50 hover:bg-ink-50/60 transition-colors ${!a.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 font-medium text-ink-800">{a.name}</td>
                  <td className="px-4 py-2.5 text-ink-600">{a.team || "—"}</td>
                  <td className="px-4 py-2.5">
                    <select value={a.profile_id || ""}
                      onChange={(e) => linkProfile(a.id, e.target.value)}
                      className={inputCls + " w-48 text-xs px-2 py-1"}>
                      <option value="">Not linked</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusChip tone={a.active ? "positive" : "neutral"}>{a.active ? "Active" : "Inactive"}</StatusChip>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleActive(a.id, a.active)} className={linkBtn}>
                      {a.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ACTIVITY LOG
// ============================================================
function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterUser, setFilterUser] = useState("all");

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs(data || []);
    setLoading(false);
  }

  const users = [...new Set(logs.map(l => l.user_name).filter(Boolean))].sort();

  const filtered = logs.filter(l => {
    if (filterType !== "all" && l.event_type !== filterType) return false;
    if (filterUser !== "all" && l.user_name !== filterUser) return false;
    return true;
  });

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  const typeTone = {
    login: "positive",
    page_view: "neutral",
    action: "info",
  };

  return (
    <div className={cardCls}>
      <div className="px-5 py-3.5 border-b border-ink-50 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[13px] font-semibold text-ink-800">Activity log</h2>
          <p className="text-[12px] text-ink-400 mt-0.5">Logins, page views, and key actions — last 500 events.</p>
        </div>
        <div className="flex gap-2">
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
            className={inputCls + " text-xs px-2 py-1.5"}>
            <option value="all">All users</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className={inputCls + " text-xs px-2 py-1.5"}>
            <option value="all">All events</option>
            <option value="login">Logins</option>
            <option value="page_view">Page views</option>
            <option value="action">Actions</option>
          </select>
          <button onClick={loadLogs}
            className="inline-flex items-center gap-1.5 bg-white text-ink-600 rounded-lg text-sm font-semibold border border-ink-200 px-3 py-1.5 hover:bg-ink-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No activity yet" />
      ) : (
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr>
                <th className={thCls}>User</th>
                <th className={thCls}>Event</th>
                <th className={thCls}>Detail</th>
                <th className={thCls}>When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-ink-50 hover:bg-ink-50/60 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-ink-800">{l.user_name || "—"}</div>
                    <div className="text-xs text-ink-400">{l.user_email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusChip tone={typeTone[l.event_type] || "neutral"}>
                      {l.event_type === "page_view" ? "page view" : l.event_type}
                    </StatusChip>
                  </td>
                  <td className="px-4 py-2.5 text-ink-600">{l.event_detail || "—"}</td>
                  <td className="px-4 py-2.5 text-ink-400 text-xs whitespace-nowrap tnum" title={new Date(l.created_at).toLocaleString()}>
                    {timeAgo(l.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN ADMIN PAGE
// ============================================================
export default function Admin() {
  const [tab, setTab] = useState("users");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink-900 flex items-center gap-2">
          <Settings2 size={20} className="text-ink-400" /> Admin
        </h1>
        <p className="text-[13px] text-ink-500 mt-1">Users, agents, markets, marketing spend, and activity.</p>
      </div>

      <div className="flex flex-wrap gap-1">
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>Users & roles</TabButton>
        <TabButton active={tab === "agents"} onClick={() => setTab("agents")}>Agents</TabButton>
        <TabButton active={tab === "markets"} onClick={() => setTab("markets")}>Markets</TabButton>
        <TabButton active={tab === "spend"} onClick={() => setTab("spend")}>Marketing spend</TabButton>
        <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>Activity log</TabButton>
      </div>

      {tab === "users" && <UserManagement />}
      {tab === "agents" && <AgentManagement />}
      {tab === "markets" && <MarketManagement />}
      {tab === "spend" && <SpendEntry />}
      {tab === "activity" && <ActivityLog />}
    </div>
  );
}
