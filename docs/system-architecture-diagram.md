# DiSCO System Architecture Diagram

This diagram shows how the Orchestration Dashboard, Surrogate Server, Data Emulator, and Client UI work together.

## System Overview Flowchart

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '13px'}}}%%
flowchart LR
    subgraph emu["&nbsp;&nbsp;Data Emulator :8766&nbsp;&nbsp;"]
        sim["Simulation<br/>Engine"]
        truth[("Truth<br/>Data")]
        mm["Measurement<br/>Model"]
        subgraph eps["Endpoints"]
            ep1["LAND"]
            ep2["SEA"]
            ep3["AIR"]
        end
        sim --> truth
        truth --> mm
        mm -->|observe| eps
    end

    subgraph srv["&nbsp;&nbsp;Surrogate Server :8765&nbsp;&nbsp;"]
        ent[("entities")]
        pos[("positions")]
        lw[("liveWorld")]
        fm[("fusedMappings")]
        fs[("fusedSummaries")]
        stats["StatisticsEngine"]
        srvDash["Dashboard UI<br/>/dashboard"]
    end

    ui["&nbsp;&nbsp;Client :3000&nbsp;&nbsp;"]
    dash["&nbsp;&nbsp;Dashboard :8880&nbsp;&nbsp;"]

    eps -->|POST entity<br/>reports| ent
    eps -->|POST position<br/>reports| pos
    sim -->|POST/PUT<br/>live world| lw
    ent -.->|future:<br/>fusion app| fm
    fm -.->|correlation<br/>groups| fs
    fs -.->|fused state| lw
    lw -->|REST GET| ui
    dash -.->|manages<br/>processes| emu
    dash -.->|manages<br/>processes| srv
    dash -.->|manages<br/>processes| ui
    dash -->|polls stats,<br/>clear data,<br/>config override| ui

    classDef emuStyle fill:#fff3e0,stroke:#e65100
    classDef srvStyle fill:#e8f5e9,stroke:#2e7d32
    classDef uiStyle fill:#fce4ec,stroke:#c2185b
    classDef dashStyle fill:#f3e5f5,stroke:#7b1fa2

    class emu emuStyle
    class srv srvStyle
    class ui uiStyle
    class dash dashStyle
```

## Data Flow Summary

### Current Implementation (Solid Lines)

1. **Emulator → Server**: Entity reports and position reports are POSTed via HTTP (realistic path, same as real endpoints)
2. **Emulator → Server (Truth Sync)**: Live world truth data is pushed via POST (new records) / PUT (updates) using server-assigned UUIDs
3. **Server → Client**: Client polls REST endpoints for live world, entity reports, and position reports
4. **Dashboard → Client**: Dashboard polls client memory stats (estimated RAM, object counts) via Vite dev server plugin, can request data clears, and can override the client's server target (IP/port)

### Prototype Endpoints (Non-Canonical)

The surrogate server supports an optional `/api/v1/prototype/` namespace for experimental features not in the canonical DiSCO API. Components discover available prototypes via the `prototype_capabilities` field in `/api/v1/health`. When connected to a real DiSCO server (which lacks this field), all prototype features are silently disabled. See `.claude/CLAUDE.md` "Prototype Endpoint Rule" for the full policy.

**Active prototypes** (3 capabilities):
- `entity_report_lob` — Extended entity reports with LOB fields (sensor position + bearing) for LOB visualization
- `live_world_batch_upsert` — Batch upsert for live world entities (single POST vs N POST/PUTs)
- `data_statistics` — Temporal/spatial data statistics for dashboard visualization (read-only observer)

**Capability gating**: All three UI applications (Client UI, Dashboard UI, Emulator) probe `/api/v1/health` on startup and periodically re-probe every 60s. Each uses a `hasCapability(key)` pattern to conditionally enable prototype features. See `disco-data-architecture.md` Section 11.2 for details.

### Future Implementation (Dashed Lines)

1. **Entity Reports → Correlation → Summarization → Live World**: The fusion pipeline will correlate observations from multiple endpoints and produce fused positions

## Component Responsibilities

| Component | Responsibility | Port |
|-----------|---------------|------|
| **Orchestration Dashboard** | Process management, config file selection, service monitoring, client stats display | 8880 |
| **Surrogate Server** | API serving, data stores (entities, positions, fused mappings, fused summaries, live world) | 8765 |
| **Data Emulator** | JSON config loading, simulation engine, endpoint generation, report submission | 8766 |
| **Client UI** | Visualization, user interaction, memory stats estimation, data clear | 3000 |

## Communication Patterns

```mermaid
sequenceDiagram
    participant D as Dashboard :8880
    participant S as Server :8765
    participant E as Emulator :8766
    participant C as Client :3000

    D->>S: Start process
    D->>E: Start process
    D->>C: Start process

    Note over E: User selects scenario via Dashboard
    D->>E: POST /api/simulation/start

    loop Every 1s (Simulation Tick)
        E->>E: Update entity positions
        E->>E: Run measurement model

        E->>S: POST /api/v1/entities/batchInsert
        E->>S: POST /api/v1/positionReports/batchInsert
        E->>S: POST /api/v1/liveWorldModel (new)
        E->>S: PUT /api/v1/liveWorldModel (updates)

        opt Prototype: entity_report_lob capability
            E->>S: POST /api/v1/prototype/entityReportLob/batchInsert
            Note over E,S: NEVER endpoints report raw AOA bearings + sensor position
        end

        opt Prototype: live_world_batch_upsert capability
            E->>S: POST /api/v1/prototype/liveWorldModel/batchUpsert
            Note over E,S: Single transactional batch instead of per-entity POST/PUT
        end
    end

    loop Every 2s (Client Polling)
        C->>S: GET /api/v1/liveWorldModel/getLatest
        S-->>C: Live world entities
        C->>S: GET /api/v1/entities
        S-->>C: Entity reports
        C->>S: GET /api/v1/positionReports
        S-->>C: Position reports
        C->>C: POST /api/client-stats/update (to Vite plugin)

        opt Prototype: entity_report_lob capability
            C->>S: GET /api/v1/prototype/entityReportLob/getLatest
            S-->>C: Entity reports with LOB fields
        end
    end

    loop Every 2s (Filtered — spatial/temporal bounds active)
        Note over C,S: Client dynamically selects getLatest (unfiltered/live)<br/>vs getByParams (spatial/temporal filters)<br/>based on FILTERS panel state
        C->>S: GET /api/v1/entities/getByParams?lat_min=...&from_write_time=...
        S-->>C: Filtered entity results (R-tree spatial index)
        C->>S: GET /api/v1/positionReports/getByParams?lat_min=...&from_write_time=...
        S-->>C: Filtered position results (R-tree spatial index)
    end

    loop Every 3s (Dashboard UI Polling)
        Note over S: Dashboard UI is served from surrogate server
        S->>S: GET /api/v1/prototype/dataStatistics/overview
        S-->>S: Statistics overview (gated by data_statistics capability)
    end

    loop Every 3s (Dashboard Polling)
        D->>C: GET /api/client-stats
        C-->>D: Memory stats (est. RAM, object counts)
    end

    opt Dashboard Clear Request
        D->>C: POST /api/client-stats/clear
        C->>C: Poll /api/client-stats/clear-requested
        C->>C: clearAllClientData()
    end

    opt Dashboard Config Override
        D->>C: POST /api/client-config (ip, port)
        C->>C: Poll /api/client-config/pending
        C->>C: setServerConfig(ip, port)
    end
```
