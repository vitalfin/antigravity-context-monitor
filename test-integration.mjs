import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { getDevToolsPortFile } from './monitor.mjs';

console.log('🧪 Starting unified CDP Integration Test (v1.6.0)');

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
    // Inject current widget.js
    const widgetSrc = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'widget.js'), 'utf8');
    await sendCmd('Runtime.evaluate', { expression: 'window.__agyWidgetVersion = null; localStorage.removeItem("agy_locale");' });
    await sendCmd('Runtime.evaluate', { expression: widgetSrc });

    // Test 1: basic elements and version
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
        const tabSystem = document.getElementById('agy-tab-btn-system');
        const modalTitle = document.getElementById('agy-modal-title-text')?.innerText;
        return { version, hasWidget: !!widget, hasPopover: !!popover, hasModal: !!modal, hasLangSelect: !!langSelect, hasPopLangSelect: !!popLangSelect, hasModalSponsor: !!modalSponsor, modalSponsorHref: modalSponsor?.getAttribute('href'), hasPopSponsor: !!popSponsor, popSponsorHref: popSponsor?.getAttribute('href'), hasTabSystem: !!tabSystem, currentLocale, tabOverviewText, modalTitle };
      })()`,
      returnByValue: true
    });
    const state = evalResult.result.value;
    console.log('🔍 Elements:', JSON.stringify(state, null, 2));
    assert.strictEqual(state.version, '1.6.0', 'Version must be 1.6.0');
    assert.strictEqual(state.hasWidget, true, 'Widget must exist');
    assert.strictEqual(state.hasPopover, true, 'Popover must exist');
    assert.strictEqual(state.hasModal, true, 'Modal must exist');
    assert.strictEqual(state.hasTabSystem, true, 'Rules & System tab button must exist');
    assert.strictEqual(state.hasLangSelect, true, 'Language selector must exist');
    assert.strictEqual(state.hasPopLangSelect, true, 'Popover language selector must exist');
    assert.strictEqual(state.hasModalSponsor, true, 'Modal sponsor button must exist');
    assert.strictEqual(state.modalSponsorHref, 'https://github.com/sponsors/vitalfin', 'Sponsor link must point to GitHub Sponsors');
    assert.strictEqual(state.hasPopSponsor, true, 'Popover sponsor button must exist');
    assert.strictEqual(state.popSponsorHref, 'https://github.com/sponsors/vitalfin', 'Popover sponsor link must point to GitHub Sponsors');
    assert.strictEqual(state.currentLocale, 'en', 'Default locale must be English');
    console.log('  ✓ Test 1 passed: Core elements and version verified');

    // Test 2: language switching across all locales
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
    console.log('🌐 Language Switching:', JSON.stringify(lRes, null, 2));
    // assertions for each locale (sample for pt and en)
    assert.strictEqual(lRes.pt.tabOverviewText, 'Visão Geral');
    assert.strictEqual(lRes.pt.tabTipsText, 'Boas Práticas');
    assert.strictEqual(lRes.pt.modalTitle, 'Inspetor de Janela de Contexto');
    assert.strictEqual(lRes.pt.sponsorText, '💖 Apoiar');
    assert.strictEqual(lRes.es.modalTitle, 'Inspector de Ventana de Contexto');
    assert.strictEqual(lRes.en.tabOverviewText, 'Overview');
    assert.strictEqual(lRes.en.tabTipsText, 'Best Practices');
    assert.strictEqual(lRes.en.modalTitle, 'Context Window Inspector');
    assert.strictEqual(lRes.en.sponsorText, '💖 Sponsor');
    console.log('  ✓ Test 2 passed: Multilingual UI strings verified');

    // Test 3: compaction tag translation
    const compTest = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        window.__agySetLocale('en');
        const modalCompTag = document.getElementById('agy-modal-compaction-tag');
        const mockData = { cascadeId: 'comp-test', totalTokens: 25000, cachedTokens: 18000, inputTokens: 5000, outputTokens: 2000, cachePct: 78, compactionCount: 2 };
        if (window.__agyContextCache) window.__agyContextCache.set(mockData.cascadeId, mockData);
        const widget = document.getElementById('agy-context-zone-widget');
        widget.click();
        const select = document.getElementById('agy-session-select');
        const opt = document.createElement('option');
        opt.value = mockData.cascadeId; opt.innerText = 'Compacted Test';
        select.appendChild(opt); select.value = mockData.cascadeId; select.dispatchEvent(new Event('change'));
        const enText = modalCompTag?.innerText;
        window.__agySetLocale('pt');
        const ptText = modalCompTag?.innerText;
        window.__agySetLocale('ja');
        const jaText = modalCompTag?.innerText;
        window.__agySetLocale('en');
        document.getElementById('agy-context-inspector-modal').style.display = 'none';
        return { enText, ptText, jaText };
      })()`,
      returnByValue: true
    });
    const cRes = compTest.result.value;
    assert.strictEqual(cRes.enText, 'COMPACTED (2x)');
    assert.strictEqual(cRes.ptText, 'COMPACTADO (2x)');
    assert.strictEqual(cRes.jaText, '圧縮済み (2x)');
    console.log('  ✓ Test 3 passed: Compaction tag translated correctly');

    // Test 4: subagent isolation
    const isoTest = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        const mockSub = { cascadeId: 'sub-test', totalTokens: 14000, cachedTokens: 10000, inputTokens: 3000, outputTokens: 1000, cachePct: 76, compactionCount: 0 };
        if (window.__agyContextCache) window.__agyContextCache.set(mockSub.cascadeId, mockSub);
        const select = document.getElementById('agy-session-select');
        const opt = document.createElement('option');
        opt.value = mockSub.cascadeId; opt.innerText = '🤖 Subagent Alpha';
        select.appendChild(opt); select.value = mockSub.cascadeId; select.dispatchEvent(new Event('change'));
        const tabSubBtn = document.getElementById('agy-tab-btn-subagents');
        const hiddenInSub = window.getComputedStyle(tabSubBtn).display;
        select.value = 'main'; select.dispatchEvent(new Event('change'));
        const visibleInMain = window.getComputedStyle(tabSubBtn).display;
        document.getElementById('agy-context-inspector-modal').style.display = 'none';
        return { hiddenInSub, visibleInMain };
      })()`,
      returnByValue: true, awaitPromise: true
    });
    const iRes = isoTest.result.value;
    assert.strictEqual(iRes.hiddenInSub, 'none', 'Subagents tab must be hidden inside subagent');
    assert.notStrictEqual(iRes.visibleInMain, 'none', 'Subagents tab must be visible in main conversation');
    console.log('  ✓ Test 4 passed: Subagent isolation works');

    // Test 5: locale switch in main conversation does not activate subagent mode
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
    assert.strictEqual(mRes.subTagAfter, 'none', 'Subagent tag must stay hidden after locale switch');
    assert.notStrictEqual(mRes.tabSubBtnAfter, 'none', 'Subagents tab must remain visible after locale switch');
    console.log('  ✓ Test 5 passed: Locale switch does not trigger subagent mode');

    // Test 6: Rules & System tab navigation and rendering
    const sysTabTest = await sendCmd('Runtime.evaluate', {
      expression: `(() => {
        window.__agySetLocale('en');
        const mockSys = {
          cascadeId: 'sys-test',
          totalTokens: 25000,
          cachedTokens: 18000,
          inputTokens: 5000,
          outputTokens: 2000,
          cachePct: 78,
          compactionCount: 0,
          breakdown: { system: 19500, files: 2500, commands: 1500, dialogue: 1500 },
          files: [{ name: 'generate-widget.mjs', path: '/workspace/generate-widget.mjs', bytes: 12000, tokensEst: 2500, count: 1 }],
          commands: [],
          filesCount: 1,
          commandsCount: 0,
          systemDetails: {
            workspaceDir: '/home/ph/projects/vitalf/code/workspace',
            rules: [
              { name: 'AGENTS.md', path: '/home/ph/projects/vitalf/code/workspace/AGENTS.md', scope: 'workspace', status: 'always_on', bytes: 5120, tokensEst: 1352, contentPreview: 'Vitalf Agent Guidelines' },
              { name: 'workflow-lifecycle.md', path: '/home/ph/projects/vitalf/code/workspace/.agents/rules/workflow-lifecycle.md', scope: 'workspace', status: 'always_on', bytes: 6900, tokensEst: 1822, contentPreview: 'Vitalf Engineering Task Execution Rule' }
            ],
            rulesCount: 2,
            rulesTokensTotal: 3174,
            skills: [
              { name: 'the-judge', path: '/home/ph/projects/vitalf/code/workspace/.agents/skills/the-judge', scope: 'workspace' },
              { name: 'antigravity-guide', path: '/home/ph/.gemini/antigravity/builtin/skills/antigravity_guide', scope: 'builtin' }
            ],
            nativeTools: ['run_command', 'view_file', 'replace_file_content'],
            promptSections: ['identity', 'user_information', 'mcp_servers', 'user_rules']
          }
        };
        if (window.__agyContextCache) window.__agyContextCache.set(mockSys.cascadeId, mockSys);

        const widget = document.getElementById('agy-context-zone-widget');
        widget.click();

        const select = document.getElementById('agy-session-select');
        const opt = document.createElement('option');
        opt.value = mockSys.cascadeId;
        opt.innerText = 'System Test Session';
        select.appendChild(opt);
        select.value = mockSys.cascadeId;
        select.dispatchEvent(new Event('change'));

        const tabSysBtn = document.getElementById('agy-tab-btn-system');
        const check = (cond, msg) => { if (!cond) throw new Error(msg); };
        check(tabSysBtn, 'tabSysBtn must exist');
        tabSysBtn.click();

        const container = document.getElementById('agy-tab-content');
        const content = container?.innerHTML || '';
        const hasSysBanner = content.includes('System Prompt') && content.includes('Rules Architecture');
        const hasRulesSec = content.includes('Active Workspace') && content.includes('Global Rules');
        const hasSkillsSec = content.includes('Skills Catalog');

        // Test overview link to system
        const tabOverviewBtn = document.getElementById('agy-tab-btn-overview');
        tabOverviewBtn.click();
        const linkSys = document.getElementById('agy-link-all-system');
        const hasLinkSys = !!linkSys;
        if (linkSys) linkSys.click();
        const activeAfterLink = tabSysBtn.style.color.includes('rgb(34, 197, 94)');

        document.getElementById('agy-modal-close').click();
        return { hasSysBanner, hasRulesSec, hasSkillsSec, hasLinkSys, activeAfterLink };
      })()`,
      returnByValue: true
    });
    const sRes = sysTabTest.result.value;
    console.log('🧠 System & Rules Tab Test:', JSON.stringify(sRes, null, 2));
    assert.strictEqual(sRes.hasSysBanner, true, 'System banner must render');
    assert.strictEqual(sRes.hasRulesSec, true, 'Rules section must render');
    assert.strictEqual(sRes.hasSkillsSec, true, 'Skills section must render');
    assert.strictEqual(sRes.hasLinkSys, true, 'Overview link to system must exist');
    assert.strictEqual(sRes.activeAfterLink, true, 'Clicking overview link must activate system tab');
    console.log('  ✓ Test 6 passed: System & Rules Inspector renders and links accurately');

    console.log('\n🎉 ALL UNIFIED CDP TESTS PASSED');
    ws.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Integration test error:', err);
    ws.close();
    process.exit(1);
  }
};
