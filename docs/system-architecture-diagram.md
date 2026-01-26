# DiSCO System Architecture Diagram

This diagram shows how the Client UI, Surrogate DiSCO Server, and Truth Data Scenario Generator work together.

## System Overview Flowchart

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '13px'}}}%%
flowchart LR
    subgraph sim["&nbsp;&nbsp;Simulation Engine&nbsp;&nbsp;"]
        truth[("Truth<br/>Data")]
        mm["Measurement<br/>Model"]
        truth --> mm
    end

    subgraph eps["&nbsp;&nbsp;Endpoints&nbsp;&nbsp;"]
        ep1["LAND"]
        ep2["SEA"]
        ep3["AIR"]
    end

    subgraph srv["&nbsp;&nbsp;Server :8765&nbsp;&nbsp;"]
        ent[("entities")]
        pos[("positions")]
        lw[("liveWorld")]
    end

    ui["&nbsp;&nbsp;Client :3000&nbsp;&nbsp;"]

    mm -->|observe| eps
    eps -->|entity<br/>reports| ent
    eps -->|position<br/>reports| pos
    pos --> lw
    truth -.->|direct<br/>feed| lw
    ent -.->|future:<br/>fusion| lw
    lw -->|REST| ui

    classDef simStyle fill:#e1f5fe,stroke:#01579b
    classDef epStyle fill:#fff3e0,stroke:#e65100
    classDef srvStyle fill:#e8f5e9,stroke:#2e7d32
    classDef uiStyle fill:#fce4ec,stroke:#c2185b

    class sim simStyle
    class eps epStyle
    class srv srvStyle
    class ui uiStyle
```

## Data Flow Summary

### Current Implementation (Solid Lines)

1. **Truth Data → Live World (Direct)**: Truth entities are directly visible in the Live World Model for development/testing
2. **Endpoints → Position Reports → Live World**: Endpoint self-locations flow directly to Live World
3. **Truth Entities → Measurement Model → Entity Reports**: Endpoints observe truth entities through visibility checks and noise models

### Future Implementation (Dashed Lines)

1. **Entity Reports → Correlation → Summarization → Live World**: The fusion pipeline will correlate observations from multiple endpoints and triangulate fused positions

## Component Responsibilities

| Component | Responsibility | Port |
|-----------|---------------|------|
| **Client UI** | Visualization, user interaction | 3000 |
| **Surrogate Server** | Data simulation, API serving | 8765 |
| **Truth Data Generator** | Realistic entity simulation | (internal) |
| **Measurement Model** | Sensor noise simulation | (internal) |
| **DiSCO Endpoints** | Simulated EW sensors | (internal) |

## Communication Patterns

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant Sim as Simulation
    participant EP as Endpoints
    participant T as Truth

    loop Every 1s (Simulation)
        Sim->>T: Update positions
        Sim->>EP: Update positions

        loop Per endpoint
            EP->>T: Observe entities
            EP->>Sim: Entity reports
            EP->>Sim: Position report
        end

        Sim->>S: Store reports
    end

    loop Every 2s (Polling)
        C->>S: GET /liveWorld
        S-->>C: Entities
        C->>S: GET /entities
        S-->>C: Reports
        C->>S: GET /positions
        S-->>C: Positions
        C->>C: Update UI
    end
```
