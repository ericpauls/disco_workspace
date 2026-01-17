# DiSCO Data Emulator

Mock DiSCO server generating simulated entity data for development and testing.

## Features

- **Realistic Entity Placement**: Entities are placed in geographically appropriate locations
  - Ships appear in water (oceans, near ports, along shipping lanes)
  - Land units appear on land (military sites, bases, installations)
  - Aircraft can appear anywhere with appropriate altitudes

- **Domain-Appropriate Naming**: Entity names match their domain
  - Maritime: USS Benfold (DDG-65), PLANS Nanchang (101), MV Ever Given
  - Air: HAMMER-12, PLAAF RED DRAGON, CPA881
  - Land: PATRIOT-ALPHA, PLA RED FLAG-1, THAAD-1

- **Realistic Movement**: Entities move according to their platform type
  - Ships: 15-30 knots, following shipping lanes
  - Aircraft: 300-700 knots, patrol patterns
  - Land units: Mostly stationary (SAM sites, radar)

## Quick Start

```bash
# Install dependencies
npm install

# Start server (default: stress-small scenario)
npm start

# Start with specific scenario
SCENARIO=contested-maritime npm start
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/entities` | GET | Get all entities |
| `/api/entities/getLatest` | GET | Get latest entities |
| `/api/entities/:uuid` | GET | Get entity by UUID |
| `/api/liveWorldModel` | GET | Get live world model |
| `/api/scenarios` | GET | List available scenarios |
| `/api/scenarios/:name` | POST | Switch to scenario |
| `/api/stats` | GET | Get entity statistics |

## Scenarios

| Scenario | Total Entities | Description |
|----------|----------------|-------------|
| `stress-tiny` | ~100 | Quick testing |
| `stress-small` | ~600 | Default development |
| `stress-medium` | ~3,000 | Performance testing |
| `stress-large` | ~6,000 | Load testing |
| `stress-extreme` | ~15,000 | Stress testing |
| `contested-maritime` | ~80 | Realistic SCS scenario |

## Geographic Coverage

The simulation covers the South China Sea region:
- **Bounds**: 5°N to 25°N latitude, 105°E to 125°E longitude
- **Features**:
  - Naval bases (Yulin, Zhanjiang, Subic Bay, etc.)
  - Airfields (Sanya, Clark, Kadena, etc.)
  - Shipping lanes (Malacca Strait, Taiwan Strait, Luzon Strait)
  - Disputed islands (Spratly, Paracel)

## Configuration

Environment variables:
- `PORT`: Server port (default: 8765)
- `SCENARIO`: Initial scenario (default: stress-small)

## Development

```bash
# Watch mode with hot reload
npm run dev

# Build TypeScript
npm run build
```

## Project Structure

```
disco_data_emulator/
├── src/
│   ├── server.ts                 # Express server entry point
│   └── simulation/
│       ├── geographicData.ts     # Land/sea boundaries, ports, lanes
│       ├── entityNames.ts        # Domain-appropriate naming
│       ├── entityFactory.ts      # Entity creation and movement
│       └── index.ts              # Module exports
├── package.json
├── tsconfig.json
└── README.md
```
