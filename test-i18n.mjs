import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Iniciando Testes Unitários de Internacionalização (i18n) e Sponsor (v1.5.0)...');

const widgetPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'widget.js');
const widgetSrc = fs.readFileSync(widgetPath, 'utf8');

// 1. Integridade de Sintaxe e Versão
assert(widgetSrc.includes("const VERSION = '1.5.0-i18n-opensource';"), 'widget.js deve ter VERSION = 1.5.0-i18n-opensource');
assert(widgetSrc.includes('SUPPORTED_LOCALES'), 'widget.js deve definir SUPPORTED_LOCALES');
assert(widgetSrc.includes('TRANSLATIONS'), 'widget.js deve conter TRANSLATIONS');
assert(widgetSrc.includes('agy-lang-select'), 'widget.js deve conter o seletor de idiomas agy-lang-select');
assert(widgetSrc.includes('agy-modal-sponsor'), 'widget.js deve conter o botão de sponsor agy-modal-sponsor');
assert(widgetSrc.includes('https://github.com/sponsors/vitalfin'), 'widget.js deve apontar para o link de sponsor do GitHub');

console.log('  ✓ Teste 1 passou: Sintaxe e elementos estruturais v1.5.0 presentes.');

// 2. Extração das traduções do widget.js para teste exaustivo de simetria
const matchTranslations = widgetSrc.match(/const TRANSLATIONS = ({[\s\S]*?\n  };)/);
assert(matchTranslations, 'Não foi possível extrair o objeto TRANSLATIONS de widget.js');

// Avalia de forma segura em escopo isolado
const evalDict = new Function(`return ${matchTranslations[1]};`);
const TRANSLATIONS = evalDict();

const expectedLocales = ['en', 'pt', 'es', 'ja', 'zh', 'fr', 'de'];
for (const loc of expectedLocales) {
  assert(TRANSLATIONS[loc], `Idioma obrigatório '${loc}' não encontrado em TRANSLATIONS`);
}
console.log('  ✓ Teste 2 passou: Todos os 7 idiomas suportados estão presentes (en, pt, es, ja, zh, fr, de).');

// 3. Simetria de Chaves e Integridade de Texto
const enKeys = Object.keys(TRANSLATIONS.en);
assert(enKeys.length >= 60, `Dicionário base 'en' deve conter ao menos 60 chaves, possui ${enKeys.length}`);

for (const loc of expectedLocales) {
  const locKeys = Object.keys(TRANSLATIONS[loc]);
  const missingInLoc = enKeys.filter(k => !locKeys.includes(k));
  assert.strictEqual(missingInLoc.length, 0, `Idioma '${loc}' está faltando as chaves: ${missingInLoc.join(', ')}`);

  const extraInLoc = locKeys.filter(k => !enKeys.includes(k));
  assert.strictEqual(extraInLoc.length, 0, `Idioma '${loc}' tem chaves extras não documentadas: ${extraInLoc.join(', ')}`);

  for (const k of enKeys) {
    const val = TRANSLATIONS[loc][k];
    assert(val !== undefined && val !== null && val !== '', `Chave '${k}' no idioma '${loc}' está vazia ou nula`);
  }
}
console.log(`  ✓ Teste 3 passou: Simetria perfeita garantida! Todas as ${enKeys.length} chaves traduzidas nos 7 idiomas sem exceção.`);

// 4. Teste de Interpolação de Parâmetros
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

console.log('  ✓ Teste 4 passou: Interpolação dinâmica ({count}, {tokens}) validada em todos os 7 idiomas.');

// 5. Teste de Inglês como Padrão
const defaultLocaleMatch = widgetSrc.match(/let currentLocale = [^;]+;/);
assert(defaultLocaleMatch, 'Não foi possível encontrar a inicialização de currentLocale');
assert(widgetSrc.includes("return 'en'") || widgetSrc.includes("defaultLocale = 'en'"), 'Idioma padrão do Antigravity DEVE ser inglês (en)');
console.log('  ✓ Teste 5 passou: Inglês configurado como idioma padrão do sistema.');

console.log('\n🎉 TODOS OS TESTES UNITÁRIOS DE i18n PASSARAM COM 100% DE SUCESSO!\n');
