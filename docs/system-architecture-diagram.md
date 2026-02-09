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

        E->>S: POST /apidocs/entities/batchInsert
        E->>S: POST /apidocs/positionReports/batchInsert
        E->>S: POST /apidocs/liveWorldModel (new)
        E->>S: PUT /apidocs/liveWorldModel (updates)
    end

    loop Every 2s (Client Polling)
        C->>S: GET /apidocs/liveWorldModel/getLatest
        S-->>C: Live world entities
        C->>S: GET /apidocs/entities
        S-->>C: Entity reports
        C->>S: GET /apidocs/positionReports
        S-->>C: Position reports
        C->>C: POST /api/client-stats/update (to Vite plugin)
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
