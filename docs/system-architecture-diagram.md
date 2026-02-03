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
    end

    ui["&nbsp;&nbsp;Client :3000&nbsp;&nbsp;"]
    dash["&nbsp;&nbsp;Dashboard :8080&nbsp;&nbsp;"]

    eps -->|POST entity<br/>reports| ent
    eps -->|POST position<br/>reports| pos
    truth -.->|POST live<br/>world sync| lw
    ent -.->|future:<br/>fusion| lw
    lw -->|REST GET| ui
    dash -.->|manages<br/>processes| emu
    dash -.->|manages<br/>processes| srv
    dash -.->|manages<br/>processes| ui

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
2. **Emulator → Server (Truth Sync)**: Live world truth data is pushed via batch sync endpoint (development shortcut)
3. **Server → Client**: Client polls REST endpoints for live world, entity reports, and position reports

### Future Implementation (Dashed Lines)

1. **Entity Reports → Correlation → Summarization → Live World**: The fusion pipeline will correlate observations from multiple endpoints and produce fused positions

## Component Responsibilities

| Component | Responsibility | Port |
|-----------|---------------|------|
| **Orchestration Dashboard** | Process management, scenario selection, service monitoring | 8080 |
| **Surrogate Server** | API serving, data stores (entities, positions, live world) | 8765 |
| **Data Emulator** | Scenario simulation, endpoint generation, report submission | 8766 |
| **Client UI** | Visualization, user interaction | 3000 |

## Communication Patterns

```mermaid
sequenceDiagram
    participant D as Dashboard :8080
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
        E->>E: Run visibility & measurement

        E->>S: POST /apidocs/entities/batch
        E->>S: POST /apidocs/positionReports/batch
        E->>S: POST /apidocs/liveWorldModel/sync
    end

    loop Every 2s (Client Polling)
        C->>S: GET /apidocs/liveWorldModel/getLatest
        S-->>C: Live world entities
        C->>S: GET /apidocs/entities
        S-->>C: Entity reports
        C->>S: GET /apidocs/positionReports
        S-->>C: Position reports
    end
```
