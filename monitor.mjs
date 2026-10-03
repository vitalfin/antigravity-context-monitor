import fs from 'fs';
import path from 'path';
import os from 'os';

const PORT_FILE = path.join(os.homedir(), '.config/Antigravity/DevToolsActivePort');
const WIDGET_PATH = path.join(os.homedir(), '.config/Antigravity/context-monitor/widget.js');

function getCDPPort() {
  try {
    if (!fs.existsSync(PORT_FILE)) return null;
    const lines = fs.readFileSync(PORT_FILE, 'utf8').trim().split('\n');
    const port = parseInt(lines[0], 10);
    return port > 0 ? port : null;
  } catch {
    return null;
  }
}

function getWidgetScript() {
  try {
    return fs.readFileSync(WIDGET_PATH, 'utf8');
  } catch (err) {
    console.error('Erro ao ler widget.js:', err);
    return null;
  }
}

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
      const script = getWidgetScript();
      if (!script) {
        clearTimeout(timer);
        ws.close();
        return resolve(false);
      }

      // Injeta na página atual
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: script }
      }));

      // Garante injeção caso o usuário recarregue a página
      ws.send(JSON.stringify({
        id: 2,
        method: 'Page.addScriptToEvaluateOnNewDocument',
        params: { source: script }
      }));

      setTimeout(() => {
        clearTimeout(timer);
        try { ws.close(); } catch {}
        resolve(true);
      }, 500);
    };

    ws.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
  });
}

async function runCycle() {
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

console.log('🛸 Antigravity Context Monitor (Linux) iniciado.');
console.log('Regras de Cores ativas:');
console.log('  🟢 0% - 40%:  SMART ZONE (Qualidade alta)');
console.log('  🟡 40% - 60%: ATENÇÃO ! Degrada (Amarelo)');
console.log('  🔴 > 60%:     DUMB ZONE (Qualidade baixa)');
console.log('  💰 v1.2.0:    Preço Previsto & Créditos ativos');
console.log('  🛸 v1.3.0:    Portal Popover & Subagent Inspector ativos');
console.log('  🛡️ v1.4.0:    Subagent Context Isolation & Compaction Detection ativos');

// Ciclo contínuo de verificação
setInterval(runCycle, 4000);
runCycle();
