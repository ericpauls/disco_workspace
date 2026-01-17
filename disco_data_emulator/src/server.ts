/**
 * DiSCO Data Emulator Server
 *
 * Mock server that generates simulated entity data for DiSCO Live World Client.
 * Provides realistic entity placement with:
 * - Ships in water (not on land)
 * - Land units on land (not in water)
 * - Aircraft anywhere with appropriate altitudes
 * - Domain-appropriate naming (Navy ships have ship names, etc.)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  Entity,
  createScenarioEntities,
  updateEntityPositions,
  entityToLiveWorldModel,
  SCENARIOS,
} from './simulation/entityFactory.js';

const app = express();
const PORT = process.env.PORT || 8765;

// Middleware
app.use(cors());
app.use(express.json());

// State
let entities: Entity[] = [];
let scenarioName = process.env.SCENARIO || 'stress-small';
let updateIntervalId: NodeJS.Timeout | null = null;
const UPDATE_INTERVAL_MS = 1000; // Update positions every second

/**
 * Initialize the scenario
 */
function initializeScenario(scenario: string): void {
  console.log(`\n========================================`);
  console.log(`[Server] Initializing scenario: ${scenario}`);
  console.log(`========================================\n`);

  entities = createScenarioEntities(scenario);
  scenarioName = scenario;

  // Log sample entities for verification
  console.log(`\n[Server] Sample entities by domain:`);

  const sampleAir = entities.find(e => e.domain === 'AIR');
  const sampleMaritime = entities.find(e => e.domain === 'MARITIME');
  const sampleLand = entities.find(e => e.domain === 'LAND');

  if (sampleAir) {
    console.log(`  AIR: "${sampleAir.entity_name}" at (${sampleAir.position.latitude.toFixed(2)}, ${sampleAir.position.longitude.toFixed(2)}) alt: ${sampleAir.position.altitude.toFixed(0)}m`);
  }
  if (sampleMaritime) {
    console.log(`  MARITIME: "${sampleMaritime.entity_name}" at (${sampleMaritime.position.latitude.toFixed(2)}, ${sampleMaritime.position.longitude.toFixed(2)})`);
  }
  if (sampleLand) {
    console.log(`  LAND: "${sampleLand.entity_name}" at (${sampleLand.position.latitude.toFixed(2)}, ${sampleLand.position.longitude.toFixed(2)})`);
  }

  console.log(`\n[Server] Entity counts by disposition:`);
  console.log(`  FRIENDLY: ${entities.filter(e => e.mil_view.disposition === 'FRIENDLY').length}`);
  console.log(`  HOSTILE: ${entities.filter(e => e.mil_view.disposition === 'HOSTILE').length}`);
  console.log(`  NEUTRAL: ${entities.filter(e => e.mil_view.disposition === 'NEUTRAL').length}`);
}

/**
 * Start the position update loop
 */
function startUpdateLoop(): void {
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
  }

  updateIntervalId = setInterval(() => {
    updateEntityPositions(entities, UPDATE_INTERVAL_MS);
  }, UPDATE_INTERVAL_MS);

  console.log(`[Server] Position update loop started (${UPDATE_INTERVAL_MS}ms interval)`);
}

// =====================================================
// API Routes
// =====================================================

/**
 * Health check
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    scenario: scenarioName,
    entityCount: entities.length,
    uptime: process.uptime(),
  });
});

/**
 * Get all entities in LiveWorldModel format
 */
app.get('/api/liveWorldModel', (_req: Request, res: Response) => {
  const liveWorldData = entities.map(entityToLiveWorldModel);
  res.json({
    results: liveWorldData,
    count: liveWorldData.length,
  });
});

/**
 * Get entities (alias for liveWorldModel)
 */
app.get('/api/entities', (_req: Request, res: Response) => {
  const liveWorldData = entities.map(entityToLiveWorldModel);
  res.json({
    results: liveWorldData,
    count: liveWorldData.length,
  });
});

/**
 * Get latest entities
 */
app.get('/api/entities/getLatest', (_req: Request, res: Response) => {
  const liveWorldData = entities.map(entityToLiveWorldModel);
  res.json({
    results: liveWorldData,
    count: liveWorldData.length,
  });
});

/**
 * Get entity by UUID
 */
app.get('/api/entities/:uuid', (req: Request, res: Response) => {
  const entity = entities.find(e => e.source_entity_uuid === req.params.uuid);
  if (entity) {
    res.json(entityToLiveWorldModel(entity));
  } else {
    res.status(404).json({ error: 'Entity not found' });
  }
});

/**
 * Get available scenarios
 */
app.get('/api/scenarios', (_req: Request, res: Response) => {
  const scenarioList = Object.entries(SCENARIOS).map(([key, config]) => ({
    id: key,
    name: config.name,
    totalEntities:
      config.entityCounts.friendlyAir +
      config.entityCounts.friendlyMaritime +
      config.entityCounts.friendlyLand +
      config.entityCounts.hostileAir +
      config.entityCounts.hostileMaritime +
      config.entityCounts.hostileLand +
      config.entityCounts.neutralAir +
      config.entityCounts.neutralMaritime,
  }));

  res.json({
    current: scenarioName,
    scenarios: scenarioList,
  });
});

/**
 * Switch scenario
 */
app.post('/api/scenarios/:scenario', (req: Request, res: Response) => {
  const newScenario = req.params.scenario;

  if (!SCENARIOS[newScenario]) {
    res.status(400).json({
      error: 'Invalid scenario',
      available: Object.keys(SCENARIOS),
    });
    return;
  }

  initializeScenario(newScenario);
  res.json({
    success: true,
    scenario: newScenario,
    entityCount: entities.length,
  });
});

/**
 * Get entity statistics
 */
app.get('/api/stats', (_req: Request, res: Response) => {
  const stats = {
    total: entities.length,
    byDomain: {
      AIR: entities.filter(e => e.domain === 'AIR').length,
      MARITIME: entities.filter(e => e.domain === 'MARITIME').length,
      LAND: entities.filter(e => e.domain === 'LAND').length,
    },
    byDisposition: {
      FRIENDLY: entities.filter(e => e.mil_view.disposition === 'FRIENDLY').length,
      HOSTILE: entities.filter(e => e.mil_view.disposition === 'HOSTILE').length,
      NEUTRAL: entities.filter(e => e.mil_view.disposition === 'NEUTRAL').length,
      UNKNOWN: entities.filter(e => e.mil_view.disposition === 'UNKNOWN').length,
    },
    byEmitterType: {
      RADAR: entities.filter(e => e.emitter_type === 'RADAR').length,
      COMMUNICATIONS: entities.filter(e => e.emitter_type === 'COMMUNICATIONS').length,
      JAMMER: entities.filter(e => e.emitter_type === 'JAMMER').length,
      MISSILE: entities.filter(e => e.emitter_type === 'MISSILE').length,
    },
    scenario: scenarioName,
    lastUpdate: new Date().toISOString(),
  };

  res.json(stats);
});

// =====================================================
// Server Startup
// =====================================================

// Parse command line arguments for scenario
const args = process.argv.slice(2);
const scenarioArg = args.find(arg => arg.startsWith('--scenario='));
if (scenarioArg) {
  scenarioName = scenarioArg.split('=')[1];
}

// Initialize and start server
initializeScenario(scenarioName);
startUpdateLoop();

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`[Server] DiSCO Data Emulator running`);
  console.log(`[Server] Port: ${PORT}`);
  console.log(`[Server] Scenario: ${scenarioName}`);
  console.log(`[Server] Entities: ${entities.length}`);
  console.log(`========================================`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  GET  /health                    - Health check`);
  console.log(`  GET  /api/entities              - Get all entities`);
  console.log(`  GET  /api/entities/getLatest    - Get latest entities`);
  console.log(`  GET  /api/entities/:uuid        - Get entity by UUID`);
  console.log(`  GET  /api/liveWorldModel        - Get live world model`);
  console.log(`  GET  /api/scenarios             - List scenarios`);
  console.log(`  POST /api/scenarios/:scenario   - Switch scenario`);
  console.log(`  GET  /api/stats                 - Get statistics`);
  console.log(`\n`);
});

export { app };
