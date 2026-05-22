import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        active ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
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

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">Users & Roles</h2>
        <p className="text-xs text-slate-400 mt-0.5">Manage who can access the CRM and what they can do</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-2 font-medium text-slate-500">Name</th>
              <th className="px-4 py-2 font-medium text-slate-500">Email</th>
              <th className="px-4 py-2 font-medium text-slate-500">Role</th>
              <th className="px-4 py-2 font-medium text-slate-500">Joined</th>
              <th className="px-4 py-2 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800">{u.full_name || "—"}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2">
                  {editing === u.id ? (
                    <select defaultValue={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      onBlur={() => setEditing(null)}
                      autoFocus
                      className="text-sm border border-slate-200 rounded px-2 py-1 bg-white">
                      <option value="admin">admin</option>
                      <option value="agent">agent</option>
                      <option value="viewer">viewer</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "admin" ? "bg-purple-100 text-purple-700" :
                      u.role === "agent" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{u.role}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <button onClick={() => setEditing(u.id)}
                    className="text-xs text-blue-600 hover:text-blue-800">Change role</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Markets ({markets.length})</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage markets, account IDs, and timezones</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
          {showAdd ? "Cancel" : "+ Add Market"}
        </button>
      </div>

      {showAdd && (
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <input type="text" value={newMarket.name} onChange={(e) => setNewMarket({ ...newMarket, name: e.target.value })}
              className="border border-slate-200 rounded px-2 py-1.5 text-sm w-40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Account ID</label>
            <input type="text" value={newMarket.account_id} onChange={(e) => setNewMarket({ ...newMarket, account_id: e.target.value })}
              className="border border-slate-200 rounded px-2 py-1.5 text-sm w-36" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Timezone</label>
            <select value={newMarket.timezone}
              onChange={(e) => setNewMarket({ ...newMarket, timezone: e.target.value, cst_offset_hours: tzOffsets[e.target.value] })}
              className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-white">
              <option value="PST">PST</option>
              <option value="MST">MST</option>
              <option value="CST">CST</option>
              <option value="EST">EST</option>
            </select>
          </div>
          <button onClick={addMarket}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700">Save</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2 font-medium text-slate-500">Market</th>
                <th className="px-4 py-2 font-medium text-slate-500">Account ID</th>
                <th className="px-4 py-2 font-medium text-slate-500">Timezone</th>
                <th className="px-4 py-2 font-medium text-slate-500">CST Offset</th>
                <th className="px-4 py-2 font-medium text-slate-500">Brand</th>
                <th className="px-4 py-2 font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.id} className={`border-t border-slate-100 hover:bg-slate-50 ${!m.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2 font-medium text-slate-800">{m.name}</td>
                  <td className="px-4 py-2 text-slate-600 font-mono text-xs">{m.account_id}</td>
                  <td className="px-4 py-2 text-slate-600">{m.timezone}</td>
                  <td className="px-4 py-2 text-slate-600">{m.cst_offset_hours >= 0 ? "+" : ""}{m.cst_offset_hours}</td>
                  <td className="px-4 py-2 text-slate-400 text-xs">{m.brand}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>{m.active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => toggleActive(m.id, m.active)}
                      className="text-xs text-blue-600 hover:text-blue-800">
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
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Marketing Spend — {monthNames[month - 1]} 2026</h2>
          <p className="text-xs text-slate-400 mt-0.5">Enter per-market spend for CPL/ROAS calculations</p>
        </div>
        <div className="flex gap-1">
          {monthNames.map((m, i) => (
            <button key={m} onClick={() => setMonth(i + 1)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                month === i + 1 ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}>{m}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-2 font-medium text-slate-500">Market</th>
              <th className="px-4 py-2 font-medium text-slate-500 text-right">Total Spend</th>
              <th className="px-4 py-2 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => {
              const spend = getSpend(m.id);
              return (
                <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{m.name}</td>
                  <td className="px-4 py-2 text-right">
                    {editing === m.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-slate-400">$</span>
                        <input type="number" step="0.01" value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveSpend(m.id)}
                          autoFocus
                          className="border border-slate-200 rounded px-2 py-1 text-sm w-28 text-right" />
                        <button onClick={() => saveSpend(m.id)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Save</button>
                        <button onClick={() => setEditing(null)}
                          className="text-xs text-slate-400">Cancel</button>
                      </div>
                    ) : (
                      <span className={spend ? "text-slate-800" : "text-slate-300"}>
                        {spend ? "$" + parseFloat(spend.total_spend).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => { setEditing(m.id); setEditValue(spend?.total_spend?.toString() || ""); }}
                      className="text-xs text-blue-600 hover:text-blue-800">
                      {spend ? "Edit" : "Add spend"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Agents ({agents.length})</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage agent roster and link to user profiles</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
          {showAdd ? "Cancel" : "+ Add Agent"}
        </button>
      </div>

      {showAdd && (
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <input type="text" value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              className="border border-slate-200 rounded px-2 py-1.5 text-sm w-40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Team</label>
            <input type="text" value={newAgent.team} onChange={(e) => setNewAgent({ ...newAgent, team: e.target.value })}
              className="border border-slate-200 rounded px-2 py-1.5 text-sm w-40" />
          </div>
          <button onClick={addAgent}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700">Save</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-2 font-medium text-slate-500">Agent</th>
              <th className="px-4 py-2 font-medium text-slate-500">Team</th>
              <th className="px-4 py-2 font-medium text-slate-500">Linked Profile</th>
              <th className="px-4 py-2 font-medium text-slate-500">Status</th>
              <th className="px-4 py-2 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className={`border-t border-slate-100 hover:bg-slate-50 ${!a.active ? "opacity-50" : ""}`}>
                <td className="px-4 py-2 font-medium text-slate-800">{a.name}</td>
                <td className="px-4 py-2 text-slate-600">{a.team || "—"}</td>
                <td className="px-4 py-2">
                  <select value={a.profile_id || ""}
                    onChange={(e) => linkProfile(a.id, e.target.value)}
                    className="text-xs border border-slate-200 rounded px-2 py-1 bg-white w-48">
                    <option value="">Not linked</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    a.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>{a.active ? "Active" : "Inactive"}</span>
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => toggleActive(a.id, a.active)}
                    className="text-xs text-blue-600 hover:text-blue-800">
                    {a.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Admin Panel</h1>

      <div className="flex gap-2 mb-6">
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>Users & Roles</TabButton>
        <TabButton active={tab === "agents"} onClick={() => setTab("agents")}>Agents</TabButton>
        <TabButton active={tab === "markets"} onClick={() => setTab("markets")}>Markets</TabButton>
        <TabButton active={tab === "spend"} onClick={() => setTab("spend")}>Marketing Spend</TabButton>
      </div>

      {tab === "users" && <UserManagement />}
      {tab === "agents" && <AgentManagement />}
      {tab === "markets" && <MarketManagement />}
      {tab === "spend" && <SpendEntry />}
    </div>
  );
}
