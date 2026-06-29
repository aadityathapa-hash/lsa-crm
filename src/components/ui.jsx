// "Control" design-system primitives — the shared kit the redesign is built from.
// Monochrome + one accent + status semantics. No emoji, tabular numerals, hairlines.
import { Info } from "lucide-react";

/* ---------- Source / provenance tag (the trust spine) ---------- */
const SOURCE = {
  "call":   { label: "Call System",     cls: "text-steel bg-steel-50 border-steel/20" },
  "sf":     { label: "Salesforce",      cls: "text-steel bg-steel-50 border-steel/20" },
  "lsa":    { label: "LSA-attributed",  cls: "text-ink-500 bg-ink-50 border-ink-200" },
  "manual": { label: "Manual",          cls: "text-ink-500 bg-ink-50 border-ink-200" },
};
export function SourceTag({ source, title }) {
  const s = SOURCE[source] || SOURCE.lsa;
  return (
    <span title={title} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${s.cls}`}>
      {s.label}
    </span>
  );
}

/* ---------- Status chip (one fixed vocabulary) ---------- */
const TONE = {
  positive: "text-positive bg-positive-50 border-positive/20",
  caution:  "text-caution bg-caution-50 border-caution/20",
  critical: "text-critical bg-critical-50 border-critical/20",
  neutral:  "text-ink-600 bg-ink-50 border-ink-200",
  info:     "text-steel bg-steel-50 border-steel/20",
};
export function StatusChip({ tone = "neutral", children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

/* ---------- Rate chip — colored vs a target, target in tooltip ---------- */
export function RateChip({ value, target = 0.95, suffix = "%" }) {
  if (value == null) return <span className="text-ink-300">—</span>;
  const pct = (value * 100);
  const tone = pct >= target * 100 ? "positive" : pct >= target * 100 - 5 ? "caution" : "critical";
  return (
    <StatusChip tone={tone} className="tnum" >
      {pct.toFixed(1)}{suffix}
    </StatusChip>
  );
}

/* ---------- Delta indicator (MTD-aware label passed in) ---------- */
export function Delta({ value, label, goodIsUp = true }) {
  if (value == null) return null;
  const up = value >= 0;
  const good = goodIsUp ? up : !up;
  const color = value === 0 ? "text-ink-400" : good ? "text-positive" : "text-critical";
  const arrow = value === 0 ? "" : up ? "↑" : "↓";
  return (
    <span className={`text-[11px] font-medium ${color}`}>
      {arrow} {up ? "+" : ""}{value}{label ? ` ${label}` : ""}
    </span>
  );
}

/* ---------- Metric (headline / supporting) ---------- */
export function Metric({ label, value, unit, source, delta, deltaLabel, deltaGoodIsUp = true, sub, size = "supporting", definition }) {
  const big = size === "headline";
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
        {source && <SourceTag source={source} title={definition} />}
        {definition && !source && <span title={definition}><Info size={12} className="text-ink-300" /></span>}
      </div>
      <div className={`mt-1 font-bold tracking-tight text-ink-900 tnum leading-none ${big ? "text-[34px]" : "text-2xl"}`}>
        {value}{unit && <span className="text-ink-400 font-semibold text-[0.55em] ml-0.5">{unit}</span>}
      </div>
      {(delta != null || sub) && (
        <div className="mt-1.5 flex items-center gap-2">
          {delta != null && <Delta value={delta} label={deltaLabel} goodIsUp={deltaGoodIsUp} />}
          {sub && <span className="text-[11px] text-ink-400">{sub}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------- Section card (border earns its place) ---------- */
export function Section({ title, source, right, note, children, className = "" }) {
  return (
    <section className={`bg-white rounded-[12px] border border-ink-100 ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            {title && <h2 className="text-[13px] font-semibold text-ink-800">{title}</h2>}
            {source && <SourceTag source={source} />}
          </div>
          {right}
        </header>
      )}
      {note && <Caveat className="mx-5 mb-3">{note}</Caveat>}
      <div className={title ? "px-5 pb-5" : "p-5"}>{children}</div>
    </section>
  );
}

/* ---------- Caveat — quiet inline provenance/uncertainty note ---------- */
export function Caveat({ children, className = "" }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg bg-caution-50 border border-caution/15 px-3 py-2 text-[12px] text-caution ${className}`}>
      <Info size={14} className="mt-0.5 shrink-0" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

/* ---------- Reconcile line — "A vs B because…" ---------- */
export function Reconcile({ children }) {
  return (
    <div className="text-[12px] text-ink-500 bg-ink-50 border border-ink-100 rounded-lg px-3 py-2 leading-snug">
      {children}
    </div>
  );
}

/* ---------- Narrative — generated summary sentence ---------- */
export function Narrative({ children }) {
  return (
    <p className="text-[15px] leading-relaxed text-ink-700">{children}</p>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-ink-100 rounded-lg ${className}`} />;
}

/* ---------- Empty state ---------- */
export function EmptyState({ title, hint, action }) {
  return (
    <div className="text-center py-14">
      <p className="text-sm font-medium text-ink-600">{title}</p>
      {hint && <p className="text-[13px] text-ink-400 mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
