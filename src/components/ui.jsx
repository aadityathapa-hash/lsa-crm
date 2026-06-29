// "Control" design-system primitives — the shared kit the redesign is built from.
// Monochrome + one accent + status semantics. No emoji, tabular numerals, hairlines.
import { Info } from "lucide-react";

/* ---------- Brand mark (Concept D — performance bars) ---------- */
export function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="LSA Operations">
      <rect width="40" height="40" rx="10" fill="#1f7a52" />
      <g fill="#fff">
        <rect x="10" y="22" width="4.6" height="8" rx="1.6" />
        <rect x="17.7" y="16" width="4.6" height="14" rx="1.6" />
        <rect x="25.4" y="10" width="4.6" height="20" rx="1.6" />
      </g>
    </svg>
  );
}

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

/* ---------- Sparkline (inline SVG, no deps) ---------- */
export function Sparkline({ data, color = "#1f7a52", w = 96, h = 34 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const x = (i) => (i / (data.length - 1)) * w;
  const y = (v) => h - 3 - ((v - min) / range) * (h - 6);
  const line = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const gid = `sg-${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} className="overflow-visible block">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.16" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}

/* ---------- Metric (headline / supporting) ---------- */
export function Metric({ label, value, unit, source, delta, deltaLabel, deltaGoodIsUp = true, sub, size = "supporting", definition, spark, sparkColor }) {
  const big = size === "headline";
  return (
    <div className="flex items-start justify-between gap-3 min-w-0">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</span>
          {source && <SourceTag source={source} title={definition} />}
          {definition && !source && <span title={definition}><Info size={12} className="text-ink-300" /></span>}
        </div>
        <div className={`mt-2 font-bold tracking-[-0.025em] text-ink-900 tnum leading-none ${big ? "text-[42px]" : "text-[27px]"}`}>
          {value}{unit && <span className="text-ink-300 font-semibold text-[0.46em] ml-0.5 align-baseline">{unit}</span>}
        </div>
        {(delta != null || sub) && (
          <div className="mt-2.5 flex items-center gap-2">
            {delta != null && <Delta value={delta} label={deltaLabel} goodIsUp={deltaGoodIsUp} />}
            {sub && <span className="text-[11px] text-ink-400">{sub}</span>}
          </div>
        )}
      </div>
      {spark && big && <div className="shrink-0 pt-1.5"><Sparkline data={spark} color={sparkColor} /></div>}
    </div>
  );
}

/* ---------- KPI card (one metric per card; line-icon chip, not emoji) ---------- */
const CHIP = {
  accent: "bg-accent-50 text-accent",
  critical: "bg-critical-50 text-critical",
  steel: "bg-steel-50 text-steel",
  neutral: "bg-ink-50 text-ink-400",
};
export function KpiCard({ label, value, unit, delta, deltaLabel, deltaGoodIsUp = true, icon: Icon, tone = "neutral", definition }) {
  return (
    <div className="bg-white rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 h-11 border-b border-ink-50">
        <span title={definition} className="text-[12px] font-medium text-ink-500 truncate">{label}</span>
        {Icon && <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${CHIP[tone]}`}><Icon size={14} strokeWidth={2} /></span>}
      </div>
      <div className="px-4 pt-3 pb-4">
        <div className="text-[27px] font-bold tracking-[-0.02em] text-ink-900 tnum leading-none">
          {value}{unit && <span className="text-ink-300 font-semibold text-[0.5em] ml-0.5">{unit}</span>}
        </div>
        {delta != null && <div className="mt-2.5"><Delta value={delta} label={deltaLabel} goodIsUp={deltaGoodIsUp} /></div>}
      </div>
    </div>
  );
}

/* ---------- Section card (subtle depth; optional accent keyline) ---------- */
export function Section({ title, source, right, note, children, className = "", accent, pad = true }) {
  return (
    <section
      className={`relative bg-white rounded-[12px] border border-ink-100 shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)] ${accent ? "overflow-hidden" : ""} ${className}`}>
      {accent && <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} aria-hidden />}
      {(title || right) && (
        <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-50">
          <div className="flex items-center gap-2">
            {title && <h2 className="text-[13px] font-semibold text-ink-800 tracking-tight">{title}</h2>}
            {source && <SourceTag source={source} />}
          </div>
          {right}
        </header>
      )}
      {note && <Caveat className="mx-5 mt-3">{note}</Caveat>}
      <div className={pad ? (title ? "p-5" : "p-5") : ""}>{children}</div>
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
