# DiSCO Workspace

Two related tools for DiSCO data simulation (server) and visualization (client).

## Quick Start

```bash
./start.sh  # Starts both server (8765) and client (3000)
```

## Project Notes & Context (CRITICAL)

**This project is worked on from multiple machines.** ALL notes, context, development history, and memory files MUST be saved in this workspace's `.claude/` directory (e.g., `.claude/geolocation-aoa.md`). NEVER save project-related notes to `~/.claude/` (the per-machine Claude Code memory directory) — other Claude Code instances on other machines won't be able to see them. The `.claude/` folder in this repo is the single source of truth for project knowledge.

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

### What this means in practice

- **Surrogate server** (`disco_surrogate_server`): Only implement endpoints that exist in the real DiSCO API. The surrogate is a local mock of the real server — it must be API-compatible. Administrative endpoints for the surrogate itself (health, metrics, clearStores) are fine, but data API endpoints must match real DiSCO.
- **Emulator** (`disco_data_emulator`): Only make outbound HTTP calls to endpoints that exist in the real DiSCO API. The emulator can be pointed at either the surrogate or a real DiSCO server, so it must use real API paths.
- **Client UI** (`disco_live_world_client_ui`): Only call endpoints that exist in the real DiSCO API.

### If you need functionality that DiSCO doesn't provide

- **Do NOT create a fake endpoint** that looks like a DiSCO API but isn't one
- Instead: implement the logic client-side, or flag it as a known limitation
- Example: DiSCO has no "getDelta" or "batch live world update" endpoint — these must not be added to the surrogate server

### Reference paths

- API docs: `disco_live_world_client_ui/javascript-client/docs/*Api.md`
- Models: `disco_live_world_client_ui/javascript-client/src/model/`
- Real DiSCO base path: `/api/v1/` (surrogate uses `/apidocs/` as local equivalent)
