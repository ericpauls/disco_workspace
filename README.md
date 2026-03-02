# DiSCO Workspace

A unified development environment for the DiSCO (Distributed Intelligence, Surveillance, and Communications Operations) data visualization system. This workspace orchestrates four components — a surrogate API server, a data emulator, a React client UI, and an orchestration dashboard — via git submodules and a unified start script.

## Overview

| Component | Description | Default Port |
|-----------|-------------|--------------|
| **Orchestration Dashboard** | Web UI for managing and monitoring all services | 8880 |
| **disco_surrogate_server** | Local mock of the real DiSCO API server + built-in data dashboard | 8765 |
| **disco_data_emulator** | Scenario-driven simulation engine that generates entity/position data | 8766 |
| **disco_live_world_client_ui** | React map UI for real-time entity visualization | 3000 |

## Prerequisites

- **Node.js**: v18+ (recommended v25.2.1+)
- **Python 3**: v3.10+ (for the data emulator)
- **npm**: comes with Node.js
- **Git**: for submodule management

Verify your installation:

```bash
node --version      # Should show v18.x.x or higher
python3 --version   # Should show 3.10.x or higher
git --version       # Any recent version
```

## Quick Start

### Option A: Unified Start Script (Recommended)

The start script handles everything — dependency checks, installation prompts, building, and launching all services:

```bash
# macOS / Linux
./start.sh

# Windows
start.bat
```

On first run the script will:
1. Check git submodules are initialized (prompts to fix if not)
2. Detect missing npm dependencies for all 4 projects and prompt to install
3. Detect missing Python virtual environment for the emulator and prompt to set up
4. Build the surrogate server's dashboard UI if the bundle is missing
5. Start the orchestration dashboard (port 8880), which auto-starts all 3 services
6. Open the dashboard in your browser

### Option B: Manual Setup (First Time)

If you prefer to set up manually, or if the start script encounters issues:

```bash
# 1. Clone and initialize submodules
git clone <repository-url>
cd disco_workspace
git submodule update --init --recursive

# 2. Install npm dependencies (4 projects)
cd dashboard && npm install && cd ..
cd disco_surrogate_server && npm install && cd ..
cd disco_surrogate_server/dashboard-ui && npm install && cd ..
cd disco_live_world_client_ui && npm install && cd ..

# 3. Set up Python virtual environment for the emulator
cd disco_data_emulator
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
deactivate
cd ..

# 4. Build the surrogate server's dashboard UI (one-time)
cd disco_surrogate_server/dashboard-ui && npm run build && cd ../..

# 5. Start everything
./start.sh                       # or start.bat on Windows
```

### After Pulling / Switching Branches

Always sync submodules after pulling or changing branches:

```bash
git pull
git submodule update --init --recursive
```

If dependencies changed, re-run the start script with `--force-install` or manually `npm install` in the affected project(s).

## Start Script Options

```bash
./start.sh --help                # Show all options
./start.sh --dashboard-only      # Start only the dashboard (manage services manually)
./start.sh --force-install       # Reinstall all dependencies
./start.sh --no-browser          # Don't open browser automatically
./start.sh --skip-install        # Fail if any deps are missing (CI mode)
```

## Using the Dashboard

Once running, open **http://127.0.0.1:8880** (opens automatically).

The orchestration dashboard shows:
- **Service status** — start/stop/monitor each service individually
- **Simulation control** — select a scenario config and start/stop simulations
- **Data flow** — visual diagram of data flowing between emulator → server → client
- **Service logs** — real-time log output from all services

### Starting a Simulation

1. Select a scenario from the dropdown (e.g., "correlation-test")
2. Click "Start Simulation"
3. Open the **Client UI** at http://127.0.0.1:3000 to see entities on the map
4. Open the **Server Dashboard** at http://127.0.0.1:8765/dashboard for data statistics

### Available Scenarios

| Scenario | Entities | Endpoints | Description |
|----------|----------|-----------|-------------|
| `debug-single` | 1 | 1 | Minimal — geolocation debug |
| `lob-test` | 1 | 4 | LOB visualization test |
| `sample-dees-config` | 20 | 3 | Demo with air/maritime/land endpoints |
| `endpoint-test` | 100 | 3 | South China Sea scenario |
| `correlation-test` | 100 | 12 | Full DF/AOA correlation scenario |
| `stress-tiny` | 100 | 0 | Quick sanity check |
| `stress-tiny-fast` | 100 | 0 | Trail visualization (1000x speed) |
| `density-gradient` | 200 | 10 | Gaussian-cluster density test |
| `stress-small` | 1,000 | 0 | Typical development |
| `stress-small-fast` | 1,000 | 0 | Trail stress testing (1000x speed) |
| `stress-medium` | 5,000 | 0 | Moderate load testing |
| `stress-large` | 10,000 | 0 | Heavy load testing |
| `stress-extreme` | 25,000 | 0 | Maximum stress testing |
| `contested-maritime` | 85 | 0 | Realistic Indo-Pacific scenario |

To generate new scenario configs: `cd disco_data_emulator && ./generate-config.sh`

## Individual Service Commands

### Surrogate Server

```bash
cd disco_surrogate_server
npm run dev          # Start with file watching (port 8765)
npm start            # Start without file watching
```

The server dashboard (data statistics, heatmap, rates) is at http://127.0.0.1:8765/dashboard.

### Data Emulator

```bash
cd disco_data_emulator
source .venv/bin/activate
PYTHONUNBUFFERED=1 PYTHONPATH="." python3 -m endpoint_emulator.emulator_server
# Runs on port 8766, API at http://127.0.0.1:8766/api
```

### Client UI

```bash
cd disco_live_world_client_ui
npm run dev          # Vite dev server on port 3000
```

## Project Structure

```
disco_workspace/
├── start.sh / start.bat          # Unified launcher (handles deps + startup)
├── README.md                     # This file
├── dashboard/                    # Orchestration dashboard (port 8880)
│   ├── server.ts                 # Express server managing all services
│   └── public/                   # Dashboard web UI
├── disco_surrogate_server/       # Surrogate DiSCO API server (port 8765)
│   ├── server.ts                 # Express API server
│   ├── dashboard-ui/             # React SPA for server data dashboard
│   │   ├── src/                  # React/TypeScript source
│   │   └── vite.config.ts        # Builds to ../public/
│   └── public/                   # Built dashboard assets (served at /dashboard)
├── disco_data_emulator/          # Scenario simulation engine (port 8766)
│   ├── endpoint_emulator/        # Flask server + simulation engine
│   ├── scenario_generator/       # Config generation from Python templates
│   ├── configs/                  # Generated JSON scenario configs
│   └── .venv/                    # Python virtual environment
├── disco_live_world_client_ui/   # React client UI (port 3000)
│   ├── src/                      # React source code
│   └── javascript-client/        # Canonical DiSCO API reference
├── docs/                         # Architecture diagrams
│   ├── c4-architecture-diagram.md
│   ├── data-architecture-erd.md
│   └── system-architecture-diagram.md
└── .claude/                      # Development docs and project memory
    ├── CLAUDE.md                 # AI assistant instructions
    └── archive/                  # Detailed architecture docs
```

## API Endpoints

When the surrogate server is running:

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Server health, data counts, prototype capabilities |
| `GET /api/v1/liveWorldModel/getLatest` | Current live world entities |
| `GET /api/v1/entityReport/getLatest` | Recent entity reports |
| `GET /api/v1/positionReport/getLatest` | Recent position reports |
| `GET /dashboard` | Server data dashboard (React SPA) |

## Troubleshooting

### Port Already in Use

The start script automatically detects and offers to kill processes on occupied ports. For manual cleanup:

```bash
lsof -i :8765 -i :8766 -i :3000 -i :8880    # Find processes
kill <PID>                                      # Stop a process
```

### Dependencies Missing

```bash
# Reinstall everything
./start.sh --force-install

# Or manually for a specific project
cd disco_surrogate_server && npm install
cd disco_surrogate_server/dashboard-ui && npm install && npm run build
cd disco_live_world_client_ui && npm install
cd disco_data_emulator && source .venv/bin/activate && pip install -r requirements.txt
```

### Server Dashboard Shows Blank Page

The surrogate server dashboard is a React SPA that must be built before use:

```bash
cd disco_surrogate_server/dashboard-ui
npm install       # If node_modules is missing
npm run build     # Builds to ../public/assets/
```

The start script does this automatically. If the dashboard page is blank, the JS bundle is likely missing from `disco_surrogate_server/public/assets/`.

### Submodules Not Initialized

```bash
git submodule update --init --recursive
```

### Python Virtual Environment Issues

```bash
cd disco_data_emulator
rm -rf .venv                          # Start fresh
python3 -m venv .venv
source .venv/bin/activate             # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Documentation

Architecture and design documentation:

- `docs/c4-architecture-diagram.md` — C4 model (context, container, component)
- `docs/data-architecture-erd.md` — Entity relationship diagram with UUID system
- `docs/system-architecture-diagram.md` — System flowchart and data flows
- `.claude/archive/disco-data-architecture.md` — Complete data architecture reference
- `.claude/archive/disco-overview.md` — Product context and background
- `.claude/archive/known-issues.md` — Known bugs and limitations
