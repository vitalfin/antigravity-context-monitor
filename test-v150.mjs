import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'assert';

console.log('🧪 Iniciando Verificação CDP v1.5.0 (i18n 7 Idiomas + Sponsor + Live Antigravity IDE)...');

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
    // 1. Injeta v1.5.0 de widget.js na página
    const widgetSrc = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'widget.js'), 'utf8');
    await sendCmd('Runtime.evaluate', { expression: 'window.__agyWidgetVersion = null; localStorage.removeItem("agy_locale");' });
    await sendCmd('Runtime.evaluate', { expression: widgetSrc });

    // 2. Valida elementos estruturais v1.5.0 e padrão inglês
    const evalResult = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        const version = window.__agyWidgetVersion;
        const widget = document.getElementById('agy-context-zone-widget');
        const popover = document.getElementById('agy-zone-popover');
        const modal = document.getElementById('agy-context-inspector-modal');
        const langSelect = document.getElementById('agy-lang-select');
        const popLangSelect = document.getElementById('agy-popover-lang-select');
        const modalSponsor = document.getElementById('agy-modal-sponsor');
        const popSponsor = document.getElementById('agy-btn-popover-sponsor');
        const currentLocale = window.__agyGetLocale ? window.__agyGetLocale() : null;
        const tabOverviewText = document.getElementById('agy-tab-btn-overview')?.innerText;
        const modalTitle = document.getElementById('agy-modal-title-text')?.innerText;

        return {
          version,
          hasWidget: !!widget,
          hasPopover: !!popover,
          hasModal: !!modal,
          hasLangSelect: !!langSelect,
          hasPopLangSelect: !!popLangSelect,
          hasModalSponsor: !!modalSponsor,
          modalSponsorHref: modalSponsor?.getAttribute('href'),
          hasPopSponsor: !!popSponsor,
          popSponsorHref: popSponsor?.getAttribute('href'),
          currentLocale,
          tabOverviewText,
          modalTitle
        };
      })()`,
      returnByValue: true
    });

    const state = evalResult.result.value;
    console.log('🔍 Elementos v1.5.0 no DOM:', JSON.stringify(state, null, 2));
    assert.strictEqual(state.version, '1.5.0-i18n-opensource', 'Versão deve ser 1.5.0-i18n-opensource');
    assert.strictEqual(state.hasWidget, true, 'Widget deve existir');
    assert.strictEqual(state.hasPopover, true, 'Popover deve existir');
    assert.strictEqual(state.hasModal, true, 'Modal deve existir');
    assert.strictEqual(state.hasLangSelect, true, 'Seletor de idioma no modal deve existir');
    assert.strictEqual(state.hasPopLangSelect, true, 'Seletor de idioma no popover deve existir');
    assert.strictEqual(state.hasModalSponsor, true, 'Botão de sponsor no modal deve existir');
    assert.strictEqual(state.modalSponsorHref, 'https://github.com/sponsors/vitalfin', 'Link de sponsor deve apontar para GitHub Sponsors');
    assert.strictEqual(state.hasPopSponsor, true, 'Botão de sponsor no popover deve existir');
    assert.strictEqual(state.popSponsorHref, 'https://github.com/sponsors/vitalfin', 'Link de sponsor popover correto');
    assert.strictEqual(state.currentLocale, 'en', 'Idioma padrão inicial DEVE ser inglês (en)');
    assert.strictEqual(state.tabOverviewText, 'Overview', 'Aba inicial em inglês deve ser "Overview"');
    console.log('  ✓ Teste 1 passou: Montagem, seletores de idioma e botão de sponsor v1.5.0 validados com padrão EN.');

    // 3. Teste de Alternância Dinâmica de Todos os 7 Idiomas
    const langTest = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        const results = {};
        const locales = ['pt', 'es', 'ja', 'zh', 'fr', 'de', 'en'];

        for (const loc of locales) {
          window.__agySetLocale(loc);
          results[loc] = {
            currentLocale: window.__agyGetLocale(),
            tabOverviewText: document.getElementById('agy-tab-btn-overview')?.innerText,
            tabTipsText: document.getElementById('agy-tab-btn-tips')?.innerText,
            modalTitle: document.getElementById('agy-modal-title-text')?.innerText,
            sponsorText: document.getElementById('agy-sponsor-text')?.innerText
          };
        }

        return results;
      })()`,
      returnByValue: true
    });

    const lRes = langTest.result.value;
    console.log('🌐 Teste de Alternância de Idiomas:', JSON.stringify(lRes, null, 2));

    assert.strictEqual(lRes.pt.tabOverviewText, 'Visão Geral');
    assert.strictEqual(lRes.pt.tabTipsText, 'Boas Práticas');
    assert.strictEqual(lRes.pt.sponsorText, '💖 Apoiar');

    assert.strictEqual(lRes.es.tabOverviewText, 'Visión General');
    assert.strictEqual(lRes.es.tabTipsText, 'Buenas Prácticas');
    assert.strictEqual(lRes.es.sponsorText, '💖 Patrocinar');

    assert.strictEqual(lRes.ja.tabOverviewText, '概要');
    assert.strictEqual(lRes.ja.tabTipsText, 'ベストプラクティス');
    assert.strictEqual(lRes.ja.sponsorText, '💖 スポンサー');

    assert.strictEqual(lRes.zh.tabOverviewText, '概览');
    assert.strictEqual(lRes.zh.tabTipsText, '最佳实践');
    assert.strictEqual(lRes.zh.sponsorText, '💖 赞助项目');

    assert.strictEqual(lRes.fr.tabOverviewText, "Vue d'ensemble");
    assert.strictEqual(lRes.fr.tabTipsText, 'Bonnes Pratiques');
    assert.strictEqual(lRes.fr.sponsorText, '💖 Sponsoriser');

    assert.strictEqual(lRes.de.tabOverviewText, 'Übersicht');
    assert.strictEqual(lRes.de.tabTipsText, 'Best Practices');
    assert.strictEqual(lRes.de.sponsorText, '💖 Sponsern');

    assert.strictEqual(lRes.en.tabOverviewText, 'Overview');
    assert.strictEqual(lRes.en.tabTipsText, 'Best Practices');
    assert.strictEqual(lRes.en.sponsorText, '💖 Sponsor');
    console.log('  ✓ Teste 2 passou: Todos os 7 idiomas alternam dinamicamente no DOM com traduções perfeitas.');

    // 4. Teste de Detecção de Compactação no Modal com i18n
    const compTest = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        window.__agySetLocale('en');
        const modal = document.getElementById('agy-context-inspector-modal');
        const modalCompTag = document.getElementById('agy-modal-compaction-tag');

        const mockData = {
          cascadeId: 'mock-comp-v150',
          totalTokens: 25000,
          cachedTokens: 18000,
          inputTokens: 5000,
          outputTokens: 2000,
          cachePct: 78,
          compactionCount: 2,
          filesCount: 5,
          commandsCount: 8,
          breakdown: { system: 12000, files: 8000, commands: 3000, dialogue: 2000 },
          files: [],
          commands: []
        };

        if (window.__agyContextCache) {
          window.__agyContextCache.set(mockData.cascadeId, mockData);
        }

        const widget = document.getElementById('agy-context-zone-widget');
        widget.click();
        const select = document.getElementById('agy-session-select');
        const opt = document.createElement('option');
        opt.value = mockData.cascadeId;
        opt.innerText = 'Compacted Test';
        select.appendChild(opt);
        select.value = mockData.cascadeId;
        select.dispatchEvent(new Event('change'));

        const enText = modalCompTag?.innerText;
        window.__agySetLocale('pt');
        const ptText = modalCompTag?.innerText;
        window.__agySetLocale('ja');
        const jaText = modalCompTag?.innerText;

        window.__agySetLocale('en'); // restaura en
        modal.style.display = 'none';

        return {
          enText,
          ptText,
          jaText
        };
      })()`,
      returnByValue: true
    });

    const cRes = compTest.result.value;
    console.log('🔄 Teste de Compactação Multilíngue:', JSON.stringify(cRes, null, 2));
    assert.strictEqual(cRes.enText, 'COMPACTED (2x)');
    assert.strictEqual(cRes.ptText, 'COMPACTADO (2x)');
    assert.strictEqual(cRes.jaText, '圧縮済み (2x)');
    console.log('  ✓ Teste 3 passou: Tag de compactação traduzida e reativa em múltiplos idiomas.');

    // 5. Teste de Isolamento de Subagente
    const isoTest = await sendCmd('Runtime.evaluate', {
      expression: `(async () => {
        const tabSubBtn = document.getElementById('agy-tab-btn-subagents');
        const modal = document.getElementById('agy-context-inspector-modal');

        const mockSub = {
          cascadeId: 'mock-sub-v150',
          totalTokens: 14000,
          cachedTokens: 10000,
          inputTokens: 3000,
          outputTokens: 1000,
          cachePct: 76,
          compactionCount: 0,
          filesCount: 2,
          commandsCount: 4,
          breakdown: { system: 8000, files: 4000, commands: 1500, dialogue: 500 },
          files: [],
          commands: []
        };

        if (window.__agyContextCache) {
          window.__agyContextCache.set(mockSub.cascadeId, mockSub);
        }

        const select = document.getElementById('agy-session-select');
        const opt = document.createElement('option');
        opt.value = mockSub.cascadeId;
        opt.innerText = '🤖 Subagent Alpha';
        select.appendChild(opt);
        select.value = mockSub.cascadeId;
        select.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 40));

        const tabSubInSub = window.getComputedStyle(tabSubBtn).display;

        select.value = 'main';
        select.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 40));

        const tabSubInMain = window.getComputedStyle(tabSubBtn).display;
        modal.style.display = 'none';

        return {
          tabSubInSub,
          tabSubInMain
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const iRes = isoTest.result.value;
    console.log('🛡️ Teste de Isolamento de Subagente v1.5.0:', JSON.stringify(iRes, null, 2));
    assert.strictEqual(iRes.tabSubInSub, 'none', 'Aba Subagentes deve sumir dentro do subagente');
    assert.notStrictEqual(iRes.tabSubInMain, 'none', 'Aba Subagentes deve estar visível na conversa principal');
    console.log('  ✓ Teste 4 passou: Isolamento estrito de subagente preservado.');

    console.log('\n🎉 TODOS OS TESTES CDP v1.5.0 PASSARAM COM 100% DE SUCESSO!\n');
    ws.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro durante o teste CDP v1.5.0:', err);
    ws.close();
    process.exit(1);
  }
};
