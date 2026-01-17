# DiSCO Workspace

Two related tools for DiSCO data simulation and visualization.

## Projects

### disco_data_emulator (Server)
Mock DiSCO server generating simulated entity data.
- **Port:** 8765
- **Tech:** Express.js + TypeScript
- **Start:** `cd disco_data_emulator && npm start`
- **Docs:** See `disco_data_emulator/CLAUDE.md`

### disco_live_world_client_ui (Client)
React UI visualizing entity data on maps and tables.
- **Port:** 3765
- **Tech:** React 19 + Vite + TypeScript
- **Start:** `cd disco_live_world_client_ui && npm run dev`
- **Docs:** See `disco_live_world_client_ui/CLAUDE.md`

## Running Both Together

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

## Shared Documentation

See sibling files in this `.claude/` directory:
- `schemas.md` - Entity data models
- `api-reference.md` - DiSCO API endpoints
- `disco-overview.md` - Product context
- `known-issues.md` - Known bugs/limitations
- `client-roadmap.md` - Development roadmap
- `source-notes.md` - Raw notes and reference material
- `claude_code_web_dev_workflow.md` - Development workflow guidelines
