# Handoff: LSA Operations — Overview Dashboard Redesign

## Overview
A modern redesign of the **LSA Operations** CRM "Overview" screen — a call/lead operations console for ops managers. The new design replaces the flat card grid with a left-sidebar app shell, soft white cards on a light canvas, an indigo accent, and real data-viz (area chart, gauge, donut). All numbers are mapped from the current production Overview (Jun 2026).

## About the Design Files
The file in this bundle (`LSA Operations.dc.html`) is a **design reference created in HTML** — a prototype showing the intended look, layout, and behavior. **It is not production code to copy directly.** Your task is to **recreate this design inside your existing codebase** (React/Next/Vue/etc.) using your established component patterns, styling system (Tailwind / CSS modules / styled-components), charting library, and icon set. Match the visual spec below; do not paste the HTML in.

> Note: the HTML uses a small custom runtime (`<x-dc>`, `support.js`, `renderVals`). Ignore that runtime entirely — it's only how the prototype renders. Implement with your normal stack.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and component treatments are specified below with exact values. Recreate pixel-faithfully using your codebase's existing libraries (e.g. swap the hand-rolled SVG charts for your chart lib, the inline SVGs for your icon set), keeping the same layout, sizing, and palette.

---

## Screen: Overview

### Global Layout
- Root: full-height flex row. Left **fixed sidebar 266px**, right **main column** (flex: 1).
- Page background (canvas): `#eef1f6`. Cards: `#ffffff`.
- Main column = sticky **topbar (70px)** + scrolling **content area** (`padding: 26px 28px 40px`, vertical flex, `gap: 22px`).
- Font: **Outfit** (Google Fonts, weights 300–800), fallback `system-ui, sans-serif`.

### Color Tokens
| Token | Value | Use |
|---|---|---|
| Accent (primary) | `#465fff` | active nav, logo, chart line, buttons, gauge |
| Accent soft | `#eef1ff` | active nav bg, icon chips, tints |
| Canvas | `#eef1f6` | page background |
| Card | `#ffffff` | all cards |
| Card border | `#e9ecf3` | card/topbar/sidebar borders |
| Hairline | `#eef0f5` / `#f4f6fa` | inner dividers, table rows |
| Heading text | `#101828` | titles, numbers |
| Body text | `#344054` / `#475467` | paragraph, table cells |
| Muted text | `#98a2b3` | labels, captions |
| Faint text | `#cdd2dc` | disabled month pills |
| Positive | fg `#027a48`, bg `#ecfdf3` | up deltas, "Connected" |
| Negative | fg `#d92d20`, bg `#fef3f2` | down deltas, "Missed" |
| Warning | fg `#b54708`/`#dc6803`, bg `#fffaeb`, border `#fedf89`/`#fef0c7` | "in progress" pill, pending, info notes |
| Donut: connected | `#465fff` (accent) | |
| Donut: missed | `#f97066` | |
| Donut: non-billable | `#d0d5dd` | |
| Salesforce tag | fg `#0e7090`, bg `#e0f2fe` | |

The accent is theme-able. In the prototype it's a CSS variable `--lsa-accent` (default `#465fff`) with a paired soft tint `--lsa-accent-soft`. Other options offered: violet `#7c3aed`/`#f3ecfe`, teal `#0d9488`/`#e3f4f1`, blue `#2563eb`/`#e8f0fe`. Implement as a single theme variable so it can be swapped.

### Spacing / Radius / Shadow
- Card radius: **16px**. Inner mini-cards / pills: 10–13px. Nav items: 11px. Avatars: 50%.
- Card padding: **22–24px**. Card shadow: `0 1px 2px rgba(16,24,40,.04)`.
- Standard grid gap between cards: **20px**. Section gap: **22px**.

### Typography Scale
| Element | Size / Weight |
|---|---|
| Page H1 ("Overview") | 27px / 700, letter-spacing −0.5px |
| Card title (H3) | 17px / 700 |
| KPI number | 32px / 700, letter-spacing −1px |
| Gauge % | 38px / 700 |
| Donut/table number | 25–28px / 700 |
| Section sub/caption | 13px / 400–500, `#98a2b3` |
| Nav item | 14.5px / 500 (active 600) |
| Uppercase labels | 12–12.5px / 600, letter-spacing 0.4px, `#98a2b3` |
| Delta badge | 12.5px / 600 |

---

### Components

**1. Sidebar (266px, white, `border-right: 1px #e9ecf3`, sticky full-height)**
- **Brand row**: 40×40 rounded-12 accent square containing three ascending white bars (9/15/21px tall, 4px wide, 3px gap), with subtle accent shadow. Beside it: "LSA Operations" (17px/700) over "Call & Lead Console" (11px/500, muted).
- **MENU group** (caption 11px/600 letter-spacing 1px `#b6bcca`): nav items with 20px line icons + label, padding `10px 12px`, radius 11px.
  - Items: **Overview** (active: bg `--lsa-accent-soft`, text accent, 600), Daily, Leads, Agents, Markets, Attention. Attention has a right-aligned red count pill "14" (fg `#d92d20`, bg `#fef3f2`, radius 20px).
  - Inactive item color `#667085`; hover bg `#f4f6fb`, text `#101828`.
- **WORKSPACE group**: Add Call, Import, Admin (same item style).
- **User card** (bottom, `border-top`, bg `#f8f9fc`, radius 12px): 38px accent-soft avatar "AT", name "Aaditya Thapa" (13.5/600) over "ADMIN" (11.5/600, accent), trailing sign-out icon button (hover bg `#eef0f5`).
- Icons used (Lucide equivalents): grid (Overview), calendar (Daily), users (Leads), phone (Agents), map-pin (Markets), alert-triangle (Attention), plus-circle (Add Call), upload (Import), settings (Admin), log-out (sign out).

**2. Topbar (70px, white, sticky, `border-bottom`, `padding: 0 28px`, flex align-center gap 18px)**
- Left: search field — pill `#f4f6fb`, border `#ebedf2`, radius 11px, height 42px, width 380px (max 42vw). Search icon + input "Search leads, agents, markets…" + `⌘K` kbd chip (white, border, radius 6px).
- Spacer (flex:1).
- "Synced 2:55 PM" status pill (green dot `#12b76a` with `0 0 0 3px #d1fadf` ring, bg `#f4f6fb`, border).
- Bell icon button (42×42, white, border, radius 11px) with red unread dot top-right.
- 42px accent avatar circle "AT".

**3. Page header block** (flex row, space-between, wrap)
- Left: H1 "Overview", subtitle "The month at a glance — what's happening, what changed, and what needs attention." (14.5px, `#667085`, max-width 520px). Below: status chips row — amber pill "In progress · settles after month end" (fg `#b54708`, bg `#fffaeb`, border `#fedf89`, radius 20px) + "Synced Jun 29, 2:55 PM" (green dot + muted text).
- Right: **month selector** — white container, border, radius 13px, padding 5px, holding Jan–Dec pills (13px). Inactive `#98a2b3` (Jul–Dec disabled `#cdd2dc`). **Jun active**: white text on accent bg, radius 8px, accent shadow.

**4. Insight summary** (toggle-able) — white card, `border-left: 4px solid accent`, radius 14px, padding `18px 22px`. 36px accent-soft info-icon chip + paragraph (15px, line-height 1.6, `#344054`) with bolded figures; "14 markets" in red. Exact copy:
> **Jun 2026:** 2,543 leads, **92.7% connected** (down 1.2 pts vs May). Salesforce shows **1,306 bookings** this month. **14 markets** below the 95% target, and **52 leads** need market attribution.

**5. KPI cards** — `grid-template-columns: repeat(4, 1fr)`, gap 20px. Each: white card, radius 16px, padding 22px, flex column gap 16px.
- Header row: uppercase label (12.5/600, muted) + 40×40 rounded-12 accent-soft icon chip.
- Body: 32px/700 number, then a delta row: colored badge (▲/▼ + value, radius 7px) + "vs May" muted.
- The four cards:
  1. **Total Calls** — `2,543` · ▲ 1,027 (green) · phone icon
  2. **Connect Rate** — `92.7%` · ▼ 1.2 pts (red) · activity/pulse icon
  3. **Bookings** — `1,306` · ▲ 595 (green) · briefcase icon
  4. **Completed Revenue** — `$526,016` · subnote "917 of 1,306 bookings completed" (no badge) · dollar icon

**6. Call Volume area chart + Connect Rate gauge** — `grid-template-columns: 2fr 1fr`, gap 20px.
- **Area chart card** (left): H3 "Call Volume", sub "Calls placed vs connected, Jan – Jun". Top-right: two legend stats — "Total calls 2,543" (accent square) and "Connected 1,715" (light `#bcc9ff` square), each 12px label over 21px/700 number.
  - Chart: two line series over Jan–Jun. **Total calls** = accent line (3px) with gradient area fill (accent 0.22 → 0 top-to-bottom). **Connected** = `#bcc9ff` line (3px). 3 light gridlines + baseline. End-point dots (white fill, colored 3px stroke). X labels Jan–Jun (Jun highlighted accent/700).
  - Series data used (for shape — replace with real monthly series if available): Total calls `[1100, 1250, 1180, 1320, 1516, 2543]`; Connected `[1023, 1163, 1097, 1227, 1409, 1715]`.
  - **Implementation:** use your charting lib (Recharts/Chart.js/ApexCharts) for an area+line combo rather than hand-drawn SVG.
- **Gauge card** (right): H3 "Connect Rate", sub "Against the 95% market target". Semicircular gauge: track `#eef0f5`, value arc accent, stroke-width 22, rounded caps, filled to **92.7%** of the 180° sweep. Centered overlay: "92.7%" (38/700) over "connected" (12.5, muted). Footer (`border-top`): "Target / 95.0%" on the left; red badge "▼ 2.3 pts below target" on the right.

**7. Call Mix donut + Markets-Need-Attention** — `grid-template-columns: 1fr 1.45fr`, gap 20px.
- **Donut card** (left): H3 "Call Mix". 180×180 donut (stroke-width 22, track `#f0f2f6`). Segments by share of 2,543 total: Connected 1,715 (67.4% → accent), Missed 136 (5.3% → `#f97066`), Non-billable 692 (27.2% → `#d0d5dd`). Center: "Total / 2,543". Legend rows: colored chip + name + count + % (Connected 1,715/67%, Missed 136/5%, Non-billable 692/27%), then a divided row **Billable 1,851 / 73%** (outlined accent chip).
- **Markets card** (right): H3 "Markets Need Attention", sub "14 markets below the 95% connect target", "View all ›" link (accent). Three progress rows — name + % on a row, then an 8px track (`#f0f2f6`) with a colored fill and a **dark 2px target tick at 95%**:
  - Des Moines **80%** (fill `#f04438`, % red)
  - Dallas Central **81%** (fill `#f04438`, % red)
  - Kansas City **86%** (fill `#f79009`, % amber `#b54708`)
  - Color rule: <85% red, 85–94% amber. Tick always at 95%.
  - Footer: two stat tiles — red `11 more markets below target` (bg `#fef3f2`) and amber `52 leads need attribution` (bg `#fffaeb`), each big number + small label.

**8. Salesforce — Bookings & Revenue** (toggle-able) — white card, padding 24px.
- Header: H3 "Salesforce — Bookings & Revenue" + "SALESFORCE" tag chip + right caption "Opps created this month · updates hourly".
- Amber info note: "Salesforce figures cover the LSA lead source only and may understate this month until it settles after month end."
- `grid-template-columns: repeat(5, 1fr)`, gap 16px, of outlined mini-cards (border `#eef0f5`, radius 13px, padding 18px): 34px colored icon chip + label, 25px/700 number, sub line.
  1. **Bookings** `1,306` · ▲ 595 vs May (green) · calendar (accent chip)
  2. **Completed** `917` · "70% of bookings" · check-circle (green chip `#ecfdf3`)
  3. **Pending** `52` · "awaiting close" · clock (amber chip `#fffaeb`)
  4. **Canceled** `337` · "26% of bookings" · x-circle (red chip `#fef3f2`)
  5. **Revenue** `$526,016` · "completed bookings" — **emphasized card**: accent border + accent-soft bg, white icon chip · dollar icon
- Footnote (bg `#f8f9fc`, radius 11px): "Salesforce shows **1,306** bookings this month; **1,022** tie to an LSA lead — **284** were booked through other channels."

**9. Recent Leads table** — white card, padding 24px.
- Header: H3 "Recent Leads" + sub "Latest calls routed to Salesforce". Right: search field (height 38) + "Filter" button (sliders icon).
- Columns grid: `1.4fr 1.4fr 1fr 1fr 1fr` = Lead / Market / Agent / Duration / Status. Uppercase muted header row, `border-bottom`.
- Rows (padding `13px 6px`, `border-bottom: 1px #f4f6fa`): 38px initial-avatar (varied tints) + name (14/600) over phone (12.5, muted); market; agent; duration; right-aligned **status pill** (radius 20px) — Connected (green), Pending (amber), Missed (red).
- Sample rows (placeholder data — replace with live feed): Marcus Reed/Des Moines/J. Carter/4m 12s/Connected · Sophia Park/Dallas Central/L. Nguyen/—/Pending · Devon Kim/Kansas City/A. Flores/2m 48s/Connected · Tasha Wells/Chicago North/J. Carter/0m 18s/Missed · Renee Ortiz/Phoenix West/L. Nguyen/6m 03s/Connected.

---

## Interactions & Behavior
- **Nav / buttons**: hover bg `#f4f6fb` (nav, filter), `#eef0f5` (icon buttons), 0.15s background/color transition. Active nav item = Overview.
- **Month selector**: clicking a month re-scopes all metrics on the page (wire to your data fetch by month). Selected month gets the accent fill.
- **Theme**: accent color is a single variable driving nav, logo, chart, gauge, donut-primary, and the emphasized revenue card. Make it a theme token.
- **Section toggles**: the Insight summary and the entire Salesforce section are independently show/hide-able (prototype exposes these as flags; implement as user/role/config preferences if useful, otherwise always-on).
- **Charts**: no animation required; a standard mount transition from your chart lib is fine.
- **Responsive**: this is a desktop ops dashboard (designed ~1440px). Below ~1100px, collapse the 4-up KPI grid to 2-up, the 2fr/1fr and 1fr/1.45fr rows to stacked, and the 5-up Salesforce grid to 2–3-up. Sidebar can collapse to icons under a breakpoint (not shown in mock).

## State Management
- `selectedMonth` (default "Jun") → drives all metric queries.
- Metric payloads per month: call totals (total/billable/connected/missed/non-billable/disputes), connect rate + target, bookings funnel (bookings/completed/pending/canceled/revenue), market connect-rates list, recent leads list, attribution counts.
- `showInsightSummary`, `showSalesforce` (booleans) for the two toggle-able sections.
- `accentTheme` token.
- Data fetching: replace the static numbers with your call-system + Salesforce sources (the prototype mirrors the current Overview's Jun 2026 figures).

## Design Tokens (summary)
- **Colors**: see table above.
- **Radius**: 6, 8, 10–13 (chips/mini-cards), 16 (cards), 50% (avatars).
- **Spacing**: 12 / 16 / 20 / 22 / 24 / 26 / 28 px.
- **Shadows**: card `0 1px 2px rgba(16,24,40,.04)`; accent glow on logo/active month `0 4–6px 10–16px -3/-6px var(--accent)`.
- **Type scale**: 11 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 / 15 / 17 / 21 / 25 / 27 / 28 / 32 / 38 px.

## Assets
- **Icons**: line icons matching the Lucide set (grid, calendar, users, phone, map-pin, alert-triangle, plus-circle, upload, settings, log-out, search, bell, activity, briefcase, dollar-sign, calendar-check, clock, x-circle, sliders, chevron-right, info). Use your existing icon library.
- **Logo**: simple geometric mark — rounded accent square with three ascending white bars. Recreate with CSS/SVG or your brand asset.
- **Font**: Outfit (Google Fonts). Substitute your product font if you have one.
- **Avatars**: colored initials (no image assets).
- No raster images required.

## Files
- `LSA Operations.dc.html` — the high-fidelity design reference (open in a browser to see the live layout, charts, and hover states). Use it as the visual source of truth alongside this README.
