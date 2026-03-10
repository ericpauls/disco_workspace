# Client-Side Query Filtering — Questions & Concerns

## Context

Adding query filtering to the client UI so users can constrain what data is fetched from the server (time window, spatial bounds). Two entry points: (1) a "send to UI" button on the surrogate server dashboard that opens the client with a pre-configured query, and (2) a new FILTERS tab on the client UI's expandable panel with controls ported from the server dashboard's statistics views.

---

## Q1: Spatial filtering — getLatest vs. getByParams endpoints

The canonical DiSCO API supports spatial filtering via `getByParams` endpoints (NOT `getLatest`). The `getByParams` endpoints for entities, position reports, live world, fused summaries, etc. all accept canonical spatial bounds parameters: `latitudeMin`, `latitudeMax`, `longitudeMin`, `longitudeMax`.

The `getLatest` endpoints only support time-based parameters (`from_time`, `to_time`, `from_write_time`, `to_write_time`, `max_count`).

The client currently uses `getLatest` with cursor-based incremental polling (`from_write_time`). Switching to `getByParams` when spatial filters are active would enable server-side spatial filtering using canonical endpoints, but may require a different polling/pagination strategy.

**Question:** When the user activates spatial bounds on the FILTERS tab, should we:
- (A) **Switch to `getByParams` endpoints** — fully canonical, server-side spatial filtering, but need to adapt the polling logic (pagination, time cursors) to work with `getByParams`
- (B) **Stay on `getLatest` and filter spatially client-side** — simpler polling logic stays unchanged, but doesn't save bandwidth
- (C) **Hybrid** — use `getByParams` for initial historical load (with spatial bounds), then switch to `getLatest` + client-side filtering for live updates
- (D) **User's choice** — default to (A) but allow fallback to (B) if `getByParams` behaves differently than expected

**Answer: (A) with smart endpoint selection.** After reviewing the canonical API, `getByParams` and `getLatest` both return the same result types (`EntityResults`, `PositionReportsResults`, `LiveWorldModelResults`) and both support the same time/cursor parameters (`from_write_time`, `to_write_time`, `from_time`, `to_time`, `max_count`, `pagetoken`). The only difference is `getByParams` additionally accepts spatial bounds (`latitudeMin/Max`, `longitudeMin/Max`).

This means the existing cursor-based polling logic (advance `from_write_time` cursor, drain in batches) works identically on both endpoints — no separate "latest tracking" needed. The implementation will dynamically select the endpoint **and polling behavior** based on active filters:

| Scenario | Endpoint | Polling Behavior |
|----------|----------|-----------------|
| **No filters** (current default) | `getLatest` | Continuous cursor polling |
| **Time window extends to "now"** (live tail with time filter) | `getLatest` | Continuous cursor polling with `from_time` bound |
| **Time window fully historical** (no spatial) | `getByParams` | One-time paginated drain, then stop |
| **Time window fully historical + spatial bounds** | `getByParams` | One-time paginated drain with lat/lon bounds, then stop |
| **Time extends to "now" + spatial bounds** | `getByParams` | Continuous cursor polling with lat/lon bounds |

Key insight: `getLatest` is only used for unfiltered or live-tail-only cases. Whenever the query is fully historical (time window in the past), we use `getByParams` even without spatial filters — it's the general-purpose query endpoint, and we drain once then stop polling. Spatial bounds are only sent when the user has explicitly selected a spatial area.

---

## Q2: Dashboard "send to UI" — transport mechanism

The current dashboard-to-client communication uses a **Vite dev server plugin** with polling endpoints (`/api/client-config`, `/api/client-stats/clear`, etc.). This only works in dev mode — it won't work in a production build.

**Question:** For the "send query to UI" button on the dashboard, should we:
- (A) Extend the existing Vite plugin polling pattern (add `/api/client-query-filter/pending`) — quick to implement but dev-only
- (B) Use **URL query parameters** to open a new client tab with pre-set filters (e.g., `http://localhost:3000?from_time=X&to_time=Y&minLat=A&...`) — works in production but requires adding URL param parsing to the client
- (C) Both — URL params for the initial launch, polling for subsequent updates
- (D) Something else entirely

---

I changed my mind, let's not worry about adding this handoff feature to the surrogate server. We can just do everything in the client UI, and we can still observe server statistics on the server.

## Q3: FILTERS tab layout — where does the heatmap go?

The server dashboard renders its H3 hexagon heatmap in a **dedicated 280px-tall map container** within the statistics panel. The client UI already has a full-screen Leaflet map.

**Question:** When the FILTERS tab is open and showing aggregate statistics:
- (A) Render the hexagon heatmap **on the existing Leaflet map** (overlay H3 cells onto the main map, which makes sense since the user can already see the spatial context)
- (B) Render a **separate mini-map** inside the FILTERS tab (like the server dashboard does) — duplicates the map but keeps the tab self-contained
- (C) Render on the main map AND add a spatial selection tool (shift+drag rectangle or polygon draw) on the main map

Related: when you say "hide all existing icons" — does this mean remove entity/position report markers from the map while viewing the heatmap overlay, so the map only shows the aggregate H3 hexagon density?

Your interpretation is correct. Option A. While the FILTERS tab is open, we should hide all the icons on the map and instead show the spatial selection and heatmap hexagons, using the same map we already use. The user should be able to see what area (if any) is currently selected as the spatial filter. 

---

## Q4: Tab dimensions — 900x600 viewport constraint

The current DATA panel has a default width of **480px** (minimum 620px for table columns). On a 900px-wide window, 1/3 is 300px and the current minimum is 620px (which is already 69% of 900px).

The server dashboard's timeline controls need ~280px minimum width for the D3 histogram to be usable (snap buttons + chart + margins). The precise date/time/coordinate entry boxes you want revealed on wider expansion would need more.

**Question:** For the FILTERS tab specifically:
- Should it have a **smaller default width** than the DATA tab (e.g., 300-350px for just the timeline sliders and buttons)?
- Should the "Reset" and "Apply Filters" buttons be stacked vertically or side-by-side?
- For the 900x600 constraint, do you want the timeline histogram tiers to be shorter than the server dashboard's 60px each, or is that height fine?
- How many timeline tiers should be visible by default (the server dashboard starts with 2)?


The default width should be the same as the existing DATA tab when the user clicks to expand. Within the default width it sounds like you have plenty of horizontal pixels to show the timeline+edge buttons graphics. It's ok to make the histogram tiers shorter to fit things vertically more easily. You can put the buttons beneath the timelines. Start with 2 timeline tiers visible. Adding more extends the height of the information in that tab, so we will need a vertical scroll feature inside the tab.
---

## Q5: Time dimension — observation time vs. write time

The canonical API has two time dimensions:
- **Observation time** (`from_time` / `to_time`) — when the event was observed in the real world
- **Write time** (`from_write_time` / `to_write_time`) — when the record was written to the database

The server dashboard's timeline histograms bin by `latest_timestamp` (which corresponds to write time). The polling hooks currently use `from_write_time` for cursor-based incremental fetching.

**Question:** When the user selects a time window on the FILTERS tab, should it filter on:
- (A) **Observation time** (`from_time`/`to_time`) — "show me what happened between 10:00 and 10:30"
- (B) **Write time** (`from_write_time`/`to_write_time`) — "show me what was recorded between 10:00 and 10:30"
- (C) **Let the user choose** which time dimension to filter on (adds complexity but maximum flexibility)
- (D) Default to observation time for the user-facing filter, but still use write_time internally for incremental polling cursor


B, write time. 

---

## Q6: Live updates with active time/space filters

If the user sets a historical time window (say 10:00–10:30 on a past date), the current polling logic uses `from_write_time` as a cursor to incrementally drain new data.

**Question:** When query filters are active:
- (A) **Stop live polling entirely** — treat filtered queries as historical snapshots
- (B) **Continue polling** but only accept records that fall within the filter window — useful if data is still being written for the selected time range (e.g., late-arriving data)
- (C) **Hybrid** — if the time window extends to "now" (right edge snapped to live), keep polling; if it's fully historical, stop polling
- (D) Something else

This affects the fundamental polling architecture — the current `from_write_time` cursor approach would need modification.

Remember that setting new query filters should immediately delete all data in memory on the client app. Selecting a historical period without the "onward" option selected via the query timeline selection tools is a historical snapshot, so there is no need to query new data. If the "onward" option is selected (right arrow on the timeline tool) then we keep querying, see Q1 for how to set up those queries using either get by params or get latest.

---

## Q7: FILTERS tab as a second expandable tab — independent or replacing DATA?

**Question:** Is the FILTERS tab:
- (A) A **second tab within** the existing expandable panel (alongside LIVE WORLD, ENTITY REPORTS, POSITION REPORTS) — user clicks FILTERS tab to see filter controls instead of data tables
- (B) A **separate pop-out** on the opposite side of the screen or different location
- (C) An **additional panel** that can be open simultaneously with the DATA panel
- (D) A tab that **replaces** the DATA tab content when open, and toggling back to any data tab restores normal view

Note: The user said "Add a second pop-out tab called FILTERS" which suggests (A) — it's another tab in the same panel system. Please confirm.

D, the FILTERS tab should sit above the existing DATA tab using the exact same styling (may need to move DATA down a little to make it fit). Opening one of those tabs should close the other so only one can be open at the same time. They are completely independent menus. Changing the horizontal size of one by dragging should not change the horizontal size of the other.

---

## Q8: Statistics endpoint fallback — controls without data

When connected to a server without the `data_statistics` prototype capability, the FILTERS tab should show "time/space controls with no aggregate data available."

**Question:**
- Should the timeline histogram area show **empty histogram bars** (axes visible, no data), or a **message** like "Statistics not available — connect to a surrogate server for data previews"?
- Should the heatmap area (if on the main map) show nothing, or show the spatial selection tool without hexagons?
- Should the time range sliders still be functional (user drags them to set from/to times manually) even without histogram data?
- When stats are unavailable, should the "set filters" button still work (applying time/space constraints to canonical `from_time`/`to_time` params)?

show "statistics not available - requires enhanced API"
heatmap should still show the selection tool, just with no hexagons. Time range sliders should still be functional. "set filters" should still work. 

---

## Q9: Data clearing UX — warning dialog design

When the user has data in memory and presses "Apply Filters," you want a warning.

**Question:**
- Should this be a **modal dialog** (blocks interaction until dismissed), a **toast/snackbar** with undo, or an **inline confirmation** within the FILTERS tab?
- Should it show **how much data** will be cleared (e.g., "This will clear 45,000 entity reports and 12,000 position reports from memory")?
- Should there be an option to **keep existing data** and only add the filter going forward (additive mode), or is clearing always required when changing query filters?

I like your idea of having an option to keep existing data, so let's have 3 buttons total: reset to default (no time/space filters, clears all data in UI memory), set and clear, and set without clear.

---

## Q10: Component reuse strategy — porting from server dashboard

The server dashboard's statistics components (`TimelineHistogram.tsx`, `HeatmapView.tsx`, `DataTypeSelector.tsx`, `StatisticsPanel.tsx`) are tightly coupled to:
- Server dashboard hooks (`useStatisticsOverview`, `useTimelineData`, `useHeatmapData`)
- Server dashboard contexts (`DashboardCapabilitiesContext`)
- Dashboard-specific CSS (`theme.css`)
- D3.js for rendering (not currently a client UI dependency)

**Question / Concern:** My plan would be to:
1. Add D3.js as a client UI dependency
2. Copy the component files into the client UI's `src/components/` directory
3. Adapt hooks to call the surrogate server's prototype statistics endpoints from the client (same endpoints, different base URL)
4. Adapt styling to match the client UI's existing theme
5. Wire up the selection state to drive query parameter changes

Is this the right approach, or would you prefer a different strategy (e.g., shared package, iframe embedding, building simpler controls from scratch)?

That approach sounds good to me, I want the functionality and appearance to match exactly. You shouldn't need to build anything new, unless there are some specific workarounds to get this working inside the collapsible tab. 


One additional note is the FILTERS tab might eventually have two different sub-sections: this current server queries filtering and another section for client-side filtering. These would be 2 different "pages" inside this same collapsible FILTERS tab the user can switch between. We don't need to implement this yet, but it might have some bearing on your architectural decisions. 