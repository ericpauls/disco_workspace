# Current Project Status

> **Last updated**: 2026-03-01
> **Branch**: `prototype_non_canonical_endpoints` (all submodules on same branch)

## What Was Just Completed

### FIFO Eviction Bug Fix (committed)
- All 4 repository classes had eviction that would fail at >32K excess rows (SQLite bind parameter limit)
- Fixed with boundary-based DELETE (`DELETE WHERE id <= ?` instead of `IN(?, ?, ...)`)
- Synthetic data generator bypass also fixed (explicit `evictIfNeeded()` calls post-generation)
- **Committed**: surrogate server commit `3ca5c67`

### Non-Canonical API Audit + Fixes (committed)
- Full audit of all 3 prototype capabilities across entire codebase
- 4 issues found and fixed:
  1. Emulator LOB field stripping on canonical fallback
  2. LOBLayerManager capability-gated in MapView
  3. Distance column default changed to false
  4. Dashboard now has `DashboardCapabilitiesContext` for capability probing
- **Committed**: all 3 submodules + parent repo

### Documentation Updates (NOT YET COMMITTED)
- 5 files modified with comprehensive documentation of:
  - FIFO eviction algorithm (new Section 9.4 in disco-data-architecture.md)
  - All 3 prototype specs with detailed sections (Sections 11.6, 11.7)
  - Graceful degradation pattern documented
  - Fixed stale `observationContext` → `entityReportLob` in diagrams
  - Updated C4, system architecture, ERD diagrams
  - Known issues entries for both fixes
- **Files**: `.claude/archive/disco-data-architecture.md`, `.claude/archive/known-issues.md`, `docs/c4-architecture-diagram.md`, `docs/data-architecture-erd.md`, `docs/system-architecture-diagram.md`

## Submodule State

All 3 submodules are pushed to `prototype_non_canonical_endpoints`:
- `disco_surrogate_server` — commit `3ca5c67`
- `disco_live_world_client_ui` — commit `9712572`
- `disco_data_emulator` — commit `1515908`
- Parent repo — commit `f7c9cad` (references above submodule commits)

## What Needs Doing Next

1. **Commit the documentation updates** in the parent repo (the 5 modified files above)
2. **Merge `prototype_non_canonical_endpoints` to `main`** when ready — all features are tested and working
3. Any future work the user requests

## Key Architecture Context

- 3 prototype capabilities: `entity_report_lob`, `live_world_batch_upsert`, `data_statistics`
- All registered in `disco_surrogate_server/prototype/capabilities.ts`
- Graceful degradation: all apps probe `/api/v1/health` for `prototype_capabilities`
- Dashboard UI is served from the surrogate server (port 8765, path `/dashboard`)
- Orchestration Dashboard is separate (port 8880, manages all services)

## Services & How to Start

```bash
./start.sh                    # Start everything (dashboard on 8880 manages the rest)
./start.sh --dashboard-only   # Just the dashboard, start services manually
```

Individual services:
- **Surrogate server**: `cd disco_surrogate_server && npm run dev` (port 8765)
- **Emulator**: `cd disco_data_emulator && source .venv/bin/activate && PYTHONUNBUFFERED=1 PYTHONPATH="." python3 -m endpoint_emulator.emulator_server` (port 8766)
- **Client UI**: `cd disco_live_world_client_ui && npm run dev` (port 3000)
