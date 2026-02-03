// DiSCO Workspace Dashboard JavaScript

const API_BASE = '/api';
const REFRESH_INTERVAL = 3000;

let activeLogTab = 'server';
let autoScroll = true;
let lastLogCounts = { server: 0, emulator: 0, client: 0 };
let scenariosLoaded = false;
let scenariosList = [];
let currentSimState = null; // 'running', 'idle', null

// ============================================================
// DOM ELEMENTS
// ============================================================

const elements = {
  btnStartAll: document.getElementById('btn-start-all'),
  btnStopAll: document.getElementById('btn-stop-all'),
  btnPauseSim: document.getElementById('btn-pause-sim'),
  btnResumeSim: document.getElementById('btn-resume-sim'),
  logContent: document.getElementById('log-content'),
  logOutput: document.getElementById('log-output'),

  // Server card
  serverStatusDot: document.getElementById('server-status-dot'),
  serverStatusText: document.getElementById('server-status-text'),
  serverLiveworldCount: document.getElementById('server-liveworld-count'),
  serverEntityCount: document.getElementById('server-entity-count'),
  serverPositionCount: document.getElementById('server-position-count'),
  serverUptime: document.getElementById('server-uptime'),
  serverMemory: document.getElementById('server-memory'),
  serverDbSize: document.getElementById('server-db-size'),
  btnClearDb: document.getElementById('btn-clear-db'),

  // Emulator card
  emulatorStatusDot: document.getElementById('emulator-status-dot'),
  emulatorStatusText: document.getElementById('emulator-status-text'),
  emulatorScenario: document.getElementById('emulator-scenario'),
  emulatorEntityCount: document.getElementById('emulator-entity-count'),
  emulatorEndpointCount: document.getElementById('emulator-endpoint-count'),
  emulatorTick: document.getElementById('emulator-tick'),
  emulatorMemory: document.getElementById('emulator-memory'),

  // Client card
  clientStatusDot: document.getElementById('client-status-dot'),
  clientStatusText: document.getElementById('client-status-text'),

  // Scenario panel
  scenarioSelect: document.getElementById('scenario-select'),
  scenarioDescription: document.getElementById('scenario-description'),
  scenarioStatusText: document.getElementById('scenario-status-text'),
  btnStartSim: document.getElementById('btn-start-sim'),
  btnStopSim: document.getElementById('btn-stop-sim'),

  // Flow diagram
  flowEmulator: document.getElementById('flow-emulator'),
  flowServer: document.getElementById('flow-server'),
  flowClient: document.getElementById('flow-client'),
  flowArrowEmSrv: document.getElementById('flow-arrow-em-srv'),
  flowArrowCliSrv: document.getElementById('flow-arrow-cli-srv')
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatUptime(ms) {
  if (!ms) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatNumber(num) {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString();
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Only update DOM element text if the value actually changed
function setText(el, value) {
  if (el && el.textContent !== value) {
    el.textContent = value;
  }
}

// Only update DOM element className if the value actually changed
function setClass(el, value) {
  if (el && el.className !== value) {
    el.className = value;
  }
}

// Only update DOM element attribute if the value actually changed
function setAttr(el, attr, value) {
  if (el && el.getAttribute(attr) !== value) {
    el.setAttribute(attr, value);
  }
}

// ============================================================
// API CALLS
// ============================================================

async function fetchServices() {
  try {
    const response = await fetch(`${API_BASE}/services`);
    if (!response.ok) throw new Error('Failed to fetch services');
    return await response.json();
  } catch (error) {
    console.error('Error fetching services:', error);
    return null;
  }
}

async function fetchLogs(serviceName) {
  try {
    const since = lastLogCounts[serviceName] || 0;
    const response = await fetch(`${API_BASE}/services/${serviceName}/logs?since=${since}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return await response.json();
  } catch (error) {
    console.error('Error fetching logs:', error);
    return null;
  }
}

async function serviceAction(serviceName, action) {
  try {
    const response = await fetch(`${API_BASE}/services/${serviceName}/${action}`, { method: 'POST' });
    return await response.json();
  } catch (error) {
    console.error(`Error ${action} ${serviceName}:`, error);
    return null;
  }
}

async function startAll() {
  try {
    const response = await fetch(`${API_BASE}/services/startAll`, { method: 'POST' });
    return await response.json();
  } catch (error) {
    console.error('Error starting all:', error);
    return null;
  }
}

async function stopAll() {
  try {
    const response = await fetch(`${API_BASE}/services/stopAll`, { method: 'POST' });
    return await response.json();
  } catch (error) {
    console.error('Error stopping all:', error);
    return null;
  }
}

async function pauseSimulation() {
  try {
    await fetch('http://localhost:8766/api/simulation/pause', { method: 'POST' });
  } catch (error) {
    console.error('Error pausing simulation:', error);
  }
}

async function resumeSimulation() {
  try {
    await fetch('http://localhost:8766/api/simulation/resume', { method: 'POST' });
  } catch (error) {
    console.error('Error resuming simulation:', error);
  }
}

async function fetchScenarios() {
  try {
    const response = await fetch('http://localhost:8766/api/scenarios');
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function startSimulationWithScenario(scenarioKey) {
  try {
    const response = await fetch('http://localhost:8766/api/simulation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenarioKey })
    });
    return await response.json();
  } catch (error) {
    console.error('Error starting simulation:', error);
    return null;
  }
}

async function stopSimulation() {
  try {
    const response = await fetch('http://localhost:8766/api/simulation/stop', { method: 'POST' });
    return await response.json();
  } catch (error) {
    console.error('Error stopping simulation:', error);
    return null;
  }
}

async function fetchEmulatorSimStatus() {
  try {
    const response = await fetch('http://localhost:8766/api/status');
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchServerMemory() {
  try {
    const response = await fetch('http://localhost:8765/apidocs/server/memory');
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchEmulatorMemory() {
  try {
    const response = await fetch('http://localhost:8766/api/memory');
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function clearDatabase() {
  try {
    const response = await fetch('http://localhost:8765/apidocs/server/clearStores', { method: 'POST' });
    return await response.json();
  } catch (error) {
    console.error('Error clearing database:', error);
    return null;
  }
}

// ============================================================
// UI UPDATE FUNCTIONS
// ============================================================

function updateServiceCard(serviceName, state) {
  const card = document.querySelector(`.service-card[data-service="${serviceName}"]`);
  if (!card) return;

  setAttr(card, 'data-status', state.status);

  // Status dot and text
  const statusDot = elements[`${serviceName}StatusDot`];
  const statusText = elements[`${serviceName}StatusText`];

  setClass(statusDot, `status-dot ${state.status}`);
  if (statusText) {
    const label = state.status.charAt(0).toUpperCase() + state.status.slice(1);
    setText(statusText, label);
    setClass(statusText, `status-text ${state.status}`);
  }

  // Service-specific stats from health check
  const health = state.lastHealthCheck;

  if (serviceName === 'server' && health) {
    const serverData = health.server || health;
    setText(elements.serverLiveworldCount, formatNumber(serverData.liveWorldEntityCount));
    setText(elements.serverEntityCount, formatNumber(serverData.entityReportCount));
    setText(elements.serverPositionCount, formatNumber(serverData.positionReportCount));
    setText(elements.serverUptime, formatUptime(serverData.uptime));
  }

  if (serviceName === 'emulator' && health) {
    setText(elements.emulatorScenario, health.scenario || '-');
  }
}

function updateFlowDiagram(servicesData) {
  if (!servicesData) return;

  const serverRunning = servicesData.find(s => s.name === 'server')?.status === 'running';
  const emulatorRunning = servicesData.find(s => s.name === 'emulator')?.status === 'running';
  const clientRunning = servicesData.find(s => s.name === 'client')?.status === 'running';

  setClass(elements.flowServer, `flow-node ${serverRunning ? 'active' : 'inactive'}`);
  setClass(elements.flowEmulator, `flow-node ${emulatorRunning ? 'active' : 'inactive'}`);
  setClass(elements.flowClient, `flow-node ${clientRunning ? 'active' : 'inactive'}`);

  setClass(elements.flowArrowEmSrv, `flow-arrow ${emulatorRunning && serverRunning ? 'active' : ''}`);
  setClass(elements.flowArrowCliSrv, `flow-arrow ${clientRunning && serverRunning ? 'active' : ''}`);
}

async function updateScenarioPanel(emulatorStatus) {
  if (emulatorStatus !== 'running') {
    // Emulator process not running - disable everything
    elements.scenarioSelect.disabled = true;
    if (!scenariosLoaded) {
      elements.scenarioSelect.innerHTML = '<option value="">-- Emulator not running --</option>';
    }
    elements.btnStartSim.disabled = true;
    elements.btnStopSim.disabled = true;
    setText(elements.scenarioDescription, 'Start the emulator to see available scenarios.');
    setText(elements.scenarioStatusText, 'Emulator offline');
    setClass(elements.scenarioStatusText, 'scenario-status');
    scenariosLoaded = false;
    currentSimState = null;
    return;
  }

  // Emulator is running - load scenarios if not already loaded
  if (!scenariosLoaded) {
    const data = await fetchScenarios();
    if (data && data.scenarios) {
      scenariosList = data.scenarios;
      elements.scenarioSelect.innerHTML = '';
      for (const s of data.scenarios) {
        const opt = document.createElement('option');
        opt.value = s.key;
        opt.textContent = s.isDefault ? `${s.name} (default)` : s.name;
        elements.scenarioSelect.appendChild(opt);
      }
      // Pre-select the default
      if (data.defaultScenario) {
        elements.scenarioSelect.value = data.defaultScenario;
      }
      updateScenarioDescription();
      scenariosLoaded = true;
    }
  }

  // Check simulation state from emulator status API (also updates emulator card stats)
  const statusData = await fetchEmulatorSimStatus();
  if (!statusData) return;

  updateEmulatorStats(statusData);

  if (statusData.running) {
    currentSimState = 'running';
    elements.scenarioSelect.disabled = true;
    elements.btnStartSim.disabled = true;
    elements.btnStopSim.disabled = false;
    setText(elements.scenarioStatusText, `Running: ${statusData.scenario}`);
    setClass(elements.scenarioStatusText, 'scenario-status running');
    // Sync dropdown to current scenario (scenario field is the name, not key)
    const match = scenariosList.find(s => s.name === statusData.scenario);
    if (match) elements.scenarioSelect.value = match.key;
  } else if (!statusData.scenario || statusData.scenario === 'None') {
    // Idle - no simulation loaded
    currentSimState = 'idle';
    elements.scenarioSelect.disabled = false;
    elements.btnStartSim.disabled = false;
    elements.btnStopSim.disabled = true;
    setText(elements.scenarioStatusText, 'Idle - select a scenario');
    setClass(elements.scenarioStatusText, 'scenario-status idle');
  } else {
    // Paused (simulation object exists but not ticking)
    currentSimState = 'paused';
    elements.scenarioSelect.disabled = true;
    elements.btnStartSim.disabled = true;
    elements.btnStopSim.disabled = false;
    setText(elements.scenarioStatusText, `Paused: ${statusData.scenario}`);
    setClass(elements.scenarioStatusText, 'scenario-status');
  }
}

function updateScenarioDescription() {
  const key = elements.scenarioSelect.value;
  const scenario = scenariosList.find(s => s.key === key);
  setText(elements.scenarioDescription, scenario ? scenario.description : '');
}

function updateLogs(logData) {
  if (!logData || !elements.logContent) return;

  if (logData.logs.length === 0) return;

  // Append only new lines
  const fragment = document.createDocumentFragment();
  for (const line of logData.logs) {
    fragment.appendChild(document.createTextNode(line + '\n'));
  }
  elements.logContent.appendChild(fragment);

  // Update the count so next fetch only gets new lines
  lastLogCounts[activeLogTab] = (lastLogCounts[activeLogTab] || 0) + logData.logs.length;

  // Auto-scroll to bottom
  if (autoScroll) {
    elements.logOutput.scrollTop = elements.logOutput.scrollHeight;
  }
}

// When switching log tabs, reload all logs for the new tab
function switchLogTab(tabName) {
  activeLogTab = tabName;
  lastLogCounts[tabName] = 0;
  elements.logContent.textContent = '';
  refreshLogs();
}

async function refreshLogs() {
  const logData = await fetchLogs(activeLogTab);
  updateLogs(logData);
}

// Update emulator card stats from status data (shared with scenario panel)
function updateEmulatorStats(statusData) {
  if (!statusData) return;
  setText(elements.emulatorScenario, statusData.scenario || '-');
  setText(elements.emulatorEntityCount, formatNumber(statusData.totalEntities));
  setText(elements.emulatorEndpointCount, formatNumber(statusData.endpointCount));
  setText(elements.emulatorTick, formatNumber(statusData.tickCount));
}

// ============================================================
// REFRESH LOOP
// ============================================================

async function refreshAll() {
  const data = await fetchServices();
  if (!data) return;

  for (const service of data.services) {
    updateServiceCard(service.name, service);
  }

  updateFlowDiagram(data.services);

  // Update scenario panel based on emulator state
  const emulatorState = data.services.find(s => s.name === 'emulator');
  const emulatorStatus = emulatorState ? emulatorState.status : 'stopped';
  await updateScenarioPanel(emulatorStatus);

  // Poll memory endpoints for running services
  const serverRunning = data.services.find(s => s.name === 'server')?.status === 'running';
  const emulatorRunning = data.services.find(s => s.name === 'emulator')?.status === 'running';

  if (serverRunning) {
    const memData = await fetchServerMemory();
    if (memData) {
      setText(elements.serverMemory, formatBytes(memData.rss));
      const dbText = `${formatBytes(memData.dbSizeBytes)} / ${formatBytes(memData.dbSizeLimitBytes)}`;
      setText(elements.serverDbSize, dbText);
      // Color the DB size based on usage percentage
      if (elements.serverDbSize) {
        if (memData.dbSizePct >= 0.90) {
          elements.serverDbSize.style.color = 'var(--color-error)';
        } else if (memData.dbSizePct >= 0.75) {
          elements.serverDbSize.style.color = 'var(--color-warning)';
        } else {
          elements.serverDbSize.style.color = '';
        }
      }
    }
  } else {
    setText(elements.serverMemory, '-');
    setText(elements.serverDbSize, '-');
    if (elements.serverDbSize) elements.serverDbSize.style.color = '';
  }

  if (emulatorRunning) {
    const memData = await fetchEmulatorMemory();
    if (memData) {
      setText(elements.emulatorMemory, formatBytes(memData.rss));
    }
  } else {
    setText(elements.emulatorMemory, '-');
  }

  // Fetch logs for active tab (incremental)
  await refreshLogs();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Start/Stop all
elements.btnStartAll.addEventListener('click', async () => {
  elements.btnStartAll.disabled = true;
  elements.btnStartAll.textContent = 'Starting...';
  await startAll();
  elements.btnStartAll.disabled = false;
  elements.btnStartAll.textContent = 'Start All';
  refreshAll();
});

elements.btnStopAll.addEventListener('click', async () => {
  elements.btnStopAll.disabled = true;
  elements.btnStopAll.textContent = 'Stopping...';
  await stopAll();
  elements.btnStopAll.disabled = false;
  elements.btnStopAll.textContent = 'Stop All';
  refreshAll();
});

// Clear database button
elements.btnClearDb.addEventListener('click', async () => {
  elements.btnClearDb.disabled = true;
  elements.btnClearDb.textContent = 'Clearing...';
  await clearDatabase();
  elements.btnClearDb.disabled = false;
  elements.btnClearDb.textContent = 'Clear DB';
  refreshAll();
});

// Individual service start/stop buttons
document.querySelectorAll('[data-action]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const serviceName = btn.getAttribute('data-service');
    const action = btn.getAttribute('data-action');
    btn.disabled = true;
    await serviceAction(serviceName, action);
    btn.disabled = false;
    refreshAll();
  });
});

// Simulation pause/resume
elements.btnPauseSim.addEventListener('click', async () => {
  await pauseSimulation();
  refreshAll();
});

elements.btnResumeSim.addEventListener('click', async () => {
  await resumeSimulation();
  refreshAll();
});

// Scenario selection
elements.scenarioSelect.addEventListener('change', updateScenarioDescription);

elements.btnStartSim.addEventListener('click', async () => {
  const scenarioKey = elements.scenarioSelect.value;
  if (!scenarioKey) return;

  elements.btnStartSim.disabled = true;
  elements.btnStartSim.textContent = 'Starting...';

  const result = await startSimulationWithScenario(scenarioKey);

  elements.btnStartSim.textContent = 'Start Simulation';

  if (result && result.success) {
    refreshAll();
  } else {
    elements.btnStartSim.disabled = false;
    console.error('Failed to start simulation:', result);
  }
});

elements.btnStopSim.addEventListener('click', async () => {
  elements.btnStopSim.disabled = true;
  elements.btnStopSim.textContent = 'Stopping...';

  await stopSimulation();

  elements.btnStopSim.textContent = 'Stop Simulation';
  elements.btnStopSim.disabled = true;
  scenariosLoaded = false;
  refreshAll();
});

// Log tabs
document.querySelectorAll('.log-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    switchLogTab(tab.getAttribute('data-log'));
  });
});

// Detect manual scroll in log panel
elements.logOutput.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = elements.logOutput;
  autoScroll = (scrollHeight - scrollTop - clientHeight) < 30;
});

// ============================================================
// INITIALIZE
// ============================================================

refreshAll();
setInterval(refreshAll, REFRESH_INTERVAL);
