import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_WIDGET_PATH = path.join(__dirname, 'widget.js');
const LEGACY_WIDGET_PATH = path.join(os.homedir(), '.config/Antigravity/context-monitor/widget.js');
const WIDGET_PATH = fs.existsSync(LOCAL_WIDGET_PATH) ? LOCAL_WIDGET_PATH : LEGACY_WIDGET_PATH;
const LOCK_FILE = path.join(os.tmpdir(), 'antigravity-context-monitor.lock');

/**
 * Returns the DevToolsActivePort file path based on current platform (Linux, macOS, Windows).
 */
export function getDevToolsPortFile() {
  const candidatePaths = [
    process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support', 'Antigravity', 'DevToolsActivePort')
      : null,
    process.platform === 'win32'
      ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Antigravity', 'DevToolsActivePort')
      : null,
    process.env.XDG_CONFIG_HOME
      ? path.join(process.env.XDG_CONFIG_HOME, 'Antigravity', 'DevToolsActivePort')
      : null,
    path.join(os.homedir(), '.config', 'Antigravity', 'DevToolsActivePort'),
    path.join(os.homedir(), 'Library', 'Application Support', 'Antigravity', 'DevToolsActivePort')
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidatePaths[0];
}

/**
 * Reads the active CDP port for Antigravity.
 */
export function getCDPPort() {
  try {
    const portFile = getDevToolsPortFile();
    if (!portFile || !fs.existsSync(portFile)) return null;
    const lines = fs.readFileSync(portFile, 'utf8').trim().split('\n');
    const port = parseInt(lines[0], 10);
    return port > 0 ? port : null;
  } catch {
    return null;
  }
}

/**
 * Reads widget.js script from disk.
 */
export function getWidgetScript() {
  try {
    return fs.readFileSync(WIDGET_PATH, 'utf8');
  } catch (err) {
    console.error('Error reading widget.js:', err);
    return null;
  }
}

/**
 * Extracts expected widget version.
 */
export function getExpectedWidgetVersion() {
  const script = getWidgetScript();
  const match = script?.match(/const VERSION = ['"]([^'"]+)['"]/);
  return match ? match[1] : '1.5.1';
}

/**
 * Ensures single instance to avoid duplicate CDP injection cycles.
 */
export function acquireLock() {
  if (process.env.MONITOR_FORCE === '1' || process.argv.includes('--force')) {
    return true;
  }

  try {
    if (fs.existsSync(LOCK_FILE)) {
      const existingPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
      if (existingPid && existingPid !== process.pid) {
        try {
          process.kill(existingPid, 0); // Check if process is still alive
          console.log(`ℹ️  Antigravity Context Monitor is already running (PID: ${existingPid}).`);
          console.log('    If running as a background service:');
          console.log('    systemctl --user status antigravity-context-monitor.service');
          process.exit(0);
        } catch {
          // Stale lock from terminated process; proceed
        }
      }
    }

    fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf8');
    const cleanup = () => {
      try {
        if (fs.existsSync(LOCK_FILE)) {
          const current = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
          if (current === process.pid) fs.unlinkSync(LOCK_FILE);
        }
      } catch {}
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { cleanup(); process.exit(0); });
    return true;
  } catch {
    return true;
  }
}

/**
 * Injects widget via CDP WebSocket with lightweight version verification:
 * If the widget is already active and up-to-date, avoids redundant 160KB payload transmission.
 */
async function injectIntoPage(wsUrl) {
  return new Promise((resolve) => {
    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      return resolve(false);
    }

    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      resolve(false);
    }, 4000);

    ws.onopen = () => {
      // 1. Lightweight probe to check if widget is already injected
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: 'typeof window.__agyWidgetVersion !== "undefined" ? window.__agyWidgetVersion : null'
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id === 1) {
          const activeVersion = msg.result?.result?.value;
          const expectedVersion = getExpectedWidgetVersion();

          // Already running with expected version; close and resolve
          if (activeVersion && activeVersion === expectedVersion) {
            clearTimeout(timer);
            try { ws.close(); } catch {}
            return resolve(true);
          }

          // Missing, outdated, or page reloaded; send full script
          const script = getWidgetScript();
          if (!script) {
            clearTimeout(timer);
            try { ws.close(); } catch {}
            return resolve(false);
          }

          ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: { expression: script }
          }));

          setTimeout(() => {
            clearTimeout(timer);
            try { ws.close(); } catch {}
            resolve(true);
          }, 300);
        }
      } catch {
        clearTimeout(timer);
        try { ws.close(); } catch {}
        resolve(false);
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
  });
}

export async function runCycle() {
  const port = getCDPPort();
  if (!port) return;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return;
    const targets = await res.json();

    for (const target of targets) {
      if (target.type === 'page' && !target.url.includes('devtools') && target.webSocketDebuggerUrl) {
        await injectIntoPage(target.webSocketDebuggerUrl);
      }
    }
  } catch {}
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

// Standalone initialization when run directly
if (isDirectExecution()) {
  acquireLock();

  const platformName = process.platform === 'darwin'
    ? 'macOS'
    : (process.platform === 'win32' ? 'Windows' : 'Linux');

  console.log(`🛸 Antigravity Context Monitor (${platformName}) started.`);
  console.log('Active Color Rules:');
  console.log('  🟢 0% - 40%:  SMART ZONE (High fidelity)');
  console.log('  🟡 40% - 60%: WARNING ZONE (Degrading attention)');
  console.log('  🔴 > 60%:     DUMB ZONE (Critical quality loss)');
  console.log('  💰 v1.2.0:    Cost Estimation & Credits active');
  console.log('  🛸 v1.3.0:    Portal Popover & Subagent Inspector active');
  console.log('  🛡️ v1.4.0:    Subagent Context Isolation & Compaction Detection active');
  console.log('  🌐 v1.5.1:    i18n (7 Languages: EN, PT, ES, JA, ZH, FR, DE), BSL 1.1 License & Sponsor active');

  setInterval(runCycle, 4000);
  runCycle();
}
