import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CheckCircle2, XCircle } from "lucide-react";
import { StatusChip } from "../components/ui";

const RESULT_OPTIONS = ["Booked", "Archived", "No Answer", "Not Interested", "Wrong Number", "Duplicate", "Callback", "Voicemail"];
const CALL_TYPE_OPTIONS = ["Inbound", "Outbound", "Follow-up"];
const SOURCE_OPTIONS = ["LSA", "Avoca Bot", "Direct", "Referral", "Other"];
const TTM_OPTIONS = ["Completed", "Cancelled", "No Show", "Pending", "Rescheduled"];

export default function AgentCallForm() {
  const { user, profile } = useAuth();
  const [agents, setAgents] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [myAgent, setMyAgent] = useState(null);
  const [matchedLead, setMatchedLead] = useState(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);

  const [form, setForm] = useState({
    lead_creation_date: new Date().toISOString().split("T")[0],
    client_name: "",
    phone: "",
    email: "",
    op_id: "",
    source_classification: "",
    location: "",
    call_type: "Inbound",
    result: "",
    last_contact: "",
    dial_attempts: "",
    booked_date: "",
    appt_date: "",
    ttm_result: "",
    revenue: "",
    notes: "",
    lead_cost: "",
    source: "LSA",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ data: agentData }, { data: marketData }] = await Promise.all([
      supabase.from("agents").select("*").eq("active", true).order("name"),
      supabase.from("markets").select("id, name").eq("active", true).order("name"),
    ]);
    setAgents(agentData || []);
    setMarkets(marketData || []);

    // Find agent linked to current user
    if (profile?.id && agentData) {
      const linked = agentData.find((a) => a.profile_id === profile.id);
      if (linked) setMyAgent(linked);
    }

    // Load recent calls
    fetchRecentCalls();
  }

  async function fetchRecentCalls() {
    const { data } = await supabase
      .from("agent_calls")
      .select("id, client_name, phone, result, location, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentCalls(data || []);
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "phone" && value.length >= 10) {
      searchLead(value);
    }
  }

  async function searchLead(phone) {
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) return;

    setSearching(true);
    setMatchedLead(null);

    // Match against agent_calls (the live pipeline table), NOT the legacy `leads`
    // table — `leads` stopped being populated when the pipeline moved to
    // agent_calls, so July+ lookups against it always came back empty.
    const { data, error } = await supabase
      .from("agent_calls")
      .select("client_name, email, market_name, source_classification, lead_creation_date, phone")
      .ilike("phone", `%${digits}`)
      .eq("year", 2026)
      .eq("is_deleted", false)
      .order("lead_creation_date", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lead = data[0];
      setMatchedLead(lead);
      // Auto-populate fields from matched lead
      setForm((prev) => ({
        ...prev,
        client_name: prev.client_name || lead.client_name || "",
        email: prev.email || lead.email || "",
        location: lead.market_name || prev.location,
        source_classification: lead.source_classification || "",
        lead_creation_date: lead.lead_creation_date || prev.lead_creation_date,
      }));
    }
    setSearching(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const agentId = myAgent?.id || agents[0]?.id;
    if (!agentId) {
      setError("No agent linked to your account. Contact admin.");
      setSubmitting(false);
      return;
    }

    if (!form.result) {
      setError("Result is required.");
      setSubmitting(false);
      return;
    }

    const now = new Date();
    const record = {
      agent_id: agentId,
      lead_creation_date: form.lead_creation_date || null,
      client_name: form.client_name || null,
      phone: form.phone || null,
      email: form.email || null,
      op_id: form.op_id || null,
      source_classification: form.source_classification || null,
      location: form.location || null,
      call_type: form.call_type || null,
      result: form.result,
      last_contact: form.last_contact || null,
      dial_attempts: form.dial_attempts ? parseInt(form.dial_attempts) : null,
      booked_date: form.booked_date || null,
      appt_date: form.appt_date || null,
      ttm_result: form.ttm_result || null,
      revenue: form.revenue ? parseFloat(form.revenue) : null,
      notes: form.notes || null,
      lead_cost: form.lead_cost ? parseFloat(form.lead_cost) : null,
      source: form.source || null,
      market_name: form.location || null,
      is_bot: form.source === "Avoca Bot",
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      created_by: profile?.id || null,
    };

    const { data, error: insertError } = await supabase
      .from("agent_calls")
      .insert([record])
      .select();

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      setMatchedLead(null);
      setForm({
        lead_creation_date: new Date().toISOString().split("T")[0],
        client_name: "",
        phone: "",
        email: "",
        op_id: "",
        source_classification: "",
        location: "",
        call_type: "Inbound",
        result: "",
        last_contact: "",
        dial_attempts: "",
        booked_date: "",
        appt_date: "",
        ttm_result: "",
        revenue: "",
        notes: "",
        lead_cost: "",
        source: "LSA",
      });
      fetchRecentCalls();
      setTimeout(() => setSuccess(false), 3000);
    }
    setSubmitting(false);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink-900">Log a call</h1>
        {myAgent && (
          <span className="text-sm text-ink-500">
            Logging as <span className="font-medium text-ink-700">{myAgent.name}</span>
          </span>
        )}
      </div>

      {/* Success / Error banners */}
      {success && (
        <div className="mb-4 flex items-center gap-2 bg-positive-50 border border-positive/20 text-positive px-4 py-3 rounded-lg text-sm">
          <CheckCircle2 size={15} className="shrink-0" />
          Call logged successfully! Lead matching trigger fired.
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-critical-50 border border-critical/20 text-critical px-4 py-3 rounded-lg text-sm">
          <XCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-surface rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone — with lead matching */}
              <div className="md:col-span-2">
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Phone number</label>
                <div className="relative">
                  <input type="tel" value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="Enter phone to auto-match LSA lead..."
                    className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent tnum" />
                  {searching && (
                    <div className="absolute right-3 top-2.5">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {matchedLead && (
                  <div className="mt-2 flex items-start gap-1.5 bg-accent-50 border border-accent/20 rounded-lg px-3 py-2 text-xs text-accent">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                    <span>
                      Matched LSA lead: <span className="font-medium">{matchedLead.client_name || "Unknown"}</span>
                      {matchedLead.market_name && <> in <span className="font-medium">{matchedLead.market_name}</span></>}
                      {matchedLead.source_classification && <> — {matchedLead.source_classification}</>}
                      {matchedLead.lead_creation_date && (
                        <span> ({new Date(matchedLead.lead_creation_date + "T00:00:00").toLocaleDateString()})</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Client name</label>
                <input type="text" value={form.client_name}
                  onChange={(e) => updateField("client_name", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Email</label>
                <input type="email" value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Market / location *</label>
                <select value={form.location} onChange={(e) => updateField("location", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent">
                  <option value="">Select market...</option>
                  {markets.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Lead date</label>
                <input type="date" value={form.lead_creation_date}
                  onChange={(e) => updateField("lead_creation_date", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent tnum" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Result *</label>
                <select value={form.result} onChange={(e) => updateField("result", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent">
                  <option value="">Select result...</option>
                  {RESULT_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Call type</label>
                <select value={form.call_type} onChange={(e) => updateField("call_type", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent">
                  {CALL_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Source</label>
                <select value={form.source} onChange={(e) => updateField("source", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent">
                  {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Op ID</label>
                <input type="text" value={form.op_id}
                  onChange={(e) => updateField("op_id", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Classification</label>
                <input type="text" value={form.source_classification} readOnly
                  className="w-full border border-ink-100 rounded-lg px-3 py-2 text-sm bg-ink-50 text-ink-500" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Dial attempts</label>
                <input type="number" value={form.dial_attempts}
                  onChange={(e) => updateField("dial_attempts", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent tnum" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Last contact</label>
                <input type="datetime-local" value={form.last_contact}
                  onChange={(e) => updateField("last_contact", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent tnum" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Booked date</label>
                <input type="date" value={form.booked_date}
                  onChange={(e) => updateField("booked_date", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent tnum" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Appointment date</label>
                <input type="date" value={form.appt_date}
                  onChange={(e) => updateField("appt_date", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent tnum" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">TTM result</label>
                <select value={form.ttm_result} onChange={(e) => updateField("ttm_result", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent">
                  <option value="">Select...</option>
                  {TTM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Revenue ($)</label>
                <input type="number" step="0.01" value={form.revenue}
                  onChange={(e) => updateField("revenue", e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent tnum" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Lead cost ($)</label>
                <input type="number" step="0.01" value={form.lead_cost}
                  onChange={(e) => updateField("lead_cost", e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent tnum" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[12px] font-medium text-ink-500 mb-1">Notes</label>
                <textarea value={form.notes} rows={3}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 bg-surface outline-none focus:border-accent resize-none" />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={handleSubmit} disabled={submitting}
                className="bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {submitting ? "Saving..." : "Log call"}
              </button>
              <button onClick={() => {
                setForm({
                  lead_creation_date: new Date().toISOString().split("T")[0],
                  client_name: "", phone: "", email: "", op_id: "", source_classification: "",
                  location: "", call_type: "Inbound", result: "", last_contact: "", dial_attempts: "",
                  booked_date: "", appt_date: "", ttm_result: "", revenue: "", notes: "", lead_cost: "", source: "LSA",
                });
                setMatchedLead(null);
              }}
                className="bg-surface text-ink-600 px-6 py-2.5 rounded-lg text-sm font-semibold border border-ink-200 hover:bg-ink-50 transition-colors">
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar — Recent calls */}
        <div>
          <div className="bg-surface rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] p-4">
            <h3 className="text-[13px] font-semibold text-ink-800 mb-3">Recent calls</h3>
            {recentCalls.length === 0 ? (
              <p className="text-xs text-ink-400">No calls logged yet</p>
            ) : (
              <div className="space-y-2">
                {recentCalls.map((call) => {
                  const tone = call.result === "Booked" || call.result === "FU Booked"
                    ? "positive"
                    : call.result === "No Answer"
                    ? "caution"
                    : "neutral";
                  return (
                    <div key={call.id} className="border-b border-ink-100 pb-2 last:border-0">
                      <p className="text-sm font-medium text-ink-700">{call.client_name || "Unknown"}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs text-ink-400">
                          {call.location} · {new Date(call.created_at).toLocaleDateString()}
                        </span>
                        {call.result && <StatusChip tone={tone}>{call.result}</StatusChip>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-steel-50 border border-steel/20 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-semibold text-steel mb-2">How it works</h3>
            <ul className="text-xs text-steel space-y-1">
              <li>• Enter a phone number to auto-match an LSA lead</li>
              <li>• Matched leads auto-fill name, market, and classification</li>
              <li>• Result is required — all other fields are optional</li>
              <li>• Lead matching trigger runs automatically on save</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
