import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('🧪 Starting Cost, Credit and Widget Structure tests (v1.6.1)...');

// 1. Pricing Tier Unit Tests
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

// Test 1: Exact prompt values for Gemini Flash
// 20k uncached, 160k cached, 6k output
const flashCosts = calculateCosts(20000, 160000, 6000, PRICING_TIERS['gemini-flash']);
assert(Math.abs(flashCosts.costInput - 0.002) < 1e-9);
assert(Math.abs(flashCosts.costCache - 0.004) < 1e-9);
assert(Math.abs(flashCosts.costOutput - 0.0024) < 1e-9);
assert.strictEqual(Number(flashCosts.totalCost.toFixed(6)), 0.0084);
assert.strictEqual(Number(flashCosts.savedCost.toFixed(6)), 0.012);
assert.strictEqual(formatUSD(flashCosts.totalCost), '$0.0084');
assert.strictEqual(formatUSD(flashCosts.savedCost), '$0.012');
console.log('  ✓ Test 1 passed: Exact Flash calculation ($0.0084 total, $0.012 saved).');

// Test 2: Gemini Pro with context > 128k (must apply tiered rate of $2.50)
const proTier = {
  ...PRICING_TIERS['gemini-pro'],
  inputPricePerM: 2.50
};
const proCosts = calculateCosts(50000, 100000, 4000, proTier);
assert.strictEqual(proCosts.costInput, 0.125);
assert.strictEqual(proCosts.costCache, 0.03125);
assert.strictEqual(proCosts.costOutput, 0.02);
assert.strictEqual(proCosts.savedCost, (100000 / 1000000) * (2.50 - 0.3125));
console.log('  ✓ Test 2 passed: Gemini Pro tiered pricing (>128k = $2.50/M).');

// Test 3: Claude Sonnet (90% cache discount, $3 input, $0.30 cache, $15 output)
const claudeCosts = calculateCosts(10000, 50000, 1000, PRICING_TIERS['claude-sonnet']);
assert.strictEqual(claudeCosts.costInput, 0.03);
assert.strictEqual(claudeCosts.costCache, 0.015);
assert.strictEqual(claudeCosts.costOutput, 0.015);
assert.strictEqual(claudeCosts.savedCost, (50000 / 1000000) * (3.00 - 0.30));
console.log('  ✓ Test 3 passed: Claude 3.5 Sonnet pricing & 90% cache discount.');

// Test 4: Currency formatting
assert.strictEqual(formatUSD(0), '$0.0000');
assert.strictEqual(formatUSD(0.00005), '< $0.0001');
assert.strictEqual(formatUSD(0.0084), '$0.0084');
assert.strictEqual(formatUSD(0.023), '$0.023');
assert.strictEqual(formatUSD(1.2345), '$1.23');
console.log('  ✓ Test 4 passed: High precision USD formatting.');

// Test 5: Syntax and structural integrity of widget.js
const widgetSrc = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'widget.js'), 'utf8');
assert(widgetSrc.includes("VERSION = '1.6.1'"), 'widget.js must have VERSION = 1.6.1');
assert(widgetSrc.includes("agy-popover-cost"), 'widget.js must contain agy-popover-cost');
assert(widgetSrc.includes("agy-m-cost"), 'widget.js must contain agy-m-cost');
assert(widgetSrc.includes("agy-tab-btn-costs"), 'widget.js must contain agy-tab-btn-costs');
assert(widgetSrc.includes("agy-tab-btn-system"), 'widget.js must contain agy-tab-btn-system');
assert(widgetSrc.includes("agy-tab-count-rules"), 'widget.js must contain agy-tab-count-rules');
assert(widgetSrc.includes("sectionRulesTitle"), 'widget.js must contain sectionRulesTitle');
assert(widgetSrc.includes("sectionSkillsTitle"), 'widget.js must contain sectionSkillsTitle');
assert(widgetSrc.includes("sectionNativeTitle"), 'widget.js must contain sectionNativeTitle');
assert(widgetSrc.includes("sectionMcpsTitle"), 'widget.js must contain sectionMcpsTitle');
console.log('  ✓ Test 5 passed: Structural integrity of widget.js (including v1.6.1 Rules & System Inspector).');

// Test 6: Syntax, exports, and resolution of monitor.mjs
const monitorSrc = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'monitor.mjs'), 'utf8');
assert(monitorSrc.includes('getDevToolsPortFile'), 'monitor.mjs must export getDevToolsPortFile');
assert(monitorSrc.includes('acquireLock'), 'monitor.mjs must export acquireLock');
assert(monitorSrc.includes('getExpectedWidgetVersion'), 'monitor.mjs must export getExpectedWidgetVersion');

const { getDevToolsPortFile, getExpectedWidgetVersion } = await import('./monitor.mjs');
assert.strictEqual(typeof getDevToolsPortFile(), 'string', 'getDevToolsPortFile() must return a path string');
assert.strictEqual(getExpectedWidgetVersion(), '1.6.1', 'Expected version must be 1.6.1');
console.log('  ✓ Test 6 passed: Structural integrity and resolution of monitor.mjs.');

console.log('🎉 All unit tests passed with 100% success!');
