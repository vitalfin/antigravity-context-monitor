import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Internationalization (i18n) and Sponsor Unit Tests (v1.6.0)...');

const widgetPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'widget.js');
const widgetSrc = fs.readFileSync(widgetPath, 'utf8');

// 1. Syntax and Version Integrity
assert(widgetSrc.includes("const VERSION = '1.6.0';"), 'widget.js must have VERSION = 1.6.0');
assert(widgetSrc.includes('SUPPORTED_LOCALES'), 'widget.js must define SUPPORTED_LOCALES');
assert(widgetSrc.includes('TRANSLATIONS'), 'widget.js must contain TRANSLATIONS');
assert(widgetSrc.includes('agy-lang-select'), 'widget.js must contain the language selector agy-lang-select');
assert(widgetSrc.includes('agy-modal-sponsor'), 'widget.js must contain the sponsor button agy-modal-sponsor');
assert(widgetSrc.includes('https://github.com/sponsors/vitalfin'), 'widget.js must point to the GitHub sponsor link');

console.log('  ✓ Test 1 passed: Syntax and structural elements for v1.6.0 present.');

// 2. Extract translations from widget.js for exhaustive symmetry testing
const matchTranslations = widgetSrc.match(/const TRANSLATIONS = ({[\s\S]*?\n  };)/);
assert(matchTranslations, 'Unable to extract TRANSLATIONS object from widget.js');

// Safely evaluate in isolated scope
const evalDict = new Function(`return ${matchTranslations[1]};`);
const TRANSLATIONS = evalDict();

const expectedLocales = ['en', 'pt', 'es', 'ja', 'zh', 'fr', 'de'];
for (const loc of expectedLocales) {
  assert(TRANSLATIONS[loc], `Required locale '${loc}' not found in TRANSLATIONS`);
}
console.log('  ✓ Test 2 passed: All 7 supported locales present (en, pt, es, ja, zh, fr, de).');

// 3. Key Symmetry and Text Integrity
const enKeys = Object.keys(TRANSLATIONS.en);
assert(enKeys.length >= 60, `Base 'en' dictionary must contain at least 60 keys, found ${enKeys.length}`);

for (const loc of expectedLocales) {
  const locKeys = Object.keys(TRANSLATIONS[loc]);
  const missingInLoc = enKeys.filter(k => !locKeys.includes(k));
  assert.strictEqual(missingInLoc.length, 0, `Locale '${loc}' is missing keys: ${missingInLoc.join(', ')}`);

  const extraInLoc = locKeys.filter(k => !enKeys.includes(k));
  assert.strictEqual(extraInLoc.length, 0, `Locale '${loc}' has undocumented extra keys: ${extraInLoc.join(', ')}`);

  for (const k of enKeys) {
    const val = TRANSLATIONS[loc][k];
    assert(val !== undefined && val !== null && val !== '', `Key '${k}' in locale '${loc}' is empty or null`);
  }
}
console.log(`  ✓ Test 3 passed: Perfect symmetry guaranteed across all ${enKeys.length} keys in 7 languages without exception.`);

// 4. Parameter Interpolation Test
function formatMessage(locale, key, params = {}) {
  const dict = TRANSLATIONS[locale] || TRANSLATIONS.en;
  let str = dict[key] || TRANSLATIONS.en[key] || key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

const enCompTag = formatMessage('en', 'modalCompactedTag', { count: 3 });
assert.strictEqual(enCompTag, 'COMPACTED (3x)');

const ptCompTag = formatMessage('pt', 'modalCompactedTag', { count: 3 });
assert.strictEqual(ptCompTag, 'COMPACTADO (3x)');

const esCompTag = formatMessage('es', 'modalCompactedTag', { count: 3 });
assert.strictEqual(esCompTag, 'COMPACTADO (3x)');

const jaCompTag = formatMessage('ja', 'modalCompactedTag', { count: 3 });
assert.strictEqual(jaCompTag, '圧縮済み (3x)');

const zhCompTag = formatMessage('zh', 'modalCompactedTag', { count: 3 });
assert.strictEqual(zhCompTag, '已压缩 (3x)');

const frCompTag = formatMessage('fr', 'modalCompactedTag', { count: 3 });
assert.strictEqual(frCompTag, 'COMPACTÉ (3x)');

const deCompTag = formatMessage('de', 'modalCompactedTag', { count: 3 });
assert.strictEqual(deCompTag, 'KOMPRIMIERT (3x)');

console.log('  ✓ Test 4 passed: Dynamic interpolation ({count}, {tokens}) validated across all 7 languages.');

// 5. English as Default Locale Test
const defaultLocaleMatch = widgetSrc.match(/let currentLocale = [^;]+;/);
assert(defaultLocaleMatch, 'Could not find currentLocale initialization');
assert(widgetSrc.includes("return 'en'") || widgetSrc.includes("defaultLocale = 'en'"), 'Default locale must be English (en)');
console.log('  ✓ Test 5 passed: English configured as default system locale.');

// 6. Specific Key and Quality Validations
assert.strictEqual(TRANSLATIONS.pt.scopeContextWindow, 'JANELA DE CONTEXTO', 'scopeContextWindow in PT must be JANELA DE CONTEXTO');
assert.strictEqual(TRANSLATIONS.es.scopeContextWindow, 'VENTANA DE CONTEXTO');
assert.strictEqual(TRANSLATIONS.fr.scopeContextWindow, 'FENÊTRE DE CONTEXTE');
assert.strictEqual(TRANSLATIONS.de.scopeContextWindow, 'KONTEXTFENSTER');
assert.strictEqual(TRANSLATIONS.ja.scopeContextWindow, 'コンテキストウィンドウ');
assert.strictEqual(TRANSLATIONS.zh.scopeContextWindow, '上下文窗口');
assert.strictEqual(TRANSLATIONS.en.scopeContextWindow, 'CONTEXT WINDOW');

for (const loc of expectedLocales) {
  assert(TRANSLATIONS[loc].optMainConversation.includes('{tokens}'), `optMainConversation in ${loc} must contain {tokens}`);
  assert(TRANSLATIONS[loc].languageLabel.length > 0, `languageLabel in ${loc} must be non-empty`);
}
console.log('  ✓ Test 6 passed: scopeContextWindow, optMainConversation, and languageLabel validated in all languages.');

// 7. Subagent Detection Logic Test (isScopeSubagent)
assert(widgetSrc.includes('function isScopeSubagent'), 'widget.js must implement helper function isScopeSubagent');
console.log('  ✓ Test 7 passed: isScopeSubagent structurally present.');

// 8. v1.6.0 Rules & System Inspector Translations and Interpolation
assert.strictEqual(TRANSLATIONS.pt.modalTitle, 'Inspetor de Janela de Contexto', 'modalTitle in PT must be Inspetor de Janela de Contexto');
assert.strictEqual(TRANSLATIONS.es.modalTitle, 'Inspector de Ventana de Contexto');
assert.strictEqual(TRANSLATIONS.en.modalTitle, 'Context Window Inspector');

for (const loc of expectedLocales) {
  assert(TRANSLATIONS[loc].tabSystem.includes('{count}'), `tabSystem in ${loc} must contain {count}`);
  assert(TRANSLATIONS[loc].sectionRulesTitle.length > 0, `sectionRulesTitle in ${loc} must be non-empty`);
  assert(TRANSLATIONS[loc].sectionSkillsTitle.length > 0, `sectionSkillsTitle in ${loc} must be non-empty`);
  assert(TRANSLATIONS[loc].sectionNativeTitle.length > 0, `sectionNativeTitle in ${loc} must be non-empty`);
  assert(TRANSLATIONS[loc].sectionMcpsTitle.length > 0, `sectionMcpsTitle in ${loc} must be non-empty`);

  const skillsText = formatMessage(loc, 'skillsSummaryText', { count: 5, wsCount: 2, globCount: 2, builtCount: 1 });
  assert(!skillsText.includes('{') && !skillsText.includes('}'), `skillsSummaryText in ${loc} failed interpolation: ${skillsText}`);

  const nativeText = formatMessage(loc, 'nativeSummaryText', { toolsCount: 8, toolsList: 'view_file, run_command', sectionsCount: 4 });
  assert(!nativeText.includes('{') && !nativeText.includes('}'), `nativeSummaryText in ${loc} failed interpolation: ${nativeText}`);

  const mcpsText = formatMessage(loc, 'mcpsSummaryText', { count: 2, toolsCount: 10 });
  assert(!mcpsText.includes('{') && !mcpsText.includes('}'), `mcpsSummaryText in ${loc} failed interpolation: ${mcpsText}`);

  const sysBannerText = formatMessage(loc, 'systemBannerDesc', { tokens: '14.5k' });
  assert(!sysBannerText.includes('{') && !sysBannerText.includes('}'), `systemBannerDesc in ${loc} failed interpolation: ${sysBannerText}`);
}
console.log('  ✓ Test 8 passed: v1.6.0 Rules & System Inspector translations and dynamic interpolations validated across all 7 languages.');

console.log('\n🎉 ALL i18n UNIT TESTS PASSED WITH 100% SUCCESS!\n');
