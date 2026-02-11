# DiSCO Client Application Roadmap

> **IMPORTANT**: This roadmap is for the **Live World Viewer client application** only.
> It is NOT the same as `.claude/roadmap.md`, which covers DiSCO product development
> (services, algorithms, edge RF sensors, autonomy, etc.).
>
> This file tracks development priorities for this specific React/Express client UI project.

---

## CLAUDE CODE: MANDATORY VALIDATION

**Every change MUST be validated before completion. No exceptions.**

### Required Steps After Any Code Change:
1. **Run `./start.sh`** to start both server and client
2. **Verify server data**: `curl http://localhost:8765/api/v1/liveWorldModel/getLatest | jq .`
3. **Take a screenshot** of the running app at http://localhost:3000
4. **Visually inspect** the screenshot - confirm UI renders correctly
5. **Verify entities** appear on map and in table with correct data
6. **Check console** for any errors or warnings
7. **Fix issues** before reporting completion to user

### What "Done" Means:
- App is running and verified working
- Screenshot taken and inspected
- Data confirmed correct via API inspection
- No console errors
- User can immediately use the feature

### What "Done" Does NOT Mean:
- "This should work"
- "Try running it"
- "The code looks correct"
- Untested assumptions

---

## Overview

The Live World Viewer is a client application for visualizing and interacting with DiSCO's
Live World Model. It displays entity data (radars, jammers, platforms) on an interactive map
with a synchronized data table.

---

## Phase 1: Dynamic Entity Simulation (Current Priority)

**Goal**: Replace hard-coded mock data with a procedural entity generator that creates
realistic, moving entities for development and testing.

### Requirements
- [ ] Create a dynamic entity generator in the mock server
- [ ] Generate simulated friend and foe entities across multiple domains:
  - **Air**: Fighter aircraft, bombers, UAVs, helicopters, tankers
  - **Maritime**: Surface combatants, submarines (surfaced), cargo vessels, patrol boats
  - **Land**: SAM sites, radar installations, ground vehicles, C2 nodes
- [ ] Implement realistic movement patterns:
  - Aircraft: Flight paths with speed/altitude changes, patrol patterns, ingress/egress routes
  - Ships: Shipping lanes, patrol patterns, convoy formations
  - Land: Stationary or slow-moving ground units, repositioning SAM sites
- [ ] Entity attributes should include:
  - Unique ID, name/designation
  - Position (lat/lon), heading, speed, altitude (where applicable)
  - Entity type, platform type, emitter type
  - Affiliation (friend/foe/neutral/unknown)
  - Last update timestamp
  - Signal characteristics (frequency, mode, etc.)
- [ ] Real-time updates: Entities should update position every 1-5 seconds
- [ ] Configurable scenario scale (10s to 100s of entities)
- [ ] Scenario should be geographically coherent (e.g., contested maritime region, air defense zone)

### Suggested Scenario
A contested maritime/littoral environment with:
- Blue force carrier strike group with air wing
- Red force coastal defense (SAM sites, patrol boats, shore-based radars)
- Neutral commercial shipping traffic
- Multiple airborne assets on both sides

---

## Phase 2: Client UI Improvements

**Goal**: Enhance the client UI for better usability, filtering, and entity inspection.

### Filtering & Search
- [ ] Filter by affiliation (friend/foe/neutral/unknown)
- [ ] Filter by domain (air/maritime/land)
- [ ] Filter by entity type / platform type
- [ ] Text search by entity name/designation
- [ ] Spatial filtering (draw region on map to filter)
- [ ] Temporal filtering (show entities updated within last N minutes)

### Entity Inspection
- [x] Click-to-select entity on map or table (synchronized selection)
- [x] Detail panel/popup showing all entity attributes
- [x] Historical track visualization (show past positions as trail) - **IMPLEMENTED**
- [x] Entity-centric view (center/follow selected entity)

### Map Enhancements
- [ ] Distinct icons/markers for different entity types and affiliations
- [ ] Heading indicators on moving entities
- [ ] Uncertainty ellipses for position estimates
- [ ] Layer toggles (show/hide by category)
- [ ] Measurement tools (distance, bearing)

### Table Enhancements
- [ ] Sortable columns
- [ ] Column visibility toggles
- [ ] Row highlighting for selected entity
- [ ] Real-time update indicators (flash on change)
- [ ] Export to CSV/JSON

### UX Polish
- [ ] Responsive layout
- [ ] Dark mode support
- [ ] Keyboard shortcuts for common actions
- [ ] Status bar showing connection state, entity count, update rate

---

## Phase 3: Real DiSCO Server Integration

**Goal**: Connect to a live DiSCO server instance instead of the mock server.

### Requirements
- [ ] Configuration for DiSCO server URL and authentication
- [ ] Handle JWT token acquisition and refresh
- [ ] Graceful handling of connection loss/reconnection
- [ ] Support for DiSCO's actual entity API responses
- [ ] Validate client against real data structures and edge cases

### Testing
- [ ] Integration tests against staging DiSCO instance
- [ ] Performance testing with production-scale entity counts
- [ ] Error handling and edge case validation

---

## Phase 4: Closed-Loop Testing Infrastructure

**Goal**: Enable Claude Code to autonomously develop, test, and validate new features.

### Requirements
- [ ] Automated test suite for client components (Jest, React Testing Library)
- [ ] Automated test suite for server endpoints (supertest, Jest)
- [ ] End-to-end tests (Playwright or Cypress)
- [ ] Test commands that Claude Code can run to validate changes
- [ ] CI-friendly test scripts (exit codes, clear output)
- [ ] Snapshot tests for UI components
- [ ] Mock data fixtures for consistent testing

### Development Workflow
- [ ] `npm test` runs all tests with clear pass/fail output
- [ ] `npm run test:e2e` runs end-to-end browser tests
- [ ] `npm run lint` checks code style
- [ ] `npm run typecheck` validates TypeScript types
- [ ] Pre-commit hooks to catch issues early

### Claude Code Integration
- [ ] Document test commands in CLAUDE.md
- [ ] Ensure all tests can run headlessly
- [ ] Provide test fixtures and mock data generators
- [ ] Include example test patterns for new features

---

## Non-Goals (Out of Scope)

The following are **NOT** part of this client roadmap:
- DiSCO server/backend development
- RF sensor integration or edge device work
- Correlation/fusion algorithm development
- NCCT, TAK, or other system integrations (server-side)
- Python client library development (auto-generated)
- Production deployment infrastructure

For DiSCO product roadmap, see `.claude/roadmap.md`.

---

## Quick Reference

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Dynamic Entity Simulation | Complete |
| 2 | Client UI Improvements | In Progress |
| 3 | Real Server Integration | Blocked (awaiting server access) |
| 4 | Testing Infrastructure | Not Started |

---

## Implementation Notes

### Entity Trails (Historical Track Visualization)

**Implemented**: January 2026

**Files**:
- `client/src/hooks/useEntityHistory.js` - Core history tracking hook
- `client/src/App.jsx` - Integration and state management
- `client/src/components/MapView.jsx` - Polyline rendering

**How It Works**:

1. **History Tracking** (`useEntityHistory` hook):
   - Maintains a `Map<uuid, TrailState>` to track position history by entity UUID
   - On each poll (1 second), records new positions only if the entity moved > 0.0001 degrees (~11 meters)
   - Automatically prunes positions older than 1 hour (configurable via `retentionMs` parameter)
   - Maximum 3600 positions per entity (1 hour at 1-second polling)

2. **Data Structure**:
   ```javascript
   TrailState = {
     positions: [{lat, lng, ts}],  // Position history with timestamps
     lastSeen: number,              // Last poll timestamp (for orphan detection)
     disposition: string            // Cached for trail coloring
   }
   ```

3. **Rendering** (`MapView.jsx`):
   - Trails rendered as Leaflet `Polyline` components BEFORE markers (so trails appear behind icons)
   - Color matches entity disposition (red=hostile, green=friendly, cyan=neutral, yellow=unknown)
   - Orphaned entities (disappeared from poll for >5 seconds) show faded trails (opacity 0.3 vs 0.6)
   - Memoized `EntityTrail` component for performance

4. **Memory Efficiency**:
   - Movement threshold prevents storing redundant points for stationary entities
   - Old positions automatically pruned
   - Only stores minimal data: `{lat, lng, ts}` per position point

**Configuration Constants** (in `useEntityHistory.js`):
```javascript
ONE_HOUR_MS = 60 * 60 * 1000           // Trail retention period
MOVEMENT_THRESHOLD_DEG = 0.0001        // ~11 meters minimum movement
MAX_POSITIONS_PER_ENTITY = 3600        // Maximum points per trail
ORPHAN_GRACE_PERIOD_MS = 5000          // Time before marking entity as "orphaned"
```

**UI Indicator**: Trail count displayed in header status bar ("TRAILS: N")
