# DiSCO (Distributed Spectrum Collaboration & Operations)

## What is DiSCO?

DiSCO is L3Harris's **tactical internet of things** architecture for electromagnetic (EM) spectrum operations. It provides the messaging, APIs, cloud compute resources, services, and endpoint configurations to facilitate moving tactical, crowdsourced ELINT from forward-deployed systems back to the cloud for storage, analysis, and decision-making support.

### Core Value Proposition
- **Data Aggregation**: Collect signals intelligence from distributed tactical sensors
- **Data Fusion**: Combine entity reports from multiple sensors into single fused tracks
- **Decision Support**: Provide situational awareness and EMBM (Electromagnetic Battle Management) tools
- **Command & Control**: Task sensors and effectors via standardized messaging

## Architecture Components

### DiSCO API
Two communication modes:
1. **Mission System Mode**: UCI (Universal Command and Control Interface) messaging for OMS (Open Mission Systems) compatibility, prioritizes low data rates
2. **Web Mode**: REST API for clients and web apps, prioritizes developer accessibility

### DiSCO Messages
Core message types (aligned with UCI schema for easy translation):

| Message Type | Purpose | Key Fields |
|-------------|---------|------------|
| **Entity Report** | High-level summary of physical entity (radar, jammer, etc.) | ID, operating characteristics, position, emitter type |
| **Pulse Data (PDW)** | Granular signal measurements | Frequency, amplitude, TOA, AOA, phase, SNR |
| **Position Report** | Reporting platform's location/state | Lat/lon/alt, heading, DOF (pitch/roll/yaw) |

Messages are linked via UUID fields (e.g., Entity Report references its associated Pulse Data UUID).

### DiSCO Services
Server-side processes that transform and move data:
- **Correlation Service**: Determines which raw sensor reports belong together (assigns Group IDs)
- **Summarization Service**: Estimates fused entity state from correlated reports (triangulation, tracking)
- **Live World Model Service**: Maintains single "row" per active tracked entity
- **MDF (Mission Data File) Service**: Updates threat libraries from raw recordings

### DiSCO Endpoints
Devices that interact with the EM spectrum:
- **Sensors**: ES (Electronic Support) systems that detect and report signals
- **Effectors**: EA (Electronic Attack) systems for jamming/disruption
- Example: **DECEPTOR** payload - L3Harris EW ES/EA payload on UAVs/USVs

### DiSCO Clients
Applications that consume DiSCO data:
- Common Operating Picture (COP) map interfaces
- Mission Data File editors
- Signal analysis tools
- Platform/payload management dashboards

## Data Fusion Pipeline

```
Raw Messages (Entity, Pulse, Position)
           ↓
    [Correlation Service]
    Assign Group IDs to related reports
           ↓
    [Summarization Service]
    Triangulation, multilateration, tracking
           ↓
    [Live World Model]
    Single entry per tracked entity
           ↓
    Common Operating Picture
```

**Goal**: 1:1 relationship between entities in the live world model and physical entities in the real world, derived from potentially millions of raw sensor reports.

## Key Differentiators

### DiSCO vs NCCT
| Aspect | NCCT | DiSCO |
|--------|------|-------|
| Platforms | Exquisite ISR (Rivet Joint, Global Hawk) | Tactical, distributed (UAVs, USVs, portable) |
| Reporting | Only pre-tasked signals of interest | Everything detected |
| Deployment | High-profile, safe areas | Contested, high-threat areas |
| Focus | Precision from advanced sensors | Breadth from crowdsourced sensors |

DiSCO and NCCT are complementary - DiSCO can discover signals NCCT wasn't looking for, and can task NCCT to investigate.

## Related Platforms & Systems

### DECEPTOR Payload
L3Harris EW payload capabilities:
- Signal de-interleaving
- ES signal classification and ID
- Automatic signal characterization (Cognitive EW)
- Emitter geolocation (differential phase/amplitude)
- Demonstrated on FVR-90 UAV, Seasats Lightfish USV

### NCCT (Network Centric Collaborative Targeting)
L3Harris-maintained ISR fusion system:
- Connects RC-135 Rivet Joint, EC-130H Compass Call, Global Hawk
- Machine-to-machine sensor cross-cueing
- Reduces find-fix-track-target chain by >90%

### AFSIM (Advanced Framework for Simulation, Integration, and Modeling)
Government-owned M&S tool L3Harris extends:
- High-fidelity EW modeling beyond simple J/S ratios
- Models 2nd/3rd order effects of EM maneuvers
- Used for "what-if" COA analysis

### Unify Project (2026)
Combining 4 L3Harris software-defined warfare products:
- **DiSCO**: Tactical IoT for data sharing and C2
- **DOMINATE**: AI/ML tactical communications routing
- **AMORPHOUS**: Edge autonomy for UAV swarms
- **RAAS**: Radio as a Sensor for COMINT/jamming

## Proven Deployments

### Talisman Sabre 2025
L3Harris demonstrated multi-domain EMBM as red team:
- DECEPTOR on UAV (FVR-90), USVs (Seasats Lightfish), land station
- Real-time data fusion via DiSCO to AWS (via Starlink)
- Dynamic MDF generation for unknown emitters
- First embedded hardware test of emitter fingerprinting
- Multi-platform geolocation fusing server-side PDWs

## Technical Standards

### Compatibility
- **OMS-UCI**: Open Mission Systems - Universal Command and Control Interface
- **TAK**: Tactical Assault Kit server integration
- **WOSA**: Weapon Open Systems Architecture format support

### Data Schema
DiSCO maintains its own openly published schema (not export-controlled like UCI) to enable:
1. Easy interoperability and 3rd party integrations
2. Freedom from restricted standards dependencies
