/**
 * Entity Factory
 *
 * Creates realistic entities with:
 * - Geographically appropriate locations (ships in water, land units on land)
 * - Domain-appropriate names (Navy ships have ship names, not army unit names)
 * - Realistic movement patterns
 * - Proper entity attributes (altitude, speed, heading, emitter characteristics)
 *
 * This module fixes the issue of mismatched names and locations (e.g., navy ships on land)
 */

import { v4 as uuidv4 } from 'uuid';
import {
  EntityDomain,
  getLocationForDomain,
  getAltitudeForDomain,
  getSpeedForDomain,
  SCENARIO_BOUNDS,
  isInWater,
  isOnLand,
  distanceKm,
} from './geographicData.js';
import {
  generateEntityName,
  resetUsedNames,
  Affiliation,
} from './entityNames.js';

/**
 * Entity types matching the DiSCO schema
 */
export type EntityType = 'Emitter' | 'Sensor' | 'Unknown';
export type EmitterType = 'RADAR' | 'COMMUNICATIONS' | 'JAMMER' | 'MISSILE';
export type Disposition = 'HOSTILE' | 'FRIENDLY' | 'NEUTRAL' | 'UNKNOWN';

/**
 * Position data
 */
export interface Position {
  latitude: number;
  longitude: number;
  altitude: number;
}

/**
 * Military view (disposition and nationality)
 */
export interface MilView {
  disposition: Disposition;
  nationality: string;
}

/**
 * Frequency range
 */
export interface FrequencyRange {
  frequency_avg: number;
  frequency_max: number;
  frequency_min: number;
}

/**
 * Complete entity data structure
 */
export interface Entity {
  source_entity_uuid: string;
  entity_name: string;
  position: Position;
  entity_type: EntityType;
  emitter_type: EmitterType;
  mil_view: MilView;
  latest_timestamp: number;

  // Extended attributes
  domain: EntityDomain;
  platform_type: string;
  callsign: string;
  heading: number;
  speed: number; // in knots
  frequency_range: FrequencyRange;

  // Movement state (for simulation)
  targetLat?: number;
  targetLon?: number;
  patrolCenter?: { lat: number; lon: number };
  patrolRadius?: number;
}

/**
 * Scenario configuration
 */
export interface ScenarioConfig {
  name: string;
  entityCounts: {
    friendlyAir: number;
    friendlyMaritime: number;
    friendlyLand: number;
    hostileAir: number;
    hostileMaritime: number;
    hostileLand: number;
    neutralAir: number;
    neutralMaritime: number;
  };
}

/**
 * Predefined scenarios
 */
export const SCENARIOS: Record<string, ScenarioConfig> = {
  'stress-tiny': {
    name: 'Stress Test (Tiny)',
    entityCounts: {
      friendlyAir: 10,
      friendlyMaritime: 15,
      friendlyLand: 10,
      hostileAir: 15,
      hostileMaritime: 20,
      hostileLand: 15,
      neutralAir: 5,
      neutralMaritime: 10,
    },
  },
  'stress-small': {
    name: 'Stress Test (Small)',
    entityCounts: {
      friendlyAir: 50,
      friendlyMaritime: 80,
      friendlyLand: 50,
      hostileAir: 80,
      hostileMaritime: 120,
      hostileLand: 80,
      neutralAir: 40,
      neutralMaritime: 100,
    },
  },
  'stress-medium': {
    name: 'Stress Test (Medium)',
    entityCounts: {
      friendlyAir: 250,
      friendlyMaritime: 400,
      friendlyLand: 250,
      hostileAir: 400,
      hostileMaritime: 600,
      hostileLand: 400,
      neutralAir: 200,
      neutralMaritime: 500,
    },
  },
  'stress-large': {
    name: 'Stress Test (Large)',
    entityCounts: {
      friendlyAir: 500,
      friendlyMaritime: 800,
      friendlyLand: 500,
      hostileAir: 800,
      hostileMaritime: 1200,
      hostileLand: 800,
      neutralAir: 400,
      neutralMaritime: 1000,
    },
  },
  'stress-extreme': {
    name: 'Stress Test (Extreme)',
    entityCounts: {
      friendlyAir: 1250,
      friendlyMaritime: 2000,
      friendlyLand: 1250,
      hostileAir: 2000,
      hostileMaritime: 3000,
      hostileLand: 2000,
      neutralAir: 1000,
      neutralMaritime: 2500,
    },
  },
  'contested-maritime': {
    name: 'Contested Maritime (South China Sea)',
    entityCounts: {
      friendlyAir: 8,
      friendlyMaritime: 12,
      friendlyLand: 8,
      hostileAir: 12,
      hostileMaritime: 18,
      hostileLand: 12,
      neutralAir: 4,
      neutralMaritime: 6,
    },
  },
};

/**
 * Generate a random heading (0-360 degrees)
 */
function randomHeading(): number {
  return Math.random() * 360;
}

/**
 * Generate frequency range based on emitter type
 */
function generateFrequencyRange(emitterType: EmitterType): FrequencyRange {
  // Frequencies in MHz
  let baseFreq: number;
  let bandwidth: number;

  switch (emitterType) {
    case 'RADAR':
      // Radar bands: L (1-2 GHz), S (2-4 GHz), C (4-8 GHz), X (8-12 GHz)
      const radarBands = [
        { base: 1500, bw: 500 },  // L-band
        { base: 3000, bw: 1000 }, // S-band
        { base: 6000, bw: 2000 }, // C-band
        { base: 10000, bw: 2000 }, // X-band
      ];
      const radar = radarBands[Math.floor(Math.random() * radarBands.length)];
      baseFreq = radar.base;
      bandwidth = radar.bw;
      break;

    case 'COMMUNICATIONS':
      // Comm bands: VHF (30-300 MHz), UHF (300-3000 MHz), SHF (3-30 GHz)
      const commBands = [
        { base: 150, bw: 100 },   // VHF
        { base: 400, bw: 200 },   // UHF lower
        { base: 1800, bw: 500 },  // UHF upper
        { base: 5000, bw: 1000 }, // SHF
      ];
      const comm = commBands[Math.floor(Math.random() * commBands.length)];
      baseFreq = comm.base;
      bandwidth = comm.bw;
      break;

    case 'JAMMER':
      // Jammers typically operate across wide bands
      baseFreq = 2000 + Math.random() * 8000; // 2-10 GHz
      bandwidth = 1000 + Math.random() * 2000; // Wide bandwidth
      break;

    case 'MISSILE':
      // Missile guidance: typically X/Ku band
      baseFreq = 10000 + Math.random() * 5000; // 10-15 GHz
      bandwidth = 500;
      break;

    default:
      baseFreq = 5000;
      bandwidth = 1000;
  }

  const frequency_avg = baseFreq + (Math.random() - 0.5) * bandwidth;
  const halfBw = bandwidth / 2;

  return {
    frequency_avg,
    frequency_min: frequency_avg - halfBw * Math.random(),
    frequency_max: frequency_avg + halfBw * Math.random(),
  };
}

/**
 * Create a single entity with appropriate domain/location/name matching
 */
export function createEntity(domain: EntityDomain, affiliation: Affiliation): Entity {
  // Generate location appropriate for domain
  const location = getLocationForDomain(domain, affiliation);

  // Generate name appropriate for domain and affiliation
  const nameData = generateEntityName(domain, affiliation);

  // Get appropriate altitude and speed
  const altitude = getAltitudeForDomain(domain, nameData.platformType);
  const speed = getSpeedForDomain(domain, nameData.platformType);

  // Map affiliation to disposition
  const disposition: Disposition = affiliation === 'UNKNOWN' ? 'UNKNOWN' : affiliation;

  const entity: Entity = {
    source_entity_uuid: uuidv4(),
    entity_name: nameData.entityName,
    position: {
      latitude: location.lat,
      longitude: location.lon,
      altitude,
    },
    entity_type: 'Emitter',
    emitter_type: nameData.emitterType,
    mil_view: {
      disposition,
      nationality: nameData.nationality,
    },
    latest_timestamp: Date.now(),
    domain,
    platform_type: nameData.platformType,
    callsign: nameData.callsign,
    heading: randomHeading(),
    speed,
    frequency_range: generateFrequencyRange(nameData.emitterType),
    patrolCenter: { lat: location.lat, lon: location.lon },
    patrolRadius: domain === 'LAND' ? 5 : domain === 'MARITIME' ? 50 : 100,
  };

  // Validate the entity placement
  validateEntityPlacement(entity);

  return entity;
}

/**
 * Validate that entity placement makes sense for its domain
 * Logs warnings if there are issues (for debugging)
 */
function validateEntityPlacement(entity: Entity): void {
  const { domain, position, entity_name } = entity;
  const { latitude, longitude } = position;

  if (domain === 'MARITIME') {
    if (!isInWater(latitude, longitude)) {
      console.warn(`[EntityFactory] Warning: Maritime entity "${entity_name}" placed on land at (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
    }
  } else if (domain === 'LAND') {
    if (!isOnLand(latitude, longitude)) {
      console.warn(`[EntityFactory] Warning: Land entity "${entity_name}" placed in water at (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
    }
  }
  // AIR domain can be anywhere
}

/**
 * Create all entities for a scenario
 */
export function createScenarioEntities(scenarioName: string = 'stress-small'): Entity[] {
  const scenario = SCENARIOS[scenarioName] || SCENARIOS['stress-small'];
  const entities: Entity[] = [];

  // Reset used names for fresh scenario
  resetUsedNames();

  console.log(`[EntityFactory] Creating scenario: ${scenario.name}`);

  // Create friendly entities
  for (let i = 0; i < scenario.entityCounts.friendlyAir; i++) {
    entities.push(createEntity('AIR', 'FRIENDLY'));
  }
  for (let i = 0; i < scenario.entityCounts.friendlyMaritime; i++) {
    entities.push(createEntity('MARITIME', 'FRIENDLY'));
  }
  for (let i = 0; i < scenario.entityCounts.friendlyLand; i++) {
    entities.push(createEntity('LAND', 'FRIENDLY'));
  }

  // Create hostile entities
  for (let i = 0; i < scenario.entityCounts.hostileAir; i++) {
    entities.push(createEntity('AIR', 'HOSTILE'));
  }
  for (let i = 0; i < scenario.entityCounts.hostileMaritime; i++) {
    entities.push(createEntity('MARITIME', 'HOSTILE'));
  }
  for (let i = 0; i < scenario.entityCounts.hostileLand; i++) {
    entities.push(createEntity('LAND', 'HOSTILE'));
  }

  // Create neutral entities
  for (let i = 0; i < scenario.entityCounts.neutralAir; i++) {
    entities.push(createEntity('AIR', 'NEUTRAL'));
  }
  for (let i = 0; i < scenario.entityCounts.neutralMaritime; i++) {
    entities.push(createEntity('MARITIME', 'NEUTRAL'));
  }

  console.log(`[EntityFactory] Created ${entities.length} entities`);
  console.log(`[EntityFactory] Domain breakdown:`);
  console.log(`  - AIR: ${entities.filter(e => e.domain === 'AIR').length}`);
  console.log(`  - MARITIME: ${entities.filter(e => e.domain === 'MARITIME').length}`);
  console.log(`  - LAND: ${entities.filter(e => e.domain === 'LAND').length}`);

  return entities;
}

/**
 * Update entity positions based on their movement patterns
 */
export function updateEntityPositions(entities: Entity[], deltaTimeMs: number): void {
  const deltaHours = deltaTimeMs / (1000 * 60 * 60);

  for (const entity of entities) {
    if (entity.speed === 0) {
      // Stationary entity (most land units)
      entity.latest_timestamp = Date.now();
      continue;
    }

    // Calculate movement in nautical miles
    const distanceNm = entity.speed * deltaHours;

    // Convert to degrees (1 degree ≈ 60 nautical miles at equator)
    const distanceDeg = distanceNm / 60;

    // Check if entity should change direction (random patrol behavior)
    if (Math.random() < 0.05) { // 5% chance per update to change course
      // Set a new target within patrol radius
      if (entity.patrolCenter && entity.patrolRadius) {
        const angle = Math.random() * 2 * Math.PI;
        const radiusDeg = entity.patrolRadius / 111; // km to degrees
        const offset = Math.random() * radiusDeg;

        entity.targetLat = entity.patrolCenter.lat + offset * Math.cos(angle);
        entity.targetLon = entity.patrolCenter.lon + offset * Math.sin(angle);

        // Calculate heading to target
        const dLat = entity.targetLat - entity.position.latitude;
        const dLon = entity.targetLon - entity.position.longitude;
        entity.heading = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
      } else {
        entity.heading = randomHeading();
      }
    }

    // Move in current heading direction
    const headingRad = entity.heading * Math.PI / 180;
    const newLat = entity.position.latitude + distanceDeg * Math.cos(headingRad);
    const newLon = entity.position.longitude + distanceDeg * Math.sin(headingRad);

    // Validate new position is appropriate for domain
    let validPosition = true;

    if (entity.domain === 'MARITIME') {
      if (!isInWater(newLat, newLon)) {
        // Ship would run aground - turn around
        entity.heading = (entity.heading + 180) % 360;
        validPosition = false;
      }
    } else if (entity.domain === 'LAND') {
      if (!isOnLand(newLat, newLon)) {
        // Land unit would enter water - stop
        validPosition = false;
      }
    }

    // Check bounds
    if (newLat < SCENARIO_BOUNDS.minLat || newLat > SCENARIO_BOUNDS.maxLat ||
        newLon < SCENARIO_BOUNDS.minLon || newLon > SCENARIO_BOUNDS.maxLon) {
      // Turn around if hitting scenario bounds
      entity.heading = (entity.heading + 180) % 360;
      validPosition = false;
    }

    if (validPosition) {
      entity.position.latitude = newLat;
      entity.position.longitude = newLon;
    }

    // Add some altitude variation for aircraft
    if (entity.domain === 'AIR' && entity.position.altitude > 0) {
      entity.position.altitude += (Math.random() - 0.5) * 100;
      entity.position.altitude = Math.max(100, entity.position.altitude);
    }

    entity.latest_timestamp = Date.now();
  }
}

/**
 * Convert entity to LiveWorldModel API format
 */
export function entityToLiveWorldModel(entity: Entity): object {
  return {
    liveworldmodel_uuid: uuidv4(),
    entity_msg_uuid: entity.source_entity_uuid,
    origin_uuid: 'disco_data_emulator',
    position: entity.position,
    frequency_range: entity.frequency_range,
    write_timestamp: Date.now(),
    initial_timestamp: entity.latest_timestamp - 3600000, // 1 hour ago
    latest_timestamp: entity.latest_timestamp,
    entity_name: entity.entity_name,
    entity_type: entity.entity_type,
    mil_view: entity.mil_view,
    group_uuid: uuidv4(),
    origin: 'simulated',
    summary: `${entity.platform_type} - ${entity.callsign}`,
    primary_designator: entity.callsign,
    secondary_designator: entity.platform_type,
    // Extended fields
    domain: entity.domain,
    heading: entity.heading,
    speed: entity.speed,
    emitter_type: entity.emitter_type,
  };
}
