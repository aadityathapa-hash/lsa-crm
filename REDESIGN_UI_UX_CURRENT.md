# LSA Operations CRM — UI / UX Specification (Current Redesigned State)

> This document describes **exactly** how the app looks and behaves on the `redesign` branch as built.
> It is the "Control" design system applied across all 10 pages. Use it to review, hand to ChatGPT,
> or spot what's missing (see the **Card Inventory** in each page section).
>
> Stack: Vite + React 19 + react-router-dom + Tailwind CSS v4 + Supabase (PostgREST, Google OAuth) +
> Recharts + lucide-react + Inter Variable. Data is read-mostly from `agent_calls`, `sf_opportunities`,
> `v_agent_performance`, `lead_status`, `lead_costs`, `markets`, `agents`.

---

## 1. Design System ("Control")

### 1.1 Color tokens (`src/index.css`, Tailwind v4 `@theme`)

**Neutral ink ramp** (slightly warm graphite) — the entire UI is built on this, not Tailwind's default slate:

| Token | Hex | Typical use |
|---|---|---|
| `ink-900` | `#14181f` | Primary headings, KPI values |
| `ink-800` | `#232a35` | Section titles, strong body |
| `ink-700` | `#3a4150` | Emphasis body, table values |
| `ink-600` | `#525a6b` | Default table cell text |
| `ink-500` | `#6b7484` | Labels, secondary text |
| `ink-400` | `#8a92a1` | Muted captions, icons, uppercase headers |
| `ink-300` | `#b4bac6` | Em-dash placeholders, "non-billable" charts |
| `ink-200` | `#d8dce3` | Input borders, pill-group borders |
| `ink-100` | `#e7e9ee` | Card borders, table header rule |
| `ink-50` | `#f2f4f7` | Row hover, icon chips, table header fill |
| `canvas` | `#f7f8fa` | App background (set on `body`) |

**One brand accent — "signal green"** `accent #1f7a52` (hover `accent-600 #1a6846`, tint `accent-50 #eaf3ee`).
Used for: active nav/month pills, primary buttons, the "good" series in charts, the narrative left-rule.

**Status semantics — only used to MEAN something:**

| Token | Hex | Meaning |
|---|---|---|
| `positive` / `positive-50` | `#1f7a52` / `#eaf3ee` | At/above target, completed, success |
| `caution` / `caution-50` | `#a66a00` / `#fbf3e3` | Near target, warning, below-median |
| `critical` / `critical-50` | `#b42318` / `#fbeceb` | Below target, missed, canceled, error |
| `steel` / `steel-50` | `#2b5c8a` / `#ebf1f7` | Informational, data-quality, bot, source-blend |

### 1.2 Typography

- Font: **Inter Variable** (`@fontsource-variable/inter`), with `font-feature-settings: "cv05" 1, "ss01" 1` and global `letter-spacing: -0.005em`.
- Numbers are **tabular** everywhere (`.tnum` + all `td`/`th`) for clean column alignment.
- Type scale in use:
  - Page H1: `text-[22px] font-bold tracking-[-0.02em] text-ink-900`
  - Page subtitle: `text-[13px] text-ink-500`
  - Section/card title (H2): `text-[13px] font-semibold text-ink-800`
  - KPI value: `text-[27px] font-bold tracking-[-0.02em] tnum`
  - KPI/field label: `text-[12px] font-medium text-ink-500`
  - Table header: `text-[10.5px] font-semibold uppercase tracking-wider text-ink-400 bg-ink-50/60`
  - Uppercase micro-label: `text-[10.5px]–[11px] font-semibold uppercase tracking-wider`

### 1.3 Surfaces & depth

- **Card chrome (standard):** `bg-white rounded-[12px] border border-ink-100` + two-layer shadow
  `shadow-[0_1px_2px_rgba(20,24,31,.05),0_4px_12px_-6px_rgba(20,24,31,.08)]`.
- Row hover: `hover:bg-ink-50/60`. Table row separators: `border-t border-ink-50`.
- Focus (keyboard): 2px accent outline with 2px offset on all interactive elements.
- Two keyframe animations: `drawer-in` (slide+fade from +28px) and `overlay-in` (fade) — used by the Leads drawer.

### 1.4 Shared primitives (`src/components/ui.jsx`)

| Primitive | What it renders |
|---|---|
| `Logo({size})` | Green rounded tile + 3 ascending white bars (brand mark "Concept D"). |
| `SourceTag({source})` | Tiny uppercase provenance pill. `call`→"Call System" (steel), `sf`→"Salesforce" (steel), `lsa`→"LSA-attributed" (ink), `manual`→"Manual" (ink). The trust spine — every metric block is tagged with its data origin. |
| `StatusChip({tone})` | Rounded-full chip; tones: `positive`/`caution`/`critical`/`neutral`/`info`. |
| `RateChip({value, target})` | Auto-colored percentage chip: positive ≥ target, caution within 5 pts below, critical otherwise. Target shown in tooltip. |
| `Delta({value, label, goodIsUp})` | "↑ +N label" / "↓ −N label" colored by whether the move is good (positive/critical). |
| `Sparkline({data})` | Inline SVG line+area, no deps. (Available; used sparingly.) |
| `Metric` | Headline/supporting metric block with optional sparkline (alternative to KpiCard). |
| `KpiCard` | **The primary metric card** — see 1.5. |
| `Section({title, source, right, note, accent})` | White card with header row (title + SourceTag + right slot), optional top accent keyline, optional inline Caveat. Wraps charts & tables. |
| `Caveat` | Amber inline note with info icon — provenance / uncertainty. |
| `Reconcile` | Grey "A vs B because…" reconciliation line. |
| `Narrative` | Large generated summary sentence (15px). |
| `Skeleton` | Pulse loading block. |
| `EmptyState({title, hint, action})` | Centered empty/zero state. |

### 1.5 The KpiCard (one metric per card)

Anatomy (top to bottom):
1. **Header strip** (`h-11`, divided by `border-b border-ink-50`): label on the left (`text-[12px] text-ink-500`, truncates, `definition` shows as tooltip), a **neutral grey icon chip** on the right (`w-6 h-6 rounded-md bg-ink-50 text-ink-400`, lucide icon at 14px).
2. **Value block:** big `text-[27px] font-bold` value with optional small superscript unit (e.g. `%`).
3. **Optional footer:** a `Delta` (e.g. "↑ +12 vs May") and/or a `sub` caption.

> Note: `tone` is accepted by KpiCard but the icon chip is intentionally **always neutral grey** (decided during review — colored chips were "distracting"). Color in the system comes from chips/values/charts, not the card icon.

---

## 2. Global Layout (`src/components/Layout.jsx`)

- **Max width** `1400px`, padded gutters, `bg-canvas`.
- **Header** (sticky, white, `border-b`): `Logo` (26px) + wordmark "**LSA** Operations" on the left; on the right: user name, an uppercase role badge, "Sign out".
- **Nav** (white, `border-b`): horizontal tabs **grouped by workflow** with thin vertical dividers between groups. Active tab = green text + green bottom border; inactive = grey, hover darkens. Each tab has a lucide icon (15px).

  | Group | Tabs (route) | Role-gated |
  |---|---|---|
  | **Monitor** | Overview (`/`), Daily (`/daily`) | — |
  | **Investigate** | Leads (`/leads`), Agents (`/agents`), Markets (`/markets`) | — |
  | **Manage** | Attention (`/insights`), Add Call (`/log-call`, admin+agent), Import (`/import`, admin), Admin (`/admin`, admin) | yes |

- Every route change logs a `page_view` activity event (PAGE_NAMES map).
- **Agent Detail** (`/agents/:agentId`) is reachable by clicking an agent row; it is not a top-level tab.

---

## 3. Page-by-Page Spec

> Common pattern on every page: a **header block** (H1 + one-line subtitle + a SourceTag row showing data origin and the active month/scope) and a **month selector** — a white pill group (`bg-white rounded-lg border border-ink-200 p-1`) where the active month is a green pill. Some pages add a market `<select>`.

---

### 3.1 Overview (`/`, `Dashboard.jsx`) — "Monitor"

Purpose: the month at a glance — what happened, what changed, what needs attention.

**Layout, top to bottom:**
1. **Header** — H1 "Overview"; a status chip ("In progress · settles after month end" when current month, else "Final"); a sync dot + "Synced {date}" (dot turns caution if data is >3h stale). Month pill group on the right (defaults to current month; December wrap handled).
2. **Narrative card** — a `Section` with a green left rule (`border-l-[3px] border-l-accent`) holding one generated sentence summarizing leads, connection rate vs last month, SF bookings, markets below target, and unattributed count.
3. **"Needs attention" strip** — inline row: up to 3 red pills for below-target markets (click → Markets filtered), one steel pill for unattributed-leads count (→ Attention), or a green "No issues need attention" chip; a right-aligned "Attention →" link.
4. **Call System (LSA) block** — section label + `SourceTag call`, then a **row of 7 KpiCards** (responsive 2 / 4 / 7 cols), then a **classification stacked bar**.
5. **Salesforce — bookings & revenue block** — label + `SourceTag sf` + "Opps created this month"; a `Caveat` when viewing the current month; a **row of 5 KpiCards**; then a `Reconcile` line.
6. **Trends** — two side-by-side `Section` charts: Connection rate line (with dashed 95% target `ReferenceLine`, y-axis 85–100) and Lead volume area chart.
7. **Leads by hour** — `Section` with a stacked bar chart (Connected/Missed/Non-billable by CST hour), only when data exists.
8. **Markets — ranked by need** — `Section` with a table sorted worst-first (below-target markets first, ascending rate, then by volume); each row clickable → Markets. Plus an "All markets →" link in the header and an **Unattributed** steel callout row beneath the table when present.

**Card Inventory — Overview:**

*Call System row (7 cards):* Total calls (Δ vs prev) · Billable · Connected · Missed (Δ, down-is-good) · Non-billable · Conn. rate (% , Δ pts) · Disputes.

*Salesforce row (5 cards):* Bookings (Δ) · Completed · Pending · Canceled · Completed revenue ($).

**Other cards/elements:** narrative card, attention strip, classification stacked bar card, 2 trend chart cards, hourly chart card, ranked-markets table card.

**Interactions:** month pills reload; market rows & attention pills deep-link; charts have custom tooltips.

---

### 3.2 Daily (`/daily`, `DailyReport.jsx`) — "Monitor"

Purpose: day-by-day call volume & connection for the month.

- **Header:** H1 "Daily activity" + subtitle; `SourceTag call`; market `<select>` (All markets / each market) above the month pill group.
- **Summary KpiCards (5):** Total leads · Billable · Connected · Missed · Conn. rate (%).
- **Table card:** "{n} days with leads"; columns Date · (Market, only when a single market is selected) · Total · Billable · Connected · Missed · **Conn. rate** (`RateChip` vs 95%). Missed cell turns critical when > 0. Sorted newest day first.
- **States:** Skeleton rows while loading; `EmptyState` when no leads.

**Card Inventory — Daily:** 5 KPI cards (above) + the day table card.

---

### 3.3 Leads (`/leads`, `LeadExplorer.jsx`) — "Investigate"

Purpose: search and investigate individual LSA leads.

- **Header:** H1 "Leads" + `SourceTag call` + "{n} leads · {month}". Month pills.
- **Filter bar:** search input (name or phone, with search icon) · market `<select>` · classification `<select>` (Connected/Missed/Non-billable) · right-aligned live counts as chips (green connected / red missed / neutral non-billable).
- **Table card** (paginated, 50/page): Date · Market · Customer ("Unknown caller" italic if blank) · Phone (formatted `(xxx) xxx-xxxx`, monospace) · **Class** (`StatusChip`: Connected=positive, Missed=critical, Non-billable=neutral) · **Handled** (Bot icon+steel, or User icon + agent name) · Duration (`Ns`) · **Status** (manual `lead_status` `StatusChip` if set, else raw result). Rows clickable. Prev/Next pager footer.
- **Detail drawer** (right slide-in, `max-w-[480px]`, `drawer-in` animation, dimmed overlay):
  - Sticky header: customer name, formatted phone, class chip + Bot/Human chip, close (X).
  - **Job status editor:** a `<select>` writing to `lead_status` (upsert by `op_id`), or a note if no opportunity ID.
  - **Field grid (2-col):** Market · Date · Handled by · Result · Duration · Revenue · Opportunity ID · Job type.
  - **Salesforce section** (`SourceTag sf`): SF status · Booked by · Last contacted · Scheduled start · Last scheduled · Cancellation (looked up live by phone from `sf_opportunities`).
  - **Notes** block when present.

**Card Inventory — Leads:** no KPI cards by design; the "cards" here are the filter count chips, the table card, and the slide-in drawer. *(If you expected a KPI summary row on Leads like the other pages, that's a candidate "missing card" — currently it shows counts as chips in the filter bar instead.)*

---

### 3.4 Agents (`/agents`, `AgentPerformance.jsx`) — "Investigate"

Purpose: per-agent call handling & booking conversion (from `v_agent_performance`).

- **Header:** H1 "Agents" + `SourceTag lsa` + "{n} agents · {month}". Month pills.
- **Summary KpiCards (6):** Total calls · Booked · Booking rate (%) · Revenue ($) · Bot calls · Human calls.
- **Caveat:** explains figures are LSA-attributed and rates are shaded vs the **team median**, not a fixed target.
- **Table card "Agent breakdown":** Agent (+ "Bot" info chip for bot-only agents; bot rows tinted steel) · Team · Calls · Booked · **Booking rate** (local `RateChip` shaded caution when below team median; "n/a" for bots) · Revenue · Avg job · Bot · Human. Rows click → Agent Detail.

**Card Inventory — Agents:** 6 KPI cards (above) + the breakdown table card.

---

### 3.5 Agent Detail (`/agents/:agentId`, `AgentDetail.jsx`)

Purpose: one agent's drill-down.

- **Header:** breadcrumb ("← Agents / {name}"), H1 = agent name, optional team chip + "Bot" info chip, `SourceTag lsa` + month. Month pills.
- **Caveat:** LSA-attributed vs Salesforce note.
- **KpiCards (7):** Total calls (Δ vs prev month) · Booked · Archived · No answer · Booking rate (%) · Revenue ($) · Avg job ($).
- **Tabs** (pill style — active `bg-ink-900 text-white`): **Call log / Monthly trend / Breakdown**.
  - *Call log:* table — Date · Client · Phone · Market · Result (`StatusChip`) · Revenue · TTM · Notes. Skeleton/empty states.
  - *Monthly trend:* table — Month · Calls · Booked · Booking rate (`RateChip` vs 30%) · Revenue · Avg job · Bot · Human.
  - *Breakdown:* two cards — Result distribution and Market distribution, each a list of labeled bars (`bg-accent` fill) with count · %.

**Card Inventory — Agent Detail:** 7 KPI cards + 3 tab content cards (call log, trend, two breakdown cards).

---

### 3.6 Markets (`/markets`, `MarketReports.jsx`) — "Investigate"

Purpose: monthly trend, connection & cost per market (from `agent_calls` + `lead_costs`).

- **Header:** H1 "Markets" + `SourceTag call` + "{market} · 2026"; market `<select>` on the right (auto-selects first market).
- **Caveat:** shown when no marketing spend exists for the market (CPL unavailable).
- **KpiCards (5):** Leads (latest month, Δ vs prev) · Conn. rate (%, Δ pts) · CPL ($/billable lead) · YTD leads (+ billable sub) · YTD rate (% + CPL sub).
- **Table card "{market} — monthly trend":** Month · Leads · Billable · Connected · Missed · **Conn. rate** (`RateChip` vs 95%) · CPL. Missed turns critical when > 0.

**Card Inventory — Markets:** 5 KPI cards (above) + the monthly-trend table card.

---

### 3.7 Attention (`/insights`, `Exceptions.jsx`) — "Manage"

Purpose: a prioritized triage queue of what needs action this month. **Computed live from `agent_calls`** (this page was repointed off the stale `leads` table / `v_market_performance`).

- **Header:** H1 "Attention" + "Ranked queue of what needs action this month." Month pills.
- **Summary KpiCards (4):** Leads · Connection rate (%) · Missed calls · Open items.
- **Severity-grouped action list** — three groups, each with a colored dot + label + count:
  - **Critical** (red), **Warning** (amber), **Data quality** (steel).
  - Each item is a clickable row: a severity-tinted icon chip + title + detail sentence + right-aligned metric + owner + chevron. Deep-links to the relevant page.
- **Item generators:** markets below 95% target (≥5 billable) · MoM connection decline > 3 pts · missed-call hour spikes (≥3 in an hour) · human agents below 30% booking (≥10 calls) · markets with no marketing spend · unattributed leads.
- **Empty state:** ShieldCheck + "Nothing needs attention" when all clear.

**Card Inventory — Attention:** 4 KPI summary cards + the three severity list cards.

---

### 3.8 Add Call (`/log-call`, `AgentCallForm.jsx`) — "Manage" (admin/agent)

Purpose: manually log a call; auto-matches an LSA lead by phone.

- **Header:** H1 "Log a call" + "Logging as {agent}".
- **Banners:** success = positive (CheckCircle2 icon); error = critical (XCircle icon).
- **Layout:** 3-col grid — form spans 2, sidebar 1.
- **Form card:** 2-col field grid. Phone field (full width) triggers a live `leads` lookup at ≥10 digits, shows a spinner, and on match renders an **accent matched-lead box** (CheckCircle2 + name/market/classification/date) and auto-fills name/email/market/classification/date. Fields: Phone · Client name · Email · Market/location* (`<select>`) · Lead date · Result* (`<select>`) · Call type · Source · Op ID · Classification (read-only, `bg-ink-50`) · Dial attempts · Last contact · Booked date · Appt date · TTM result · Revenue · Lead cost · Notes (textarea). Buttons: **Log call** (accent) + **Clear** (secondary).
- **Sidebar:** "Recent calls" card (last 5; result wrapped in `StatusChip` — Booked/FU Booked=positive, No Answer=caution, else neutral) and a steel "How it works" panel.

**Card Inventory — Add Call:** form card + recent-calls card + how-it-works card (no KPI cards by design).

---

### 3.9 Import (`/import`, `CsvUpload.jsx`) — "Manage" (admin)

Purpose: upload a Google Ads LSA detailed-report CSV into `leads`.

- **Header:** H1 "Import LSA data" + subtitle. Admin-gated (non-admins see a notice).
- **Upload card:** Month `<select>` + Year input; a dashed **drop zone** (`border-dashed`, hover accent) with an Upload glyph showing filename/size. Auto-detects month from the first timestamp.
- **Preview card:** 4 stat tiles (Total rows · Valid leads in positive green · Charged · With duration) + a **market breakdown** grid (account_id → market name via `ACCOUNT_TO_MARKET`) + an **Import N leads** accent button (chunked upsert by `external_lead_id`).
- **Result/Error banners:** positive (CheckCircle2) / critical (XCircle).
- **Instructions card:** steel panel "How to export from Google Ads" (ordered list).

**Card Inventory — Import:** upload card + preview card (with 4 stat tiles) + result/error banner + instructions card.

---

### 3.10 Admin (`/admin`, `Admin.jsx`) — "Manage" (admin)

Purpose: configuration. Tabbed.

- **Header:** H1 "Admin" with a Settings2 icon.
- **Tabs** (AgentDetail pill pattern, active `bg-ink-900 text-white`): **Users & roles · Agents · Markets · Marketing spend · Activity log**.
  - *Users & roles:* table with `StatusChip` role badges (admin=positive, agent=info, viewer/inactive=neutral); role editing.
  - *Agents:* "Agents ({n})" with active/inactive `StatusChip`; CRUD.
  - *Markets:* "Markets ({n})" with active/inactive `StatusChip`; CRUD.
  - *Marketing spend:* "Marketing spend — {month} 2026" with a segmented month picker; spend entry per market.
  - *Activity log:* event table with type `StatusChip` (login=positive, action=info, etc.); `EmptyState` when empty.
- Buttons use lucide icons (Plus / Save / Pencil / RefreshCw); inputs/tables follow the shared chrome.

**Card Inventory — Admin:** one card per tab (5 section cards), each with its own table + form controls.

---

### 3.11 Login (`/login`, `Login.jsx`)

Centered card: `Logo` (44px) + "LSA Operations" + Google sign-in button, on the canvas background.

---

## 4. Cross-Cutting Interaction Patterns

- **Month selection** is the universal time control — a green-pill group, present on Overview, Daily, Leads, Agents, Agent Detail, Attention (Markets uses YTD + latest instead).
- **Provenance everywhere:** each metric block/table carries a `SourceTag` so a reader always knows whether a number is Call-System, Salesforce, or LSA-attributed.
- **Dual "Booked" is made explicit** on Overview via the `Reconcile` line (SF opps created this month vs the subset tied to an LSA lead).
- **Deep-linking:** attention pills, market rows, and agent rows navigate with query params (e.g. `/markets?market=…`, `/leads?classification=Missed`).
- **Targets:** connection-rate target is **95%** (RateChips + dashed chart line); agent booking-rate is shaded vs the **team median** (no fixed target); Agent Detail's trend uses a 30% reference.
- **Loading** uses `Skeleton` blocks shaped like the content; **empty/zero** uses `EmptyState`.
- **No emoji anywhere** — all glyphs are lucide-react line icons.

---

## 5. Known Gaps / Candidate "Missing Cards" to Review

These are places where a card a reviewer might expect is intentionally *not* present, or could be added:

1. **Leads** has no KPI summary row — counts live as chips in the filter bar instead. A 3–4 KPI row (Total / Connected / Missed / Non-billable) would match the other pages.
2. **Overview Salesforce block** shows bookings/revenue but no **CPL or spend** card (spend lives on Markets/Admin). A blended cost card could be added.
3. **Agents** summary has no **disputes** or **connection-rate** card (those live on Overview/Markets) — only booking-side metrics.
4. **Markets** shows latest + YTD but no **MoM delta card for CPL** or a **spend total** card.
5. **Daily** has no **revenue/bookings** cards (call-volume only).
6. No dedicated **Revenue** or **Reconciliation** page — SF vs LSA reconciliation is a single line on Overview, not a full view.

> If "missing cards" refers to something specific you saw in production that isn't here, compare this inventory against the old `UI_UX_SPEC.md` to pinpoint it.
