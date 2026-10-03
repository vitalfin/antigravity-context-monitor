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
 * Retorna o caminho do arquivo DevToolsActivePort de acordo com a plataforma (Linux, macOS, Windows).
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
 * Lê a porta CDP atual do Antigravity.
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
 * Lê o script widget.js do disco.
 */
export function getWidgetScript() {
  try {
    return fs.readFileSync(WIDGET_PATH, 'utf8');
  } catch (err) {
    console.error('Erro ao ler widget.js:', err);
    return null;
  }
}

/**
 * Extrai a versão esperada do widget.
 */
export function getExpectedWidgetVersion() {
  const script = getWidgetScript();
  const match = script?.match(/const VERSION = ['"]([^'"]+)['"]/);
  return match ? match[1] : '1.5.0-i18n-opensource';
}

/**
 * Garante instância única do monitor para evitar conflitos concorrentes de CDP.
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
          process.kill(existingPid, 0); // Testa se o processo ainda está vivo
          console.log(`ℹ️  Antigravity Context Monitor já está ativo no sistema (PID: ${existingPid}).`);
          console.log('    Se estiver rodando como serviço em segundo plano:');
          console.log('    systemctl --user status antigravity-context-monitor.service');
          process.exit(0);
        } catch {
          // PID anterior não existe mais (stale lock); pode prosseguir
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
 * Conecta via WebSocket CDP e injeta o widget de forma otimizada:
 * Se o widget já estiver ativo e atualizado na página, evita tráfego redundante de 160KB.
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
      // 1. Consulta leve sobre o estado da injeção atual na página
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

          // Se já está ativo com a versão esperada, encerra sem reenviar 160KB
          if (activeVersion && activeVersion === expectedVersion) {
            clearTimeout(timer);
            try { ws.close(); } catch {}
            return resolve(true);
          }

          // Se ausente, desatualizado ou página recarregada, envia o script completo
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

// Inicialização autônoma se executado diretamente
if (isDirectExecution()) {
  acquireLock();

  const platformName = process.platform === 'darwin'
    ? 'macOS'
    : (process.platform === 'win32' ? 'Windows' : 'Linux');

  console.log(`🛸 Antigravity Context Monitor (${platformName}) iniciado.`);
  console.log('Regras de Cores ativas:');
  console.log('  🟢 0% - 40%:  SMART ZONE (Qualidade alta)');
  console.log('  🟡 40% - 60%: ATENÇÃO ! Degrada (Amarelo)');
  console.log('  🔴 > 60%:     DUMB ZONE (Qualidade baixa)');
  console.log('  💰 v1.2.0:    Preço Previsto & Créditos ativos');
  console.log('  🛸 v1.3.0:    Portal Popover & Subagent Inspector ativos');
  console.log('  🛡️ v1.4.0:    Subagent Context Isolation & Compaction Detection ativos');
  console.log('  🌐 v1.5.0:    i18n (7 Languages: EN, PT, ES, JA, ZH, FR, DE) & Sponsor active');

  setInterval(runCycle, 4000);
  runCycle();
}
