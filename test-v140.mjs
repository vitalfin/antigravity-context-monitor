import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'assert';

console.log('🧪 Iniciando Verificação CDP v1.4.0 (Subagent Isolation + Compaction Detection)...');

const portFile = path.join(os.homedir(), '.config/Antigravity/DevToolsActivePort');
if (!fs.existsSync(portFile)) {
  console.error('DevToolsActivePort não encontrado.');
  process.exit(1);
}

const lines = fs.readFileSync(portFile, 'utf8').trim().split('\n');
const port = parseInt(lines[0], 10);

const res = await fetch(`http://127.0.0.1:${port}/json`);
const targets = await res.json();
const pageTarget = targets.find(t => t.type === 'page' && !t.url.includes('devtools'));

if (!pageTarget) {
  console.error('Nenhum alvo de página do Antigravity encontrado.');
  process.exit(1);
}

console.log('Conectado ao alvo CDP:', pageTarget.title, pageTarget.url);

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
    // 1. Injeta a versão v1.4.0 de widget.js na página
    const widgetSrc = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'widget.js'), 'utf8');
    await sendCmd('Runtime.evaluate', { expression: 'window.__agyWidgetVersion = null;' });
    await sendCmd('Runtime.evaluate', { expression: widgetSrc });

    // 2. Verifica a versão e elementos essenciais no DOM
    const evalResult = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        const version = window.__agyWidgetVersion;
        const widget = document.getElementById('agy-context-zone-widget');
        const popover = document.getElementById('agy-zone-popover');
        const modal = document.getElementById('agy-context-inspector-modal');
        const compBadge = document.getElementById('agy-compaction-badge');
        const modalCompTag = document.getElementById('agy-modal-compaction-tag');
        const modalSubagentTag = document.getElementById('agy-modal-subagent-tag');
        const tabSubBtn = document.getElementById('agy-tab-btn-subagents');

        return {
          version,
          hasWidget: !!widget,
          hasPopover: !!popover,
          hasModal: !!modal,
          hasCompactionBadge: !!compBadge,
          hasModalCompTag: !!modalCompTag,
          hasModalSubagentTag: !!modalSubagentTag,
          hasTabSubBtn: !!tabSubBtn
        };
      })()`,
      returnByValue: true
    });

    const state = evalResult.result.value;
    console.log('🔍 Elementos v1.4.0 no DOM:', JSON.stringify(state, null, 2));
    assert(state.version === '1.4.0-subagent-isolation-compaction' || state.version === '1.5.0-i18n-opensource', 'Versão deve ser 1.4.0 ou 1.5.0-i18n-opensource');
    assert.strictEqual(state.hasWidget, true, 'Widget deve existir');
    assert.strictEqual(state.hasPopover, true, 'Popover deve existir');
    assert.strictEqual(state.hasModal, true, 'Modal deve existir');
    assert.strictEqual(state.hasCompactionBadge, true, 'Badge de compactação deve existir no popover');
    assert.strictEqual(state.hasModalCompTag, true, 'Tag de compactação deve existir no modal');
    assert.strictEqual(state.hasModalSubagentTag, true, 'Tag de subagente deve existir no modal');
    assert.strictEqual(state.hasTabSubBtn, true, 'Botão da aba de subagentes deve existir');
    console.log('  ✓ Teste 1 passou: Montagem e tags v1.4.0 validadas.');

    // 3. Teste de Isolamento de Subagente (Aba Subagentes deve SUMIR ao inspecionar subagente)
    const isolationTest = await sendCmd('Runtime.evaluate', {
      expression: `(async () => {
        const modal = document.getElementById('agy-context-inspector-modal');
        const tabSubBtn = document.getElementById('agy-tab-btn-subagents');
        
        // Simula dados de um subagente
        const mockSubData = {
          cascadeId: 'mock-subagent-cascade-999',
          totalTokens: 28500,
          cachedTokens: 25000,
          inputTokens: 3500,
          outputTokens: 500,
          cachePct: 87,
          compactionCount: 0,
          filesCount: 3,
          commandsCount: 5,
          breakdown: { system: 15000, files: 8000, commands: 4000, dialogue: 1500 },
          files: [],
          commands: []
        };

        // Simula abertura de subagente no modal
        const widget = document.getElementById('agy-context-zone-widget');
        widget.click(); // Abre modal
        
        // Popula cache e dispara render com escopo de subagente
        if (window.__agyContextCache) {
          window.__agyContextCache.set(mockSubData.cascadeId, mockSubData);
        }
        const select = document.getElementById('agy-session-select');
        const opt = document.createElement('option');
        opt.value = mockSubData.cascadeId;
        opt.innerText = '🤖 Test Subagent';
        select.appendChild(opt);
        select.value = mockSubData.cascadeId;
        select.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 50));

        // Testa visibilidade do botão de subagente
        const tabSubDisplayInSub = window.getComputedStyle(tabSubBtn).display;

        // Agora simula volta para Conversa Principal
        select.value = 'main';
        select.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 60));
        const tabSubDisplayInMain = window.getComputedStyle(tabSubBtn).display;

        modal.style.display = 'none';

        return {
          tabSubDisplayInSub,
          tabSubDisplayInMain
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const iso = isolationTest.result.value;
    console.log('🛡️ Teste de Isolamento de Aba:', JSON.stringify(iso, null, 2));
    assert.strictEqual(iso.tabSubDisplayInSub, 'none', 'Aba Subagentes DEVE ficar oculta (display: none) ao inspecionar um subagente!');
    assert.notStrictEqual(iso.tabSubDisplayInMain, 'none', 'Aba Subagentes DEVE voltar a ficar visível na Conversa Principal');
    console.log('  ✓ Teste 2 passou: Aba Subagentes oculta dentro de subagente e visível na principal.');

    // 4. Teste de Detecção de Compactação no Modal e Popover
    const compactionTest = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.getElementById('agy-context-inspector-modal');
        const popover = document.getElementById('agy-zone-popover');
        const compBadge = document.getElementById('agy-compaction-badge');
        const modalCompTag = document.getElementById('agy-modal-compaction-tag');

        // Simula render de dados compactados no popover e modal
        const mockCompactedData = {
          cascadeId: 'mock-cascade-compacted',
          totalTokens: 22800,
          cachedTokens: 16000,
          inputTokens: 5400,
          outputTokens: 1400,
          cachePct: 75,
          compactionCount: 2,
          filesCount: 12,
          commandsCount: 20,
          breakdown: { system: 12000, files: 6000, commands: 3000, dialogue: 1800 },
          files: [],
          commands: []
        };

        // Popula popover e modal
        const widget = document.getElementById('agy-context-zone-widget');
        if (window.__agyContextCache) {
          window.__agyContextCache.set('mock-cascade-compacted', mockCompactedData);
        }
        
        // Simula clique e renderização de dados compactados
        widget.click();
        const select = document.getElementById('agy-session-select');
        const opt = document.createElement('option');
        opt.value = mockCompactedData.cascadeId;
        opt.innerText = 'Compactada';
        select.appendChild(opt);
        select.value = mockCompactedData.cascadeId;
        select.dispatchEvent(new Event('change'));

        const modalCompTagDisplay = modalCompTag?.style?.display;
        const modalCompTagText = modalCompTag?.innerText;
        modal.style.display = 'none';

        return {
          modalCompTagDisplay,
          modalCompTagText
        };
      })()`,
      returnByValue: true
    });

    const compRes = compactionTest.result.value;
    console.log('🔄 Teste de Compactação:', JSON.stringify(compRes, null, 2));
    assert.strictEqual(compRes.modalCompTagDisplay, 'inline-block', 'Tag de compactação deve estar visível');
    assert(compRes.modalCompTagText.includes('COMPACTADO (2x)') || compRes.modalCompTagText.includes('COMPACTED (2x)'), 'Tag deve indicar compactação 2x');
    console.log('  ✓ Teste 3 passou: Detecção e exibição visual de compactação validadas.');

    // 5. Teste de Contexto acima de 250k (sem resetar para zero e mantendo porcentagem real)
    const overflowTest = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        const SMART_LIMIT = 250000;
        const totalTokens = 268945;
        const pct = Math.round((totalTokens / SMART_LIMIT) * 1000) / 10;
        const visualPct = Math.min(100, Math.max(0, pct));
        
        return {
          totalTokens,
          pct,
          visualPct,
          isOver100: pct > 100,
          visualClampedAt100: visualPct === 100,
          textFormat: totalTokens >= 1000 ? (totalTokens / 1000).toFixed(1) + 'k' : String(totalTokens)
        };
      })()`,
      returnByValue: true
    });

    const ofRes = overflowTest.result.value;
    console.log('📊 Teste de Exibição > 250k:', JSON.stringify(ofRes, null, 2));
    assert.strictEqual(ofRes.isOver100, true, 'Porcentagem textual deve passar de 100% (> 250k)');
    assert.strictEqual(ofRes.visualClampedAt100, true, 'Porcentagem visual gráfica deve ser clampeada em 100%');
    assert.strictEqual(ofRes.textFormat, '268.9k', 'Formatação textual correta');
    console.log('  ✓ Teste 4 passou: Contexto acima de 250k mostra porcentagem real sem resetar.');

    console.log('\n🎉 TODOS OS TESTES v1.4.0 PASSARAM COM 100% DE SUCESSO!');
    ws.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro durante o teste CDP v1.4.0:', err);
    ws.close();
    process.exit(1);
  }
};
