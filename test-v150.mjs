import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'assert';
import { getDevToolsPortFile } from './monitor.mjs';

console.log('🧪 Starting CDP Verification v1.5.0 (i18n 7 Languages + Sponsor + Live Antigravity IDE)...');

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

console.log('Connected to CDP target:', pageTarget.title, pageTarget.url);

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
    // 1. Inject v1.5.0 of widget.js into page
    const widgetSrc = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'widget.js'), 'utf8');
    await sendCmd('Runtime.evaluate', { expression: 'window.__agyWidgetVersion = null; localStorage.removeItem("agy_locale");' });
    await sendCmd('Runtime.evaluate', { expression: widgetSrc });

    // 2. Validate structural elements and English default
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
    console.log('🔍 Elements v1.5.0 in DOM:', JSON.stringify(state, null, 2));
    assert.strictEqual(state.version, '1.5.0-i18n-opensource', 'Version must be 1.5.0-i18n-opensource');
    assert.strictEqual(state.hasWidget, true, 'Widget must exist');
    assert.strictEqual(state.hasPopover, true, 'Popover must exist');
    assert.strictEqual(state.hasModal, true, 'Modal must exist');
    assert.strictEqual(state.hasLangSelect, true, 'Modal language selector must exist');
    assert.strictEqual(state.hasPopLangSelect, true, 'Popover language selector must exist');
    assert.strictEqual(state.hasModalSponsor, true, 'Modal sponsor button must exist');
    assert.strictEqual(state.modalSponsorHref, 'https://github.com/sponsors/vitalfin', 'Sponsor link must point to GitHub Sponsors');
    assert.strictEqual(state.hasPopSponsor, true, 'Popover sponsor button must exist');
    assert.strictEqual(state.popSponsorHref, 'https://github.com/sponsors/vitalfin', 'Popover sponsor link must point to GitHub Sponsors');
    assert.strictEqual(state.currentLocale, 'en', 'Initial default locale MUST be English (en)');
    assert.strictEqual(state.tabOverviewText, 'Overview', 'Initial tab text in English must be "Overview"');
    console.log('  ✓ Test 1 passed: Assembly, language selectors, and sponsor button validated with EN default.');

    // 3. Dynamic Switching Test across all 7 Locales
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
    console.log('🌐 Language Switching Test:', JSON.stringify(lRes, null, 2));

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
    console.log('  ✓ Test 2 passed: All 7 languages switch dynamically in DOM with translations.');

    // 4. Multilingual Compaction Detection Test in Modal
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

        window.__agySetLocale('en'); // restore en
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
    console.log('🔄 Multilingual Compaction Test:', JSON.stringify(cRes, null, 2));
    assert.strictEqual(cRes.enText, 'COMPACTED (2x)');
    assert.strictEqual(cRes.ptText, 'COMPACTADO (2x)');
    assert.strictEqual(cRes.jaText, '圧縮済み (2x)');
    console.log('  ✓ Test 3 passed: Compaction tag translated and reactive across languages.');

    // 5. Subagent Isolation Test
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
    console.log('🛡️ Subagent Isolation Test v1.5.0:', JSON.stringify(iRes, null, 2));
    assert.strictEqual(iRes.tabSubInSub, 'none', 'Subagents tab must be hidden inside subagent');
    assert.notStrictEqual(iRes.tabSubInMain, 'none', 'Subagents tab must be visible in main conversation');
    console.log('  ✓ Test 4 passed: Strict subagent isolation preserved.');

    // 6. Locale Switch in Main Conversation Test (must not toggle subagent mode)
    const mainSwitchTest = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        window.__agySetLocale('en');
        const widget = document.getElementById('agy-context-zone-widget');
        widget.click();
        const subTagBefore = document.getElementById('agy-modal-subagent-tag').style.display;
        const tabSubBtnBefore = document.getElementById('agy-tab-btn-subagents').style.display;

        window.__agySetLocale('pt');

        const subTagAfter = document.getElementById('agy-modal-subagent-tag').style.display;
        const tabSubBtnAfter = document.getElementById('agy-tab-btn-subagents').style.display;

        window.__agySetLocale('en');
        document.getElementById('agy-modal-close').click();

        return { subTagBefore, tabSubBtnBefore, subTagAfter, tabSubBtnAfter };
      })()`,
      returnByValue: true
    });

    const mRes = mainSwitchTest.result.value;
    console.log('🔄 Main Conversation Locale Switch Test:', JSON.stringify(mRes, null, 2));
    assert.strictEqual(mRes.subTagAfter, 'none', 'Subagent tag MUST NOT appear when switching locale in main conversation');
    assert.notStrictEqual(mRes.tabSubBtnAfter, 'none', 'Subagents tab MUST remain visible after switching locale');
    console.log('  ✓ Test 5 passed: Locale switch in main conversation does not activate subagent mode.');

    // 7. Startup with Saved Locale in localStorage Test
    const startupTest = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        localStorage.setItem('agy_locale', 'pt');
        window.__agyWidgetVersion = null;
        ${widgetSrc}

        const popLangSelect = document.getElementById('agy-popover-lang-select');
        const lblOperational = document.getElementById('agy-lbl-operational')?.innerText;
        const lblRaw = document.getElementById('agy-lbl-raw')?.innerText;

        localStorage.removeItem('agy_locale');
        return {
          popLangSelectVal: popLangSelect?.value,
          lblOperational,
          lblRaw
        };
      })()`,
      returnByValue: true
    });

    const sRes = startupTest.result.value;
    console.log('💾 localStorage Startup Test:', JSON.stringify(sRes, null, 2));
    assert.strictEqual(sRes.popLangSelectVal, 'pt', 'Popover selector must initialize with pt');
    assert.strictEqual(sRes.lblOperational, 'Uso Operacional:', 'Operational label must initialize in Portuguese');
    assert.strictEqual(sRes.lblRaw, 'Capacidade Bruta:', 'Raw capacity label must initialize in Portuguese');
    console.log('  ✓ Test 6 passed: Saved locale in localStorage initializes popover and selectors.');

    console.log('\n🎉 ALL CDP v1.5.0 TESTS PASSED WITH 100% SUCCESS!\n');
    ws.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during CDP v1.5.0 test:', err);
    ws.close();
    process.exit(1);
  }
};
