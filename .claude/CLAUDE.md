# DiSCO Workspace

Two related tools for DiSCO data simulation (server) and visualization (client).

## Quick Start

```bash
./start.sh  # Starts both server (8765) and client (3000)
```

## Critical Rules

1. **Visual Testing is MANDATORY** for UI changes - TypeScript compilation is not enough
2. **Git submodules** - Always use full paths: `cd /full/path/to/submodule && git command`

## Custom Agents (IMPORTANT)

**ALWAYS delegate to these specialized agents when questions match their domain:**

| Topic | Agent | Trigger keywords |
|-------|-------|------------------|
| Data architecture | `disco-architecture` | UUIDs, entity reporting, position reports, fusion, correlation, API endpoints, database tables |
| Development practices | `dev-practices` | Visual testing, screenshots, git submodules, cross-project changes, implementation plan |

**How to invoke**: Use the Task tool with `subagent_type: "disco-architecture"` or `subagent_type: "dev-practices"`

Do NOT read documentation files directly when an agent covers that domain - always delegate to the agent first.

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
5. Commit both repos

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

## API & Schema Reference

For detailed API endpoints and data schemas, see the auto-generated JavaScript client:
- `disco_live_world_client_ui/javascript-client/docs/` - API documentation
- `disco_live_world_client_ui/javascript-client/src/api/` - API client classes
- `disco_live_world_client_ui/javascript-client/src/model/` - Data model classes
