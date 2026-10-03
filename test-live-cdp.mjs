import fs from 'fs';
import path from 'path';
import os from 'os';
import { getDevToolsPortFile } from './monitor.mjs';

const portFile = getDevToolsPortFile();
if (!portFile || !fs.existsSync(portFile)) {
  console.error('DevToolsActivePort not found.');
  process.exit(1);
}

const lines = fs.readFileSync(portFile, 'utf8').trim().split('\n');
const port = parseInt(lines[0], 10);

const res = await fetch(`http://127.0.0.1:${port}/json`);
const targets = await res.json();
const pageTarget = targets.find(t => t.type === 'page' && !t.url.includes('devtools'));

if (!pageTarget) {
  console.error('No Antigravity page target found.');
  process.exit(1);
}

console.log('Connecting to CDP target:', pageTarget.title, pageTarget.url);

const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

function sendCmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const onMsg = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', onMsg);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      } catch (e) {}
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.onopen = async () => {
  try {
    // 1. Inspect injected version and cost elements
    const evalResult = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        const version = window.__agyWidgetVersion;
        const popCostEl = document.getElementById('agy-popover-cost');
        const popSavedEl = document.getElementById('agy-popover-saved');
        const mCostEl = document.getElementById('agy-m-cost');
        const mCostSubEl = document.getElementById('agy-m-cost-sub');
        const tabBtnCosts = document.getElementById('agy-tab-btn-costs');
        const modal = document.getElementById('agy-context-inspector-modal');

        return {
          version,
          hasPopoverCost: !!popCostEl,
          popoverCostText: popCostEl?.innerText,
          hasPopoverSaved: !!popSavedEl,
          popoverSavedText: popSavedEl?.innerText,
          hasModalCost: !!mCostEl,
          modalCostText: mCostEl?.innerText,
          hasModalCostSub: !!mCostSubEl,
          modalCostSubText: mCostSubEl?.innerText,
          hasTabBtnCosts: !!tabBtnCosts,
          tabBtnCostsText: tabBtnCosts?.innerText,
          modalDisplay: modal?.style.display
        };
      })()`,
      returnByValue: true
    });

    console.log('🔍 Element State in DOM:', JSON.stringify(evalResult.result.value, null, 2));

    // 2. Simulate opening modal and clicking Costs & Credits tab
    const tabTest = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        const tabBtn = document.getElementById('agy-tab-btn-costs');
        if (!tabBtn) return { success: false, reason: 'Tab button not found' };
        
        tabBtn.click();
        
        const container = document.getElementById('agy-tab-content');
        return {
          success: true,
          contentHtmlLength: container?.innerHTML?.length || 0,
          hasExplanation: container?.innerHTML?.includes('Google AI Pro'),
          hasPricingTable: container?.innerHTML?.includes('CATEGORIA DE TOKEN') || container?.innerHTML?.includes('TOKEN CATEGORY'),
          hasProjections: container?.innerHTML?.includes('Smart Zone (250k tokens)'),
          innerTextPreview: container?.innerText?.slice(0, 300)
        };
      })()`,
      returnByValue: true
    });

    console.log('💳 Costs & Credits Tab Test:', JSON.stringify(tabTest.result.value, null, 2));

    // Close modal if left open
    await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.getElementById('agy-context-inspector-modal');
        if (modal) modal.style.display = 'none';
      })()`
    });

    ws.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during CDP test:', err);
    ws.close();
    process.exit(1);
  }
};
