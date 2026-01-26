# DiSCO System Architecture Diagram

This diagram shows how the Client UI, Surrogate DiSCO Server, and Truth Data Scenario Generator work together.

## System Overview Flowchart

```mermaid
flowchart TB
    subgraph TruthLayer["Truth Data Layer (Scenario Generator)"]
        TruthData[(Truth Data<br/>100+ Entities)]
        TruthData --> |Real positions,<br/>signal characteristics| Entities

        subgraph Entities["Truth Entities"]
            Land["Land Entities<br/>(SAM Sites, Coastal Radars)"]
            Maritime["Maritime Entities<br/>(Ships with Radars)"]
            Air["Air Entities<br/>(Aircraft)"]
        end
    end

    subgraph EndpointLayer["DiSCO Endpoints (Simulated Sensors)"]
        subgraph EP1["DECEPTOR-LAND"]
            EP1Sensor["High Accuracy Sensor<br/>200km range<br/>2° bearing error"]
        end
        subgraph EP2["DECEPTOR-SEA"]
            EP2Sensor["Medium Accuracy Sensor<br/>150km range<br/>4° bearing error"]
        end
        subgraph EP3["DECEPTOR-AIR"]
            EP3Sensor["Lower Accuracy Sensor<br/>300km range (altitude advantage)<br/>5° bearing error"]
        end
    end

    subgraph MeasurementModel["Measurement Model"]
        Visibility["Visibility Check<br/>(Range + Line-of-Sight)"]
        GeoNoise["Geolocation Noise<br/>(Bearing/Range Error)"]
        SigNoise["Signal Parameter Noise<br/>(Freq/PRI/PW/Amplitude)"]
    end

    Entities --> |Observe| Visibility
    Visibility --> |Visible entities| GeoNoise
    GeoNoise --> SigNoise
    SigNoise --> |Entity Reports<br/>with measurement noise| EntityReports

    EP1 --> |Position Reports| PosReports
    EP2 --> |Position Reports| PosReports
    EP3 --> |Position Reports| PosReports

    subgraph Server["Surrogate DiSCO Server (disco_data_emulator)"]
        direction TB

        subgraph DataStores["In-Memory Data Stores"]
            EntityReports[(entities<br/>Raw observations)]
            PosReports[(positionReports<br/>Endpoint locations)]
            LiveWorld[(liveWorldModel<br/>Canonical view)]
        end

        subgraph FutureFusion["Fusion Pipeline (Planned)"]
            Correlation["Correlation Service<br/>Assign Group IDs"]
            Summarization["Summarization Service<br/>Triangulation/Tracking"]
        end

        subgraph APIs["REST API Layer"]
            EntitiesAPI["/apidocs/entities/*"]
            PosReportsAPI["/apidocs/positionReports/*"]
            LiveWorldAPI["/apidocs/liveWorldModel/*"]
            SimControlAPI["/apidocs/simulation/*<br/>/apidocs/endpoints/*"]
        end

        EntityReports -.-> |Future| Correlation
        Correlation -.-> |Future| Summarization
        Summarization -.-> |Future| LiveWorld

        PosReports --> |Direct Path| LiveWorld
        TruthData --> |Current: Direct| LiveWorld
    end

    subgraph Client["Client UI (disco_live_world_client_ui)"]
        direction TB

        subgraph Views["UI Views"]
            MapView["Leaflet Map<br/>Interactive visualization"]
            DataTable["TanStack Table<br/>Entity data grid"]
        end

        subgraph Tabs["Data Tabs"]
            LiveWorldTab["LIVE_WORLD Tab"]
            EntityTab["ENTITY_REPORTS Tab"]
            PosTab["POSITION_REPORTS Tab"]
        end

        subgraph ClientServices["Services"]
            Polling["Polling Service<br/>(Real-time updates)"]
            APIClient["API Client<br/>(JavaScript SDK)"]
        end

        Polling --> APIClient
        APIClient --> |Fetch data| Tabs
        Tabs --> Views
    end

    EntitiesAPI --> |HTTP GET| APIClient
    PosReportsAPI --> |HTTP GET| APIClient
    LiveWorldAPI --> |HTTP GET| APIClient
    SimControlAPI --> |HTTP POST| APIClient

    style TruthLayer fill:#e1f5fe,stroke:#01579b
    style EndpointLayer fill:#fff3e0,stroke:#e65100
    style MeasurementModel fill:#f3e5f5,stroke:#7b1fa2
    style Server fill:#e8f5e9,stroke:#2e7d32
    style Client fill:#fce4ec,stroke:#c2185b
    style FutureFusion fill:#fff,stroke:#999,stroke-dasharray: 5 5
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
    participant Client as Client UI
    participant Server as DiSCO Server
    participant Sim as Simulation Engine
    participant Endpoints as DiSCO Endpoints
    participant Truth as Truth Data

    loop Every 1 second
        Sim->>Truth: Update entity positions
        Sim->>Endpoints: Update endpoint positions

        loop For each endpoint
            Endpoints->>Truth: Observe visible entities
            Endpoints->>Sim: Generate Entity Reports (with noise)
            Endpoints->>Sim: Generate Position Report
        end

        Sim->>Server: Store reports in memory
    end

    loop Every 2 seconds (polling)
        Client->>Server: GET /liveWorldModel/getLatest
        Server-->>Client: Live World entities
        Client->>Server: GET /entities/getLatest
        Server-->>Client: Entity Reports
        Client->>Server: GET /positionReports/getLatest
        Server-->>Client: Position Reports
        Client->>Client: Update map & tables
    end
```
