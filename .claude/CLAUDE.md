# DiSCO Workspace

Two related tools for DiSCO data simulation and visualization.

## Active Development Branch

**Current feature branch:** `add_endpoints_and_entities`

This branch adds endpoint-based entity reporting with realistic measurement simulation. If you cloned without this branch, switch to it to get the latest work:

```bash
# Fresh clone with all submodules
git clone --recurse-submodules https://github.com/ericpauls/disco_workspace.git
cd disco_workspace

# Checkout the feature branch
git checkout add_endpoints_and_entities

# Update submodules to match workspace branch
git submodule update --init --recursive

# Checkout matching branches in submodules
cd disco_data_emulator && git checkout add_endpoint_entity_reporting
cd ../disco_live_world_client_ui && git checkout add_endpoint_entity_reporting
cd ..

# Install dependencies
cd disco_data_emulator && npm install
cd ../disco_live_world_client_ui && npm install
cd ..

# Start both servers
./start.sh
```

**Key documentation for this feature:**
- `disco-data-architecture.md` - Complete data architecture and UUID system
- `entity-reporting-implementation-plan.md` - Implementation plan and status

## Projects

### disco_data_emulator (Server)
Mock DiSCO server generating simulated entity data.
- **Port:** 8765
- **Tech:** Express.js + TypeScript
- **Start:** `cd disco_data_emulator && npm start`
- **Docs:** See `disco_data_emulator/CLAUDE.md`

### disco_live_world_client_ui (Client)
React UI visualizing entity data on maps and tables.
- **Port:** 3000
- **Tech:** React 19 + Vite + TypeScript
- **Start:** `cd disco_live_world_client_ui && npm run dev`
- **Docs:** See `disco_live_world_client_ui/CLAUDE.md`

## Running Both Together

The easiest way is to use the unified start script from the workspace root:

```bash
./start.sh
```

Or run them separately in two terminals:

```bash
# Terminal 1 - Start server
cd disco_data_emulator && npm start

# Terminal 2 - Start client
cd disco_live_world_client_ui && npm run dev
```

Client connects to server at http://localhost:8765

## Cross-Project Changes

When making changes affecting both projects (e.g., new API endpoint):

1. **Plan the API contract** - Define request/response shape
2. **Update server** - Add endpoint in disco_data_emulator
3. **Update client** - Consume endpoint in disco_live_world_client_ui
4. **Test end-to-end** - Run both and verify integration
5. **Commit both** - Coordinate commits in both repos

## Git Operations (Submodules)

This workspace uses git submodules. Each project has its own git repo.

**IMPORTANT:** Always use full paths when running git commands:

```bash
# Correct - explicit directory
cd /Users/ericpauls/Documents/DiSCO_combined_client_server/disco_data_emulator && git status

# Wrong - assumes current directory
git status
```

Each Bash command starts fresh - directory state doesn't persist between calls. Always combine `cd` with the git command in a single call.

## Shared Documentation

See sibling files in this `.claude/` directory:
- `disco-data-architecture.md` - **Complete data architecture reference** (UUIDs, data flow, fusion pipeline)
- `entity-reporting-implementation-plan.md` - **Entity reporting implementation plan and status**
- `schemas.md` - Entity data models
- `api-reference.md` - DiSCO API endpoints
- `disco-overview.md` - Product context
- `known-issues.md` - Known bugs/limitations
- `client-roadmap.md` - Development roadmap
- `source-notes.md` - Raw notes and reference material
- `claude_code_web_dev_workflow.md` - Development workflow guidelines
