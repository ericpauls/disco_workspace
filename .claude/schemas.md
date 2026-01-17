# DiSCO API Schemas

## Fundamental Types

### Position
Geographic location data.
```
latitude: number   - Latitude in degrees
longitude: number  - Longitude in degrees
altitude: number   - Altitude
```

### Ellipse
Uncertainty ellipse for position data.
```
orientation: number           - Ellipse orientation angle
semi_major_axis_length: number
semi_minor_axis_length: number
```

### DOF (Degrees of Freedom)
Orientation data.
```
pitch: number
roll: number
yaw: number
```

### FrequencyRange
Frequency characteristics.
```
frequency_avg: number
frequency_max: number
frequency_min: number
```

### PriRange
Pulse Repetition Interval range.
```
pri_avg: number
pri_max: number
pri_min: number
```

### PwRange
Pulse Width range.
```
pulsewidth_avg: number
pulsewidth_max: number
pulsewidth_min: number
```

## Enumerations

### EntityType
```
'Emitter' | 'Sensor' | 'Unknown'
```

### EmitterType
```
'RADAR' | 'COMMUNICATIONS' | 'JAMMER' | 'MISSILE'
```

### ModulationType
Signal modulation types:
- AM/FM/PM variants: `AM`, `FM`, `PM`, `TONEAM`, `TONEFM`
- PSK variants: `PSK`, `BPSK`, `QPSK`, `PSK_8`, `PSK_16`, `PSK_32`, `PSK_64`, `DPSK`, `OQPSK`, `PI_4_QPSK`
- FSK variants: `FSK`, `BFSK`, `QFSK`, `FSK_8`, `FSK_16`, `FSK_32`, `FSK_64`, `AFSK`, `MFSK`, `DTMF`
- Other digital: `ASK`, `OOK`, `QAM`, `CPM`, `TCM`
- MSK variants: `MSK`, `BMSK`, `QMSK`, `MSK_8`, `MSK_16`, `MSK_32`, `MSK_64`, `GMSK`, `CPFSK`
- Spread spectrum: `DSSS`, `CSS`, `FHSS`
- Other: `OFDM`, `DMT`, `WAVELET`, `SIM`, `SSB`, `SSBU`, `SSBL`
- Pulsed: `PULSED`, `CW`, `PULSE_MODULATION`, `PULSE_STAGGER`, `PULSE_DOPPLER`
- Special: `NOISE_JAM`, `CODE_MODULATION_PULSE`, `TIME_DIVISION`, `VENDORSPECIFIC`, `NONE`, `UNDETERMINED`, `UNSPECIFIED`

### MilView
Military identification.
```
disposition: string   - e.g., 'FRIENDLY', 'HOSTILE', 'NEUTRAL', 'UNKNOWN'
nationality: string   - Country/nation identifier
```

## Core Request Schemas

### EntityRequest
Required fields marked with *
```
source_entity_uuid*: string     - Unique entity identifier
source_payload_uuid*: string    - Source payload UUID
pulsedata_uuid*: string         - Associated pulse data
latest_timestamp*: integer      - Unix timestamp (ms)
position*: Position             - Entity location
ellipse*: Ellipse               - Position uncertainty
position_position_covariance*: object
elnot*: string                  - ELNOT identifier
emitter_key*: string            - Emitter key
emitter_name*: string           - Emitter name
amplitude_avg*: number          - Average signal amplitude
frequency_range*: FrequencyRange
pri_range*: PriRange
pulsewidth_range*: PwRange
data*: string                   - Additional data (JSON string)
emitter_type: EmitterType       - Optional
modulation_type: ModulationType - Optional
signal_bandwidth: object        - Optional
fingerprint_center: object      - Optional
fingerprint_dev: object         - Optional
```

### EOBRequest
Electronic Order of Battle record.
```
eob_uuid*: string
entity_msg_uuid*: string
group_uuid*: string             - Correlation group ID (from fusion service)
entity_name*: string
entity_type*: EntityType
position*: Position
initial_timestamp*: integer     - Unix timestamp (ms) of first detection
latest_timestamp*: integer      - Unix timestamp (ms) of most recent update
elnot*: string
primary_designator*: string     - Primary military unit designation
secondary_designator*: string   - Secondary military unit designation
detection_range*: object        - Sensor/emitter effective range
mil_view*: MilView
```

### PositionReportsRequest
Position tracking data.
```
source_position_report_uuid*: string
source_payload_uuid*: string
latest_timestamp*: integer
position*: Position
dof*: DOF
altitude_reference*: string
magnetic_heading*: number
```

### PulsesRequest
Raw pulse collection data.
```
source_pulsedata_uuid*: string
source_payload_uuid*: string
component_uuid*: string
latest_timestamp*: integer
position*: Position
dof*: DOF
frequency*: array        - Frequency measurements
frequency_range*: FrequencyRange
amplitude*: array        - Amplitude measurements
amplitude_avg*: number
pulsewidth*: array       - Pulse width measurements
pulsewidth_range*: PwRange
snr*: array              - Signal-to-noise measurements
aoa*: array              - Angle of arrival
toa*: array              - Time of arrival
phase*: array            - Phase measurements
data*: string            - Additional data
```

### FusedEntitySummaryRequest
Aggregated/fused entity view. Created by DiSCO's fusion service after correlating multiple raw Entity Reports.
```
group_uuid*: string              - Unique ID for this correlated entity group
group_num*: integer              - Numeric group identifier
position*: Position              - Fused position estimate
frequency_range*: FrequencyRange - Aggregated frequency characteristics
latest_timestamp*: integer       - Most recent observation time
initial_timestamp: integer       - First detection time
# Plus many optional fields from EntityRequest
entity_list: array               - List of source entity_msg_uuids that were fused
agg_sig_summary: string          - Human/machine-readable fusion state description
```

**Correlation Context**: The DiSCO Correlation Service analyzes raw Entity Reports from multiple sensors over time to determine which reports "belong together" (i.e., represent the same physical emitter). Reports deemed to correlate are assigned the same group_uuid/group_num. The Summarization Service then creates a FusedEntitySummary with triangulated position, aggregated signal characteristics, and tracking metadata.

### LiveWorldModelRequest
Real-time world state. Represents the final, canonical "live world" view - one entry per tracked entity.
```
liveworldmodel_uuid*: string     - Unique live world model identifier
entity_msg_uuid*: string         - Associated entity message UUID
origin_uuid*: string             - Origin UUID
position*: Position              - Current position
frequency_range*: FrequencyRange - Signal characteristics
write_timestamp: integer         - When record was written to database
initial_timestamp: integer       - First detection time
latest_timestamp: integer        - Most recent update time
entity_name: string              - Entity name/identifier
entity_type: EntityType          - Emitter/Sensor/Unknown
mil_view: MilView                - Disposition and nationality
group_uuid: string               - Correlation group ID (if from fusion pipeline)
origin: string                   - Origin identifier string
summary: string                  - State summary (e.g., "Tracking stable", "On patrol")
primary_designator: string       - Primary military unit designation
secondary_designator: string     - Secondary military unit designation
detection_range: object          - Sensor/emitter effective range
# Plus many optional fields similar to FusedEntitySummary
```

**Data Flow Context**: LiveWorldModel is the final output of DiSCO's fusion pipeline:
1. Raw Entity Reports → entities table
2. Correlation Service → assigns group_uuid/group_num
3. Summarization Service → creates FusedEntitySummary with triangulated data
4. Live World Model Service → maintains canonical single entry per tracked entity

**Goal**: Achieve 1:1 relationship between LiveWorldModel entries and physical entities in the real world, informed by potentially millions of raw sensor reports.

## Schema Counts by Category

| Category | Count |
|----------|-------|
| Entity | 13 |
| Position | 10 |
| Pulse | 10 |
| Fused | 10 |
| LiveWorld | 7 |
| Algorithm | 16 |
| EOB | 5 |
| Payload | 4 |
| AIS | 4 |
| KeepOut | 4 |
| User | 5 |
| Other (primitives) | 69 |
| **Total** | **157** |
