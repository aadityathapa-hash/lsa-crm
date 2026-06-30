// Derives a human-readable "who handled this" label from the attributed call.
// Missed calls have no answering agent, so instead of a bare "Unattributed" we
// surface the routing the pipeline already recorded in `notes`:
//   - Avoca answered then transferred to the human queue  -> "Avoca → missed/transfer"
//   - rang the human (Dialpad) queue, nobody picked up     -> "Queue — missed/Queue"
//   - genuinely no record anywhere                         -> "Unattributed"
//
// kind drives the icon/tone in the UI: bot | agent | avoca | queue | unattr
export function handledLabel({ is_bot, agentName, source_classification, notes }) {
  if (is_bot) return { text: "Avoca bot", kind: "bot" };
  if (agentName && agentName !== "Unattributed") return { text: agentName, kind: "agent" };

  const n = (notes || "").toLowerCase();
  const missed = (source_classification || "").includes("Missed");

  if (n.includes("avoca->human") || n.includes("avoca → human") || n.includes("avoca transfer")) {
    return { text: missed ? "Avoca → missed" : "Avoca → transfer", kind: "avoca" };
  }
  if (n.includes("queue")) {
    return { text: missed ? "Queue — missed" : "Queue", kind: "queue" };
  }
  return { text: "Unattributed", kind: "unattr" };
}
