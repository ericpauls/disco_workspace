# Entity Reporting Implementation Plan

> **Purpose**: This document provides a step-by-step implementation plan for adding entity reporting and position reporting capabilities to the DiSCO data emulator. A developer should be able to follow this plan to implement the feature.

**Prerequisites**: Read [disco-data-architecture.md](disco-data-architecture.md) first to understand the data model.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current State](#2-current-state)
3. [Target State](#3-target-state)
4. [Implementation Phases](#4-implementation-phases)
5. [Phase Details](#5-phase-details)
6. [Test Scenario Specification](#6-test-scenario-specification)
7. [Critical Files Reference](#7-critical-files-reference)
8. [Verification Plan](#8-verification-plan)
9. [Out of Scope](#9-out-of-scope)

---

## 1. Project Overview

### 1.1 Goals

1. **Extend the server/data emulator** beyond Live World to support:
   - **Entity Reports**: Observations of RF emitters by DiSCO endpoints
   - **Position Reports**: Self-reported locations of DiSCO endpoints

2. **Implement realistic simulation**:
   - Truth Data → Measurement Model → Entity Reports with noise
   - Different endpoints have different sensor capabilities and noise characteristics

3. **Future-proof for fusion**: While not implementing fusion now, the architecture should support eventual server-side correlation, summarization, and live world publication.

### 1.2 What We're Building

```
                        ┌─────────────────────────────────────────┐
                        │           TRUTH DATA                     │
                        │  (100 entities with real positions       │
                        │   and signal characteristics)            │
                        └─────────────────┬───────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
           ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
           │ ENDPOINT 1   │      │ ENDPOINT 2   │      │ ENDPOINT 3   │
           │ (Land/Fixed) │      │ (Sea/Mobile) │      │ (Air/Mobile) │
           │ High accuracy│      │ Med accuracy │      │ Low accuracy │
           └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
                  │                     │                     │
                  │ [Measurement Model: visibility, noise]    │
                  │                     │                     │
                  ▼                     ▼                     ▼
         Entity Reports          Entity Reports          Entity Reports
         Position Reports        Position Reports        Position Reports
                  │                     │                     │
                  └─────────────────────┴─────────────────────┘
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │    DiSCO SERVER       │
                            │                       │
                            │  entities table       │
                            │  positionReports      │
                            │  liveWorldModel       │
                            └───────────────────────┘
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │    CLIENT UI          │
                            │                       │
                            │  LIVE_WORLD tab       │
                            │  ENTITY_REPORTS tab   │
                            │  POSITION_REPORTS tab │
                            └───────────────────────┘
```

---

## 2. Current State

The emulator currently implements:

- **Live World Model**: Generates and serves simulated entities directly as truth data
- **Entity Generation**: Creates land, sea, and air entities with realistic signal profiles
- **Motion Models**: Patrol, transit, waypoint, and stationary motion patterns
- **Signal Generation**: Realistic RF signal parameters from EmitterProfiles.ts
- **Client UI**: Map visualization with data table for live world entities

**What's Missing:**
- DiSCO endpoints as distinct entities
- Measurement model (visibility, noise)
- Entity Reports table and API
- Position Reports table and API
- Client UI tabs for entity/position reports

---

## 3. Target State

After implementation:

1. **Server maintains three data stores:**
   - `entities[]` - Historical entity reports from endpoints
   - `positionReports[]` - Historical position reports from endpoints
   - `liveWorldModel[]` - Current truth data (unchanged from current behavior)

2. **Simulation loop:**
   - Update truth data positions (existing)
   - Update endpoint positions
   - For each endpoint, observe truth entities through measurement model
   - Generate entity reports with noise
   - Generate position reports
   - Store in respective tables

3. **API endpoints:**
   - `/apidocs/entities/getLatest` - Returns latest entity reports
   - `/apidocs/entities/getByParams` - Filter entity reports
   - `/apidocs/positionReports/getLatest` - Returns latest position reports
   - `/apidocs/positionReports/getByParams` - Filter position reports

4. **Client UI:**
   - Three tabs: LIVE_WORLD, ENTITY_REPORTS, POSITION_REPORTS
   - Toggle to show/hide each data type on map
   - Tables showing respective data

---

## 4. Implementation Phases

| Phase | Description | Dependency |
|-------|-------------|------------|
| **1** | Architecture Documentation | None (COMPLETE) |
| **2** | Truth Data Generator | None |
| **3** | Measurement Model | Phase 2 |
| **4** | Server API Updates | Phase 3 |
| **5** | Developer Dashboard | Phase 4 |
| **6** | Client UI Updates | Phase 4 |
| **7** | Test Scenario | Phase 2-4 |

---

## 5. Phase Details

### Phase 2: Truth Data Generator

**Goal**: Extend existing scenario generation to model DiSCO endpoints as distinct from "truth entities."

#### 2.1 Requirements

- Maintain truth data for ~100 entities (radars, comms, jammers, etc.)
- Add 3 DiSCO endpoints (1 land stationary, 1 sea slow-moving, 1 air)
- DiSCO endpoints use existing entity generation (land, sea, air) but are flagged as "endpoints"
- DiSCO endpoints do NOT appear in truth data for observation (invisible to each other)
- Live World continues to show truth data + endpoints as before

#### 2.2 New Types

```typescript
// disco_data_emulator/types/endpoint.ts

interface DiscoEndpoint {
  source_payload_uuid: string;      // Constant identifier
  name: string;                     // e.g., "DECEPTOR-ALPHA"
  domain: 'land' | 'maritime' | 'air';
  position: Position;
  heading: number;
  speed: number;
  motionModel: MotionModel;

  // Sensor capabilities
  sensorConfig: SensorConfig;
}

interface SensorConfig {
  max_detection_range_km: number;   // Maximum sensing distance
  min_detection_amplitude_dbm: number; // Sensitivity threshold

  // Geolocation noise (1-sigma values)
  bearing_error_deg: number;
  range_error_percent: number;

  // Signal measurement noise (1-sigma values)
  frequency_error_mhz: number;
  pri_error_us: number;
  pulsewidth_error_us: number;
  amplitude_error_db: number;
}
```

#### 2.3 Files to Modify

| File | Changes |
|------|---------|
| `types/endpoint.ts` | **NEW** - Endpoint and sensor config types |
| `simulation/entities/DiscoEndpoint.ts` | **NEW** - Endpoint entity class |
| `simulation/EntityManager.ts` | Add endpoint management (separate from truth entities) |
| `simulation/scenarios/EndpointTestScenario.ts` | **NEW** - Test scenario with 3 endpoints + 100 entities |

#### 2.4 Implementation Steps

1. Create `DiscoEndpoint` type with sensor configuration
2. Create `DiscoEndpoint` entity class extending base entity
3. Update `EntityManager` to track endpoints separately from truth entities
4. Create test scenario that generates:
   - 3 DiSCO endpoints with different sensor configs
   - 100 truth data entities (existing generation)
5. Ensure endpoints appear in live world (as friendly platforms)
6. Ensure endpoints are NOT included when iterating truth entities for observation

---

### Phase 3: Measurement Model

**Goal**: Simulate how DiSCO endpoints observe truth entities and generate reports.

#### 3.1 Visibility Check

For each endpoint-entity pair, determine if the entity is visible:

```typescript
// disco_data_emulator/simulation/measurement/VisibilityCheck.ts

function isVisible(
  endpoint: DiscoEndpoint,
  entity: TruthEntity
): boolean {
  // 1. Calculate distance
  const distance_km = calculateDistance(endpoint.position, entity.position);

  // 2. Check max detection range
  if (distance_km > endpoint.sensorConfig.max_detection_range_km) {
    return false;
  }

  // 3. Check horizon (line of sight)
  const observerHorizon_km = 3.57 * Math.sqrt(endpoint.position.altitude);
  const targetHorizon_km = 3.57 * Math.sqrt(entity.position.altitude);
  const maxRange_km = observerHorizon_km + targetHorizon_km;

  if (distance_km > maxRange_km) {
    return false;
  }

  // 4. Check signal strength (simplified - assume visible if in range)
  // Future: Calculate received power based on distance, transmit power, etc.

  return true;
}
```

#### 3.2 Geolocation Noise

Apply noise to the true position to get the measured position:

```typescript
// disco_data_emulator/simulation/measurement/NoiseModel.ts

function applyGeoNoise(
  truePosition: Position,
  observerPosition: Position,
  sensorConfig: SensorConfig
): { position: Position; ellipse: Ellipse } {
  // Calculate bearing from observer to target
  const trueBearing = calculateBearing(observerPosition, truePosition);
  const trueRange = calculateDistance(observerPosition, truePosition);

  // Apply Gaussian noise
  const bearingError = gaussianRandom() * sensorConfig.bearing_error_deg;
  const rangeError = gaussianRandom() * (trueRange * sensorConfig.range_error_percent / 100);

  const measuredBearing = trueBearing + bearingError;
  const measuredRange = trueRange + rangeError;

  // Convert back to lat/lon
  const measuredPosition = calculatePositionFromBearingRange(
    observerPosition,
    measuredBearing,
    measuredRange
  );

  // Generate uncertainty ellipse
  const ellipse = {
    orientation: trueBearing, // Major axis along bearing
    semi_major_axis_length: trueRange * sensorConfig.range_error_percent / 100 * 1000, // meters
    semi_minor_axis_length: trueRange * Math.tan(sensorConfig.bearing_error_deg * Math.PI / 180) * 1000
  };

  return { position: measuredPosition, ellipse };
}
```

#### 3.3 Signal Noise

Apply noise to signal parameters:

```typescript
function applySignalNoise(
  trueSignal: CurrentSignal,
  sensorConfig: SensorConfig
): MeasuredSignal {
  return {
    frequency_range: {
      frequency_avg: trueSignal.frequencyRange.frequency_avg +
                     gaussianRandom() * sensorConfig.frequency_error_mhz,
      frequency_min: trueSignal.frequencyRange.frequency_min +
                     gaussianRandom() * sensorConfig.frequency_error_mhz * 0.5,
      frequency_max: trueSignal.frequencyRange.frequency_max +
                     gaussianRandom() * sensorConfig.frequency_error_mhz * 0.5
    },
    pri_range: trueSignal.priRange ? {
      pri_avg: trueSignal.priRange.pri_avg +
               gaussianRandom() * sensorConfig.pri_error_us,
      pri_min: trueSignal.priRange.pri_min +
               gaussianRandom() * sensorConfig.pri_error_us * 0.5,
      pri_max: trueSignal.priRange.pri_max +
               gaussianRandom() * sensorConfig.pri_error_us * 0.5
    } : null,
    // ... similar for pulsewidth, amplitude
  };
}
```

#### 3.4 Entity Report Generation

```typescript
// disco_data_emulator/simulation/measurement/MeasurementModel.ts

function generateEntityReport(
  endpoint: DiscoEndpoint,
  entity: TruthEntity,
  timestamp: number
): EntityReport | null {
  // Check visibility
  if (!isVisible(endpoint, entity)) {
    return null;
  }

  // Apply geolocation noise
  const { position, ellipse } = applyGeoNoise(
    entity.position,
    endpoint.position,
    endpoint.sensorConfig
  );

  // Apply signal noise
  const measuredSignal = applySignalNoise(
    entity.currentSignal,
    endpoint.sensorConfig
  );

  // Generate entity report
  return {
    // Source-side UUIDs
    source_entity_uuid: generateSourceEntityUuid(endpoint, entity),
    source_payload_uuid: endpoint.source_payload_uuid,

    // Measured data
    position,
    ellipse,
    frequency_range: measuredSignal.frequency_range,
    pri_range: measuredSignal.pri_range,
    pulsewidth_range: measuredSignal.pulsewidth_range,
    amplitude_avg: measuredSignal.amplitude_avg,

    // Metadata
    emitter_type: entity.emitterType,
    modulation_type: entity.modulation,
    elnot: entity.elnot,
    latest_timestamp: timestamp
  };
}
```

#### 3.5 Files to Create

| File | Purpose |
|------|---------|
| `simulation/measurement/VisibilityCheck.ts` | Line-of-sight and range checks |
| `simulation/measurement/NoiseModel.ts` | Gaussian noise generators |
| `simulation/measurement/MeasurementModel.ts` | Main measurement model class |
| `simulation/measurement/index.ts` | Exports |

---

### Phase 4: Server API Updates

**Goal**: Add real API endpoints for entities and positionReports.

#### 4.1 Data Stores

```typescript
// In server.ts or new file: stores/EntityStore.ts

interface EntityReport {
  entity_msg_uuid: string;          // Server-assigned
  source_entity_uuid: string;
  source_payload_uuid: string;
  position: Position;
  ellipse: Ellipse;
  frequency_range: FrequencyRange;
  pri_range: PriRange | null;
  pulsewidth_range: PulsewidthRange | null;
  amplitude_avg: number;
  emitter_type: string;
  modulation_type: string;
  elnot: string;
  latest_timestamp: number;
}

interface PositionReport {
  position_report_uuid: string;     // Server-assigned
  source_position_report_uuid: string;
  source_payload_uuid: string;
  position: Position;
  dof: DOF;
  magnetic_heading: number;
  altitude_reference: string;
  latest_timestamp: number;
}

class EntityStore {
  private entities: EntityReport[] = [];
  private maxEntities: number = 10000; // History limit

  add(report: Omit<EntityReport, 'entity_msg_uuid'>): EntityReport {
    const entityReport = {
      ...report,
      entity_msg_uuid: uuidv4()  // Server assigns UUID
    };

    this.entities.push(entityReport);

    // Enforce history limit
    if (this.entities.length > this.maxEntities) {
      this.entities = this.entities.slice(-this.maxEntities);
    }

    return entityReport;
  }

  getLatest(limit: number = 1000): EntityReport[] {
    return this.entities.slice(-limit);
  }

  getByParams(params: QueryParams): EntityReport[] {
    // Filter by source_payload_uuid, time range, etc.
  }

  clear(): void {
    this.entities = [];
  }

  count(): number {
    return this.entities.length;
  }
}
```

#### 4.2 API Routes

```typescript
// In server.ts

// Entity Reports
app.get('/apidocs/entities/getLatest', (req, res) => {
  const limit = parseInt(req.query.max_count as string) || 1000;
  res.json({ tasks: entityStore.getLatest(limit) });
});

app.get('/apidocs/entities/getByParams', (req, res) => {
  const params = {
    source_payload_uuid: req.query.source_payload_uuid,
    start_time: req.query.start_time,
    end_time: req.query.end_time,
    // ... other filters
  };
  res.json({ tasks: entityStore.getByParams(params) });
});

app.get('/apidocs/entities/:entity_msg_uuid', (req, res) => {
  const entity = entityStore.getByUuid(req.params.entity_msg_uuid);
  if (entity) {
    res.json(entity);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Position Reports (similar pattern)
app.get('/apidocs/positionReports/getLatest', (req, res) => {
  const limit = parseInt(req.query.max_count as string) || 1000;
  res.json({ tasks: positionStore.getLatest(limit) });
});

// ... etc
```

#### 4.3 Simulation Integration

Update the simulation loop to generate reports:

```typescript
// In SimulationEngine.ts or similar

function simulationTick(timestamp: number) {
  // 1. Update truth entity positions (existing)
  for (const entity of truthEntities) {
    entity.update(deltaTime);
  }

  // 2. Update endpoint positions
  for (const endpoint of discoEndpoints) {
    endpoint.update(deltaTime);

    // 3. Generate position report
    const positionReport = generatePositionReport(endpoint, timestamp);
    positionStore.add(positionReport);
  }

  // 4. For each endpoint, observe truth entities
  for (const endpoint of discoEndpoints) {
    for (const entity of truthEntities) {
      const entityReport = generateEntityReport(endpoint, entity, timestamp);
      if (entityReport) {
        entityStore.add(entityReport);
      }
    }
  }

  // 5. Update live world (existing - continues to show truth data)
}
```

#### 4.4 Files to Modify

| File | Changes |
|------|---------|
| `server.ts` | Add entity and position report routes |
| `stores/EntityStore.ts` | **NEW** - Entity report storage |
| `stores/PositionStore.ts` | **NEW** - Position report storage |
| `types/entityReport.ts` | **NEW** - Entity report types |
| `types/positionReport.ts` | **NEW** - Position report types |
| `simulation/SimulationEngine.ts` | Integrate measurement model |

---

### Phase 5: Developer Dashboard

**Goal**: Provide visibility into server state and controls.

#### 5.1 Requirements

- Show count of entity reports in memory
- Show count of position reports in memory
- Graph of entity reports over time
- Pause button to stop storing new reports
- Clear button to wipe entity report history

#### 5.2 Implementation Options

**Option A: Server-side endpoint + Client page**
```typescript
// Server endpoint
app.get('/apidocs/simulation/dashboard', (req, res) => {
  res.json({
    entityReportCount: entityStore.count(),
    positionReportCount: positionStore.count(),
    isPaused: simulationEngine.isPaused,
    entityReportsOverTime: getEntityCountHistory()
  });
});

app.post('/apidocs/simulation/pause', (req, res) => {
  simulationEngine.pause();
  res.json({ success: true });
});

app.post('/apidocs/simulation/resume', (req, res) => {
  simulationEngine.resume();
  res.json({ success: true });
});

app.post('/apidocs/simulation/clearEntities', (req, res) => {
  entityStore.clear();
  res.json({ success: true });
});
```

**Option B: Extend existing /health endpoint**
```typescript
app.get('/apidocs/health', (req, res) => {
  res.json({
    status: 'healthy',
    simulation: {
      running: !simulationEngine.isPaused,
      entityCount: entityStore.count(),
      positionReportCount: positionStore.count(),
      truthEntityCount: truthEntities.length,
      endpointCount: discoEndpoints.length
    }
  });
});
```

---

### Phase 6: Client UI Updates

**Goal**: Allow client to query and display entity reports and position reports.

#### 6.1 Requirements

- Rename "DATA" tab to "LIVE_WORLD"
- Add "ENTITY_REPORTS" tab with same table UI
- Add "POSITION_REPORTS" tab with same table UI
- Each tab queries its respective API (limit to 1000 latest)
- Toggle switches for plotting each data type on map

#### 6.2 API Client Updates

```typescript
// disco_live_world_client_ui/src/api/discoApi.ts

export async function getEntityReports(options?: { limit?: number }) {
  const params = new URLSearchParams();
  if (options?.limit) params.append('max_count', options.limit.toString());

  const response = await fetch(
    `${API_BASE}/entities/getLatest?${params}`
  );
  return response.json();
}

export async function getPositionReports(options?: { limit?: number }) {
  const params = new URLSearchParams();
  if (options?.limit) params.append('max_count', options.limit.toString());

  const response = await fetch(
    `${API_BASE}/positionReports/getLatest?${params}`
  );
  return response.json();
}
```

#### 6.3 New Types

```typescript
// disco_live_world_client_ui/src/types/entityReport.ts

export interface EntityReport {
  entity_msg_uuid: string;
  source_entity_uuid: string;
  source_payload_uuid: string;
  position: Position;
  ellipse?: Ellipse;
  frequency_range?: FrequencyRange;
  pri_range?: PriRange | null;
  pulsewidth_range?: PulsewidthRange | null;
  amplitude_avg?: number;
  emitter_type?: string;
  modulation_type?: string;
  elnot?: string;
  latest_timestamp: number;
}

export interface PositionReport {
  position_report_uuid: string;
  source_position_report_uuid: string;
  source_payload_uuid: string;
  position: Position;
  dof?: DOF;
  magnetic_heading?: number;
  latest_timestamp: number;
}
```

#### 6.4 UI Components

The existing table and map components can be reused with minor modifications:

1. **Tab Navigation**: Add tabs for LIVE_WORLD, ENTITY_REPORTS, POSITION_REPORTS
2. **Data Tables**: Same table structure, different data source
3. **Map Overlays**: Different colored markers for each data type
4. **Toggle Controls**: Show/hide each data type on map

#### 6.5 Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add tab navigation, new data hooks |
| `src/api/discoApi.ts` | Add entity/position report API functions |
| `src/types/entityReport.ts` | **NEW** - Entity report types |
| `src/types/positionReport.ts` | **NEW** - Position report types |
| `src/hooks/useEntityReports.ts` | **NEW** - Hook for fetching entity reports |
| `src/hooks/usePositionReports.ts` | **NEW** - Hook for fetching position reports |
| `src/components/MapView.tsx` | Add overlay layers for entity/position reports |

---

### Phase 7: Test Scenario

**Goal**: Create a specific scenario for testing the full pipeline.

#### 7.1 Scenario Configuration

```typescript
// disco_data_emulator/simulation/scenarios/EndpointTestScenario.ts

export const ENDPOINT_TEST_SCENARIO = {
  name: 'Endpoint Test Scenario',
  description: '3 DiSCO endpoints observing 100 truth entities',

  // Geographic center (South China Sea area)
  center: { latitude: 15.0, longitude: 115.0 },
  radius_km: 200,

  endpoints: [
    {
      name: 'DECEPTOR-LAND',
      domain: 'land',
      position: { latitude: 14.5, longitude: 114.5, altitude: 50 },
      speed: 0,  // Stationary
      sensorConfig: {
        max_detection_range_km: 200,
        min_detection_amplitude_dbm: -70,
        bearing_error_deg: 2,        // High accuracy
        range_error_percent: 5,
        frequency_error_mhz: 0.5,
        pri_error_us: 1,
        pulsewidth_error_us: 0.1,
        amplitude_error_db: 2
      }
    },
    {
      name: 'DECEPTOR-SEA',
      domain: 'maritime',
      position: { latitude: 15.0, longitude: 115.5, altitude: 20 },
      speed: 10,  // ~10 knots, slow patrol
      sensorConfig: {
        max_detection_range_km: 150,
        min_detection_amplitude_dbm: -65,
        bearing_error_deg: 4,        // Medium accuracy
        range_error_percent: 10,
        frequency_error_mhz: 2,
        pri_error_us: 5,
        pulsewidth_error_us: 0.5,
        amplitude_error_db: 3
      }
    },
    {
      name: 'DECEPTOR-AIR',
      domain: 'air',
      position: { latitude: 15.5, longitude: 115.0, altitude: 10000 },
      speed: 200,  // ~200 knots patrol
      sensorConfig: {
        max_detection_range_km: 300,  // Altitude advantage
        min_detection_amplitude_dbm: -60,
        bearing_error_deg: 5,         // Lower accuracy (platform motion)
        range_error_percent: 12,
        frequency_error_mhz: 3,
        pri_error_us: 8,
        pulsewidth_error_us: 0.8,
        amplitude_error_db: 4
      }
    }
  ],

  truthEntities: {
    count: 100,
    distribution: {
      land: 30,      // SAM sites, coastal radars
      maritime: 40,  // Ships with radars, comms
      air: 30        // Aircraft with radars
    },
    emitterTypes: {
      RADAR: 60,
      COMMUNICATIONS: 25,
      JAMMER: 10,
      MISSILE: 5
    }
  }
};
```

#### 7.2 Expected Data Rates

With the test scenario:
- **3 endpoints** × **100 entities** × **1 observation/second** = **~300 entity reports/second** (if all visible)
- **3 endpoints** × **1 position report/second** = **3 position reports/second**
- With visibility constraints, actual rate will be lower

#### 7.3 Memory Management

At 300 entity reports/second with a 10,000 report limit:
- Memory fills in ~33 seconds
- Oldest reports automatically purged
- Adjust limit based on available memory

---

## 7. Critical Files Reference

### 7.1 Server (disco_data_emulator)

```
server.ts                                    - Main Express server
types/
  entity.ts                                  - LiveWorldEntity type
  signal.ts                                  - Signal parameter types
  position.ts                                - Position, Ellipse, DOF types
  endpoint.ts                                - NEW: DiscoEndpoint type
  entityReport.ts                            - NEW: Entity report type
  positionReport.ts                          - NEW: Position report type

simulation/
  SimulationEngine.ts                        - Main simulation loop
  EntityManager.ts                           - Entity management
  TruthDataStore.ts                          - Truth data storage

  entities/
    BaseEntity.ts                            - Base entity class
    AirEntity.ts                             - Air entity
    LandEntity.ts                            - Land entity
    MaritimeEntity.ts                        - Maritime entity
    DiscoEndpoint.ts                         - NEW: Endpoint entity

  signals/
    EmitterProfiles.ts                       - Realistic signal profiles
    SignalGenerator.ts                       - Signal generation

  measurement/                               - NEW DIRECTORY
    VisibilityCheck.ts                       - Line-of-sight checks
    NoiseModel.ts                            - Gaussian noise generators
    MeasurementModel.ts                      - Main measurement model
    index.ts                                 - Exports

  scenarios/
    ContestedMaritimeScenario.ts             - Existing scenario
    EndpointTestScenario.ts                  - NEW: Test scenario

stores/                                      - NEW DIRECTORY
  EntityStore.ts                             - Entity report storage
  PositionStore.ts                           - Position report storage
```

### 7.2 Client (disco_live_world_client_ui)

```
src/
  App.tsx                                    - Main app (modify for tabs)

  api/
    discoApi.ts                              - API client (add new endpoints)

  types/
    entity.ts                                - Existing types
    entityReport.ts                          - NEW: Entity report types
    positionReport.ts                        - NEW: Position report types

  hooks/
    useLiveWorldData.ts                      - Existing live world hook
    useEntityReports.ts                      - NEW: Entity reports hook
    usePositionReports.ts                    - NEW: Position reports hook

  components/
    MapView.tsx                              - Map (add new layers)
```

---

## 8. Verification Plan

### 8.1 Server Health

```bash
curl http://localhost:8765/apidocs/health | jq .
```

Expected: Server status with entity/position counts.

### 8.2 Entity Reports API

```bash
# Get latest entity reports
curl http://localhost:8765/apidocs/entities/getLatest | jq .

# Verify structure
curl http://localhost:8765/apidocs/entities/getLatest | jq '.tasks[0] | keys'
# Should include: entity_msg_uuid, source_entity_uuid, source_payload_uuid, position, etc.
```

### 8.3 Position Reports API

```bash
# Get latest position reports
curl http://localhost:8765/apidocs/positionReports/getLatest | jq .

# Verify structure
curl http://localhost:8765/apidocs/positionReports/getLatest | jq '.tasks[0] | keys'
# Should include: position_report_uuid, source_payload_uuid, position, etc.
```

### 8.4 Client UI

1. Open http://localhost:3000
2. Verify three tabs: LIVE_WORLD, ENTITY_REPORTS, POSITION_REPORTS
3. Check each tab populates with data
4. Test map toggles for each data type
5. Verify different colored markers for each data source

### 8.5 Memory Management

```bash
# Monitor entity count over time
watch -n 1 'curl -s http://localhost:8765/apidocs/health | jq .simulation.entityCount'
```

Verify count stays under limit and old reports are purged.

### 8.6 End-to-End Data Flow

1. **Truth vs Measured**: Compare a live world entity position with entity report positions
   - Entity reports should have noise relative to truth
   - Different endpoints should have different noise levels

2. **Endpoint Visibility**: Verify that:
   - Land endpoint sees nearby entities
   - Air endpoint sees more distant entities (altitude advantage)
   - Entities beyond horizon are not reported

3. **UUID Tracking**: Pick an entity and verify:
   - Same source_payload_uuid for all reports from same endpoint
   - Different entity_msg_uuid for each report (server-assigned)
   - source_entity_uuid may repeat (if endpoint tracks internally)

---

## 9. Out of Scope

The following are explicitly NOT part of this implementation:

1. **Fusion Service**: Correlation and summarization of entity reports
2. **Live World from Fusion**: Populating live world from fused entity summaries
3. **Live World from Position Reports**: Auto-populating live world from position reports
4. **Mutual Endpoint Visibility**: Endpoints observing each other
5. **Position Report Noise**: Adding noise to endpoint self-locations
6. **Advanced Terrain Blocking**: Complex terrain-based visibility
7. **Pulse Data**: Raw PDW generation and storage
8. **Entity ID from Signal**: Automatic identification of emitter type from signal characteristics

These may be implemented in future phases.

---

## See Also

- [disco-data-architecture.md](disco-data-architecture.md) - Data architecture reference
- [schemas.md](schemas.md) - Detailed schema definitions
- [api-reference.md](api-reference.md) - Full API reference
