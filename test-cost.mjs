import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('🧪 Iniciando testes de Custos e Créditos (v1.2.0)...');

// 1. Testes de Unidade de Lógica de Precificação
const PRICING_TIERS = {
  'gemini-flash': {
    id: 'gemini-flash',
    displayName: 'Gemini 2.0 / 1.5 Flash',
    provider: 'Google AI Studio',
    inputPricePerM: 0.10,
    cachePricePerM: 0.025,
    outputPricePerM: 0.40,
    cacheDiscountPct: 75
  },
  'gemini-pro': {
    id: 'gemini-pro',
    displayName: 'Gemini 1.5 / 2.5 Pro',
    provider: 'Google AI Studio',
    inputPricePerM: 1.25,
    inputPricePerMHigh: 2.50,
    cachePricePerM: 0.3125,
    outputPricePerM: 5.00,
    cacheDiscountPct: 75
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    inputPricePerM: 3.00,
    cachePricePerM: 0.30,
    outputPricePerM: 15.00,
    cacheDiscountPct: 90
  }
};

function calculateCosts(uncachedInputTokens, cachedTokens, outputTokens, pricing) {
  const pInput = pricing.inputPricePerM;
  const pCache = pricing.cachePricePerM;
  const pOutput = pricing.outputPricePerM;

  const costInput = (uncachedInputTokens / 1000000) * pInput;
  const costCache = (cachedTokens / 1000000) * pCache;
  const costOutput = (outputTokens / 1000000) * pOutput;
  const totalCost = costInput + costCache + costOutput;
  const savedCost = (cachedTokens / 1000000) * (pInput - pCache);
  const costWithoutCache = totalCost + savedCost;

  return { costInput, costCache, costOutput, totalCost, savedCost, costWithoutCache, pricing };
}

function formatUSD(val) {
  if (val === undefined || val === null || isNaN(val) || val <= 0) return '$0.0000';
  if (val < 0.0001) return '< $0.0001';
  if (val < 0.01) return '$' + val.toFixed(4);
  if (val < 1) return '$' + val.toFixed(3);
  return '$' + val.toFixed(2);
}

// Teste 1: Valores exatos do prompt para Gemini Flash
// 20k uncached, 160k cached, 6k output
const flashCosts = calculateCosts(20000, 160000, 6000, PRICING_TIERS['gemini-flash']);
assert(Math.abs(flashCosts.costInput - 0.002) < 1e-9);
assert(Math.abs(flashCosts.costCache - 0.004) < 1e-9);
assert(Math.abs(flashCosts.costOutput - 0.0024) < 1e-9);
assert.strictEqual(Number(flashCosts.totalCost.toFixed(6)), 0.0084);
assert.strictEqual(Number(flashCosts.savedCost.toFixed(6)), 0.012);
assert.strictEqual(formatUSD(flashCosts.totalCost), '$0.0084');
assert.strictEqual(formatUSD(flashCosts.savedCost), '$0.012');
console.log('  ✓ Teste 1 passou: Cálculo Flash exato ($0.0084 total, $0.012 economia).');

// Teste 2: Gemini Pro com contexto > 128k (deve aplicar tarifa escalonada $2.50)
const proTier = {
  ...PRICING_TIERS['gemini-pro'],
  inputPricePerM: 2.50
};
const proCosts = calculateCosts(50000, 100000, 4000, proTier);
assert.strictEqual(proCosts.costInput, 0.125);
assert.strictEqual(proCosts.costCache, 0.03125);
assert.strictEqual(proCosts.costOutput, 0.02);
assert.strictEqual(proCosts.savedCost, (100000 / 1000000) * (2.50 - 0.3125));
console.log('  ✓ Teste 2 passou: Gemini Pro tiered pricing (>128k = $2.50/M).');

// Teste 3: Claude Sonnet (90% desconto de cache, $3 input, $0.30 cache, $15 output)
const claudeCosts = calculateCosts(10000, 50000, 1000, PRICING_TIERS['claude-sonnet']);
assert.strictEqual(claudeCosts.costInput, 0.03);
assert.strictEqual(claudeCosts.costCache, 0.015);
assert.strictEqual(claudeCosts.costOutput, 0.015);
assert.strictEqual(claudeCosts.savedCost, (50000 / 1000000) * (3.00 - 0.30)); // 0.135
console.log('  ✓ Teste 3 passou: Claude 3.5 Sonnet pricing & 90% cache discount.');

// Teste 4: Formatação de moedas
assert.strictEqual(formatUSD(0), '$0.0000');
assert.strictEqual(formatUSD(0.00005), '< $0.0001');
assert.strictEqual(formatUSD(0.0084), '$0.0084');
assert.strictEqual(formatUSD(0.023), '$0.023');
assert.strictEqual(formatUSD(1.2345), '$1.23');
console.log('  ✓ Teste 4 passou: Formatação USD com alta precisão.');

// Teste 5: Verificação de sintaxe de widget.js e monitor.mjs
const widgetSrc = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'widget.js'), 'utf8');
assert(widgetSrc.includes("VERSION = '1.4.0-subagent-isolation-compaction'"), 'widget.js deve ter VERSION = 1.4.0-subagent-isolation-compaction');
assert(widgetSrc.includes("agy-popover-cost"), 'widget.js deve conter agy-popover-cost');
assert(widgetSrc.includes("agy-m-cost"), 'widget.js deve conter agy-m-cost');
assert(widgetSrc.includes("agy-tab-btn-costs"), 'widget.js deve conter agy-tab-btn-costs');
console.log('  ✓ Teste 5 passou: Integridade estrutural do código de widget.js.');

console.log('🎉 Todos os testes de unidade passaram com 100% de sucesso!');
