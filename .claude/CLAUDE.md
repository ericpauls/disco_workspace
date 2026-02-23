# DiSCO Workspace

Two related tools for DiSCO data simulation (server) and visualization (client).

## Quick Start

```bash
./start.sh  # Starts both server (8765) and client (3000)
```

## Critical Rules

1. **NEVER commit or push without explicit user permission** - Always wait for "commit" or "push" command
2. **Visual Testing is MANDATORY** for UI changes - TypeScript compilation is not enough
3. **Git submodules** - Always use full paths: `cd /full/path/to/submodule && git command`
   - **After `git pull` or `git checkout <branch>`**, ALWAYS run `git submodule update --init --recursive` from the workspace root to sync submodules to the commit the parent repo expects. Skipping this leaves stale/wrong code in submodule directories.
4. **Pre-commit gate** - When user says "commit" or "push", FIRST check if completion-checklist has run this session. If not, invoke it before committing.
5. **Browser screenshots** - Always resize Chrome to 900x600 before taking screenshots. Never use fullscreen.
6. **NEVER invent API endpoints** - See "API Realism Rule" below. Every endpoint on the surrogate server and every API call from the emulator/client MUST correspond to a real DiSCO API endpoint documented in the JavaScript client reference.
   ```bash
   osascript -e 'tell application "Google Chrome" to set bounds of front window to {100, 100, 1000, 700}'
   ```

## Pre-Commit Gate (ENFORCED)

**When the user says "commit" or "push", you MUST verify before proceeding:**

1. Has the `completion-checklist` agent been invoked this session for these changes?
   - **YES**: Proceed with commit
   - **NO**: Invoke `completion-checklist` FIRST, then commit after it passes

2. Did the completion-checklist report any required documentation updates?
   - **YES, and they were addressed**: Proceed with commit
   - **YES, but NOT addressed**: Do NOT commit. Fix documentation first.
   - **NO updates needed**: Proceed with commit

**This is a hard gate. Never skip it.**

Example:
```
User: "commit"
Assistant: [Checks: Was completion-checklist run? No.]
Assistant: "Let me run the completion checklist first to verify everything is ready."
[Invokes completion-checklist]
[If passes, then commits]
```

## Git Submodule Commit/Push Workflow (CRITICAL)

**This workspace uses git submodules.** When committing changes, you MUST commit/push in BOTH places:

### Step 1: Commit/push in the submodule first
```bash
cd /Users/ericpauls/Documents/disco_workspace/disco_live_world_client_ui
git add <files>
git commit -m "message"
git push
```

### Step 2: Commit/push the submodule reference in the parent repo
```bash
cd /Users/ericpauls/Documents/disco_workspace
git add disco_live_world_client_ui  # This stages the new submodule commit reference
git add <any other changed files like start.sh>
git commit -m "feat: Update submodule with <description>"
git push
```

**Why this matters:** The parent repo (`disco_workspace`) tracks which commit the submodule should be at. If you only push the submodule, other machines pulling the parent repo won't see the changes until the parent repo is also updated.

**How to verify:** After pushing, run `git status` in the parent directory. If it shows `modified: disco_live_world_client_ui (new commits)`, you forgot to commit/push the parent repo.

## Custom Agents (IMPORTANT)

**ALWAYS delegate to these specialized agents when questions match their domain:**

| Topic | Agent | When to Use |
|-------|-------|-------------|
| Data architecture | `disco-architecture` | Questions about UUIDs, schemas, data flows, API contracts, database tables |
| Development practices | `dev-practices` | Questions about testing methodology, git workflows, visual testing details |
| **Completion check** | **`completion-checklist`** | **AFTER implementing changes, BEFORE committing (handles testing + docs)** |

**How to invoke**: Use the Task tool with `subagent_type: "disco-architecture"`, `subagent_type: "dev-practices"`, or `subagent_type: "completion-checklist"`

**CRITICAL**: Do NOT read documentation files directly when an agent covers that domain - always delegate to the agent first.

## Completion Workflow (CRITICAL)

**ALWAYS invoke the `completion-checklist` agent AFTER implementing changes, BEFORE committing.**

This agent handles BOTH testing AND documentation verification in one invocation.

### When to Invoke

After implementing ANY feature, fix, or change - but BEFORE the user says "commit":

1. Finish implementing the feature/fix
2. **IMMEDIATELY invoke completion-checklist agent** (do not ask - just do it)
3. Wait for its report on testing AND documentation
4. Fix any issues the agent identifies
5. Only THEN is the work ready for commit

### How to Invoke

```
Task tool with subagent_type: "completion-checklist"
```

### What the Agent Does

1. **Visual Testing**: Runs the full verification workflow (screenshots, inspection)
2. **Documentation Check**: Based on which FILES changed, checks if specific docs need updating

The agent uses **deterministic file-path triggers** - no semantic analysis required:

| Changed Path | Documentation to Check |
|--------------|----------------------|
| `disco_data_emulator/server.ts` | `disco-data-architecture.md` API section |
| `disco_data_emulator/types/*.ts` | `disco-data-architecture.md` schemas + ERD diagram |
| `disco_data_emulator/simulation/**` | System architecture diagrams |
| `disco_live_world_client_ui/src/**` | C4 client component diagrams |

### Example Workflow

```
User: "Add a new API endpoint for entity batching"
Assistant: [implements the endpoint in server.ts]
Assistant: "I've implemented the batch endpoint. Let me run the completion checklist."
[Invokes completion-checklist - NO ASKING, just invoke]
Agent Report: "Tests PASS. Documentation needs update: disco-data-architecture.md Section 10"
Assistant: [Updates documentation]
Assistant: "Implementation complete and verified. Ready for commit when you are."
User: "commit"
Assistant: [commits]
```

**Key point**: Do NOT ask "should I run the completion checklist?" - just invoke it automatically after implementation.

## Active Development Branch

**Current branch:** `main`

All database realism work has been merged to main.

## Project Structure

| Project | Port | Tech | Start |
|---------|------|------|-------|
| disco_data_emulator (Server) | 8766 | Flask + Python | `cd disco_data_emulator && ./start.sh` |
| disco_live_world_client_ui (Client) | 3000 | React 19 + Vite | `cd disco_live_world_client_ui && npm run dev` |

## Cross-Project Changes

When making changes affecting both projects:

1. Plan the API contract
2. Update server (disco_data_emulator)
3. Update client (disco_live_world_client_ui)
4. Test end-to-end
5. **Wait for user to say "commit" or "push"** - never commit/push automatically

## After Completing Features/Fixes

**ALWAYS invoke the completion-checklist agent after development work:**

1. Finish implementing the feature/fix
2. **IMMEDIATELY invoke the completion-checklist agent** (handles testing + docs)
3. Do not claim the work is "complete" until the checklist passes

Use: `Task tool with subagent_type: "completion-checklist"`

Example: "I've completed the implementation. Let me run the completion checklist."

**Note**: The completion-checklist agent replaces separate testing invocations - it handles everything.

## Documentation Archive

Detailed docs in `.claude/archive/`:

- `disco-data-architecture.md` - Complete data architecture (UUIDs, tables, data flows)
- `entity-reporting-implementation-plan.md` - Implementation plan and status
- `claude_code_web_dev_workflow.md` - Visual testing workflow details
- `disco-overview.md` - Product context
- `known-issues.md` - Known bugs/limitations
- `client-roadmap.md` - Development roadmap

Architecture diagrams in `docs/`:

- `c4-architecture-diagram.md` - C4 model (context, container, component, deployment)
- `data-architecture-erd.md` - Entity relationship diagram with UUID system
- `system-architecture-diagram.md` - System flowchart and data flows

## Subproject Docs

- `disco_data_emulator/CLAUDE.md` - Server-specific guidance
- `disco_live_world_client_ui/CLAUDE.md` - Client-specific guidance

## API & Schema Reference (AUTHORITATIVE)

**The JavaScript client is the canonical source of truth for API schemas and table fields.**

When asked about data models, table schemas, or "all fields" questions:
1. Check `disco_live_world_client_ui/javascript-client/docs/` FIRST (API documentation)
2. Check `disco_live_world_client_ui/javascript-client/src/model/` for model definitions
3. Compare with TypeScript types (which may be incomplete or in development)

**Do NOT rely solely on TypeScript types in the emulator or client** - always verify against the JavaScript client reference.

## API Realism Rule (CRITICAL — HARD GATE)

**The entire purpose of this project is to build apps compatible with the real DiSCO system.** Every API interaction must be grounded in the real DiSCO API as documented in the JavaScript client reference.

### NEVER invent API endpoints

Before implementing ANY API endpoint on the surrogate server or ANY outbound API call from the emulator/client:

1. **Verify the endpoint exists** in `disco_live_world_client_ui/javascript-client/docs/` (the *Api.md files)
2. **Verify the request/response format** matches the JavaScript client models in `javascript-client/src/model/`
3. **Verify query parameter names** match (real DiSCO uses snake_case on the wire: `from_time`, `max_count`, `from_write_time`, etc.)

### NEVER deviate from canonical field names

All data model field names in entity reports, position reports, and other API objects **MUST exactly match** the canonical JavaScript client reference (`javascript-client/src/model/`). This applies to:

- **Type definitions** (TypeScript interfaces, Python TypedDicts)
- **Database columns** (surrogate server SQLite schema)
- **Report construction** (emulator building reports)
- **API responses** (surrogate server returning data)
- **Client consumption** (UI parsing responses)

**Common mistakes to avoid:**
- `modulation` → MUST be `modulation_type` (matches `ModulationType` in canonical API)
- `created_timestamp` → MUST be `write_timestamp` (every canonical DiSCO response uses `write_timestamp`)

**Exception:** Emulator-internal fields not part of any DiSCO API (e.g., endpoint `created_timestamp` for internal state tracking) are fine — these never cross the API boundary.

### What this means in practice

- **Surrogate server** (`disco_surrogate_server`): Only implement endpoints that exist in the real DiSCO API. The surrogate is a local mock of the real server — it must be API-compatible. Administrative endpoints for the surrogate itself (health, metrics, clearStores) are fine, but data API endpoints must match real DiSCO.
- **Emulator** (`disco_data_emulator`): Only make outbound HTTP calls to endpoints that exist in the real DiSCO API. The emulator can be pointed at either the surrogate or a real DiSCO server, so it must use real API paths. **All report fields sent over the wire must use canonical DiSCO field names.**
- **Client UI** (`disco_live_world_client_ui`): Only call endpoints that exist in the real DiSCO API. **All type definitions for API objects must use canonical field names so the client could work with a real DiSCO server.**

### If you need functionality that DiSCO doesn't provide

- **Preferred**: implement the logic client-side, or flag it as a known limitation
- **If a prototype endpoint would provide significant value**: see the Prototype Endpoint Rule below
- Example: DiSCO has no "getDelta" or "batch live world update" endpoint — these must not be added to canonical surrogate server paths

### Reference paths

- API docs: `disco_live_world_client_ui/javascript-client/docs/*Api.md`
- Models: `disco_live_world_client_ui/javascript-client/src/model/`
- Real DiSCO base path: `/api/v1/` (both real DiSCO and surrogate use this path)

## Prototype Endpoint Rule (NON-CANONICAL EXTENSIONS)

Prototype endpoints are experimental features that extend beyond the canonical DiSCO API. They are allowed ONLY under these strict conditions:

### Canonical-First Principle (HARD GATE)

- ALWAYS try to solve the problem using canonical DiSCO API endpoints first
- Only consider a prototype endpoint when canonical approaches have significant, quantifiable drawbacks (e.g., "this requires N+1 polling loops and adds 5 seconds of latency" or "this data simply does not exist in any canonical endpoint")
- Claude Code MUST NEVER independently create prototype endpoints. If a prototype seems useful, Claude MUST:
  1. **Stop and warn the user** with prominent, up-front text before proceeding
  2. **Explain why** canonical approaches are insufficient (with specifics)
  3. **Propose the prototype** as a suggestion for the user to approve or reject
  4. **Wait for explicit approval** before implementing

**Example warning format:**
> **WARNING: This plan introduces a non-canonical API endpoint.**
> Proposed: `POST /api/v1/prototype/entityObservationContext/getLatest`
> Reason: The canonical entity report response does not include line-of-bearing from the reporting sensor. Computing this client-side would require joining entity reports with position reports on every poll cycle, adding ~2s latency at 1000+ entities. There is no canonical endpoint that provides this data.
> **This endpoint would need to be proposed to the DiSCO development team for inclusion in the official API.**

### NEVER Modify Canonical Endpoints

- NEVER add fields to canonical endpoint responses
- NEVER add query parameters to canonical endpoints
- NEVER change the behavior, types, or structure of any canonical endpoint
- Adding "optional" fields to canonical responses is FORBIDDEN — it creates silent incompatibility when the same client code is pointed at a real DiSCO server where those fields are absent
- If you need data not in a canonical response, create a **companion prototype endpoint** that returns the supplementary data keyed by canonical UUIDs
- Document the companion endpoint as a proposal for the DiSCO team to merge the fields into the canonical endpoint in a future API version

**Example — correct approach for adding line-of-bearing to entity reports:**
- WRONG: Add `observation_bearing_deg` field to `/api/v1/entities/getLatest` response
- RIGHT: Create `/api/v1/prototype/entityObservationContext/getLatest` that returns `{ entity_msg_uuid, observation_bearing_deg, observation_distance_km }` as supplementary data. Client fetches canonical entity reports normally, then optionally enriches with prototype data if the capability is available.

### URL Namespace

- ALL prototype endpoints MUST use the prefix: `/api/v1/prototype/`
- NEVER add prototype functionality to canonical endpoint paths
- Example: `/api/v1/prototype/fusionPipeline/trigger` — OK
- Example: `/api/v1/entities/myCustomFilter` — FORBIDDEN

### Capability Registry

- Every prototype feature MUST be registered in `disco_surrogate_server/prototype/capabilities.ts`
- The capability key, description, and endpoint list must be kept up to date
- The surrogate server advertises capabilities via the `prototype_capabilities` field in `/api/v1/health`

### Graceful Degradation (HARD GATE)

- ALL components (client UI, emulator, dashboard) MUST check for prototype capability before using any prototype endpoint
- Client: use `hasCapability(key)` from `ServerCapabilitiesContext`
- Emulator: use `_has_capability(key)` after `_probe_capabilities()`
- If capability is absent, the feature MUST be silently disabled — no errors, no crashes
- This ensures all components work correctly against a real DiSCO server

### Code Marking (MANDATORY)

Every file implementing prototype functionality MUST include:

**TypeScript/JavaScript:**
```
// ============================================================
// PROTOTYPE — NOT PART OF CANONICAL DiSCO API
// Capability key: "<capability_key>"
// Description: <what this prototype does>
// ============================================================
```

**Python:**
```
# ============================================================
# PROTOTYPE — NOT PART OF CANONICAL DiSCO API
# Capability key: "<capability_key>"
# Description: <what this prototype does>
# ============================================================
```

### File Organization

- **Surrogate server**: Prototype routes in `routes/prototype/` directory (NOT in `server.ts`)
- **Client UI**: Prototype API calls in `src/api/prototypeApi.ts` (NOT in `discoApi.ts`)
- **Client UI**: Prototype hooks in files named `usePrototype*.ts`
- **Client UI**: Prototype components gated with `hasCapability()` checks
- **Emulator**: Prototype submission code in separate methods prefixed with `_prototype_`

### Documentation

- Each prototype MUST be documented in `.claude/archive/disco-data-architecture.md` Section 11
- Documentation MUST clearly state: "PROTOTYPE — Not part of canonical DiSCO API"
- The prototype registry in `capabilities.ts` is the single source of truth for what prototypes exist
- Each prototype MUST include a "Proposed Upstream Change" note describing what the DiSCO team would need to change in the official API to make this prototype unnecessary

### Relationship to Canonical Rule

- The API Realism Rule (above) remains in FULL FORCE for all `/api/v1/` paths outside `/api/v1/prototype/`
- Canonical endpoints are NEVER modified to support prototype features — not their responses, not their query parameters, not their behavior
- Prototype data models MAY reference canonical UUIDs/fields but MUST NOT alter canonical table schemas
- Prototype features that prove valuable should be proposed upstream to the real DiSCO API team
