import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync, ChildProcess } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 8880;

// Read child service ports from environment (set by start scripts) with defaults
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '8765');
const EMULATOR_PORT = parseInt(process.env.EMULATOR_PORT || '8766');
const CLIENT_PORT = parseInt(process.env.CLIENT_PORT || '3000');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// SERVICE DEFINITIONS
// ============================================================

interface ServiceConfig {
  name: string;
  displayName: string;
  port: number;
  cwd: string;
  command: string;
  args: string[];
  healthUrl: string;
  dashboardUrl?: string;
  appUrl?: string;
}

interface ServiceState {
  name: string;
  displayName: string;
  port: number;
  status: 'stopped' | 'starting' | 'running' | 'error';
  pid: number | null;
  healthUrl: string;
  dashboardUrl?: string;
  appUrl?: string;
  logs: string[];
  lastHealthCheck: object | null;
  startedAt: number | null;
}

const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
  server: {
    name: 'server',
    displayName: 'Surrogate Server',
    port: SERVER_PORT,
    cwd: path.join(workspaceRoot, 'disco_surrogate_server'),
    command: 'npx',
    args: ['tsx', 'server.ts'],
    healthUrl: `http://localhost:${SERVER_PORT}/api/v1/health`,
    dashboardUrl: `http://localhost:${SERVER_PORT}/dashboard`
  },
  emulator: {
    name: 'emulator',
    displayName: 'Data Emulator',
    port: EMULATOR_PORT,
    cwd: path.join(workspaceRoot, 'disco_data_emulator'),
    command: process.platform === 'win32'
      ? path.join(workspaceRoot, 'disco_data_emulator', '.venv', 'Scripts', 'python.exe')
      : path.join(workspaceRoot, 'disco_data_emulator', '.venv', 'bin', 'python3'),
    args: ['-m', 'endpoint_emulator.emulator_server',
           '--target-server', `http://localhost:${SERVER_PORT}`],
    healthUrl: `http://localhost:${EMULATOR_PORT}/api/health`
  },
  client: {
    name: 'client',
    displayName: 'Client UI',
    port: CLIENT_PORT,
    cwd: path.join(workspaceRoot, 'disco_live_world_client_ui'),
    command: 'npm',
    args: ['run', 'dev'],
    healthUrl: `http://localhost:${CLIENT_PORT}`,
    appUrl: `http://localhost:${CLIENT_PORT}`
  }
};

// ============================================================
// PROCESS MANAGEMENT
// ============================================================

const MAX_LOG_LINES = 200;

const services: Record<string, {
  config: ServiceConfig;
  state: ServiceState;
  process: ChildProcess | null;
}> = {};

// Initialize service states
for (const [key, config] of Object.entries(SERVICE_CONFIGS)) {
  services[key] = {
    config,
    state: {
      name: config.name,
      displayName: config.displayName,
      port: config.port,
      status: 'stopped',
      pid: null,
      healthUrl: config.healthUrl,
      dashboardUrl: config.dashboardUrl,
      appUrl: config.appUrl,
      logs: [],
      lastHealthCheck: null,
      startedAt: null
    },
    process: null
  };
}

function addLog(serviceName: string, message: string): void {
  const service = services[serviceName];
  if (!service) return;

  const timestamp = new Date().toLocaleTimeString();
  const line = `[${timestamp}] ${message}`;
  service.state.logs.push(line);

  // Trim to max lines
  if (service.state.logs.length > MAX_LOG_LINES) {
    service.state.logs = service.state.logs.slice(-MAX_LOG_LINES);
  }
}

// Kill ALL processes listening on a given port (handles duplicates, orphans, external starts)
// NOTE: On Windows, start.bat already ensures ports are free before launching the dashboard,
// and taskkill requires admin privileges — so we skip port-killing on Windows entirely.
function killProcessesOnPort(port: number): number {
  if (process.platform === 'win32') {
    return 0; // Windows: start.bat already found free ports; taskkill needs admin
  }

  let killed = 0;

  try {
    const pids: number[] = [];

    // macOS/Linux: use lsof to find PIDs on the port
    const output = execSync(
      `lsof -ti :${port} -sTCP:LISTEN`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    for (const line of output.split('\n')) {
      const pid = parseInt(line.trim());
      if (pid > 0 && !pids.includes(pid)) pids.push(pid);
    }

    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGTERM');
        killed++;
      } catch {
        // Process may have already exited
      }
    }

    // If we killed anything, wait briefly then force-kill any survivors
    if (killed > 0) {
      setTimeout(() => {
        for (const pid of pids) {
          try {
            process.kill(pid, 0); // Check if still alive
            process.kill(pid, 'SIGKILL');
          } catch {
            // Already dead
          }
        }
      }, 2000);
    }
  } catch {
    // No processes found on port (lsof returns non-zero) - that's fine
  }

  return killed;
}

async function startService(serviceName: string): Promise<{ success: boolean; error?: string }> {
  const service = services[serviceName];
  if (!service) return { success: false, error: `Unknown service: ${serviceName}` };

  if (service.process) {
    return { success: false, error: `Service ${serviceName} is already running` };
  }

  const { config } = service;

  try {
    // Kill any existing processes on this port before starting
    const killed = killProcessesOnPort(config.port);
    if (killed > 0) {
      addLog(serviceName, `Cleared ${killed} existing process(es) on port ${config.port}`);
      // Brief pause to let the port free up
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    service.state.status = 'starting';
    service.state.logs = [];
    addLog(serviceName, `Starting ${config.displayName}...`);

    const childProcess = spawn(config.command, config.args, {
      cwd: config.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        PYTHONPATH: config.cwd,
        PORT: String(config.port),
        // Client needs to know the server URL for API calls
        ...(serviceName === 'client' ? {
          VITE_DISCO_API_URL: `http://127.0.0.1:${SERVER_PORT}/api/v1`,
        } : {}),
      }
    });

    service.process = childProcess;
    service.state.pid = childProcess.pid ?? null;
    service.state.startedAt = Date.now();

    // Capture stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        addLog(serviceName, line);
      }
    });

    // Capture stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        addLog(serviceName, `[ERR] ${line}`);
      }
    });

    // Handle process exit
    childProcess.on('exit', (code, signal) => {
      addLog(serviceName, `Process exited (code: ${code}, signal: ${signal})`);
      service.process = null;
      service.state.pid = null;
      service.state.status = code === 0 ? 'stopped' : 'error';
      service.state.startedAt = null;
    });

    childProcess.on('error', (err) => {
      addLog(serviceName, `Process error: ${err.message}`);
      service.process = null;
      service.state.pid = null;
      service.state.status = 'error';
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    addLog(serviceName, `Failed to start: ${msg}`);
    service.state.status = 'error';
    return { success: false, error: msg };
  }
}

async function stopService(serviceName: string): Promise<{ success: boolean; error?: string }> {
  const service = services[serviceName];
  if (!service) return { success: false, error: `Unknown service: ${serviceName}` };

  addLog(serviceName, `Stopping ${service.config.displayName}...`);

  // Step 1: Kill the tracked child process if we have one
  if (service.process) {
    service.process.kill('SIGTERM');

    // Wait up to 5 seconds for graceful exit, then force kill
    await new Promise<void>(resolve => {
      const killTimeout = setTimeout(() => {
        if (service.process) {
          addLog(serviceName, 'Force killing tracked process...');
          service.process.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      service.process!.on('exit', () => {
        clearTimeout(killTimeout);
        resolve();
      });
    });
  }

  // Step 2: Kill ANY remaining processes on this port (handles orphans, duplicates, external starts)
  const killed = killProcessesOnPort(service.config.port);
  if (killed > 0) {
    addLog(serviceName, `Killed ${killed} additional process(es) on port ${service.config.port}`);
  }

  // Ensure state is marked as stopped
  service.process = null;
  service.state.pid = null;
  service.state.status = 'stopped';
  service.state.startedAt = null;

  addLog(serviceName, `${service.config.displayName} stopped`);
  return { success: true };
}

// ============================================================
// HEALTH CHECK POLLING
// ============================================================

async function checkHealth(serviceName: string): Promise<void> {
  const service = services[serviceName];
  if (!service || !service.process) return;

  try {
    const response = await fetch(service.config.healthUrl, {
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      try {
        service.state.lastHealthCheck = await response.json();
      } catch {
        service.state.lastHealthCheck = { status: 'ok' };
      }
      service.state.status = 'running';
    } else {
      service.state.status = 'starting';
    }
  } catch {
    // Service not ready yet or unreachable
    if (service.process) {
      service.state.status = 'starting';
    }
  }
}

// Poll health every 3 seconds
setInterval(() => {
  for (const serviceName of Object.keys(services)) {
    if (services[serviceName].process) {
      checkHealth(serviceName);
    }
  }
}, 3000);

// ============================================================
// API ENDPOINTS
// ============================================================

// Get all services status
app.get('/api/services', (_req: Request, res: Response) => {
  const result = Object.values(services).map(s => s.state);
  res.json({ services: result });
});

// Get single service status
app.get('/api/services/:name', (req: Request<{ name: string }>, res: Response) => {
  const service = services[req.params.name];
  if (!service) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }
  res.json(service.state);
});

// Start a service
app.post('/api/services/:name/start', async (req: Request<{ name: string }>, res: Response) => {
  const result = await startService(req.params.name);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json({ ...result, status: services[req.params.name].state.status });
});

// Stop a service
app.post('/api/services/:name/stop', async (req: Request<{ name: string }>, res: Response) => {
  const result = await stopService(req.params.name);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

// Start all services (in order: server -> emulator -> client)
app.post('/api/services/startAll', async (_req: Request, res: Response) => {
  const results: Record<string, { success: boolean; error?: string }> = {};

  // Start server first
  results.server = await startService('server');

  // Wait for server to be healthy before starting emulator
  await new Promise(resolve => setTimeout(resolve, 3000));

  results.emulator = await startService('emulator');

  // Start client
  results.client = await startService('client');

  res.json({ results });
});

// Stop all services
app.post('/api/services/stopAll', async (_req: Request, res: Response) => {
  const results: Record<string, { success: boolean; error?: string }> = {};

  // Stop in reverse order
  results.client = await stopService('client');
  results.emulator = await stopService('emulator');
  results.server = await stopService('server');

  res.json({ results });
});

// Get logs for a service
app.get('/api/services/:name/logs', (req: Request<{ name: string }>, res: Response) => {
  const service = services[req.params.name];
  if (!service) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }

  const since = req.query.since ? parseInt(req.query.since as string) : 0;
  res.json({
    logs: service.state.logs.slice(since),
    total: service.state.logs.length
  });
});

// Dashboard health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    services: Object.fromEntries(
      Object.entries(services).map(([key, s]) => [key, s.state.status])
    )
  });
});

// ============================================================
// START DASHBOARD
// ============================================================

app.listen(PORT, () => {
  console.log(`
=====================================
  DiSCO Workspace Dashboard
=====================================
  URL: http://localhost:${PORT}

  Services:
    Server:   port ${SERVICE_CONFIGS.server.port} (${SERVICE_CONFIGS.server.cwd})
    Emulator: port ${SERVICE_CONFIGS.emulator.port} (${SERVICE_CONFIGS.emulator.cwd})
    Client:   port ${SERVICE_CONFIGS.client.port} (${SERVICE_CONFIGS.client.cwd})

  API:
    GET  /api/health
    GET  /api/services
    POST /api/services/:name/start
    POST /api/services/:name/stop
    POST /api/services/startAll
    POST /api/services/stopAll
    GET  /api/services/:name/logs
=====================================
  `);
});

// Graceful shutdown - stop all child processes AND clean up ports
function shutdown(): void {
  console.log('\nShutting down all services...');

  // Step 1: SIGTERM tracked child processes
  for (const service of Object.values(services)) {
    if (service.process) {
      service.process.kill('SIGTERM');
    }
  }

  // Step 2: After 5 seconds, force kill any remaining processes on all service ports
  setTimeout(() => {
    for (const service of Object.values(services)) {
      if (service.process) {
        service.process.kill('SIGKILL');
      }
      // Kill anything else on the port (orphans, duplicates)
      killProcessesOnPort(service.config.port);
    }
    process.exit(0);
  }, 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
