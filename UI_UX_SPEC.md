# LSA Performance Platform — UI/UX Specification

A complete, self-contained description of the current CRM's interface, design system, every page, and every interaction. Written so a designer or an LLM (e.g. ChatGPT) can understand or redesign the product without seeing the code.

---

## 1. Product overview

- **What it is:** An internal CRM/analytics dashboard for **1-800-GOT-JUNK? (South Wind franchise group)** that tracks **Google Local Services Ads (LSA)** lead performance — call volume, connection rates, bookings, revenue, and per-agent productivity.
- **Who uses it:** Internal staff. Three roles — **admin**, **agent**, **viewer** (read-only). Role gates which nav items and pages are visible.
- **Data shown:** One row per inbound LSA lead, stitched together from four sources by phone number: **Google LSA** (the master call list), **Avoca** (AI receptionist/bot), **Dialpad** (human agents' phone system), and **Salesforce** (bookings, job status, revenue). Refreshed automatically every hour.
- **Time model:** Everything is scoped to a **month** of **2026**. Almost every page has a Jan–Dec month selector. There is no date-range picker.

### Tech stack
- **Frontend:** Vite + React 19, React Router (client-side routing), Tailwind CSS v4 (utility classes only, no separate config — `@import "tailwindcss"`).
- **Charts:** Recharts (line/area, donut, stacked bar).
- **Backend/data:** Supabase (Postgres + PostgREST). Auth via **Google OAuth** (Supabase Auth).
- **Hosting:** Vercel.

---

## 2. Design system

### Palette
- **Canvas:** `slate-50` page background; **white** cards/surfaces.
- **Text:** `slate-900` (headings/values), `slate-600` (body/table cells), `slate-500` (secondary), `slate-400` (muted labels/captions), `slate-300` (placeholders/empty).
- **Primary accent:** **blue-600/700** — active nav underline, primary buttons, links, focus rings (`focus:ring-blue-100`).
- **Semantic colors** (used in badges, KPI accents, chart series):
  - **Emerald/green** = good: Connected, Booked, Completed, high rates, revenue.
  - **Red** = bad/attention: Missed, Canceled, low rates, disputes, high severity.
  - **Amber** = warning/pending: Pending, stale data, medium severity.
  - **Slate/gray** = neutral: Non-Charged, archived, "—".
  - **Purple** = the Avoca **bot** tag (Agent Detail).
- **Borders:** `slate-200` (cards), `slate-100`/`slate-50` (dividers, table row borders).

### Typography
- Page titles: `text-2xl font-bold text-slate-900` (some pages `text-xl`).
- Section/card titles: `text-[13px]`–`text-sm font-semibold text-slate-800`.
- **Micro-labels** (KPI labels, table headers): `text-[11px] font-semibold uppercase tracking-wider text-slate-400`.
- Big metric values: `text-[28px]` or `text-2xl` `font-bold tracking-tight`.
- Numbers in tables use `tabular-nums`; phone numbers use `font-mono text-xs`.

### Core components (recurring patterns)
- **Card:** `bg-white rounded-xl border border-slate-200`, often `hover:shadow-md transition-shadow`. Section cards have a header strip (`px-5 py-3/4 border-b border-slate-100`) + body.
- **KPI card:** small uppercase label top-left + a rounded icon chip (`w-8 h-8 rounded-lg` tinted with the accent color, holds an emoji) top-right; large bold value; optional delta line ("↑ +466 vs May" in green, "↓ -0.1 pts" in red).
- **Badge / pill:** `inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border`, color-coded (emerald/blue/amber/red/slate). Used for rates, classifications, roles, statuses.
- **Rate badge** (threshold-colored): e.g. booking rate ≥50% emerald, ≥35% blue, ≥20% amber, else red. Connection rate ≥98% emerald, ≥95% blue, ≥90% amber, else red.
- **Month selector:** a single pill-row of Jan…Dec. Active month is filled — **`bg-slate-900 text-white`** on most pages (Dashboard, Lead Explorer, Agent Performance, Daily Report) or **`bg-blue-600 text-white`** on Insights/Agent Detail. Inactive months are muted gray with hover.
- **Tables:** `text-sm`; header row `bg-slate-50/80` with micro-labels; body rows `border-t border-slate-50`, zebra striping (`i % 2 ? bg-slate-50/30`), `hover:bg-blue-50/30`; clickable rows use `cursor-pointer`.
- **Skeleton loaders:** `animate-pulse bg-slate-100 rounded-lg` blocks shaped like the content (KPI cards + rows).
- **Spinner:** `w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin`, centered in `py-20`.
- **Empty state:** centered card, `py-16 text-center`, muted "No … found for {month}".
- **Modal:** full-screen overlay `fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4`; white rounded card; "×" close top-right; closes on overlay click.

### Layout grid
- Centered container `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- KPI rows use responsive grids: `grid-cols-2 md:grid-cols-3 lg:grid-cols-6/8`.
- Two-column chart/exception areas: `grid-cols-1 lg:grid-cols-2`.

---

## 3. Global chrome (every authenticated page)

### Top header (sticky, `z-50`, white, bottom border)
- **Left:** "**LSA Performance Platform**" wordmark (bold) + a small blue pill "**CRM**".
- **Right:** user's name/email (`slate-500`), a gray role pill (`admin`/`agent`/`viewer`), and a **Sign out** text button.

### Primary nav (tab bar, white, under header)
Horizontal tabs with emoji icons; active tab has a **blue bottom-border + blue text**, inactive are gray with hover underline. Items (role-gated):
1. 📊 **Dashboard** (`/`) — all roles
2. 🔍 **Lead Explorer** (`/leads`) — all
3. 📞 **Log Call** (`/log-call`) — admin, agent only
4. 👥 **Agent Performance** (`/agents`) — all
5. 📈 **Market Reports** (`/markets`) — all
6. 📅 **Daily Report** (`/daily`) — all
7. ⚡ **Insights** (`/insights`) — all
8. 📥 **Import** (`/import`) — admin only
9. ⚙️ **Admin** (`/admin`) — admin only (rendered separately, far right)

Page views are logged to an activity log on every navigation.

---

## 4. Login (`/`, unauthenticated)

Centered white card (`max-w-sm`) on `slate-50`:
- Title "**LSA Performance Platform**", subtitle "1-800-GOT-JUNK? CRM".
- One button: **"Sign in with Google"** (white, bordered, Google "G" SVG icon).
- Footer caption "South Wind internal tool".
No email/password — Google OAuth only. Protected routes redirect here when signed out; role-gated routes block unauthorized roles.

---

## 5. Pages

### 5.1 Dashboard (`/`)
The default landing page — a monthly performance overview.

- **Header:** "Dashboard" + subtitle "LSA Performance — {Mon} 2026", an **"Updated {date, time}" freshness badge** (turns **amber "⚠ Data from …"** if data is >3h old), an **"All In"** pill, and the **Jan–Dec month selector** (top-right).
- **Alert banner** (amber, dismissible-looking): surfaces the worst markets, e.g. "⚠ Unknown at 93.8% connection rate … View all →".
- **Call-metrics KPI row** (8 cards): **Total Calls, Charged, Connected, Missed, Non-Charged, Conn. Rate, Booked, Disputes.** Each shows value + a "vs prior month" delta (green up / red down). Source: `agent_calls`.
- **"Bookings — Salesforce" section** (4 cards): **Completed, Pending, Canceled, Completed Revenue ($).** Subtitle "Salesforce opps created this month." **Amber caveat note**: "⚠ These figures come from the current Salesforce feed, which is filtered by lead source. Earlier months understate Completed & Revenue until the feed is widened … Call metrics above are unaffected." Source: `sf_opportunities`.
- **Charts (2×2):**
  - **Call Volume Trend** — line/area, monthly total calls Jan→current (solid = total, dashed = a secondary series).
  - **Classification** — donut for the selected month: Connected (green) / Missed (red) / Non-Charged (slate), with a legend showing counts.
  - **Connection Rate Trend** — monthly % line.
  - **Hourly Distribution** — stacked bar of leads by hour (CST), colored by connected/missed/non-charged.
- **Market Performance** table (bottom): per-market Total, Charged, Connected, Missed, Conn. Rate (badge), Booked; "View all →". (Currently can show "Unknown" when market isn't populated.)
- **States:** full skeleton while loading.

### 5.2 Lead Explorer (`/leads`)
Searchable, filterable table of individual leads with a detail modal.

- **Header:** "Lead Explorer" + "{Mon} 2026 — N leads found"; top-right summary chips: **N Connected** (emerald), **N Missed** (red), **N Non-Charged** (slate).
- **Controls row:** month selector; **All Markets** dropdown; **All Classifications** dropdown (Connected / Missed / Non-Charged); **search box** ("Search name or phone…") with a search icon.
- **Table columns:** Date · Market · Customer · Phone · Classification (color badge) · Duration (e.g. "323s") · Status. The Status cell shows an editable job-status badge if set, else the raw `result`.
- **Row click → Detail modal:**
  - Title = customer name (or "Lead detail"); "×" to close.
  - **Editable job-status dropdown:** Booked / Pending / Completed / Canceled / No-show / Rescheduled (persists per-lead, survives the hourly rebuild).
  - **Field grid (two groups):**
    - Lead facts: Market, Date, **Handled by** (agent name or "Avoca (bot)"), Result, Duration, Revenue, Opportunity ID, Job type.
    - Salesforce facts: SF status, Booked by, Last contacted, Scheduled start, Last scheduled, Cancellation source.
- **Pagination:** client-side page size; many blank Customer cells are expected (non-booked/missed calls have no name in any source).

### 5.3 Log Call (`/log-call`, admin/agent)
Manual call-entry form ("Log a Call") — for calls not auto-captured.

- **Phone field** with **auto-match**: typing a phone looks up and pre-fills the matching LSA lead.
- **Fields:** Phone Number, Client Name, Email, **Market/Location\*** (dropdown), Lead Date, **Result\*** (dropdown), Call Type, Source, Op ID, Classification, Dial Attempts, Last Contact, Booked Date, Appointment Date, TTM Result (dropdown), Revenue ($), Lead Cost ($), Notes (textarea). (\* required.)
- Manually-logged rows are preserved across the hourly pipeline rebuild (not overwritten).

### 5.4 Agent Performance (`/agents`)
Leaderboard of agents (incl. the Avoca bot) for the month.

- **Header:** title + "{Mon} 2026 — N agents" + month selector.
- **KPI row (6):** Total Calls, Booked, Booking Rate (%), Revenue ($), Bot Calls, Human Calls.
- **Agent Breakdown table:** Agent · Team · Calls · Booked · **Booking Rate** (threshold badge) · Revenue · Avg Job · Bot · Human. Bot-only agents (Avoca) get a blue **"BOT"** tag and a faint blue row tint. **Rows are clickable → Agent Detail.**
- Source: `v_agent_performance` view (built on `agent_calls`).

### 5.5 Agent Detail (`/agents/:id`)
Drill-down for one agent.

- **Breadcrumb:** "← Agents / {name}" + team pill + optional purple "Bot" pill.
- **Month selector** (compact pill row).
- **KPI row (7):** Total Calls (with vs-prev delta), Booked, Archived, No Answer, Booking Rate, Revenue, Avg Job.
- **Tabs:** **Call Log** (table: Date, Client, Phone, Market, Result badge, Revenue, TTM, Notes) · **Monthly Trend** (table across all 2026 months) · **Breakdown** (two horizontal-bar lists: Result distribution and Market distribution, each with a blue progress bar + count + %).

### 5.6 Market Reports (`/markets`)
Per-market monthly trend.

- **Header:** "Market Reports" + "{market} — 2026" + a **market dropdown** (defaults to first market).
- **KPI cards (5):** Latest month leads (with delta), Conn. Rate (with pts delta), CPL ($), YTD Leads, YTD Rate (+ YTD CPL).
- **Monthly Trend table:** Month · Total · Charged · Connected · Missed · Conn. Rate (badge) · CPL. One row per month of 2026.

### 5.7 Daily Report (`/daily`)
Day-by-day breakdown for a month.

- **Header:** "Daily Report" + "{Mon} 2026 — {market}" + an **All Markets** dropdown (top-right) + month selector.
- **Summary strip (5):** Total Leads, Charged, Connected, Missed, Conn. Rate.
- **Table:** "N days with leads" → Date · Total · Charged · Connected · Missed · Conn. Rate (badge), newest day first. When a single market is selected a Market column appears.

### 5.8 Insights & Exceptions (`/insights`)
Auto-flagged issues needing attention.

- **Header:** "Insights & Exceptions" + "{Mon} {year} — N items need attention" + month selector (blue-active variant).
- **Summary strip (4):** Total leads, Connection rate, Missed calls (red if >30), Issues found (amber if >0, green if 0).
- **Exception cards (2-col grid)**, each a left-border-accented card (red=high / amber=medium / blue=low) with an issue count badge (or green "All clear"):
  1. **🎯 Markets Below Target** — connection rate <95% (with "X missed of Y charged"); click → Market Reports.
  2. **📉 Month-over-Month Decline** — markets down >3 pts vs prior month.
  3. **📵 Missed Call Concentrations** — hours with ≥3 missed calls; click → filtered Lead Explorer.
  4. **👤 Agents Below Booking Benchmark** — booking rate <30%; click → Agent Performance.
  5. **💰 Missing Spend Data** — markets with leads but no cost data; click → Admin.
- Each issue is a row: severity dot + name + context (left), colored value + metric (right). Rows are clickable deep-links.

### 5.9 Import (`/import`, admin)
Upload a Google Ads LSA detailed report CSV.

- **Header:** "Import LSA Data" + description.
- **Controls:** Month + Year selectors.
- **Drop zone:** large dashed-border area, "Click to select CSV file" (shows filename + size once chosen).
- **Preview** panel after selection (valid lead count), then a primary button "**Import N leads for {Mon} {Year}**" (shows "Importing…" while running). Includes a short how-to list.
- Non-admins see "Admin access required for CSV upload."

### 5.10 Admin (`/admin`, admin)
Tabbed settings console. **Tabs:** Users & Roles · Agents · Markets · Marketing Spend · Activity Log.

- **Users & Roles:** table of profiles; inline role editing.
- **Agents:** list + "+ Add Agent" form.
- **Markets:** list ("Markets (N)") + "+ Add Market" form; toggle active/inactive.
- **Marketing Spend:** month selector; per-market editable spend inputs with inline "Save" (drives CPL).
- **Activity Log:** audit feed of page views / actions.

---

## 6. Interaction & state patterns
- **Loading:** every page shows skeletons or a centered spinner; never a blank screen.
- **Empty:** consistent centered "No … found" card.
- **Navigation between pages** is instant (client-side); selecting a month re-fetches that page's data.
- **Cross-page deep links:** Insights rows and the Dashboard alert jump to filtered Lead Explorer / Market Reports / Agent Performance / Admin.
- **Freshness honesty:** Dashboard "Updated" badge reflects the real last data write and warns (amber) when stale; the Salesforce bookings block carries an explicit caveat that its figures can understate historical months.
- **Editable, persisted state:** per-lead job status (Lead Explorer modal) and manual call logs survive the hourly data rebuild.

---

## 7. Known UX issues / redesign opportunities
(Useful context if the goal is to improve the UI.)
- **Many blank "Customer" names** in Lead Explorer — non-booked/missed/anonymous calls genuinely have no name in any source. Could be visually de-emphasized or labeled "Unknown caller" rather than blank.
- **"Unknown" market** can dominate when the market field isn't populated for a month — needs a clearer treatment / fallback label.
- **Two different "Booked"/revenue numbers** exist across pages (Dashboard reads Salesforce; Agent Performance reads agent_calls). The distinction isn't visually explained to users beyond the caveat note — a redesign could unify or clearly label "All SF bookings" vs "LSA-attributed."
- **Inconsistent active-toggle color** (slate-900 vs blue-600) across month selectors — a redesign should standardize.
- **Dense KPI rows** (up to 8 cards) can feel cramped on smaller screens; grids collapse to 2-up on mobile but the information hierarchy could be sharpened.
- **No global date-range** — everything is month-locked to 2026; a redesign might add ranges/year switching.
- **Emoji icons** are used throughout (nav, KPI chips); a redesign may prefer a consistent icon set.

---

## 8. Responsive behavior
- Container is centered with responsive horizontal padding.
- KPI/stat grids collapse `lg:grid-cols-6/8 → md:grid-cols-3 → grid-cols-2`.
- Tables get horizontal scroll (`overflow-x-auto`) on narrow screens.
- Charts are responsive-width (Recharts `ResponsiveContainer`).
- The current design is **desktop-first**; mobile is functional but secondary.

---

## 9. Page → data-source map (for accuracy)
| Page | Reads from |
|---|---|
| Dashboard (call metrics) | `agent_calls` |
| Dashboard (bookings/revenue) | `sf_opportunities` (lead-source-filtered) |
| Lead Explorer | `agent_calls` (+ `sf_opportunities` for modal, `lead_status` for status) |
| Agent Performance / Agent Detail | `v_agent_performance` (built on `agent_calls`) |
| Market Reports | `agent_calls` + `lead_costs` (spend/CPL) |
| Daily Report | `agent_calls` |
| Insights | `v_market_performance`, `agent_calls`, `lead_costs`, `agents`, `markets` |
| Log Call | writes `agent_calls` (manual rows) |
| Import | writes leads from CSV |
| Admin | `profiles`, `agents`, `markets`, `lead_costs`, `activity_log` |

> Underlying pipeline: Google LSA + Avoca + Dialpad + Salesforce are joined by phone, one row per lead, written to `agent_calls` hourly. "All In" = the full monthly picture intended to match the source-of-truth tracking workbook.
</content>
