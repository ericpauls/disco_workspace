# DiSCO Data Architecture - Entity Relationship Diagram

This document shows the database table relationships and UUID system in DiSCO.

## Entity Relationship Diagram

Shows key fields only. See Implementation Status section for complete field documentation.

```mermaid
erDiagram
    DISCO_ENDPOINT {
        uuid source_payload_uuid PK
        string name
        enum domain
    }

    ENTITIES {
        uuid entity_msg_uuid PK
        uuid source_entity_uuid
        uuid source_payload_uuid FK
        json position
        json ellipse
        string elnot
        enum emitter_type
        bigint latest_timestamp
    }

    POSITION_REPORTS {
        uuid position_report_uuid PK
        uuid source_payload_uuid FK
        json position
        bigint latest_timestamp
    }

    FUSED_ENTITY_MAPPING {
        uuid entity_msg_uuid FK
        uuid group_uuid
    }

    FUSED_ENTITY_SUMMARY {
        uuid summary_uuid PK
        uuid group_uuid
        json position
    }

    LIVE_WORLD_MODEL {
        uuid liveworldmodel_uuid PK
        enum origin
        uuid origin_uuid
        json position
    }

    DISCO_ENDPOINT ||--o{ ENTITIES : "reports"
    DISCO_ENDPOINT ||--o{ POSITION_REPORTS : "reports"
    ENTITIES ||--o| FUSED_ENTITY_MAPPING : "maps to"
    FUSED_ENTITY_MAPPING }o--|| FUSED_ENTITY_SUMMARY : "summarizes"
    FUSED_ENTITY_SUMMARY ||--o| LIVE_WORLD_MODEL : "fused path"
    POSITION_REPORTS ||--o| LIVE_WORLD_MODEL : "direct path"
```

## UUID System Explained

DiSCO uses **two UUID namespaces** to track data provenance:

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '11px'}}}%%
flowchart LR
    subgraph source["Source-Side (Endpoint)"]
        direction TB
        spu["source_payload_uuid"]
        seu["source_entity_uuid"]
        spru["source_position_report_uuid"]
    end

    subgraph server["Server-Side (DiSCO)"]
        direction TB
        emu["entity_msg_uuid"]
        pru["position_report_uuid"]
        gu["group_uuid"]
        su["summary_uuid"]
        lwu["liveworldmodel_uuid"]
    end

    spu --> emu
    seu --> emu
    spru --> pru
    emu --> gu
    gu --> su
    su --> lwu
    pru --> lwu

    classDef sourceStyle fill:#fff3e0,stroke:#e65100
    classDef serverStyle fill:#e8f5e9,stroke:#2e7d32

    class source sourceStyle
    class server serverStyle
```

### Why Two UUID Systems?

**Critical Insight**: The server assigns a **NEW** `entity_msg_uuid` for every incoming entity report, regardless of the `source_entity_uuid`.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '11px'}}}%%
flowchart LR
    subgraph endpoint["Endpoint Reports"]
        direction TB
        r1["R1: src_ent = 123"]
        r2["R2: src_ent = 123"]
        r3["R3: src_ent = 123"]
    end

    subgraph server["Server Assigns"]
        direction TB
        m1["msg_uuid = 001"]
        m2["msg_uuid = 002"]
        m3["msg_uuid = 003"]
    end

    subgraph corr["Correlation"]
        g1["group_uuid = 555<br/>(same entity)"]
    end

    r1 --> m1
    r2 --> m2
    r3 --> m3

    m1 & m2 & m3 --> g1

    classDef epStyle fill:#fff3e0,stroke:#e65100
    classDef srvStyle fill:#e8f5e9,stroke:#2e7d32
    classDef corrStyle fill:#e3f2fd,stroke:#1565c0

    class endpoint epStyle
    class server srvStyle
    class corr corrStyle
```

**Reasons:**
1. **Server cannot trust endpoint correlation** - Some endpoints track entities internally (smart), others report every observation as unique (simple)
2. **Correlation is server-side** - The fusion service uses signal characteristics and geolocation to determine which reports belong together

## Table Relationships Detail

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '11px'}}}%%
flowchart LR
    subgraph raw["Raw Tables"]
        direction TB
        e[("entities")]
        p[("positions")]
    end

    subgraph fusion["Fusion (Planned)"]
        direction TB
        fem[("mapping")]
        fes[("summary")]
    end

    subgraph canon["Canonical"]
        lw[("liveWorld")]
    end

    e -->|N:1| fem
    fem -->|N:1| fes
    fes -->|fused| lw
    p -->|direct| lw

    classDef rawStyle fill:#e1f5fe,stroke:#01579b
    classDef fusionStyle fill:#f3e5f5,stroke:#7b1fa2
    classDef canonStyle fill:#e8f5e9,stroke:#2e7d32

    class raw rawStyle
    class fusion fusionStyle
    class canon canonStyle
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
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '11px'}}}%%
flowchart LR
    a["Entity Report"] --> b["Correlate"]
    b --> c["Mapping"]
    c --> d["Summarize"]
    d --> e["Summary"]
    e --> f["LiveWorld"]

    classDef data fill:#fff3e0,stroke:#e65100
    classDef svc fill:#f3e5f5,stroke:#7b1fa2
    classDef out fill:#e8f5e9,stroke:#2e7d32

    class a data
    class b,d svc
    class c,e data
    class f out
```

**Status:** PLANNED - Not yet implemented

### Direct Path (Position Reports → Live World)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#666', 'fontSize': '11px'}}}%%
flowchart LR
    a["Position Report"] --> b["LiveWorld Service"]
    b --> c["liveWorldModel"]

    classDef data fill:#fff3e0,stroke:#e65100
    classDef svc fill:#f3e5f5,stroke:#7b1fa2
    classDef out fill:#e8f5e9,stroke:#2e7d32

    class a data
    class b svc
    class c out
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
