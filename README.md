# DiSCO Workspace

A unified development environment for the DiSCO (Distributed Intelligence, Surveillance, and Communications Operations) data visualization system. This workspace contains both the server emulator and client UI as git submodules.

## Overview

| Component | Description | Default Port |
|-----------|-------------|--------------|
| **disco_data_emulator** | Mock DiSCO server generating simulated entity data | 8765 |
| **disco_live_world_client_ui** | React UI for real-time map visualization | 3000 |

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: For submodule management

Verify your installation:

```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show v9.x.x or higher
git --version     # Any recent version
```

## Quick Start

### Initial Setup (First Time Only)

After cloning the repository, initialize the submodules and install dependencies:

```bash
# 1. Clone the repository (if not already done)
git clone <repository-url>
cd disco_workspace

# 2. Initialize and update submodules
git submodule update --init --recursive

# 3. Install dependencies for both projects
cd disco_data_emulator && npm install && cd ..
cd disco_live_world_client_ui && npm install && cd ..
```

Or use the unified start script (it will prompt to install dependencies):

```bash
./start.sh
```

### Starting Both Services

The easiest way to run both services is with the unified start script:

```bash
./start.sh
```

This will:
1. Check for existing processes on ports 8765 and 3000
2. Kill any existing processes (with notification)
3. Verify dependencies are installed
4. Start the server and wait for it to be ready
5. Start the client
6. Display status URLs
7. Handle Ctrl+C gracefully to stop both

### Start Script Options

```bash
./start.sh --help                    # Show all options
./start.sh --scenario stress-tiny    # Use 100 entities (faster startup)
./start.sh --server-port 9000        # Custom server port
./start.sh --client-port 4000        # Custom client port
./start.sh --force-install           # Reinstall all dependencies
```

### Available Scenarios

| Scenario | Entities | Use Case |
|----------|----------|----------|
| `stress-tiny` | 100 | Quick testing |
| `stress-tiny-fast` | 100 | Trail visualization testing (1000x speed) |
| `stress-small` | 1,000 | **Default** - typical development |
| `stress-small-fast` | 1,000 | Trail stress testing (1000x speed) |
| `stress-medium` | 5,000 | Moderate load testing |
| `stress-large` | 10,000 | Heavy load testing |
| `stress-extreme` | 25,000 | Maximum stress testing |
| `contested-maritime` | 80 | Realistic South China Sea scenario |

## Individual Project Commands

### Server (disco_data_emulator)

```bash
cd disco_data_emulator

# Using npm
npm start                           # Default configuration
npm start -- stress-medium          # Custom scenario
PORT=9000 npm start                 # Custom port

# Using start script
./start.sh                          # Default: port 8765, 1K entities
./start.sh --scenario stress-tiny   # 100 entities
./start.sh --port 9000              # Custom port
```

### Client (disco_live_world_client_ui)

```bash
cd disco_live_world_client_ui

# Using npm
npm run dev                         # Default configuration
npm run dev -- --port 4000          # Custom port

# Using start script (if available)
./start.sh                          # Default: port 3000
```

## Port Information

| Service | Default Port | Description |
|---------|--------------|-------------|
| Server API | 8765 | DiSCO API endpoints at `/api/v1/*` |
| Client UI | 3000 | React development server |

### API Endpoints

When the server is running, the following endpoints are available:

- **Health Check**: http://127.0.0.1:8765/api/v1/health
- **Entity Data**: http://127.0.0.1:8765/api/v1/liveWorldModel/getLatest
- **Simulation Status**: http://127.0.0.1:8765/api/v1/simulation/status

## Troubleshooting

### Port Already in Use

**Symptom**: Error message about port being in use

**Solution**: The unified `./start.sh` script automatically handles this. For manual cleanup:

```bash
# Find process using the port
lsof -i :8765

# Kill the process
kill <PID>

# Or force kill
kill -9 <PID>
```

### Dependencies Missing

**Symptom**: "Module not found" or "command not found" errors (e.g., `tsx: command not found`, `vite: command not found`)

**Solution**:

```bash
# Reinstall dependencies for both projects
cd disco_data_emulator && npm install && cd ..
cd disco_live_world_client_ui && npm install && cd ..

# Or use the force-install option
./start.sh --force-install
```

### Submodules Not Initialized

**Symptom**: Empty project directories or "directory not found" errors

**Solution**:

```bash
git submodule update --init --recursive
```

### Server Not Responding

**Symptom**: Client shows connection errors or server health check fails

**Solutions**:

1. Ensure server is running:
   ```bash
   curl http://127.0.0.1:8765/api/v1/health
   ```

2. Check server logs for errors

3. Verify correct port configuration

### Client Not Loading

**Symptom**: Browser shows blank page or connection errors

**Solutions**:

1. Check browser console for errors (F12 -> Console)
2. Verify client URL: http://127.0.0.1:3000
3. Ensure server is running first
4. Try clearing browser cache

### Node Version Issues

**Symptom**: Syntax errors or unexpected behavior

**Solution**: Ensure Node.js v18+:

```bash
# Check current version
node --version

# If using nvm, switch to v18+
nvm use 18
```

## Project Structure

```
disco_workspace/
├── start.sh                      # Unified launcher script
├── README.md                     # This file
├── .gitmodules                   # Submodule configuration
├── .gitignore                    # Git ignore rules
├── .claude/                      # Shared documentation
│   ├── CLAUDE.md                 # Project overview
│   ├── api-reference.md          # DiSCO API documentation
│   ├── schemas.md                # Entity data models
│   └── ...                       # Additional docs
├── disco_data_emulator/          # Server submodule
│   ├── start.sh                  # Server start script
│   ├── server.ts                 # Express server entry
│   ├── simulation/               # Simulation engine
│   └── ...
└── disco_live_world_client_ui/   # Client submodule
    ├── src/                      # React source code
    ├── vite.config.js            # Vite configuration
    └── ...
```

## Development Workflow

### Updating Submodules

To pull the latest changes for both submodules:

```bash
git submodule update --remote
```

### Making Changes

Each submodule has its own git repository. Make commits within each project:

```bash
# Server changes
cd disco_data_emulator
git add .
git commit -m "Your message"
git push

# Client changes
cd disco_live_world_client_ui
git add .
git commit -m "Your message"
git push

# Update workspace to point to new commits
cd ..
git add disco_data_emulator disco_live_world_client_ui
git commit -m "Update submodules"
git push
```

## Documentation

Additional documentation is available in the `.claude/` directory:

- `CLAUDE.md` - Project overview and quick reference
- `api-reference.md` - Complete DiSCO API documentation
- `schemas.md` - Entity data models and schemas
- `disco-overview.md` - Product context and background
- `known-issues.md` - Known bugs and limitations
- `client-roadmap.md` - Development roadmap
