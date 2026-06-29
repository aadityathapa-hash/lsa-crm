# LSA Operating Platform — Full Redesign Direction
**Codename: "Control" — an operating surface for LSA lead operations, not a dashboard.**

Source of truth: `UI_UX_SPEC.md`. This document restructures, renames, and elevates that product. It is opinionated by design.

---

## 1. Product Redesign Direction

**Posture: this is an *operating console*, not a reporting dashboard.** A dashboard is something you look at. A console is something you *work in*. The current app is a competent dashboard template; the redesign turns it into the surface a lead-ops manager keeps open all day and a VP trusts in a Monday meeting.

**The single organizing idea: every screen answers a question an operator is already asking, in the order they ask it.** Operations teams think in a fixed loop — *What happened? What changed? What's broken? Who owns it? What do I do next?* The product is rebuilt around that loop, not around "here are some charts of your data."

**The defining feature is not a chart — it's trust.** This business has two competing truths (the call system vs. Salesforce), a filtered SF feed, stitched-by-phone attribution, and an hourly sync that can be stale. A generic dashboard hides that. Our product **names the source of every number, shows its confidence, and explains its caveats inline.** That provenance system is the thing that will make this not look like a Tailwind demo — because no template does it.

**Why it won't look generic:** it's monochrome-disciplined with one restrained accent, table-first (not card-first), uses real iconography instead of emoji, and earns its visual interest from *information design* (deltas, sparklines, source tags, severity) rather than decoration. It looks like Bloomberg/Stripe-dashboard/Linear seriousness, tuned for a junk-removal call center — calm, dense where it should be, quiet where it shouldn't.

**Intended feeling:** *"This tool knows my job."* A frontline user grasps the day in 3 seconds. A manager finds the one broken market without hunting. A VP sees a number and believes it — and if it's soft, the UI already told them why.

---

## 2. Core UX Strategy

### Information architecture (reorganized around the ops loop)
Collapse the flat 9-tab nav into **three intent zones**:

1. **MONITOR** — *What's happening?* → **Today** (live operational view) and **Overview** (the month at a glance, replaces "Dashboard").
2. **INVESTIGATE** — *Where's the problem / who/what is it?* → **Leads**, **Agents**, **Markets**.
3. **ACT / MANAGE** — *Handle it.* → **Attention** (the renamed Insights/Exceptions — the action queue), **Log Call**, **Import**, **Admin**.

This maps navigation to *workflow*, not to *data tables*. "Daily Report" and "Dashboard" stop being siblings; "Today" (operational, intraday) and "Overview" (monthly, analytical) become the two clearly-different monitor modes.

### The top-level workflow (overview → detection → investigation → action)
- **Overview** surfaces the month's headline truth + a ranked **"Needs attention"** strip at the top (not buried). 
- Each attention item **deep-links into the exact filtered investigation view** (a market in Markets, a cohort in Leads, an agent in Agents).
- Every investigation view has a **primary action** (e.g., assign status, open Salesforce, log follow-up) and an **owner cue**.
- **Attention** is the standing queue version of the same items, with severity and ownership — the place a manager triages.

The user should never hit a dead end where they see a problem but can't act on it. Every red number is a link.

### Roles
- **Viewer (leadership):** read-only, but gets a *cleaner, higher-altitude* default — Overview opens collapsed to headline KPIs + attention; no edit affordances render at all (not greyed — absent). Trust features (source tags, freshness) are *more* prominent for this audience.
- **Agent:** defaults to **Today** + their own **Agent Detail** as home; "Log Call" is one click; they see the whole org but their own row is pinned/highlighted.
- **Admin:** full access; Admin + Import live in MANAGE; gets data-health surfacing (sync status, missing spend, unknown-market counts) that others don't.

Role differences are **about default landing + edit affordances + data-health visibility**, not about hiding pages.

### A smarter temporal model (keep month-centric, fix its blind spots)
Month is the right primary unit — keep it. But add three things:
1. **A global, persistent period control** in the context bar: `[‹] June 2026 [›]` with a year switcher, used by *every* page consistently (no more per-page month rows in different styles).
2. **Fair current-month comparison.** The live month is incomplete, so "vs May" is misleading mid-month. For the current month, compare **month-to-date vs the same day-of-month last period** ("MTD through the 26th vs May through the 26th"). This single change fixes the "99.7% morning blip looks like a win" problem.
3. **A "Complete vs In-progress" stamp** on the period itself — closed months render with a "Final" chip; the live month with a "In progress — through Jun 26, 14:59" chip. Users instantly know whether a number is settled.

---

## 3. Visual Design System ("Control" system)

### Visual tone
Editorial-operational. Think *financial terminal meets Linear*: high contrast type on near-white, hairline structure, generous-but-not-airy spacing, color used only to *mean something*. Restraint is the aesthetic.

### Color system (disciplined, ~monochrome + one accent + semantics)
- **Neutrals (the 95% of the UI):** an ink/graphite ramp, slightly warm to feel less clinical. `ink-900 #14181F` (text), `ink-700`, `ink-500` (secondary), `ink-400` (muted), `ink-300` (placeholder), hairlines `#E7E9EE`, surfaces `#FFFFFF`, canvas `#F7F8FA`.
- **One brand-anchored accent — "Signal Green":** a *deep, desaturated* green (`#1F7A52`-ish, not the loud retail GOT-JUNK green). Used for primary actions, active nav, and "on-target/go" only. The loud brand green is reserved for at most a 4px brand keyline, never for fills.
- **Semantic set (status only, never decoration):**
  - Positive `#1F7A52` (deep green)
  - Caution `#B8860B`→ refined amber `#A66A00`
  - Critical `#B42318` (deep red, not neon)
  - Neutral/unknown `ink-400`
  - Source-blend / informational `#2B5C8A` (steel blue)
- **Rule:** a screen at rest is ~90% neutral. Color appears only on status badges, deltas, severity, and the single primary action. If everything is colorful, nothing is urgent.

### Typography
- **One workhorse grotesk** with excellent tabular numerals — **Inter** (or, for more custom character, a licensed grotesk like Söhne/GT America; spec'd to Inter as the safe default). Numbers **always** `font-variant-numeric: tabular-nums`.
- **Scale (deliberate, few steps):** Display 28/32, H1 20/28, H2 15/22 semibold, Body 14/20, Label 12/16 (uppercase, +0.04em tracking, ink-400), Micro 11/14.
- **Numerals are first-class:** big metric values use a slightly tighter, heavier weight; deltas are smaller and colored; units (%, $, s) are de-emphasized (`ink-400`, lighter weight) so the magnitude reads first.

### Spacing & grid
- **8px base, 4px sub-grid.** Page gutters 24/32/40 responsive. Section vertical rhythm 24px between blocks, 12–16px inside.
- **12-column max-w-[1400px]** content frame (wider than current 1280 — ops tables need room).
- Density is intentional: tables are *tight* (40–44px rows), summary cards are *calm* (more padding). Density follows function.

### Card philosophy
**Fewer, bigger, meaningful cards — cards are for summaries, tables are for data.** Stop wrapping every list in a card. A card earns its border only when it groups a *concept* (a KPI cluster, a chart, an exception group). No nested cards. No card-on-card shadows; use **hairline borders + one soft shadow level** for elevation (drawers, menus) only.

### Table design (the heart of the product)
- **Tables are the primary surface, styled to broadcast quality.** Hairline rows, no zebra (zebra is a template tell), `ink-50` hover, sticky header on scroll, **sticky first column** (the entity), right-aligned tabular numerals, monospace only for IDs/phones.
- **Column types are typed:** entity (left, semibold), metric (right, tabular), status (chip), delta (small colored), trend (inline 60px sparkline). 
- **Every numeric column header carries its source tag** (see §6). 
- **Pinning + density toggle + column visibility** as standard table affordances.
- **Empty cells are never blank** — they render a meaningful token ("—" for true null vs a labeled chip like "No name" / "Unknown market", styled muted).

### Iconography
**Replace all emoji with a single line-icon set (Lucide or Phosphor, one only).** 1.5px stroke, 16/20px, `ink-500`, inherit color for status. Icons support labels; never icon-only for primary nav. This single change removes 80% of the "template/toy" feeling.

### Status language (one system, used everywhere)
A fixed vocabulary of chips (shape + color + label), defined once: **On target / Below target / Critical / Pending / Stale / Estimated / Unverified / Bot / Human / Manual.** Same chip means the same thing on every page.

### Chart style
- **Quiet charts.** One hue per series (the steel blue / signal green), 1.5px lines, no gradients, no drop shadows, no 3D, no neon. 
- **Direct labeling** over legends where possible; values on hover with a crisp tooltip, plus the last/current value labeled at the line end.
- **Sparklines in tables** beat standalone trend charts for scanning.
- **Reference lines** for targets (e.g., 95% connection target as a dashed hairline) — charts show the *bar to clear*, not just the shape.
- Donuts are demoted: the classification "donut" becomes a **single horizontal 100% stacked bar** (more honest, more compact, easier to compare across months).

### Motion
Functional only. 150ms ease-out for hover/state, 200ms for drawer slide, 120ms for tooltip. No bounce, no parallax, no entrance animations on data. Charts may draw once on first paint (200ms) and never again.

### Empty / loading / error states (a designed set, not afterthoughts)
- **Loading:** content-shaped skeletons that match final layout exactly (no spinners except for sub-second actions). Tables show 8 skeleton rows with the real column widths.
- **Empty (no data):** a calm, explanatory block — *what* is empty, *why* it might be (e.g., "No leads for July yet — the month hasn't started"), and a next step.
- **Empty (filtered to nothing):** different copy — "No leads match these filters" + a "Clear filters" action.
- **Error/partial:** never a blank screen. A bordered notice that states what failed, what's still trustworthy, and a retry.

### Interaction / focus / hover
- Visible **focus rings** (2px signal-green, 2px offset) on every interactive element — this is an internal tool used by keyboard-heavy power users.
- Hover reveals *affordance*, not decoration (row → "open", header → sort, value → tooltip with source/definition).
- Clickable numbers get a subtle underline-on-hover so users learn "numbers are doors."

---

## 4. Navigation & Global Layout Redesign

### Header (slimmer, more credible)
- Left: a small **brand keyline mark** + "**LSA Operations**" (drop "Platform" — it's filler) + environment chip only if non-prod.
- Center: **global search** (⌘K) — jump to a lead by phone/name, a market, an agent, or a page. This is the single biggest daily-speed upgrade.
- Right: a **data-health pill** ("All systems current" / "SF sync 14m ago" / amber "Sync delayed"), then user + role, then sign out. Freshness is global, not per-page.

### A new **context bar** (sticky, under header)
The persistent operating context on every page:
`[Period: ‹ June 2026 › ▾ ] [Scope: All markets ▾] [Source basis: All Sources ▾]   ·····   In progress · through Jun 26 14:59 · Final on Jul 1`
- Period control is global and consistent (kills the inconsistent month-selector problem).
- "Source basis" lets the user globally state which truth they're viewing (Call System / Salesforce / All Sources) — and the whole app reflects it. This is the central trust control.
- Right side = freshness + completeness stamp.

### Nav structure
Grouped tabs under three labels (MONITOR / INVESTIGATE / MANAGE) as described in §2. Active = signal-green text + 2px underline. Role-gated items are *absent* for unauthorized roles, not disabled.

### Page title areas (standardized template)
Every page header follows one structure:
`H1 (page) · one-line purpose statement · [primary action, right]`
Below it, an optional **summary/sticky bar** of 3–4 headline numbers that stays pinned as you scroll a long table.

### Filter placement
Filters live in a **single left-aligned filter row directly above the table**, never scattered. Active filters render as removable chips. Search is always the first control. Filter state is URL-encoded (shareable, deep-linkable, back-button-safe).

### Cross-page linking model
A consistent **drill convention**: clicking an entity (market, agent, lead) opens its focused view; clicking a *metric* opens the filtered list behind it. Breadcrumbs show the path back. Deep links carry period + scope + source basis so context never resets.

---

## 5. Page-by-Page Redesign

> Note: pages renamed — see §12. Mapping: Dashboard→**Overview**, Daily Report→**Today**, Insights & Exceptions→**Attention**, Log Call→**Add Call**, Lead Explorer→**Leads**.

### Overview (was Dashboard)
- **Purpose:** the month's truth in 10 seconds + what needs attention. (Deep dive in §7.)
- **Answers:** Are we winning or losing this month, where are we leaking, and what's broken right now?
- **Hierarchy:** Narrative line → Needs-attention strip → 3 headline KPIs → two truth blocks (Call System / Salesforce) with reconciliation → trends → market table.
- **De-emphasize:** the donut (→ stacked bar), the 8-card cramped row (→ 3 headline + expandable supporting), the generic alert banner (→ structured attention strip).
- **Add:** explicit source separation, MTD-fair deltas, a one-line auto-narrative.

### Today (was Daily Report)
- **Purpose:** the live operational pulse for *today* and recent days — the screen open during the workday.
- **Answers:** How's the day going right now vs a normal day at this hour? Any missed-call spike happening?
- **Hierarchy:** Today's running totals (with "vs same time on a typical day") → hour-by-hour bar with the current hour highlighted → a tight recent-days table (last 8 days) → live missed-call flag if a spike is in progress.
- **Add:** "intraday pace" — projected end-of-day vs target. Make this the agent/floor-manager home.
- **Caveat treatment:** the morning-snapshot problem is solved here by *labeling* early-day numbers "settling" until Dialpad/SF catch up.

### Leads (was Lead Explorer)
Deep dive in §8. Summary: serious investigation table + a **right-side drawer** (not modal), fast search/filter, graceful blank/unknown handling, attribution-confidence surfacing.

### Add Call (was Log Call)
- **Purpose:** capture a call the pipeline can't (or correct one).
- **Redesign:** lead with the **phone field + live auto-match preview** — as you type, a card appears showing the matched LSA lead (or "new lead"). The form then *pre-fills and visually marks* which fields came from the match vs. manual entry. Group fields into **Identity / Outcome / Scheduling / Money / Notes** sections with progressive disclosure (Money + Scheduling collapsed until relevant). Required fields (Market, Result) gated with inline validation. Confirmation toast links to the new lead in the drawer. Manual rows are tagged **"Manual"** everywhere so they're never confused with pipeline data.

### Agents (was Agent Performance) + Agent Detail
Deep dive in §9. Summary: fair, scannable leaderboard with **explicit bot/human separation**, source-tagged revenue, and coaching-oriented detail.

### Markets (was Market Reports)
Deep dive in §10. Summary: ranked-by-need market list, MoM diagnosis, spend-vs-outcome, first-class missing-data handling.

### Attention (was Insights & Exceptions)
Deep dive in §11. Summary: a real triage queue with severity, ownership, and one-click drill — not a card wall.

### Import
- **Purpose:** bring in a Google LSA CSV (admin).
- **Redesign:** a 3-step wizard — **Upload → Validate → Confirm.** Validation shows a real preview table with row-level warnings (bad dates, missing phones, duplicates) and a clear count of "X will import, Y skipped (reasons)". Confirm states exactly what will happen ("Replaces June pipeline rows; preserves N manual rows"). Post-import: a result summary with before/after counts and a link to view the imported month. This screen must *radiate* "I won't silently wipe your data."

### Admin
- **Purpose:** manage the system + see its health.
- **Redesign:** keep the 5 tabs but add a **System Health** tab as the default: sync status per source (LSA/Avoca/Dialpad/SF, last run, row counts), unknown-market count, missing-spend markets, and the completeness-guard status. Spend entry becomes a clean editable grid with save-state per cell. Activity log gets filters. This makes Admin the place data trust is maintained, not just a settings dump.

---

## 6. Solve the Known UX Problems Properly

**A. Blank customer names.**
- *Problem:* ~45% of leads (non-booked/missed/anonymous) have no name; the column reads as broken.
- *Why it hurts:* looks like missing data → erodes trust in the whole table.
- *Solution:* never render blank. Show a typed token: a muted **"Unknown caller"** with the phone as the de-facto identifier (formatted), and a tiny reason on hover ("No name captured — missed/short call"). Named leads show the name + a source dot (SF/Avoca). Add a filter "Has name / No name."
- *In UI:* `ink-400` italic "Unknown caller" + formatted phone as primary identifier for nameless rows.

**B. Unknown market domination.**
- *Problem:* when Geo is empty, every lead buckets to "Unknown," swamping the market view.
- *Why it hurts:* makes market reporting useless and looks broken.
- *Solution:* (1) derive market from Business Name (already shipped); (2) treat residual "Unknown" as an **explicit data-quality item**, not a market — pull it out of the ranked market list into a labeled "**Unattributed market — N leads (data issue)**" footer row with a link to the cause. Never let "Unknown" sort as the #1 market.
- *In UI:* a separate, visually distinct "needs attribution" row + an Attention item.

**C. Inconsistent month selector styling.**
- *Problem:* slate-900 vs blue-600 active states across pages.
- *Solution:* delete all per-page month rows. One **global period control** in the context bar (§4). Consistency by elimination.

**D. Too many cramped KPI cards.**
- *Problem:* 8-card rows; everything competes; nothing leads.
- *Solution:* a **3-tier hierarchy** — 3 *headline* KPIs (big, the answer), a *supporting* row of 4–5 (smaller), and *detail* behind a "More metrics" disclosure. Group by concept (Volume / Connection / Conversion / Money), not a flat strip.

**E. Different booking/revenue definitions across pages.**
- *Problem:* Dashboard "Booked" = all SF opps; Agent Performance "Booked" = LSA-attributed; revenue likewise. Same word, different number → the #1 trust killer.
- *Solution:* a **provenance system.** Every metric is tagged with its basis: **`Call System`**, **`Salesforce`**, or **`LSA-attributed`**. Tags are small, consistent labels next to the metric/header. Hovering any metric shows a one-line definition ("Booked (Salesforce): all opps created this month, any lead source"). On Overview, the two truths sit in **two clearly-labeled blocks with a reconciliation line** ("Salesforce shows 1,001 booked; 892 tie to an LSA lead — 109 booked through other channels"). Never show two "Booked" numbers without saying why they differ.

**F. Lack of global date flexibility.**
- *Solution:* global period control with month/quarter/year + the MTD-fair comparison model (§2). Keep month as default; add range without adding clutter.

**G. Emoji-driven visual language.**
- *Solution:* replace with one line-icon set (§3). Single highest-leverage change for perceived quality.

**H. Ambiguity around "All In."**
- *Problem:* "All In" is internal jargon meaning "the full monthly figure intended to match the tracking workbook."
- *Solution:* rename to **"All Sources (complete month)"** with a definition tooltip and a small "matches the LSA tracking workbook" note. Make it a *mode* of the Source-basis control, not a mystery pill.

**I. Stale data communication.**
- *Solution:* the **global data-health pill** (header) + per-source last-sync in Admin + the completeness stamp in the context bar. "Updated" becomes "**Synced 14m ago · SF 9:10**." Stale (>3h) escalates the pill to amber with a tooltip on what's behind.

**J. Weak data provenance.**
- *Solution:* the source-tag system (E) applied everywhere + a one-screen "**Where these numbers come from**" explainer linked from the data-health pill (the four sources, what each provides, the phone-join, the SF lead-source filter caveat). Provenance becomes a *feature you can click into*, not a footnote.

---

## 7. Overview (Dashboard) Reimagined — the flagship screen

**Design it as a top-to-bottom narrative that matches an operator's eye path. The eye should travel in this exact sequence:**

**(1) One-line auto-narrative (top, full width).** Plain-English summary the user reads first:
> *"June is pacing ahead of May — 2,410 leads, 95.3% connected. Booking is steady at 45%. Two markets are below target and one needs attribution. Salesforce revenue is still catching up for this month."*
This is generated from the data, written in the §14 voice. It tells leadership the answer before any chart.

**(2) Needs-attention strip (immediately below).** A horizontal row of 2–4 **ranked** attention chips (from the Attention engine), each one click into the fix. If nothing's wrong: a calm "No issues need attention" state. This is *above* the KPIs on purpose — problems beat vanity metrics.

**(3) Three headline KPIs (the answer).** Big, source-tagged, MTD-fair deltas:
- **Lead Volume** (`Call System`) — 2,410, ▲ vs May MTD
- **Connection Rate** (`Call System`) — 95.3%, vs 95% target (with the 0.7pt headroom shown)
- **Booking Rate / Bookings** (`LSA-attributed`) — 45% / 892
Each with a tiny sparkline and a "vs prior" that is honest about MTD.

**(4) Two truth blocks, side by side, explicitly labeled.** This is the centerpiece that no template has:
- **Left — "Call System (LSA)"**: Charged, Connected, Missed, Non-Charged, Disputes. The operational truth.
- **Right — "Salesforce (bookings & revenue)"**: Completed, Pending, Canceled, Completed Revenue — each tagged `Salesforce`, with the **filtered-feed caveat** as a quiet inline note and an "earlier months understate" flag on closed-month views.
- **Between them: a reconciliation line** that does the math the user would otherwise do in their head ("892 of 1,001 SF bookings tie to an LSA lead").

**(5) Trends (sequence matters):** Connection Rate trend (with the 95% target reference line) → Lead Volume trend → a small Bot-vs-Human split (is the bot helping? what's human conversion?). Quiet single-hue lines, target lines, end-of-line value labels. The classification donut becomes one honest 100% stacked bar inline near the KPIs, not a chart card.

**(6) Market performance table (bottom, ranked by *need*, not alphabetically).** Worst-first: market · leads · connection rate (vs target, colored only when off) · booking · revenue (SF-tagged) · trend sparkline. "Unattributed market" pulled into a labeled footer row. Click a market → Markets view, pre-scoped.

**Data confidence woven throughout:** every block carries its source tag; the period/completeness stamp sits in the context bar; "in-progress month" numbers are visibly marked so a 99.7% morning blip can't masquerade as a win.

**Net effect:** a VP reads line (1) and is done. A manager scans (2)→(3) and knows where to go. An analyst drops to (4)–(6). One screen, three altitudes, zero decoration.

---

## 8. Lead Investigation Experience (Leads + detail)

**Use a right-side drawer, not a modal — and here's why:** investigation is comparative and sequential. A modal blocks the list and forces close-reopen-close. A **drawer (480–560px, slides from right, list stays visible and dimmed-not-hidden)** lets the user keep their place, arrow-key ↑/↓ through leads with the drawer open, and compare. This is the single biggest investigation-UX upgrade.

**Search & filter (speed-first):**
- Search is instant, matches name *or* phone, normalizes phone input (strip formatting), and shows match-count live.
- Filters as a compact row: Classification · Market · Has name · Handled by (Bot/Human/Queue) · Status · Source. Active filters = removable chips. All URL-encoded.
- A few **saved smart filters** as one-click presets: "Missed calls," "Booked, no name," "Bot-handled," "Unattributed market."

**The table (reduce fatigue):**
- Columns: Time · Caller (name or "Unknown caller" + formatted phone) · Market · Classification chip · Duration · Handled by (Bot/Human chip) · Status. Sticky header + sticky Caller column.
- **Phone formatting:** `(817) 975-4930`, monospace, click-to-copy.
- **Bot vs human:** a clear chip, not a buried field; bot rows get a subtle left keyline so the eye groups them.
- **Attribution confidence:** a small dot (high = matched by Op-ID/clean phone, low = fuzzy/none) so users know how much to trust the SF join on that row.
- Row height 44px, hairline dividers, hover reveals an "open" affordance; whole row opens the drawer.

**The drawer (a real lead history):**
- Header: caller identity (name or "Unknown caller"), formatted phone (copy), market, time, Bot/Human + confidence.
- **Status editor** as a confident segmented control with optimistic save + "Saved" micro-confirmation + "Manual override" tag so it's clear this is human-set and survives rebuilds.
- **Provenance section:** which source each fact came from (LSA / Avoca / Dialpad / SF), with the SF opp link.
- **Timeline:** lead created → call handled → booked → scheduled → outcome, as a vertical timeline (graceful when steps are unknown — missing steps render as "not recorded," not blank).
- Keyboard: ↑/↓ navigate rows, `S` focus status, `Esc` close, `C` copy phone.

---

## 9. Agent Performance UX (fair, non-misleading, coaching-ready)

**Separate bot from human — structurally, not just a tag.** The Avoca bot is not an agent and must never be ranked against humans on "booking rate." Split the page into **two tables**: **Human Agents** (ranked) and a single **Avoca (Bot)** summary block above/beside it. This kills the "is Avoca winning?" false comparison.

**Make the metric basis explicit.** Booking and revenue may come from different logic — tag every column (`LSA-attributed`) and footnote that revenue is the SF amount on matched opps. Show **Booked count + Booking rate together** (rate alone is unfair to high-volume agents; count alone hides efficiency).

**Coaching orientation, not leaderboard shaming.** For each human agent: calls, connected, booked, booking rate (vs *team median*, not an absolute that ignores call mix), revenue, avg job, and a 6-month sparkline. Color a rate only when it's meaningfully below the team median — and label it "below team median," not "bad." Avoid red-on-people unless it's a real, sustained gap.

**Guard against bad incentives.** Surface **call mix** (charged vs non-charged, bot-transferred vs direct) so a low booking rate caused by junk leads isn't read as poor performance. Add a "fair comparison" note explaining that rates are mix-adjusted where possible.

**Agent Detail:** keep the tabs (Call Log / Trend / Breakdown) but lead with a **coaching summary** — "Strong on connection, below team median on booking this month; most misses cluster 4–6pm." Make the breakdown bars comparative to team, and the call log filterable to "lost bookings" for review.

---

## 10. Market Reporting UX

**Rank by need, default to worst-first.** The landing market view is a **ranked list of all markets** (not a single-market dropdown), sorted by distance-below-target, so the eye lands on the problem. A market detail opens on click (drawer or sub-page).

**MoM diagnosis built in.** Each market row shows current connection rate, the MoM delta (colored only when down >3pts), and a sparkline. The detail view leads with "**What changed**" — the biggest MoM movers (rate, volume, missed-by-hour) — answering the diagnosis question directly.

**Spend vs outcome.** Show CPL next to connection/booking so the user sees efficiency, not just volume. A small **spend→leads→booked→revenue funnel** per market makes the money story legible. Flag markets where spend is rising but bookings aren't.

**Missing/unknown data, handled with dignity.** Markets missing spend show "CPL unavailable — no spend entered" (link to Admin), not a blank or a misleading $0. The "Unattributed" bucket is labeled a data issue, separated from real markets, with a link to the cause and an Attention item.

**Actionability.** Every market row → filtered Leads (that market, that month) and → the agents who handled it. Underperformance is always one click from "who/what."

---

## 11. Attention (Insights & Exceptions) — an operations control surface

**Reframe from "cards of insights" to "a triage queue."** This is the page a manager works down to zero.

**Severity model (P1/P2/P3):**
- **P1 Critical** — revenue or connection actively bleeding (market <90% with volume, missed-call spike in progress, sync down). Red.
- **P2 Warning** — below target / declining (market 90–95%, MoM drop, agent sustained below median). Amber.
- **P3 Data-quality** — unknown market, missing spend, low-confidence attribution, stale source. Steel-blue/neutral. *Separated* from performance issues so messy data never masquerades as a performance crisis.

**Prioritization logic:** sort by severity, then by **$ or volume at stake** (an exception affecting 300 leads outranks one affecting 12). Each item shows an **impact estimate** ("~$8k pending exposure," "112 leads affected").

**Layout:** a single prioritized list (not a 5-card grid), grouped by severity with collapsible sections. Each row: severity dot · title · one-line context · impact · **suggested owner** (Market lead / Floor manager / Admin) · **primary action button** (deep-link: Investigate / Assign / Fix in Admin). 

**Ownership cues** make it a queue, not a noticeboard — every item names who should act and what the next step is.

**Noise control:** thresholds are tuned and *explained* ("Below 95% with ≥5 charged leads"); items can be **snoozed/acknowledged** (with a reason) so the queue reflects real open work. A resolved item shows how it cleared. An "All clear" state is a genuine, calm reward — not an empty card.

---

## 12. Naming & Language Improvements

| Current | Replace with | Why |
|---|---|---|
| Dashboard | **Overview** | "Dashboard" is generic; this is the monthly overview. |
| Daily Report | **Today** | It's the live operational view, not a report. |
| Insights & Exceptions | **Attention** (or "Needs Attention") | It's a work queue, not insights. |
| Log Call | **Add Call** | Action-first, clearer. |
| Lead Explorer | **Leads** | Shorter; the page *is* leads. |
| Market Reports | **Markets** | Consistent noun nav. |
| Agent Performance | **Agents** | Same. |
| "All In" | **All Sources (complete month)** | Defines the jargon; ties to source-basis control. |
| Booked | **Bookings (Salesforce)** / **Bookings (LSA-attributed)** | Disambiguate the two definitions in the label itself. |
| Connected | keep, tooltip: "Charged call that connected" | It's an LSA billing term; define it. |
| Non-Charged | **Non-billable call** | "Non-Charged" is LSA jargon; "non-billable" is clearer. |
| Charged | **Billable calls** | Same reasoning. |
| Result | **Outcome** | Plainer. |
| Updated 10:35 AM | **Synced 14m ago · SF 9:10** | States freshness *and* source, relative + absolute. |
| Unknown (market) | **Unattributed** (+ "data issue") | "Unknown" reads as broken; "unattributed" names the cause. |
| Missed | keep | Clear. |
| Disputes | keep, tooltip | Clear to this domain. |

Helper text everywhere should state the *definition and source* of a metric on hover. Section names describe the *question* ("Where are we leaking leads?") on analytical pages where it adds clarity.

---

## 13. Component-Level Recommendations

- **KPI / Stat (`<Metric>`):** label (uppercase micro, ink-400) + **source tag** + value (display, tabular) with de-emphasized unit + delta (small, colored, MTD-aware) + optional 60px sparkline. Variants: `headline` (large), `supporting` (compact). Hover → definition+source tooltip. Clickable → drill.
- **Metric group (`<MetricCluster>`):** titled group of 3–5 Metrics with a shared source tag and a "More" disclosure. Replaces the flat 8-card row.
- **Chart header (`<ChartHeader>`):** title + source tag + period + a right-aligned legend/toggle; reference-line note ("dashed = 95% target").
- **Table (`<DataTable>`):** sticky header, sticky first column, typed columns (entity/metric/status/delta/trend), sortable, pinnable, density toggle, source-tagged numeric headers, URL-synced sort/filter, skeleton + empty + filtered-empty states built in.
- **Badge / status chip (`<StatusChip>`):** the fixed vocabulary (On target/Below/Critical/Pending/Stale/Estimated/Unverified/Bot/Human/Manual). Shape+color+label; size sm/md.
- **Rate badge (`<RateChip>`):** value colored by threshold *relative to target*, with the target in the tooltip.
- **Filter bar (`<FilterBar>`):** search + filter dropdowns + active-filter chips + clear-all; URL-synced; saved presets.
- **Period control (`<PeriodControl>`):** ‹ month › + year + (later) quarter/range; the single global temporal control; emits period to all pages.
- **Source-basis control (`<SourceBasis>`):** Call System / Salesforce / All Sources; global.
- **Breadcrumb (`<Breadcrumb>`):** entity path with period/scope preserved.
- **Freshness pill (`<DataHealth>`):** global sync state, expands to per-source detail + "where numbers come from" link.
- **Caveat callout (`<Caveat>`):** quiet inline note (not a yellow banner) for filtered-SF / estimated / in-progress; one icon + one line + "learn more."
- **Drilldown link (`<DrillValue>`):** any number that navigates; underline-on-hover, carries context.
- **Empty state (`<EmptyState>`):** typed (no-data / filtered-empty / error) with cause + action.
- **Skeleton (`<Skeleton>`):** layout-matched, per component.
- **Drawer (`<Drawer>`):** right-side, keyboard-navigable, used for lead/agent/market detail (replaces modals).
- **Inline edit (`<InlineStatus>`):** segmented control, optimistic save, saved-state, "Manual" tag.
- **Reconciliation line (`<Reconcile>`):** the small "A vs B because…" explainer between two source blocks.
- **Auto-narrative (`<Narrative>`):** generated summary line, §14 voice.

---

## 14. UX Writing Guidelines (voice & tone)

**Voice:** the competent operations lead who is calm under pressure — concise, factual, never hyped, never cute, honest about uncertainty. Numbers first, adjectives rarely. No exclamation marks. No "Oops!" No "🎉." Calm *especially* when something's wrong.

**Rules:** state the fact, then the cause, then the action. Prefer "is" over "may be." Quantify ("112 leads," not "several"). Name the source. Never blame the user.

**Microcopy examples:**
- **Stale data:** "Synced 3h 12m ago — Salesforce sync is delayed. Connection metrics are current; bookings may lag."
- **Missing name:** "Unknown caller — no name captured on this call." (identifier = phone)
- **Unknown market:** "Unattributed — market not provided by the source. 36 leads. Fix in Admin → Markets."
- **Filtered Salesforce:** "Salesforce figures cover the LSA lead source only. Earlier months understate bookings until the feed is widened."
- **No results (data):** "No leads for July yet. The month begins July 1."
- **No results (filtered):** "No leads match these filters." + [Clear filters]
- **Import success:** "Imported 1,317 leads for June. 6 rows skipped (missing phone). Manual entries preserved." + [View June]
- **Import failure:** "Import stopped — 0 valid rows found. Nothing was changed. Check the file is a Google LSA detailed export."
- **Role restriction:** "Adding calls is limited to agents and admins." (state who *can*, not just "denied")
- **Editable status saved:** "Status set to Completed · manual override."
- **Benchmark warning:** "Below team median booking rate (38% vs 45%). Most misses cluster 4–6pm." (diagnostic, not judgmental)
- **In-progress month:** "June is in progress — figures update hourly and settle after month end."

---

## 15. Implementation Guidance (React + Tailwind)

- **Layout system:** a single `<AppShell>` (header + context bar + nav + content frame, `max-w-[1400px]`). Pages render into a standardized `<PageHeader>` + content. CSS grid for KPI clusters and the two-truth blocks; flex for bars.
- **Component system:** build the §13/§18 primitives first as a small internal kit (tokens → primitives → composites). Tailwind with a **design-token layer** (CSS variables for the ink ramp, accent, semantics, spacing, radii, shadows) so the system is themeable and consistent — *not* raw utility soup. One `tokens.css`.
- **State patterns:** URL is the source of truth for period/scope/source-basis/filters/sort (deep-linkable, shareable). Server state via a query cache (TanStack Query) keyed by those params; optimistic updates for status edits. Global context only for auth/role + period/source-basis.
- **Responsiveness:** desktop-first (this is a workstation tool), but tables degrade gracefully — horizontal scroll with the sticky entity column; KPI clusters collapse 4→2→1; the drawer becomes full-width on narrow screens. Don't pretend it's a phone app; make it *usable* on a laptop split-screen.
- **Charts:** keep Recharts but wrap in a `<Chart>` with house defaults (hues, stroke, no grid clutter, target reference lines, end-labels). Prefer in-table sparklines for scanning; reserve full charts for trends that need shape.
- **Tables:** a headless table lib (TanStack Table) for sort/pin/virtualize. **Virtualize** the Leads table (thousands of rows). Column defs declare type (entity/metric/status) so styling + alignment + source tags are automatic.
- **Accessibility:** semantic table markup, `aria-sort`, focus-visible rings everywhere, drawer focus-trap + `Esc`, color never the *only* signal (status has shape+label), AA contrast on all text including ink-400.
- **Keyboard:** ⌘K global search/jump; arrow-key row nav in tables/drawer; `/` focus search; `S` status; `Esc` close. Power users should rarely touch the mouse.
- **Performance:** virtualize long tables; paginate server-side where possible; memoize aggregations; lazy-load charts below the fold; skeletons within 100ms.
- **Progressive disclosure:** headline → supporting (one click) → detail (drawer). Caveats are one line with "learn more." Never show everything at once; never hide the thing that matters.

---

## 16. Final Design Brief for Engineering

**Vision:** Build an *operating console* for LSA lead operations — a tool staff live in and leadership trusts. It is table-first, source-honest, and organized around the operator's loop (what happened → what changed → what's broken → who owns it → what's next).

**Key UX changes (the must-dos):**
1. **Provenance system** — every metric tagged Call System / Salesforce / LSA-attributed, with definition-on-hover and a reconciliation line where truths diverge. This is the soul of the product.
2. **Global context bar** — one period control + scope + source-basis + freshness/completeness. Kill all per-page month rows.
3. **Two-truth Overview** with a top auto-narrative and a needs-attention strip *above* the KPIs.
4. **Attention as a triage queue** with severity, impact, owner, and one-click drill.
5. **Leads drawer** (not modal), with confidence + graceful blank/unknown handling.
6. **Bot/human separation** in Agents; **rank-by-need** in Markets.
7. **Real icon set, monochrome+1-accent palette, table-first** visual system; emoji removed.
8. **MTD-fair comparisons** and visible in-progress/Final stamps.

**Non-negotiables:**
- No two pages may show the same word ("Booked") meaning different numbers without a visible source tag.
- No blank cells; no "Unknown" sorting as a top market; no green-looking 99% on an incomplete morning.
- Freshness and completeness are always visible.
- Color means status, never decoration. One accent. One icon set. Tabular numerals.
- Every red number is a link to the fix.

**What must NOT feel generic:** no donut-and-cards template, no rainbow charts, no emoji, no per-page filter chaos, no hidden ambiguity. If it could be any SaaS dashboard, it's wrong.

**Quality bar:** a frontline user understands the day in 3 seconds; a manager reaches the broken thing in one click; a VP believes the number — and if it's soft, the UI already said so.

---

## 17. Wireframe-Level Layout Notes

**Global shell (all pages):**
```
┌ Header: [▍LSA Operations]      [ ⌘K  search leads / markets / agents ]      [● Synced 14m · SF 9:10] [Aaditya · admin ▾] ┐
├ Context bar: [‹ June 2026 ›]  [All markets ▾]  [Source: All Sources ▾]        In progress · through Jun 26 14:59 ──────────┤
├ Nav:  MONITOR  Overview · Today   |   INVESTIGATE  Leads · Agents · Markets   |   MANAGE  Attention(3) · Add Call · Import · Admin ┤
└ Content (max-w 1400) ─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Overview:**
```
[ Narrative: "June pacing ahead of May — 2,410 leads, 95.3% connected…" ]
[ Needs attention:  ⦿P1 Cleveland 88%  ⦿P2 GR −4pts  ⦿P3 36 unattributed   → ]
[ HEADLINE:  Lead Volume 2,410 ▲   |   Connection 95.3% (target 95%)   |   Bookings 892 · 45% ]   each: sparkline
┌ Call System (LSA) ───────────────┐   ┌ Salesforce (bookings/revenue) ────┐
│ Billable 1,943 · Connected 1,852 │   │ Completed 904 · Pending 47        │
│ Missed 91 · Non-billable 564     │   │ Canceled 333 · Revenue $517k 〔SF〕│
└──────────────────────────────────┘   └── caveat: LSA lead source only ───┘
        └─ Reconcile: 892 of 1,001 SF bookings tie to an LSA lead ─┘
[ Connection-rate trend ——— w/ 95% target line ]   [ Volume trend ]   [ Bot vs Human split ]
[ Markets — worst first | leads | conn% vs target | booking | revenue〔SF〕| trend ]   (Unattributed row footer)
```

**Leads (list + drawer):**
```
[ H1 Leads · "Investigate individual LSA leads"            ]
[ search ____ ][Class ▾][Market ▾][Has name ▾][Handled ▾][Status ▾]  ·  presets: Missed | Booked,no name | Bot
┌ table ───────────────────────────────────────────────┐ ┌ Drawer (on row click) ───────┐
│ Time│Caller (or Unknown caller +phone)│Mkt│Class│Dur │ │ Caller / phone(copy) · Bot ●hi│
│ ...sticky header, sticky Caller, 44px rows, conf dot  │ │ [Status segmented · Manual]   │
│                                                       │ │ Provenance: LSA·Avoca·SF link │
└───────────────────────────────────────────────────────┘ │ Timeline: created→call→booked │
                                                           └───────────────────────────────┘
```

**Agents:** Bot summary block (top) → Human Agents table (rank, calls, conn, booked, rate vs team median, revenue〔LSA-attr〕, avg job, 6-mo spark) → row click = Agent Detail drawer/page with coaching summary + tabs.

**Markets:** ranked worst-first list (market, conn% vs target, MoM Δ, CPL, revenue〔SF〕, spark) → detail leads with "What changed" + spend→leads→booked→revenue funnel. Unattributed pulled to a labeled footer.

**Attention:** severity-grouped list (P1/P2/P3 collapsible), each row: dot · title · context · impact · owner · [action]. "All clear" calm state.

**Today:** running totals + "vs typical day at this hour" → hour bars (current hour highlighted) → last-8-days table → live spike flag.

**Add Call:** phone + live match preview card → sectioned form (Identity/Outcome/Scheduling/Money/Notes, money+scheduling collapsed) → confirm → toast w/ link.

**Import:** Upload → Validate (preview table + warnings + "X import / Y skipped") → Confirm ("replaces June pipeline rows; preserves N manual") → result summary.

**Admin:** tabs [System Health* · Users · Agents · Markets · Spend · Activity]; Health default (per-source sync, unknown-market count, missing-spend, guard status).

---

## 18. Component Inventory

**Shell/global:** AppShell, Header, GlobalSearch (⌘K), ContextBar, PeriodControl, SourceBasisControl, ScopeControl, DataHealthPill, NavTabs, PageHeader, Breadcrumb, RoleGate.
**Data display:** Metric (headline/supporting variants), MetricCluster, Narrative, Reconcile, DataTable (+ TableHeader, SortableHeader, StickyColumn, DensityToggle, ColumnPicker), Sparkline, Chart (+ ChartHeader, TargetLine, EndLabel, Tooltip), StackedBar100, Funnel.
**Status/labels:** StatusChip, RateChip, SourceTag, ConfidenceDot, DeltaIndicator (MTD-aware), TrendArrow.
**Inputs/filters:** FilterBar, FilterChip, SearchInput, Dropdown/Select, SegmentedControl, InlineStatusEditor, FormSection, FieldRow, FileDropzone.
**Overlays:** Drawer, Modal (confirm-only), Toast, Tooltip, Popover, ConfirmDialog.
**States:** Skeleton (per layout), EmptyState (no-data/filtered/error variants), Caveat, ErrorBoundaryNotice, PartialDataNotice.
**Action:** Button (primary/secondary/ghost/danger), DrillValue, ActionMenu.
**Domain composites:** LeadRow, LeadDrawer, AgentRow, AgentSummaryCard (bot), MarketRow, MarketDetail, AttentionItem, AttentionGroup, KpiTwoTruthBlock, IntradayPace, ImportWizard, SystemHealthPanel.

---

## 19. Build Order

**Phase 0 — Foundation (no visible features, enables everything):**
1. Design tokens (`tokens.css`: ink ramp, accent, semantics, spacing, radii, shadow, type scale) + icon set install.
2. AppShell + Header + ContextBar + NavTabs + PageHeader; URL-state plumbing (period/scope/source-basis/filters) + query cache.
3. Core primitives: Metric, StatusChip/RateChip/SourceTag/ConfidenceDot, DataTable (sort/sticky/skeleton/empty), Drawer, Caveat, EmptyState, Skeleton, Button, DrillValue.

**Phase 1 — Trust spine (the differentiator, do early):**
4. SourceTag/provenance wired to real metrics; definition tooltips; DataHealthPill + "where numbers come from" explainer; in-progress/Final + MTD-fair delta logic.

**Phase 2 — Highest-traffic pages:**
5. **Overview** (narrative, attention strip, headline KPIs, two-truth blocks + Reconcile, trends, markets table).
6. **Leads** + LeadDrawer (search/filter/URL-state, confidence, blank/unknown handling, status edit).

**Phase 3 — Investigation depth:**
7. **Markets** (rank-by-need, MoM, funnel, unattributed handling).
8. **Agents** + Agent Detail (bot/human split, coaching, team-median comparison).
9. **Attention** (severity engine, impact, owner, deep-links, snooze).

**Phase 4 — Operational + management:**
10. **Today** (intraday pace, hour bars, settling labels).
11. **Add Call** (match preview, sectioned form), **Import** (wizard), **Admin** (System Health first).

**Phase 5 — Polish:**
12. ⌘K global search, keyboard nav, virtualization, accessibility pass, saved filter presets, motion tuning.

**Sequencing logic:** tokens + shell + provenance first (everything depends on them and provenance is the identity); then the two screens with the most daily use (Overview, Leads) to deliver value fast; then the investigation trio; operational/admin last; polish continuous. Each phase ships a usable slice — no big-bang.
