# DiSCO Data Architecture - Entity Relationship Diagram

This document shows the database table relationships and UUID system in DiSCO.

## Entity Relationship Diagram

```mermaid
erDiagram
    %% ============================================
    %% SOURCE-SIDE (Endpoint-Generated)
    %% ============================================

    DISCO_ENDPOINT {
        uuid source_payload_uuid PK "Constant endpoint identity"
        string name "e.g., DECEPTOR-ALPHA"
        enum domain "land | maritime | air"
        json sensor_config "Detection ranges, noise params"
    }

    %% ============================================
    %% CORE DATA TABLES
    %% ============================================

    ENTITIES {
        uuid entity_msg_uuid PK "Server-assigned (new per report)"
        uuid source_entity_uuid "Endpoint's internal tracking ID"
        uuid source_payload_uuid FK "Which endpoint sent this"
        uuid pulsedata_uuid FK "Optional: raw pulse data ref"
        json position "lat/lon/alt of OBSERVED entity"
        json ellipse "Uncertainty bounds (orientation, axes)"
        json frequency_range "min/max/avg MHz"
        json pri_range "min/max/avg microseconds"
        json pulsewidth_range "min/max/avg microseconds"
        float amplitude_avg "dBm"
        string elnot "ELNOT identifier"
        enum emitter_type "RADAR | COMMUNICATIONS | JAMMER | MISSILE"
        enum modulation "PULSED | PULSE_DOPPLER | CW | FHSS | etc"
        bigint latest_timestamp "Unix ms"
        bigint created_timestamp "Server creation time"
        float observation_distance_km "Optional"
        float observation_bearing_deg "Optional"
    }

    POSITION_REPORTS {
        uuid position_report_uuid PK "Server-assigned"
        uuid source_position_report_uuid "Endpoint's report ID"
        uuid source_payload_uuid FK "Which endpoint sent this"
        json position "lat/lon/alt of ENDPOINT itself"
        json dof "pitch/roll/yaw"
        float magnetic_heading "degrees"
        float heading "degrees"
        float speed "knots or m/s"
        string altitude_reference "Reference system"
        bigint latest_timestamp "Unix ms"
        bigint created_timestamp "Server creation time"
    }

    %% ============================================
    %% FUSION TABLES (PLANNED - NOT YET IMPLEMENTED)
    %% ============================================

    FUSED_ENTITY_MAPPING {
        uuid entity_msg_uuid FK "References ENTITIES"
        uuid group_uuid "Correlation group ID"
    }

    FUSED_ENTITY_SUMMARY {
        uuid summary_uuid PK "Server-assigned"
        uuid group_uuid "Which correlation group"
        int group_num "Numeric group identifier"
        json position "Fused/triangulated position"
        json frequency_range "Aggregated frequency"
        bigint latest_timestamp "Most recent observation"
        bigint initial_timestamp "First detection"
    }

    %% ============================================
    %% LIVE WORLD MODEL (CANONICAL VIEW)
    %% ============================================

    LIVE_WORLD_MODEL {
        uuid liveworldmodel_uuid PK "Server-assigned"
        enum origin "fused_entity_summary | position_report"
        uuid origin_uuid "References source table"
        uuid entity_msg_uuid "For fused entities"
        int group_num "For fused entities"
        json position "Current position"
        bigint latest_timestamp "Last update"
        bigint write_timestamp "When row was written"
        string emitter_type "Entity type"
        string modulation "Signal modulation"
        json frequency_range "Signal frequency"
    }

    %% ============================================
    %% RELATIONSHIPS
    %% ============================================

    DISCO_ENDPOINT ||--o{ ENTITIES : "reports"
    DISCO_ENDPOINT ||--o{ POSITION_REPORTS : "reports"

    ENTITIES ||--o| FUSED_ENTITY_MAPPING : "correlated to"
    FUSED_ENTITY_MAPPING }o--|| FUSED_ENTITY_SUMMARY : "summarized as"

    FUSED_ENTITY_SUMMARY ||--o| LIVE_WORLD_MODEL : "published to (fused path)"
    POSITION_REPORTS ||--o| LIVE_WORLD_MODEL : "published to (direct path)"
```

## UUID System Explained

DiSCO uses **two UUID namespaces** to track data provenance:

```mermaid
flowchart LR
    subgraph SourceSide["Source-Side UUIDs (Endpoint-Generated)"]
        SPU["source_payload_uuid<br/>(Constant per endpoint)"]
        SEU["source_entity_uuid<br/>(Endpoint's internal tracking)"]
        SPRU["source_position_report_uuid<br/>(Unique per report)"]
        SPDU["source_pulsedata_uuid<br/>(Unique per pulse collection)"]
    end

    subgraph ServerSide["Server-Side UUIDs (DiSCO Server-Assigned)"]
        EMU["entity_msg_uuid<br/>(NEW for every report)"]
        PRU["position_report_uuid<br/>(NEW for every report)"]
        GU["group_uuid<br/>(One per physical entity)"]
        SU["summary_uuid<br/>(One per state update)"]
        LWU["liveworldmodel_uuid<br/>(One per live world row)"]
    end

    SPU --> EMU
    SEU --> EMU
    SPRU --> PRU
    EMU --> GU
    GU --> SU
    SU --> LWU
    PRU --> LWU

    style SourceSide fill:#fff3e0,stroke:#e65100
    style ServerSide fill:#e8f5e9,stroke:#2e7d32
```

### Why Two UUID Systems?

**Critical Insight**: The server assigns a **NEW** `entity_msg_uuid` for every incoming entity report, regardless of the `source_entity_uuid`.

```mermaid
flowchart TB
    subgraph Endpoint["Endpoint A Reports"]
        R1["Report 1: source_entity_uuid = 'ent-123'"]
        R2["Report 2: source_entity_uuid = 'ent-123'"]
        R3["Report 3: source_entity_uuid = 'ent-123'"]
    end

    subgraph Server["Server Processing"]
        M1["entity_msg_uuid = 'msg-001'"]
        M2["entity_msg_uuid = 'msg-002'"]
        M3["entity_msg_uuid = 'msg-003'"]
    end

    subgraph Correlation["Correlation Result"]
        G1["All three get: group_uuid = 'group-555'<br/>(Same physical entity)"]
    end

    R1 --> M1
    R2 --> M2
    R3 --> M3

    M1 --> G1
    M2 --> G1
    M3 --> G1

    style Endpoint fill:#fff3e0,stroke:#e65100
    style Server fill:#e8f5e9,stroke:#2e7d32
    style Correlation fill:#e3f2fd,stroke:#1565c0
```

**Reasons:**
1. **Server cannot trust endpoint correlation** - Some endpoints track entities internally (smart), others report every observation as unique (simple)
2. **Correlation is server-side** - The fusion service uses signal characteristics and geolocation to determine which reports belong together

## Table Relationships Detail

```mermaid
flowchart TB
    subgraph Raw["Raw Data Tables"]
        E[(entities)]
        P[(positionReports)]
    end

    subgraph Fusion["Fusion Tables (Planned)"]
        FEM[(fusedEntityMapping)]
        FES[(fusedEntitySummary)]
    end

    subgraph Canonical["Canonical View"]
        LW[(liveWorldModel)]
    end

    E -->|"Many entity_msg_uuid"| FEM
    FEM -->|"One group_uuid"| FES
    FES -->|"origin='fused_entity_summary'"| LW

    P -->|"origin='position_report'"| LW

    style Raw fill:#e1f5fe,stroke:#01579b
    style Fusion fill:#f3e5f5,stroke:#7b1fa2
    style Canonical fill:#e8f5e9,stroke:#2e7d32
```

### Relationship Cardinalities

| Relationship | Cardinality | Description |
|--------------|-------------|-------------|
| DISCO_ENDPOINT → ENTITIES | 1:N | One endpoint generates many entity reports |
| DISCO_ENDPOINT → POSITION_REPORTS | 1:N | One endpoint generates many position reports |
| ENTITIES → FUSED_ENTITY_MAPPING | 1:1 | Each entity report maps to exactly one group |
| FUSED_ENTITY_MAPPING → FUSED_ENTITY_SUMMARY | N:1 | Many reports summarize to one group |
| FUSED_ENTITY_SUMMARY → LIVE_WORLD_MODEL | N:1 | Multiple summaries (historical) → one live world row |
| POSITION_REPORTS → LIVE_WORLD_MODEL | N:1 | Multiple position reports → one live world row per endpoint |

## Data Flow Paths

### Fused Path (Entity Reports → Live World)

```mermaid
flowchart LR
    A["Entity Report<br/>(raw observation)"] --> B["Correlation Service<br/>(assign group_uuid)"]
    B --> C["fusedEntityMapping"]
    C --> D["Summarization Service<br/>(triangulate position)"]
    D --> E["fusedEntitySummary<br/>(new row per update)"]
    E --> F["Live World Service<br/>(query latest per group)"]
    F --> G["liveWorldModel<br/>(origin='fused_entity_summary')"]

    style A fill:#fff3e0
    style B fill:#f3e5f5
    style D fill:#f3e5f5
    style F fill:#f3e5f5
    style G fill:#e8f5e9
```

**Status:** PLANNED - Not yet implemented

### Direct Path (Position Reports → Live World)

```mermaid
flowchart LR
    A["Position Report<br/>(endpoint self-location)"] --> B["Live World Service<br/>(find/create by source_payload_uuid)"]
    B --> C["liveWorldModel<br/>(origin='position_report')"]

    style A fill:#fff3e0
    style B fill:#f3e5f5
    style C fill:#e8f5e9
```

**Status:** ✓ IMPLEMENTED

## Implementation Status

| Table | Status | Notes |
|-------|--------|-------|
| `entities` | ✓ Implemented | Stores raw entity reports from endpoints |
| `positionReports` | ✓ Implemented | Stores endpoint self-locations |
| `liveWorldModel` | ✓ Implemented | Currently shows truth data directly |
| `fusedEntityMapping` | Planned | Correlation service output |
| `fusedEntitySummary` | Planned | Summarization service output |

## Key Design Principles

1. **Historical Data**: `fusedEntitySummary` creates a NEW row on each update (not in-place update) enabling forensic analysis and track reconstruction

2. **Dual Origin**: Live World Model tracks whether each entry came from fusion (`fused_entity_summary`) or direct reporting (`position_report`)

3. **Server-Side Correlation**: The server determines which reports belong together, independent of what endpoints think

4. **Data Provenance**: `group_uuid` enables drill-down from live world → summary → raw entity reports
