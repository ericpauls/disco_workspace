# DiSCO System Architecture Diagram

This diagram shows how the Client UI, Surrogate DiSCO Server, and Truth Data Scenario Generator work together.

## System Overview Flowchart

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '11px'}}}%%
flowchart LR
    subgraph truth["Truth Layer"]
        direction TB
        td[("Truth Data")]
        ents["Land | Maritime | Air"]
        td --> ents
    end

    subgraph endpoints["Endpoints"]
        direction TB
        ep1["LAND 200km"]
        ep2["SEA 150km"]
        ep3["AIR 300km"]
    end

    subgraph measure["Measurement Model"]
        direction TB
        vis["Visibility"]
        geo["Geo Noise"]
        sig["Signal Noise"]
        vis --> geo --> sig
    end

    subgraph server["Server :8765"]
        direction TB
        subgraph stores["Data Stores"]
            direction LR
            ent[("Entities")]
            pos[("Positions")]
            lw[("LiveWorld")]
        end
        subgraph fusion["Fusion (Planned)"]
            direction LR
            corr["Correlate"]
            summ["Summarize"]
            corr --> summ
        end
        subgraph api["REST APIs"]
            direction LR
            apis["/entities | /positions | /liveWorld"]
        end
    end

    subgraph client["Client :3000"]
        direction TB
        tabs["Tabs"]
        views["Map | Table"]
        tabs --> views
    end

    ents --> measure
    sig -->|reports| ent
    endpoints -->|position| pos
    ent -.->|future| corr
    summ -.->|future| lw
    pos --> lw
    td -->|direct| lw
    apis --> client

    classDef truthStyle fill:#e1f5fe,stroke:#01579b
    classDef endpointStyle fill:#fff3e0,stroke:#e65100
    classDef measureStyle fill:#f3e5f5,stroke:#7b1fa2
    classDef serverStyle fill:#e8f5e9,stroke:#2e7d32
    classDef clientStyle fill:#fce4ec,stroke:#c2185b
    classDef futureStyle fill:#fff,stroke:#999,stroke-dasharray: 5 5

    class truth truthStyle
    class endpoints endpointStyle
    class measure measureStyle
    class server serverStyle
    class client clientStyle
    class fusion futureStyle
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
