# DiSCO Data Emulator

Mock DiSCO server generating simulated entity data with realistic placement.

## Key Architecture

### Entity Factory (`src/simulation/entityFactory.ts`)

Creates entities with proper domain/location matching:
- **MARITIME** entities always placed in water (validated against land polygons)
- **LAND** entities always placed on land (validated against land polygons)
- **AIR** entities can be anywhere with appropriate altitudes

### Geographic Data (`src/simulation/geographicData.ts`)

Contains:
- Land/sea boundary polygons for South China Sea region
- Naval bases and ports (Yulin, Subic Bay, Kaohsiung, etc.)
- Airfields (Sanya, Clark, Kadena, etc.)
- Shipping lanes (Malacca, Taiwan Strait, Luzon Strait)
- Military installation sites

### Entity Names (`src/simulation/entityNames.ts`)

Domain-appropriate naming:
- **Maritime FRIENDLY**: USS ship names with hull numbers (DDG-XX, CG-XX)
- **Maritime HOSTILE**: PLANS ship names with Chinese hull numbers
- **Maritime NEUTRAL**: Commercial vessels (MV, MT prefixes)
- **Air FRIENDLY**: Call signs (HAMMER, VIPER) + flight numbers
- **Air HOSTILE**: PLAAF/PLAN designations
- **Land**: SAM battery names, radar station IDs

## Running

```bash
npm install
npm start                              # Default scenario
SCENARIO=contested-maritime npm start  # Specific scenario
```

## API

```bash
# Get entities
curl http://localhost:8765/api/entities

# Get stats
curl http://localhost:8765/api/stats

# Switch scenario
curl -X POST http://localhost:8765/api/scenarios/contested-maritime
```

## Adding New Platforms

To add new platform types, edit `src/simulation/entityNames.ts`:

```typescript
const FRIENDLY_MARITIME_PLATFORMS: PlatformDef[] = [
  {
    type: 'New Ship Class',
    prefix: 'USS',
    names: ['Ship1', 'Ship2'],
    hullNumbers: ['DDG-XX', 'DDG-YY'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  // ...
];
```

## Troubleshooting

### Ships appearing on land
- Check `isInWater()` function in geographicData.ts
- Verify land polygon boundaries are correct
- Entity factory retries up to 100 times to find valid placement

### Land units in water
- Check `isOnLand()` function in geographicData.ts
- Verify military site coordinates are correct
