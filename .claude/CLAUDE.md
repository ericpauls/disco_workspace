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

## Custom Agents (IMPORTANT)

**ALWAYS delegate to these specialized agents when questions match their domain:**

| Topic | Agent | Trigger keywords |
|-------|-------|------------------|
| Data architecture | `disco-architecture` | UUIDs, entity reporting, position reports, fusion, correlation, API endpoints, database tables, **fields, schema, "all fields", "every field", data model** |
| Development practices | `dev-practices` | **Testing, verification, "run test(s)"**, visual testing, screenshots, git submodules, cross-project changes, implementation plan |

**How to invoke**: Use the Task tool with `subagent_type: "disco-architecture"` or `subagent_type: "dev-practices"`

**CRITICAL**: Do NOT read documentation files directly when an agent covers that domain - always delegate to the agent first. **ESPECIALLY for testing and verification requests** - these MUST be delegated to dev-practices.

## Testing and Verification (MANDATORY)

**CRITICAL: Always delegate testing to the dev-practices agent.**

When the user requests ANY of the following, you MUST invoke the dev-practices agent:
- Running tests or verification ("run a test", "test this", "verify it works", "full test")
- Testing the client, server, or application ("test the client", "test the server")
- Taking screenshots or visual inspection
- Checking if UI changes work correctly ("does it work?", "verify the UI")
- End-to-end testing of features
- Any validation or verification of functionality

**How to invoke**:
```
Task tool with subagent_type: "dev-practices"
```

**Never perform testing steps yourself** - the dev-practices agent has specialized workflows for visual testing.

After implementing ANY feature or fix, you should proactively suggest:
"Should I invoke the dev-practices agent to run the visual testing workflow?"

## Active Development Branch

**Current feature branch:** `add_endpoints_and_entities`

Adds endpoint-based entity reporting with realistic measurement simulation.

## Project Structure

| Project | Port | Tech | Start |
|---------|------|------|-------|
| disco_data_emulator (Server) | 8765 | Express + TypeScript | `cd disco_data_emulator && npm start` |
| disco_live_world_client_ui (Client) | 3000 | React 19 + Vite | `cd disco_live_world_client_ui && npm run dev` |

## Cross-Project Changes

When making changes affecting both projects:

1. Plan the API contract
2. Update server (disco_data_emulator)
3. Update client (disco_live_world_client_ui)
4. Test end-to-end
5. **Wait for user to say "commit" or "push"** - never commit/push automatically

## After Completing Features/Fixes

**ALWAYS run testing after development work:**

1. Finish implementing the feature/fix
2. **IMMEDIATELY invoke the dev-practices agent** to run the visual testing workflow
3. Do not claim the work is "complete" until testing passes

Use: `Task tool with subagent_type: "dev-practices"`

Example: "I've completed the implementation. Let me now invoke the dev-practices agent to verify it works."

## Documentation Archive

Detailed docs in `.claude/archive/`:

- `disco-data-architecture.md` - Complete data architecture (UUIDs, tables, data flows)
- `entity-reporting-implementation-plan.md` - Implementation plan and status
- `claude_code_web_dev_workflow.md` - Visual testing workflow details
- `disco-overview.md` - Product context
- `known-issues.md` - Known bugs/limitations
- `client-roadmap.md` - Development roadmap

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
