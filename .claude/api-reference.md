# DiSCO API Reference

## API Overview
- **75 endpoints** across 13 API groups
- **157 schemas** for request/response models
- Base path: `/apidocs`
- Authentication: Bearer (JWT)

## API Groups

### Core Data APIs

#### entities (12 endpoints)
Primary objects representing planes, ships, vehicles on the map.
- `POST /entities` - Add new Entity
- `PUT /entities` - Update Entity
- `POST /entities/batchInsert` - Batch add Entities
- `POST /entities/getBatch` - Get batch by UUIDs
- `GET /entities/getByParams` - Query by parameters
- `GET /entities/getLatest` - Get latest Entities
- `GET /entities/getLatest/{source_entity_uuid}` - Latest by source UUID
- `GET /entities/getLatestPosition/{source_entity_uuid}` - Latest position
- `GET /entities/getPositions` - Query positions
- `GET /entities/getUuids` - List UUIDs
- `GET /entities/{entity_msg_uuid}` - Get by UUID
- `DELETE /entities/{entity_msg_uuid}` - Delete by UUID

#### eobs (6 endpoints)
Electronic Order of Battle - entity status/tracking records.
- `POST /eobs` - Add new EOB
- `PUT /eobs` - Update EOB
- `GET /eobs/getByParams` - Query by parameters
- `GET /eobs/getUuids` - List UUIDs
- `GET /eobs/{eob_uuid}` - Get by UUID
- `DELETE /eobs/{eob_uuid}` - Delete by UUID

#### payloads (7 endpoints)
Data payloads associated with entities.
- `POST /payloads` - Add new Payload
- `PUT /payloads` - Update Payload
- `GET /payloads/getByParams` - Query by parameters
- `GET /payloads/getLatest` - Get latest Payloads
- `GET /payloads/getUuids` - List UUIDs
- `GET /payloads/{source_payload_uuid}` - Get by UUID
- `DELETE /payloads/{source_payload_uuid}` - Delete by UUID

#### positionReports (11 endpoints)
Location data for entities.
- `POST /positionReports` - Add new Position Report
- `PUT /positionReports` - Update Position Report
- `POST /positionReports/batchInsert` - Batch add
- `POST /positionReports/getBatchBySource` - Get batch by source UUIDs
- `GET /positionReports/getByParams` - Query by parameters
- `GET /positionReports/getLatest` - Get latest
- `GET /positionReports/getLatestPosition/{uuid}` - Latest position
- `GET /positionReports/getPositions` - Query positions
- `GET /positionReports/getUuids` - List UUIDs
- `GET /positionReports/{uuid}` - Get by UUID
- `DELETE /positionReports/{uuid}` - Delete by UUID

#### pulses (12 endpoints)
Pulse data collections (radar/sensor data). Supports TTL variants.
- `POST /pulses` - Add new Pulse Collection
- `PUT /pulses` - Update Pulse Collection
- `POST /pulses/batchInsert` - Batch add
- `POST /pulses/getBatch` - Get batch by UUIDs
- `GET /pulses/getByParams` - Query by parameters
- `GET /pulses/getLatest` - Get latest
- `GET /pulses/getLatest/{uuid}` - Latest by UUID
- `GET /pulses/getUuids` - List UUIDs
- `GET /pulses/{uuid}` - Get by UUID
- `DELETE /pulses/{uuid}` - Delete by UUID
- `POST /ttlPulses` - Add with TTL
- `PUT /ttlPulses` - Update with TTL

### Fusion & World Model APIs

#### fusedEntityMapping (9 endpoints)
Maps relationships between fused entities.
- `POST /fusedEntityMapping` - Add new mapping
- `PUT /fusedEntityMapping` - Update mapping
- `POST /fusedEntityMapping/batchInsert` - Batch add
- `POST /fusedEntityMapping/getBatch` - Get batch by UUIDs
- `GET /fusedEntityMapping/getByParams` - Query by parameters
- `GET /fusedEntityMapping/getLatest` - Get latest
- `GET /fusedEntityMapping/getUuids` - List UUIDs
- `GET /fusedEntityMapping/{uuid}` - Get by UUID
- `DELETE /fusedEntityMapping/{uuid}` - Delete by UUID

#### fusedEntitySummary (9 endpoints)
Summary views of fused entities.
- `POST /fusedEntitySummary` - Add new summary
- `PUT /fusedEntitySummary` - Update summary
- `POST /fusedEntitySummary/batchInsert` - Batch add
- `POST /fusedEntitySummary/getBatch` - Get batch by UUIDs
- `GET /fusedEntitySummary/getByParams` - Query by parameters
- `GET /fusedEntitySummary/getLatest` - Get latest
- `GET /fusedEntitySummary/getUuids` - List UUIDs
- `GET /fusedEntitySummary/{uuid}` - Get by UUID
- `DELETE /fusedEntitySummary/{uuid}` - Delete by UUID

#### liveWorldModel (8 endpoints)
Real-time world model state. Supports TTL variants.
- `POST /liveWorldModel` - Add new record
- `PUT /liveWorldModel` - Update record
- `GET /liveWorldModel/getByParams` - Query by parameters
- `GET /liveWorldModel/getLatest` - Get latest
- `GET /liveWorldModel/getUuids` - List UUIDs by origin
- `GET /liveWorldModel/{uuid}` - Get by origin UUID
- `DELETE /liveWorldModel/{uuid}` - Delete by UUID
- `POST /ttlLiveWorldModel` - Add with TTL
- `PUT /ttlLiveWorldModel` - Update with TTL

### Specialized Data APIs

#### aisVessels (6 endpoints)
AIS (Automatic Identification System) vessel data.
- `POST /aisVessels` - Add new AIS Vessel
- `PUT /aisVessels` - Update AIS Vessel
- `GET /aisVessels/getByParams` - Query by parameters
- `GET /aisVessels/getUuids` - List UUIDs
- `GET /aisVessels/{uuid}` - Get by UUID
- `DELETE /aisVessels/{uuid}` - Delete by UUID

#### keepOutArea (5 endpoints)
Geographic exclusion zones.
- `POST /keepOutArea` - Add new Keep Out Area
- `PUT /keepOutArea` - Update Keep Out Area
- `GET /keepOutArea/getByParams` - Query by parameters
- `GET /keepOutArea/{uuid}` - Get by UUID
- `DELETE /keepOutArea/{uuid}` - Delete by UUID

### Service & Management APIs

#### algorithms (9 endpoints)
Algorithm job management and service registration.
- `GET /algorithms` - List supported algorithms
- `GET /algorithms/jobs` - List all jobs
- `POST /algorithms/jobs` - Submit new job
- `GET /algorithms/jobs/running` - List running jobs
- `PUT /algorithms/jobs/status/{job_uuid}` - Update job status
- `GET /algorithms/jobs/{job_uuid}` - Get job status
- `DELETE /algorithms/jobs/{job_uuid}` - Cancel job
- `POST /algorithms/register` - Register new service
- `DELETE /algorithms/unregister/{algorithm_uuid}` - Unregister service

#### userManagement (3 endpoints)
User and access management.
- `GET /users/getLogs` - Get access logs
- `GET /users/getUsers` - List users
- `GET /users/{username}` - Get user by username

#### health (1 endpoint)
- `GET /health` - Health check

## Common Query Parameters
Most `getByParams` endpoints support:
- `start_date` / `end_date` - Time range filtering
- `limit` - Result count limit
- `offset` - Pagination offset
- Various entity-specific filters

## Response Patterns
- Single item: Returns the object directly
- Lists: Returns `{results: [...], count: N}`
- Batch operations: Returns `{success: [...], failed: [...]}`
