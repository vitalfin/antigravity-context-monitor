import fs from 'fs';
import path from 'path';
import { TRANSLATIONS } from './translations.mjs';

const widgetJsContent = `(() => {
  const WIDGET_ID = 'agy-context-zone-widget';
  const BREADCRUMB_WIDGET_ID = 'agy-breadcrumb-context-widget';
  const MODAL_ID = 'agy-context-inspector-modal';
  const POPOVER_ID = 'agy-zone-popover';
  const VERSION = '1.5.1';

  if (window.__agyWidgetVersion === VERSION && (document.getElementById(WIDGET_ID) || document.getElementById(BREADCRUMB_WIDGET_ID))) {
    return;
  }

  // Complete cleanup of older instances
  document.querySelectorAll('#' + WIDGET_ID + ', #' + BREADCRUMB_WIDGET_ID + ', #' + MODAL_ID + ', #' + POPOVER_ID).forEach(el => el.remove());
  document.querySelectorAll('.agy-subagent-badge').forEach(el => el.remove());
  if (window.__agyWidgetInterval) clearInterval(window.__agyWidgetInterval);

  window.__agyWidgetVersion = VERSION;

  const SMART_LIMIT = 250000; // Operational quality threshold (~250k)
  const RAW_LIMIT = 1000000;   // Raw model context capacity (~1M)
  const CIRCLE_C = 81.6814;    // 2 * Math.PI * 13

  // ==========================================
  // INTERNATIONALIZATION SYSTEM (i18n)
  // ==========================================
  const SUPPORTED_LOCALES = {
    en: { name: 'English', flag: '🇺🇸', short: 'EN' },
    pt: { name: 'Português', flag: '🇧🇷', short: 'PT' },
    es: { name: 'Español', flag: '🇪🇸', short: 'ES' },
    ja: { name: '日本語', flag: '🇯🇵', short: 'JA' },
    zh: { name: '中文', flag: '🇨🇳', short: 'ZH' },
    fr: { name: 'Français', flag: '🇫🇷', short: 'FR' },
    de: { name: 'Deutsch', flag: '🇩🇪', short: 'DE' }
  };

  const TRANSLATIONS = ${JSON.stringify(TRANSLATIONS, null, 2)};

  function getSavedLocale() {
    try {
      const saved = localStorage.getItem('agy_locale');
      if (saved && SUPPORTED_LOCALES[saved]) return saved;
    } catch (e) {}
    return 'en'; // Default: English
  }

  let currentLocale = getSavedLocale();

  function t(key, params = {}) {
    const dict = TRANSLATIONS[currentLocale] || TRANSLATIONS.en;
    let str = dict[key] || TRANSLATIONS.en[key] || key;
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll('{' + k + '}', v);
    }
    return str;
  }

  function isScopeSubagent(data, scopeName) {
    const sessionSelect = document.getElementById('agy-session-select');
    if (sessionSelect && sessionSelect.value === 'main') return false;
    if (data && currentContextData && data.cascadeId === currentContextData.cascadeId) return false;
    if (scopeName && (scopeName.includes('🤖') || (currentContextData && data && data.cascadeId !== currentContextData.cascadeId))) return true;
    if (sessionSelect && sessionSelect.value && sessionSelect.value !== 'main') return true;
    return false;
  }

  function setLocale(newLoc) {
    if (!SUPPORTED_LOCALES[newLoc]) return;
    currentLocale = newLoc;
    try {
      localStorage.setItem('agy_locale', newLoc);
    } catch (e) {}

    const modalLangSelect = document.getElementById('agy-lang-select');
    if (modalLangSelect && modalLangSelect.value !== newLoc) modalLangSelect.value = newLoc;
    const popLangSelect = document.getElementById('agy-popover-lang-select');
    if (popLangSelect && popLangSelect.value !== newLoc) popLangSelect.value = newLoc;

    updateStaticLabels();

    if (popover && popover.style.display === 'block') {
      const activeSub = getActiveBreadcrumbSubagent();
      const isSub = currentPopoverIsSubagent || (activeSub && activeSub.details);
      const scopeTitle = isSub ? ('🤖 ' + t('scopeSubagent') + ': ' + (activeSub?.name || '')) : t('scopeContextWindow');
      populatePopoverData(currentPopoverData, scopeTitle, isSub);
    }

    if (modal && modal.style.display === 'flex') {
      const isSub = isScopeSubagent(activeModalData, activeModalScope);
      const sessionSelect = document.getElementById('agy-session-select');
      const subName = sessionSelect && sessionSelect.value !== 'main' ? (sessionSelect.options[sessionSelect.selectedIndex]?.text?.replace(/^[🤖🌐\s]+/, '') || t('scopeSubagent')) : null;
      const scopeTitle = isSub ? ('🤖 ' + (subName || t('scopeSubagent'))) : t('scopeMainConversation');
      renderModalWithData(activeModalData, scopeTitle);
    }

    updateAll();
  }

  function formatTokens(n) {
    if (!n || n <= 0) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  function toTokens(chars) {
    if (!chars || chars <= 0) return 0;
    return Math.max(1, Math.round(chars / 3.8));
  }

  function getZone(pct) {
    if (pct > 60) {
      return {
        color: '#ef4444',
        tag: t('zoneDumbTag'),
        bg: 'rgba(239, 68, 68, 0.18)',
        desc: t('zoneDumbDesc')
      };
    } else if (pct >= 40) {
      return {
        color: '#eab308',
        tag: t('zoneWarnTag'),
        bg: 'rgba(234, 179, 8, 0.20)',
        desc: t('zoneWarnDesc')
      };
    }
    return {
      color: '#22c55e',
      tag: t('zoneSmartTag'),
      bg: 'rgba(34, 197, 94, 0.18)',
      desc: t('zoneSmartDesc')
    };
  }

  const MODEL_NAMES = {
    'MODEL_PLACEHOLDER_M318': 'Gemini 3.8 Flash',
    'MODEL_PLACEHOLDER_M319': 'Gemini 3.8 Flash',
    'MODEL_PLACEHOLDER_M320': 'Gemini 3.8 Flash',
    'MODEL_PLACEHOLDER_M298': 'Gemini 3.7 Flash',
    'MODEL_PLACEHOLDER_M71': 'Gemini 3.6 Flash',
    'MODEL_PLACEHOLDER_M35': 'Claude Sonnet 4.6',
    'MODEL_PLACEHOLDER_M26': 'Claude Opus 4.6',
    'MODEL_PLACEHOLDER_M16': 'Gemini 3.1 Pro',
    'default': 'Gemini 3.8 Flash'
  };

  function detectModelName(rawModelId) {
    const btn = document.querySelector('button[data-testid="model-selector-trigger"]') ||
                document.querySelector('[data-testid*="model"]');
    if (btn) {
      const aria = (btn.getAttribute('aria-label') || '').trim();
      const ariaMatch = aria.match(/current:\\s*([A-Za-z0-9.\\s]+)/i);
      if (ariaMatch && ariaMatch[1]) {
        return ariaMatch[1].replace(/\\s+(Medium|Low|High)$/i, '').trim();
      }
      const text = (btn.innerText || '').trim();
      if (text && text.length < 40 && (text.includes('Gemini') || text.includes('Claude') || text.includes('Flash') || text.includes('Pro') || text.includes('GPT'))) {
        return text.replace(/\\s+(Medium|Low|High)$/i, '').trim();
      }
    }

    if (rawModelId && MODEL_NAMES[rawModelId]) {
      return MODEL_NAMES[rawModelId];
    }

    if (rawModelId && !rawModelId.startsWith('MODEL_PLACEHOLDER')) {
      return rawModelId;
    }

    return 'Gemini 3.8 Flash';
  }

  // API PRICING TABLE (Google AI Studio / Vertex AI / Claude)
  const PRICING_TIERS = {
    'gemini-flash': {
      id: 'gemini-flash',
      displayName: 'Gemini 3.8 Flash',
      provider: 'Google AI Studio',
      inputPricePerM: 0.10,
      cachePricePerM: 0.025, // 75% cache discount
      outputPricePerM: 0.40,
      cacheDiscountPct: 75
    },
    'gemini-pro': {
      id: 'gemini-pro',
      displayName: 'Gemini 3.1 Pro',
      provider: 'Google AI Studio',
      inputPricePerM: 1.25,      // <= 128k
      inputPricePerMHigh: 2.50,  // > 128k
      cachePricePerM: 0.3125,    // 75% discount
      outputPricePerM: 5.00,
      cacheDiscountPct: 75
    },
    'claude-sonnet': {
      id: 'claude-sonnet',
      displayName: 'Claude Sonnet 4.6',
      provider: 'Anthropic',
      inputPricePerM: 3.00,
      cachePricePerM: 0.30,      // 90% discount
      outputPricePerM: 15.00,
      cacheDiscountPct: 90
    }
  };

  function getModelPricing(modelName, totalTokens) {
    const detectedName = detectModelName(modelName);
    const m = detectedName.toLowerCase();

    if (m.includes('claude') || m.includes('sonnet') || m.includes('opus')) {
      return {
        ...PRICING_TIERS['claude-sonnet'],
        displayName: detectedName
      };
    }

    if (m.includes('pro')) {
      const isOver128k = (totalTokens || 0) > 128000;
      const base = PRICING_TIERS['gemini-pro'];
      return {
        ...base,
        displayName: isOver128k ? detectedName + ' (>128k)' : detectedName,
        inputPricePerM: isOver128k ? base.inputPricePerMHigh : base.inputPricePerM
      };
    }

    // Default: Gemini Flash
    return {
      ...PRICING_TIERS['gemini-flash'],
      displayName: detectedName || 'Gemini 3.8 Flash'
    };
  }

  function calculateCosts(uncachedInputTokens, cachedTokens, outputTokens, pricing) {
    const pInput = pricing.inputPricePerM;
    const pCache = pricing.cachePricePerM;
    const pOutput = pricing.outputPricePerM;

    const costInput = (uncachedInputTokens / 1000000) * pInput;
    const costCache = (cachedTokens / 1000000) * pCache;
    const costOutput = (outputTokens / 1000000) * pOutput;
    const totalCost = costInput + costCache + costOutput;

    // Context cache savings
    const savedCost = (cachedTokens / 1000000) * (pInput - pCache);
    const costWithoutCache = totalCost + savedCost;

    return {
      costInput,
      costCache,
      costOutput,
      totalCost,
      savedCost,
      costWithoutCache,
      pricing
    };
  }

  function formatUSD(val) {
    if (val === undefined || val === null || isNaN(val) || val <= 0) return '$0.0000';
    if (val < 0.0001) return '< $0.0001';
    if (val < 0.01) return '$' + val.toFixed(4);
    if (val < 1) return '$' + val.toFixed(3);
    return '$' + val.toFixed(2);
  }

  function formatBRL(valUSD) {
    if (!valUSD || isNaN(valUSD) || valUSD <= 0) return 'R$ 0,00';
    const brl = valUSD * 5.65;
    if (brl < 0.01) return '< R$ 0,01';
    return 'R$ ' + brl.toFixed(2).replace('.', ',');
  }

  function calculateProjections(cacheRatio, currentOutputTokens, pricing) {
    const ratio = Math.max(0, Math.min(0.99, cacheRatio || 0.75));
    const output = currentOutputTokens > 0 ? currentOutputTokens : 4000;

    // Smart Zone (250k tokens)
    const smartTarget = 250000;
    const smartCached = Math.round(smartTarget * ratio);
    const smartUncached = smartTarget - smartCached;
    const smartInputPrice = (pricing.id === 'gemini-pro' && smartTarget > 128000) ? pricing.inputPricePerMHigh : pricing.inputPricePerM;
    const smartCostCached = (smartCached / 1000000) * pricing.cachePricePerM;
    const smartCostUncached = (smartUncached / 1000000) * smartInputPrice;
    const smartCostOutput = (output / 1000000) * pricing.outputPricePerM;
    const smartTotal = smartCostCached + smartCostUncached + smartCostOutput;
    const smartWithoutCache = (smartTarget / 1000000) * smartInputPrice + smartCostOutput;
    const smartSaved = smartWithoutCache - smartTotal;

    // Dumb Zone / Full Window (1M tokens)
    const rawTarget = 1000000;
    const rawCached = Math.round(rawTarget * ratio);
    const rawUncached = rawTarget - rawCached;
    const rawInputPrice = (pricing.id === 'gemini-pro') ? pricing.inputPricePerMHigh : pricing.inputPricePerM;
    const rawCostCached = (rawCached / 1000000) * pricing.cachePricePerM;
    const rawCostUncached = (rawUncached / 1000000) * rawInputPrice;
    const rawCostOutput = (output / 1000000) * pricing.outputPricePerM;
    const rawTotal = rawCostCached + rawCostUncached + rawCostOutput;
    const rawWithoutCache = (rawTarget / 1000000) * rawInputPrice + rawCostOutput;
    const rawSaved = rawWithoutCache - rawTotal;

    return {
      smart: {
        targetTokens: smartTarget,
        cachedTokens: smartCached,
        uncachedTokens: smartUncached,
        totalCost: smartTotal,
        savedCost: smartSaved,
        withoutCache: smartWithoutCache
      },
      raw: {
        targetTokens: rawTarget,
        cachedTokens: rawCached,
        uncachedTokens: rawUncached,
        totalCost: rawTotal,
        savedCost: rawSaved,
        withoutCache: rawWithoutCache
      }
    };
  }

  // Global context state
  let currentContextData = null;
  let activeTab = 'overview';
  let latestSubagentsList = [];
  let activeModalData = null;
  let activeModalScope = 'Main Conversation';
  let currentPopoverData = null;
  let currentPopoverScope = 'CONTEXT WINDOW';
  let currentPopoverIsSubagent = false;
  let hideTimer = null;

  // Context cache by cascadeId
  const contextCache = new Map();
  window.__agyContextCache = contextCache;
  window.__agySetLocale = setLocale;
  window.__agyGetLocale = () => currentLocale;

  async function fetchContextDetails(cascadeId) {
    if (!cascadeId) return null;
    try {
      const token = window.__APP_CONFIG__?.csrfToken;
      const res = await fetch('/exa.language_server_pb.LanguageServerService/GetCascadeTrajectorySteps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-codeium-csrf-token': token
        },
        body: JSON.stringify({
          cascadeId: cascadeId,
          startIndex: 0,
          endIndex: 2000,
          metadata: { ideName: 'antigravity', extensionName: 'antigravity' }
        })
      });
      if (!res.ok) return contextCache.get(cascadeId) || null;
      const data = await res.json();
      const steps = data.steps || [];

      if (steps.length === 0) {
        return null;
      }

      let latestUsage = null;
      let firstUsage = null;
      let compactionCount = 0;
      let checkpoints = [];
      const filesMap = new Map();
      const commandsList = [];
      let userChars = 0;
      let assistantChars = 0;

      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];

        // Antigravity automatic compaction detection
        if (s.type === 'CORTEX_STEP_TYPE_CHECKPOINT' || s.checkpoint) {
          compactionCount++;
          checkpoints.push({
            stepIndex: s.metadata?.sourceTrajectoryStepInfo?.stepIndex || i,
            summary: s.checkpoint?.sessionSummary || null
          });
        }

        if (s.metadata?.modelUsage) {
          if (!firstUsage) firstUsage = s.metadata.modelUsage;
          latestUsage = s.metadata.modelUsage;
        }

        if (s.userInput?.userRequest?.message) {
          userChars += s.userInput.userRequest.message.length;
        } else if (s.userInput?.items) {
          for (const it of s.userInput.items) {
            if (it.text) userChars += it.text.length;
          }
        }

        if (s.plannerResponse?.response) {
          assistantChars += s.plannerResponse.response.length;
        }

        if (s.viewFile) {
          let p = s.viewFile.absolutePath || s.viewFile.path;
          if (!p && s.metadata?.toolCall?.argumentsJson) {
            try {
              const parsed = JSON.parse(s.metadata.toolCall.argumentsJson);
              p = parsed.AbsolutePath || parsed.Path;
            } catch (e) {}
          }
          if (p) {
            const bytes = s.viewFile.lineRangeBytes || s.viewFile.contentLength || s.viewFile.numBytes || 0;
            const existing = filesMap.get(p) || { count: 0, bytes: 0 };
            filesMap.set(p, {
              path: p,
              name: p.split('/').pop(),
              count: existing.count + 1,
              bytes: Math.max(existing.bytes, bytes),
              tokensEst: toTokens(Math.max(existing.bytes, bytes))
            });
          }
        }

        if (s.runCommand) {
          let cmd = s.runCommand.commandLine;
          if (!cmd && s.metadata?.toolCall?.argumentsJson) {
            try {
              const parsed = JSON.parse(s.metadata.toolCall.argumentsJson);
              cmd = parsed.CommandLine;
            } catch (e) {}
          }
          const out = s.runCommand.combinedOutput?.full || '';
          if (cmd) {
            commandsList.push({
              cmd: cmd.trim().split('\\n')[0].slice(0, 90),
              fullCmd: cmd,
              outBytes: out.length,
              tokensEst: toTokens(out.length),
              exitCode: s.runCommand.exitCode ?? 0
            });
          }
        }
      }

      const filesList = Array.from(filesMap.values()).sort((a, b) => b.tokensEst - a.tokensEst);
      const commandsSorted = commandsList.sort((a, b) => b.tokensEst - a.tokensEst);

      const totalFilesTokens = filesList.reduce((acc, f) => acc + f.tokensEst, 0);
      const totalCmdTokens = commandsSorted.reduce((acc, c) => acc + c.tokensEst, 0);
      const totalUserTokens = toTokens(userChars);
      const totalAssistantTokens = toTokens(assistantChars);

      const totalTokens = latestUsage ? (Number(latestUsage.inputTokens || 0) + Number(latestUsage.cacheReadTokens || 0) + Number(latestUsage.outputTokens || 0)) : 0;
      const cachedTokens = latestUsage ? Number(latestUsage.cacheReadTokens || 0) : 0;
      const inputTokens = latestUsage ? Number(latestUsage.inputTokens || 0) : 0;
      const outputTokens = latestUsage ? Number(latestUsage.outputTokens || 0) : 0;

      // Base system prompt tokens
      const systemTokensEst = firstUsage ? Math.max(5000, Number(firstUsage.inputTokens || 0) - totalUserTokens) : 19000;

      const pricing = getModelPricing(latestUsage?.model, totalTokens);
      const costs = calculateCosts(inputTokens, cachedTokens, outputTokens, pricing);

      const result = {
        cascadeId,
        totalTokens,
        cachedTokens,
        inputTokens,
        outputTokens,
        cachePct: (cachedTokens + inputTokens) > 0 ? Math.round((cachedTokens / (cachedTokens + inputTokens)) * 100) : 0,
        pricing,
        costs,
        compactionCount,
        checkpoints,
        breakdown: {
          system: systemTokensEst,
          files: totalFilesTokens,
          commands: totalCmdTokens,
          dialogue: totalUserTokens + totalAssistantTokens
        },
        files: filesList,
        commands: commandsSorted,
        filesCount: filesList.length,
        commandsCount: commandsSorted.length,
        latestUsage
      };

      contextCache.set(cascadeId, result);
      return result;
    } catch (err) {
      return contextCache.get(cascadeId) || null;
    }
  }

  // 1. CREATE MAIN WIDGET (FOOTER / INPUT BAR)
  const widget = document.createElement('div');
  widget.id = WIDGET_ID;
  widget.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; height: 28px; width: 28px; border-radius: 8px; cursor: pointer; user-select: none; position: relative; margin-left: 6px; vertical-align: middle; transition: background-color 0.15s ease; flex-shrink: 0;';
  widget.innerHTML = \`
    <div id="agy-badge" style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; position: relative;">
      <svg viewBox="0 0 32 32" style="width: 17px; height: 17px; transform: rotate(-90deg); display: block;">
        <circle cx="16" cy="16" r="13" fill="transparent" stroke="color-mix(in srgb, var(--foreground, #fff) 12%, transparent)" stroke-width="3.2" />
        <circle id="agy-zone-ring" cx="16" cy="16" r="13" fill="transparent" stroke="#22c55e" stroke-width="3.8" stroke-linecap="round" stroke-dasharray="\${CIRCLE_C}" stroke-dashoffset="\${CIRCLE_C}" style="transition: stroke-dashoffset 0.35s ease, stroke 0.3s ease;" />
      </svg>
    </div>
  \`;

  // 2. CREATE BREADCRUMB WIDGET (TOP / HEADER)
  const breadcrumbWidget = document.createElement('div');
  breadcrumbWidget.id = BREADCRUMB_WIDGET_ID;
  breadcrumbWidget.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; height: 22px; width: 22px; border-radius: 6px; cursor: pointer; user-select: none; position: relative; margin-left: 6px; vertical-align: middle; transition: background-color 0.15s ease; flex-shrink: 0;';
  breadcrumbWidget.innerHTML = \`
    <div id="agy-breadcrumb-badge" style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; position: relative;">
      <svg viewBox="0 0 32 32" style="width: 15px; height: 15px; transform: rotate(-90deg); display: block;">
        <circle cx="16" cy="16" r="13" fill="transparent" stroke="color-mix(in srgb, var(--foreground, #fff) 12%, transparent)" stroke-width="3.2" />
        <circle id="agy-breadcrumb-ring" cx="16" cy="16" r="13" fill="transparent" stroke="#22c55e" stroke-width="3.8" stroke-linecap="round" stroke-dasharray="\${CIRCLE_C}" stroke-dashoffset="\${CIRCLE_C}" style="transition: stroke-dashoffset 0.35s ease, stroke 0.3s ease;" />
      </svg>
    </div>
  \`;

  // 3. SINGLETON POPOVER PORTALED DIRECTLY TO BODY
  const popover = document.createElement('div');
  popover.id = POPOVER_ID;
  popover.style.cssText = 'display: none; position: fixed; width: 310px; background: var(--card, #1c1c1f); color: var(--foreground, #f2f2f2); border: 1px solid var(--border, rgba(255, 255, 255, 0.12)); border-radius: 10px; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6), 0 3px 10px rgba(0, 0, 0, 0.4); padding: 12px; z-index: 99999999; font-family: var(--font-sans, system-ui, -apple-system, sans-serif); pointer-events: auto; box-sizing: border-box; font-size: 11.5px; line-height: 1.4;';

  popover.innerHTML = \`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <div style="display: flex; align-items: center; gap: 5px; max-width: 165px;">
        <span id="agy-scope-title" style="font-weight: 600; font-size: 11px; opacity: 0.85; letter-spacing: 0.03em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">CONTEXT WINDOW</span>
        <span id="agy-compaction-badge" style="display: none; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; white-space: nowrap;">🔄 1x</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span id="agy-zone-tag" style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(34, 197, 94, 0.18); color: #22c55e; letter-spacing: 0.02em;">
          SMART ZONE ✓
        </span>
      </div>
    </div>

    <div style="height: 5px; width: 100%; background: color-mix(in srgb, var(--foreground, #fff) 10%, transparent); border-radius: 9999px; overflow: hidden; margin-bottom: 8px; position: relative;">
      <div id="agy-zone-bar" style="width: 0%; height: 100%; background: #22c55e; border-radius: 9999px; transition: width 0.35s ease, background 0.3s ease;"></div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px;">
      <span id="agy-lbl-operational" style="font-size: 11px; color: var(--muted-foreground, #999);">Operational Usage:</span>
      <span id="agy-zone-used" style="font-weight: 600; font-size: 12px; font-variant-numeric: tabular-nums;">0 / 250k (0%)</span>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; font-size: 10px; color: var(--muted-foreground, #888);">
      <span id="agy-lbl-raw">Raw Capacity:</span>
      <span id="agy-zone-raw" style="font-variant-numeric: tabular-nums;">0 / 1.0M (0%)</span>
    </div>

    <div id="agy-zone-desc" style="font-size: 10px; padding: 4px 6px; border-radius: 4px; background: color-mix(in srgb, var(--foreground, #fff) 5%, transparent); color: #22c55e; text-align: center; font-weight: 500; margin-bottom: 8px;">
      High quality (accurate, sharp responses)
    </div>

    <!-- SUMMARY CONTEXT COMPOSITION -->
    <div id="agy-composition-section" style="padding-top: 6px; border-top: 1px solid var(--border, rgba(255,255,255,0.1)); margin-bottom: 6px;">
      <div style="font-size: 10px; font-weight: 600; color: var(--muted-foreground, #999); text-transform: uppercase; margin-bottom: 5px; display: flex; justify-content: space-between;">
        <span id="agy-lbl-context-dist">Context Distribution</span>
        <span id="agy-cache-badge" style="color: #38bdf8; font-weight: 600; text-transform: none;">⚡ Cache: 0%</span>
      </div>

      <div id="agy-cost-popover-badge" style="display: flex; justify-content: space-between; align-items: center; padding: 4px 7px; border-radius: 5px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); margin-bottom: 6px; font-size: 9.5px;">
        <span><span id="agy-lbl-pop-cost">💰 Est. Cost:</span> <strong id="agy-popover-cost" style="color: #22c55e; font-variant-numeric: tabular-nums;">~$0.0000</strong></span>
        <span id="agy-popover-saved" style="color: #38bdf8; font-size: 9px; font-variant-numeric: tabular-nums;">Saved: -$0.0000</span>
      </div>
      
      <div id="agy-breakdown-tags" style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 9.5px; margin-bottom: 6px;">
        <span id="agy-tag-system" style="padding: 2px 5px; border-radius: 3px; background: rgba(168, 85, 247, 0.15); color: #c084fc;">🧠 System: 0</span>
        <span id="agy-tag-files" style="padding: 2px 5px; border-radius: 3px; background: rgba(59, 130, 246, 0.15); color: #60a5fa;">📄 Files: 0</span>
        <span id="agy-tag-cmds" style="padding: 2px 5px; border-radius: 3px; background: rgba(249, 115, 22, 0.15); color: #fb923c;">💻 Outputs: 0</span>
      </div>

      <!-- Top consumers preview -->
      <div id="agy-top-consumers" style="font-size: 10px; color: var(--muted-foreground, #aaa); display: flex; flex-direction: column; gap: 2px;"></div>
    </div>

    <!-- DYNAMIC SUBAGENTS SECTION (for main conversation) -->
    <div id="agy-subagents-section" style="display: none; padding-top: 6px; border-top: 1px solid var(--border, rgba(255,255,255,0.1)); margin-bottom: 6px;">
      <div style="font-size: 10px; font-weight: 600; color: var(--muted-foreground, #999); text-transform: uppercase; margin-bottom: 2px; display: flex; justify-content: space-between;">
        <span id="agy-lbl-subagents-sec">Subagents (Isolated)</span>
        <span id="agy-subagents-count" style="font-weight: 700;">0</span>
      </div>
      <div id="agy-lbl-subagents-hint" style="font-size: 9.5px; color: var(--muted-foreground, #777); margin-bottom: 4px;">Independent contexts (do not count toward main):</div>
      <div id="agy-subagents-list" style="display: flex; flex-direction: column; gap: 3px; font-size: 10.5px;"></div>
    </div>

    <!-- POPOVER FOOTER (INSPECT + LANGUAGE + SPONSOR) -->
    <div style="padding-top: 6px; border-top: 1px solid var(--border, rgba(255,255,255,0.1)); display: flex; gap: 6px; align-items: center;">
      <button id="agy-btn-inspect" type="button" style="flex: 1; border: 1px solid var(--border, rgba(255,255,255,0.15)); background: var(--secondary, rgba(255,255,255,0.06)); color: var(--foreground, #f2f2f2); border-radius: 6px; padding: 5px 8px; font-size: 10.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: background 0.15s ease;">
        <span id="agy-btn-inspect-text">🔍 Inspect Full Context</span>
      </button>

      <select id="agy-popover-lang-select" style="background: var(--secondary, #27272a); color: var(--foreground, #f4f4f5); border: 1px solid var(--border, rgba(255,255,255,0.18)); border-radius: 6px; padding: 4px 5px; font-size: 10px; font-weight: 600; cursor: pointer; outline: none;" title="Change Language / Trocar Idioma">
        <option value="en">🇺🇸 EN</option>
        <option value="pt">🇧🇷 PT</option>
        <option value="es">🇪🇸 ES</option>
        <option value="ja">🇯🇵 JA</option>
        <option value="zh">🇨🇳 ZH</option>
        <option value="fr">🇫🇷 FR</option>
        <option value="de">🇩🇪 DE</option>
      </select>

      <a id="agy-btn-popover-sponsor" href="https://github.com/sponsors/vitalfin" target="_blank" rel="noopener noreferrer" style="background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); color: #fb7185; border-radius: 6px; padding: 5px 7px; font-size: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 2px; text-decoration: none; transition: background 0.15s ease;" title="Support Vitalf on GitHub Sponsors">
        <span>💖</span>
      </a>
    </div>

    <!-- Popover Arrow with Dynamic Positioning -->
    <div id="agy-popover-arrow" style="position: absolute; width: 8px; height: 8px; background: var(--card, #1c1c1f); pointer-events: none;"></div>
  \`;

  document.body.appendChild(popover);

  // 4. DYNAMIC POPOVER POSITIONING AND VIEWPORT CLAMPING (ANTI-CLIPPING)
  function positionPopover(targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const popWidth = 310;

    let left = rect.left + rect.width / 2 - popWidth / 2;
    left = Math.max(16, Math.min(window.innerWidth - popWidth - 16, left));
    popover.style.left = left + 'px';

    const arrow = popover.querySelector('#agy-popover-arrow');
    const arrowLeft = (rect.left + rect.width / 2) - left;
    const clampedArrowLeft = Math.max(14, Math.min(popWidth - 14, arrowLeft));

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove < 340 && spaceBelow >= 250) {
      popover.style.top = (rect.bottom + 8) + 'px';
      popover.style.bottom = 'auto';
      if (arrow) {
        arrow.style.top = '-5px';
        arrow.style.bottom = 'auto';
        arrow.style.left = clampedArrowLeft + 'px';
        arrow.style.transform = 'translateX(-50%) rotate(45deg)';
        arrow.style.borderLeft = '1px solid var(--border, rgba(255, 255, 255, 0.12))';
        arrow.style.borderTop = '1px solid var(--border, rgba(255, 255, 255, 0.12))';
        arrow.style.borderRight = 'none';
        arrow.style.borderBottom = 'none';
      }
    } else {
      popover.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
      popover.style.top = 'auto';
      if (arrow) {
        arrow.style.bottom = '-5px';
        arrow.style.top = 'auto';
        arrow.style.left = clampedArrowLeft + 'px';
        arrow.style.transform = 'translateX(-50%) rotate(45deg)';
        arrow.style.borderRight = '1px solid var(--border, rgba(255, 255, 255, 0.12))';
        arrow.style.borderBottom = '1px solid var(--border, rgba(255, 255, 255, 0.12))';
        arrow.style.borderLeft = 'none';
        arrow.style.borderTop = 'none';
      }
    }
  }

  function populatePopoverData(data, scopeTitle, isSubagent = false) {
    currentPopoverData = data;
    currentPopoverScope = scopeTitle;
    currentPopoverIsSubagent = isSubagent;

    const scopeEl = document.getElementById('agy-scope-title');
    if (scopeEl) {
      scopeEl.innerText = scopeTitle || (isSubagent ? t('scopeSubagent') : t('scopeContextWindow'));
    }

    const compBadge = document.getElementById('agy-compaction-badge');
    if (compBadge) {
      if (data && data.compactionCount > 0) {
        compBadge.style.display = 'inline-block';
        compBadge.innerText = '🔄 ' + data.compactionCount + 'x';
        compBadge.title = t('compactionBadgeTitle', { count: data.compactionCount, tokens: formatTokens(data.totalTokens) });
      } else {
        compBadge.style.display = 'none';
      }
    }

    if (!data || data.totalTokens === 0) {
      const tagEl = document.getElementById('agy-zone-tag');
      if (tagEl) {
        tagEl.innerText = t('zoneSmartTag');
        tagEl.style.color = '#22c55e';
        tagEl.style.background = 'rgba(34, 197, 94, 0.18)';
      }
      const barEl = document.getElementById('agy-zone-bar');
      if (barEl) { barEl.style.width = '0%'; barEl.style.background = '#22c55e'; }
      const usedEl = document.getElementById('agy-zone-used');
      if (usedEl) { usedEl.innerText = '0 / 250k (0%)'; usedEl.style.color = '#22c55e'; }
      const rawEl = document.getElementById('agy-zone-raw');
      if (rawEl) rawEl.innerText = '0 / 1.0M (0%)';
      const descEl = document.getElementById('agy-zone-desc');
      if (descEl) { descEl.innerText = t('cleanContext'); descEl.style.color = '#22c55e'; }
      const cacheBadge = document.getElementById('agy-cache-badge');
      if (cacheBadge) cacheBadge.innerText = t('cacheBadge', { pct: 0 });
      const popCost = document.getElementById('agy-popover-cost');
      if (popCost) popCost.innerText = '~$0.0000';
      const popSaved = document.getElementById('agy-popover-saved');
      if (popSaved) popSaved.innerText = t('savings') + ' -$0.0000';
      const tagSys = document.getElementById('agy-tag-system');
      if (tagSys) tagSys.innerText = t('tagSystem', { val: '0' });
      const tagFiles = document.getElementById('agy-tag-files');
      if (tagFiles) tagFiles.innerText = t('tagFiles', { val: '0' });
      const tagCmds = document.getElementById('agy-tag-cmds');
      if (tagCmds) tagCmds.innerText = t('tagCmds', { val: '0' });
      const topConsumers = document.getElementById('agy-top-consumers');
      if (topConsumers) topConsumers.innerHTML = '<span style="opacity: 0.7;">' + t('readyForTasks') + '</span>';
      const sectionEl = document.getElementById('agy-subagents-section');
      if (sectionEl) sectionEl.style.display = 'none';
      return;
    }

    const totalTokens = data.totalTokens;
    const pct = Math.round((totalTokens / SMART_LIMIT) * 1000) / 10;
    const visualPct = Math.min(100, Math.max(0, pct));
    const rawPct = Math.round((totalTokens / RAW_LIMIT) * 1000) / 10;
    const zone = getZone(pct);

    const tagEl = document.getElementById('agy-zone-tag');
    const barEl = document.getElementById('agy-zone-bar');
    const usedEl = document.getElementById('agy-zone-used');
    const rawEl = document.getElementById('agy-zone-raw');
    const descEl = document.getElementById('agy-zone-desc');

    if (tagEl) {
      tagEl.innerText = zone.tag;
      tagEl.style.color = zone.color;
      tagEl.style.background = zone.bg;
    }
    if (barEl) {
      barEl.style.width = visualPct + '%';
      barEl.style.background = zone.color;
    }
    if (usedEl) {
      usedEl.innerText = formatTokens(totalTokens) + ' / 250k (' + pct + '%)';
      usedEl.style.color = zone.color;
    }
    if (rawEl) {
      rawEl.innerText = formatTokens(totalTokens) + ' / 1.0M (' + rawPct + '%)';
    }
    if (descEl) {
      descEl.innerText = zone.desc;
      descEl.style.color = zone.color;
    }

    const cacheBadge = document.getElementById('agy-cache-badge');
    if (cacheBadge) {
      cacheBadge.innerText = t('cacheBadge', { pct: data.cachePct || 0 });
      cacheBadge.title = t('cacheTooltip', { tokens: formatTokens(data.cachedTokens || 0) });
    }

    const costs = data.costs || calculateCosts(data.inputTokens, data.cachedTokens, data.outputTokens, data.pricing || getModelPricing(data.latestUsage?.model, totalTokens));

    const popCost = document.getElementById('agy-popover-cost');
    if (popCost) popCost.innerText = '~' + formatUSD(costs.totalCost);
    const popSaved = document.getElementById('agy-popover-saved');
    if (popSaved) {
      popSaved.innerText = t('savings') + ' -' + formatUSD(costs.savedCost);
      popSaved.title = t('savingsTooltip', { usd: formatUSD(costs.savedCost) });
    }

    const tagSys = document.getElementById('agy-tag-system');
    if (tagSys) tagSys.innerText = t('tagSystem', { val: '~' + formatTokens(data.breakdown?.system || 0) });
    const tagFiles = document.getElementById('agy-tag-files');
    if (tagFiles) tagFiles.innerText = t('tagFiles', { val: '~' + formatTokens(data.breakdown?.files || 0) });
    const tagCmds = document.getElementById('agy-tag-cmds');
    if (tagCmds) tagCmds.innerText = t('tagCmds', { val: '~' + formatTokens(data.breakdown?.commands || 0) });

    const topConsumers = document.getElementById('agy-top-consumers');
    if (topConsumers) {
      const topItems = [];
      if (data.files && data.files[0]) topItems.push('📄 ' + data.files[0].name + ' (~' + formatTokens(data.files[0].tokensEst) + ')');
      if (data.files && data.files[1]) topItems.push('📄 ' + data.files[1].name + ' (~' + formatTokens(data.files[1].tokensEst) + ')');
      if (data.commands && data.commands[0]) topItems.push('💻 ' + data.commands[0].cmd.slice(0, 24) + '... (~' + formatTokens(data.commands[0].tokensEst) + ')');

      if (topItems.length > 0) {
        topConsumers.innerHTML = topItems.slice(0, 2).map(it => \`
          <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.85;">\${it}</div>
        \`).join('');
      } else {
        topConsumers.innerHTML = '<span style="opacity: 0.7;">' + t('balancedConsumption') + '</span>';
      }
    }

    // Subagents section in popover (only shown in main session when subagents exist)
    const sectionEl = document.getElementById('agy-subagents-section');
    const countEl = document.getElementById('agy-subagents-count');
    const listEl = document.getElementById('agy-subagents-list');

    if (sectionEl && listEl && countEl) {
      if (!isSubagent && latestSubagentsList && latestSubagentsList.length > 0) {
        sectionEl.style.display = 'block';
        countEl.innerText = String(latestSubagentsList.length);
        listEl.innerHTML = latestSubagentsList.map(s => \`
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 2px 0;">
            <span style="opacity: 0.9; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">• \${s.name}</span>
            <span style="color: \${s.zone.color}; font-weight: 600; font-variant-numeric: tabular-nums;">\${formatTokens(s.totalTokens)} (\${s.pct}%)</span>
          </div>
        \`).join('');
      } else {
        sectionEl.style.display = 'none';
      }
    }
  }

  function showPopover(targetEl, data, scopeTitle, isSubagent = false) {
    clearTimeout(hideTimer);
    populatePopoverData(data, scopeTitle, isSubagent);
    popover.style.display = 'block';
    positionPopover(targetEl);
  }

  function scheduleHidePopover() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      popover.style.display = 'none';
    }, 150);
  }

  popover.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  popover.addEventListener('mouseleave', scheduleHidePopover);

  popover.querySelector('#agy-btn-inspect')?.addEventListener('click', (e) => {
    e.stopPropagation();
    scheduleHidePopover();
    openModal(currentPopoverData, currentPopoverScope);
  });

  popover.querySelector('#agy-popover-lang-select')?.addEventListener('change', (e) => {
    setLocale(e.target.value);
  });

  // 5. DETAILED CONTEXT INSPECTION MODAL WITH MULTI-SCOPE AND i18n
  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(5px); z-index: 999999999; align-items: center; justify-content: center; font-family: var(--font-sans, system-ui, -apple-system, sans-serif); color: var(--foreground, #f2f2f2); box-sizing: border-box;';

  modal.innerHTML = \`
    <div id="agy-modal-card" style="width: 780px; max-width: 95vw; max-height: 88vh; background: var(--card, #18181b); border: 1px solid var(--border, rgba(255, 255, 255, 0.14)); border-radius: 14px; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; overflow: hidden; animation: agyFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);">
      
      <!-- Modal Header -->
      <div style="padding: 12px 18px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.1)); display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span id="agy-modal-title-text" style="font-size: 14.5px; font-weight: 700; letter-spacing: -0.01em;">Context Window Inspector</span>
          <span id="agy-modal-tag" style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: rgba(34, 197, 94, 0.18); color: #22c55e;">
            SMART ZONE ✓
          </span>
          <span id="agy-modal-subagent-tag" style="display: none; font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(168, 85, 247, 0.2); color: #c084fc;">
            🤖 SUBAGENT
          </span>
          <span id="agy-modal-compaction-tag" style="display: none; font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #60a5fa;">
            🔄 COMPACTED
          </span>
        </div>

        <!-- Session Selector, Language & Sponsor -->
        <div style="display: flex; align-items: center; gap: 6px;">
          <span id="agy-lbl-scope" style="font-size: 10.5px; color: var(--muted-foreground, #888); font-weight: 500;">Scope:</span>
          <select id="agy-session-select" style="background: var(--secondary, #27272a); color: var(--foreground, #f4f4f5); border: 1px solid var(--border, rgba(255,255,255,0.18)); border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 500; cursor: pointer; outline: none; max-width: 200px;">
            <option value="main">🌐 Main Conversation</option>
          </select>

          <!-- Language Selector -->
          <select id="agy-lang-select" style="background: var(--secondary, #27272a); color: var(--foreground, #f4f4f5); border: 1px solid var(--border, rgba(255,255,255,0.18)); border-radius: 6px; padding: 4px 6px; font-size: 11px; font-weight: 600; cursor: pointer; outline: none;" title="Language / Idioma">
            <option value="en">🇺🇸 EN</option>
            <option value="pt">🇧🇷 PT</option>
            <option value="es">🇪🇸 ES</option>
            <option value="ja">🇯🇵 JA</option>
            <option value="zh">🇨🇳 ZH</option>
            <option value="fr">🇫🇷 FR</option>
            <option value="de">🇩🇪 DE</option>
          </select>

          <!-- Vitalf Sponsor Button -->
          <a id="agy-modal-sponsor" href="https://github.com/sponsors/vitalfin" target="_blank" rel="noopener noreferrer" style="text-decoration: none; background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); color: #fb7185; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;" title="Support Vitalf on GitHub Sponsors">
            <span>💖</span><span id="agy-sponsor-text">Sponsor</span>
          </a>

          <button id="agy-modal-close" type="button" style="background: transparent; border: none; color: var(--muted-foreground, #999); font-size: 18px; line-height: 1; cursor: pointer; padding: 4px 8px; border-radius: 6px; margin-left: 4px; transition: color 0.15s, background 0.15s;">✕</button>
        </div>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div style="padding: 12px 18px; background: color-mix(in srgb, var(--foreground, #fff) 2.5%, transparent); border-bottom: 1px solid var(--border, rgba(255,255,255,0.08)); display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
        <div style="display: flex; flex-direction: column;">
          <span id="agy-lbl-m-active" style="font-size: 10px; color: var(--muted-foreground, #888); text-transform: uppercase; font-weight: 600;">Active Consumption</span>
          <span id="agy-m-total" style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 1px;">0 tokens</span>
          <span id="agy-m-pct" style="font-size: 10.5px; color: #22c55e;">0% of smart limit</span>
        </div>
        <div style="display: flex; flex-direction: column;">
          <span id="agy-lbl-m-cache" style="font-size: 10px; color: var(--muted-foreground, #888); text-transform: uppercase; font-weight: 600;">Fast Cache</span>
          <span id="agy-m-cache" style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: #38bdf8; margin-top: 1px;">0 tokens</span>
          <span id="agy-m-cache-pct" style="font-size: 10.5px; color: #38bdf8;">0% in fast cache</span>
        </div>
        <div style="display: flex; flex-direction: column;">
          <span id="agy-lbl-m-cost" style="font-size: 10px; color: var(--muted-foreground, #888); text-transform: uppercase; font-weight: 600;">Est. Cost (API)</span>
          <span id="agy-m-cost" style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: #22c55e; margin-top: 1px;">~$0.0000</span>
          <span id="agy-m-cost-sub" style="font-size: 10.5px; color: #38bdf8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">75% savings via Cache (-$0.000)</span>
        </div>
        <div style="display: flex; flex-direction: column;">
          <span id="agy-lbl-m-files" style="font-size: 10px; color: var(--muted-foreground, #888); text-transform: uppercase; font-weight: 600;">Files in Context</span>
          <span id="agy-m-files" style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: #60a5fa; margin-top: 1px;">0 files</span>
          <span id="agy-m-files-tokens" style="font-size: 10.5px; color: var(--muted-foreground, #999);">~0 tokens</span>
        </div>
        <div style="display: flex; flex-direction: column;">
          <span id="agy-lbl-m-cmds" style="font-size: 10px; color: var(--muted-foreground, #888); text-transform: uppercase; font-weight: 600;">Command Outputs</span>
          <span id="agy-m-cmds" style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: #fb923c; margin-top: 1px;">0 cmds</span>
          <span id="agy-m-cmds-tokens" style="font-size: 10.5px; color: var(--muted-foreground, #999);">~0 tokens</span>
        </div>
      </div>

      <!-- Distribution Stacked Bar -->
      <div style="padding: 10px 18px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));">
        <div style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 4px; color: var(--muted-foreground, #aaa);">
          <span id="agy-lbl-m-dist">Visual Load Distribution</span>
          <span id="agy-m-raw-ratio">0 / 1.0M (0% raw capacity)</span>
        </div>
        <div style="height: 10px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 9999px; overflow: hidden; display: flex;">
          <div id="agy-bar-sys" style="width: 0%; background: #a855f7; height: 100%; transition: width 0.3s;" title="System & Rules"></div>
          <div id="agy-bar-files" style="width: 0%; background: #3b82f6; height: 100%; transition: width 0.3s;" title="Injected Files"></div>
          <div id="agy-bar-cmds" style="width: 0%; background: #f97316; height: 100%; transition: width 0.3s;" title="Terminal Commands"></div>
          <div id="agy-bar-dialog" style="width: 0%; background: #10b981; height: 100%; transition: width 0.3s;" title="Dialogue History"></div>
        </div>
        <div style="display: flex; gap: 14px; font-size: 10px; margin-top: 6px; flex-wrap: wrap;">
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #a855f7;"></span> <span id="agy-leg-sys">System & Rules</span></span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #3b82f6;"></span> <span id="agy-leg-files">Injected Files</span></span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #f97316;"></span> <span id="agy-leg-cmds">Terminal Commands</span></span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span> <span id="agy-leg-dialog">Dialogue History</span></span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; padding: 0 18px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.1)); background: color-mix(in srgb, var(--foreground, #fff) 1.5%, transparent); gap: 16px;">
        <button id="agy-tab-btn-overview" type="button" class="agy-tab-btn" data-tab="overview" style="background: transparent; border: none; border-bottom: 2px solid #22c55e; color: #22c55e; font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">Overview</button>
        <button id="agy-tab-btn-costs" type="button" class="agy-tab-btn" data-tab="costs" style="background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--muted-foreground, #999); font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">💳 Costs & Credits</button>
        <button id="agy-tab-btn-files" type="button" class="agy-tab-btn" data-tab="files" style="background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--muted-foreground, #999); font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">Files (<span id="agy-tab-count-files">0</span>)</button>
        <button id="agy-tab-btn-commands" type="button" class="agy-tab-btn" data-tab="commands" style="background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--muted-foreground, #999); font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">Commands (<span id="agy-tab-count-commands">0</span>)</button>
        <button id="agy-tab-btn-subagents" type="button" class="agy-tab-btn" data-tab="subagents" style="background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--muted-foreground, #999); font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">Subagents (<span id="agy-tab-count-subagents">0</span>)</button>
        <button id="agy-tab-btn-tips" type="button" class="agy-tab-btn" data-tab="tips" style="background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--muted-foreground, #999); font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">Best Practices</button>
      </div>

      <!-- Tab Content Area -->
      <div id="agy-tab-content" style="padding: 14px 18px; overflow-y: auto; flex: 1; font-size: 11.5px;">
        <!-- Dynamically injected via renderModalTab() -->
      </div>
      
    </div>
  \`;

  // Dynamic global styles
  const styleEl = document.createElement('style');
  styleEl.textContent = \`
    @keyframes agyFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    .agy-tab-btn:hover { color: var(--foreground, #fff) !important; }
    .agy-table-row:hover { background: rgba(255, 255, 255, 0.04) !important; }
    .agy-subagent-badge:hover { filter: brightness(1.25) !important; }
    #agy-modal-sponsor:hover, #agy-btn-popover-sponsor:hover { background: rgba(244, 63, 94, 0.28) !important; }
  \`;
  document.head.appendChild(styleEl);

  document.body.appendChild(modal);

  function updateStaticLabels() {
    const el = (id) => document.getElementById(id);
    if (el('agy-lbl-operational')) el('agy-lbl-operational').innerText = t('operationalUsage');
    if (el('agy-lbl-raw')) el('agy-lbl-raw').innerText = t('rawCapacity');
    if (el('agy-lbl-context-dist')) el('agy-lbl-context-dist').innerText = t('contextDistribution');
    if (el('agy-lbl-pop-cost')) el('agy-lbl-pop-cost').innerText = t('estCost');
    if (el('agy-lbl-subagents-sec')) el('agy-lbl-subagents-sec').innerText = t('subagentsIsolated');
    if (el('agy-lbl-subagents-hint')) el('agy-lbl-subagents-hint').innerText = t('subagentsHint');
    if (el('agy-btn-inspect-text')) el('agy-btn-inspect-text').innerText = t('btnInspect');

    if (el('agy-modal-title-text')) el('agy-modal-title-text').innerText = t('modalTitle');
    if (el('agy-modal-subagent-tag')) el('agy-modal-subagent-tag').innerText = t('modalSubagentTag');
    if (el('agy-lbl-scope')) el('agy-lbl-scope').innerText = t('scopeLabel');
    if (el('agy-sponsor-text')) el('agy-sponsor-text').innerText = t('sponsorBtn');
    if (el('agy-modal-sponsor')) el('agy-modal-sponsor').title = t('sponsorTooltip');
    if (el('agy-btn-popover-sponsor')) el('agy-btn-popover-sponsor').title = t('sponsorTooltip');

    if (el('agy-lang-select')) el('agy-lang-select').title = t('languageLabel');
    if (el('agy-popover-lang-select')) el('agy-popover-lang-select').title = t('languageLabel');

    if (el('agy-lbl-m-active')) el('agy-lbl-m-active').innerText = t('activeConsumption');
    if (el('agy-lbl-m-cache')) el('agy-lbl-m-cache').innerText = t('fastCache');
    if (el('agy-lbl-m-cost')) el('agy-lbl-m-cost').innerText = t('estCostApi');
    if (el('agy-lbl-m-files')) el('agy-lbl-m-files').innerText = t('filesInContext');
    if (el('agy-lbl-m-cmds')) el('agy-lbl-m-cmds').innerText = t('commandOutputs');

    if (el('agy-lbl-m-dist')) el('agy-lbl-m-dist').innerText = t('loadDistribution');
    if (el('agy-leg-sys')) el('agy-leg-sys').innerText = t('legendSystem');
    if (el('agy-leg-files')) el('agy-leg-files').innerText = t('legendFiles');
    if (el('agy-leg-cmds')) el('agy-leg-cmds').innerText = t('legendCmds');
    if (el('agy-leg-dialog')) el('agy-leg-dialog').innerText = t('legendDialogue');

    if (el('agy-bar-sys')) el('agy-bar-sys').title = t('legendSystem');
    if (el('agy-bar-files')) el('agy-bar-files').title = t('legendFiles');
    if (el('agy-bar-cmds')) el('agy-bar-cmds').title = t('legendCmds');
    if (el('agy-bar-dialog')) el('agy-bar-dialog').title = t('legendDialogue');

    if (el('agy-tab-btn-overview')) el('agy-tab-btn-overview').innerText = t('tabOverview');
    if (el('agy-tab-btn-costs')) el('agy-tab-btn-costs').innerText = t('tabCosts');
    if (el('agy-tab-btn-tips')) el('agy-tab-btn-tips').innerText = t('tabTips');

    const popLangSelect = el('agy-popover-lang-select');
    if (popLangSelect && popLangSelect.value !== currentLocale) popLangSelect.value = currentLocale;
    const modalLangSelect = el('agy-lang-select');
    if (modalLangSelect && modalLangSelect.value !== currentLocale) modalLangSelect.value = currentLocale;

    const sessionSelect = el('agy-session-select');
    if (sessionSelect && sessionSelect.options && sessionSelect.options[0]) {
      sessionSelect.options[0].innerText = t('optMainConversation', { tokens: formatTokens(currentContextData?.totalTokens || 0) });
    }
  }

  // Initialize selectors and static labels in DOM immediately
  updateStaticLabels();

  function closeModal() {
    modal.style.display = 'none';
  }

  modal.querySelector('#agy-modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
  });

  // Modal tab navigation
  modal.querySelectorAll('.agy-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      modal.querySelectorAll('.agy-tab-btn').forEach(b => {
        b.style.borderBottomColor = 'transparent';
        b.style.color = 'var(--muted-foreground, #999)';
      });
      btn.style.borderBottomColor = '#22c55e';
      btn.style.color = '#22c55e';
      renderModalTab(activeTab, activeModalData);
    });
  });

  // Modal language selector
  const modalLangSelect = modal.querySelector('#agy-lang-select');
  if (modalLangSelect) {
    modalLangSelect.value = currentLocale;
    modalLangSelect.addEventListener('change', (e) => {
      setLocale(e.target.value);
    });
  }

  // Modal scope select handler
  const sessionSelect = modal.querySelector('#agy-session-select');
  if (sessionSelect) {
    sessionSelect.addEventListener('change', () => {
      const val = sessionSelect.value;
      if (val === 'main') {
        renderModalWithData(currentContextData, t('scopeMainConversation'));
      } else {
        const sub = latestSubagentsList.find(s => s.cascadeId === val);
        const subDetails = sub?.details || contextCache.get(val);
        const sName = sub?.name || sessionSelect.options[sessionSelect.selectedIndex]?.text?.replace(/^[🤖🌐\\s]+/, '') || t('scopeSubagent');
        if (subDetails) {
          renderModalWithData(subDetails, '🤖 ' + sName);
        } else {
          renderModalWithData({ cascadeId: val, totalTokens: 1, filesCount: 0, commandsCount: 0, breakdown: { system: 0, files: 0, commands: 0, dialogue: 0 } }, '🤖 ' + sName);
          fetchContextDetails(val).then(res => {
            if (res && sessionSelect.value === val) {
              renderModalWithData(res, '🤖 ' + sName);
            }
          });
        }
      }
    });
  }

  function renderModalWithData(data, scopeName) {
    activeModalData = data;
    const isSubagent = isScopeSubagent(data, scopeName);
    activeModalScope = scopeName || (isSubagent ? t('scopeSubagent') : t('scopeMainConversation'));

    // Toggle subagents tab visibility (NEVER show subagents tab inside a subagent)
    const tabSubBtn = document.getElementById('agy-tab-btn-subagents');
    if (tabSubBtn) {
      if (isSubagent) {
        tabSubBtn.style.display = 'none';
        if (activeTab === 'subagents') {
          activeTab = 'overview';
          modal.querySelectorAll('.agy-tab-btn').forEach(b => {
            b.style.borderBottomColor = 'transparent';
            b.style.color = 'var(--muted-foreground, #999)';
          });
          const ovBtn = document.getElementById('agy-tab-btn-overview');
          if (ovBtn) {
            ovBtn.style.borderBottomColor = '#22c55e';
            ovBtn.style.color = '#22c55e';
          }
        }
      } else {
        tabSubBtn.style.display = 'inline-block';
        tabSubBtn.innerHTML = t('tabSubagents', { count: latestSubagentsList.length });
      }
    }

    const subTag = document.getElementById('agy-modal-subagent-tag');
    if (subTag) {
      subTag.style.display = isSubagent ? 'inline-block' : 'none';
      subTag.innerText = t('modalSubagentTag');
    }

    const compTag = document.getElementById('agy-modal-compaction-tag');
    if (compTag) {
      if (data && data.compactionCount > 0) {
        compTag.style.display = 'inline-block';
        compTag.innerText = t('modalCompactedTag', { count: data.compactionCount });
        compTag.title = t('modalCompactedTooltip', { count: data.compactionCount });
      } else {
        compTag.style.display = 'none';
      }
    }

    const mTag = document.getElementById('agy-modal-tag');
    const mTotal = document.getElementById('agy-m-total');
    const mPct = document.getElementById('agy-m-pct');
    const mCache = document.getElementById('agy-m-cache');
    const mCachePct = document.getElementById('agy-m-cache-pct');
    const mCost = document.getElementById('agy-m-cost');
    const mCostSub = document.getElementById('agy-m-cost-sub');
    const mFiles = document.getElementById('agy-m-files');
    const mFilesTokens = document.getElementById('agy-m-files-tokens');
    const mCmds = document.getElementById('agy-m-cmds');
    const mCmdsTokens = document.getElementById('agy-m-cmds-tokens');
    const mRawRatio = document.getElementById('agy-m-raw-ratio');

    const bSys = document.getElementById('agy-bar-sys');
    const bFiles = document.getElementById('agy-bar-files');
    const bCmds = document.getElementById('agy-bar-cmds');
    const bDiag = document.getElementById('agy-bar-dialog');

    const tabFilesBtn = document.getElementById('agy-tab-btn-files');
    const tabCmdsBtn = document.getElementById('agy-tab-btn-commands');

    if (!data || data.totalTokens === 0) {
      if (mTag) {
        mTag.innerText = t('zoneSmartTag');
        mTag.style.color = '#22c55e';
        mTag.style.background = 'rgba(34, 197, 94, 0.18)';
      }
      if (mTotal) mTotal.innerText = '0 tokens';
      if (mPct) { mPct.innerText = t('ofSmartLimit', { pct: 0 }); mPct.style.color = '#22c55e'; }
      if (mCache) mCache.innerText = '0 tokens';
      if (mCachePct) mCachePct.innerText = t('inFastCache', { pct: 0 });
      if (mCost) mCost.innerText = '~$0.0000';
      if (mCostSub) mCostSub.innerText = t('cacheSavingsDesc', { discount: 75, usd: '$0.000' });
      if (mFiles) mFiles.innerText = t('filesCountUnit', { count: 0 });
      if (mFilesTokens) mFilesTokens.innerText = t('estTokens', { tokens: '0' });
      if (mCmds) mCmds.innerText = t('cmdsCountUnit', { count: 0 });
      if (mCmdsTokens) mCmdsTokens.innerText = t('estTokens', { tokens: '0' });
      if (mRawRatio) mRawRatio.innerText = t('rawRatioText', { tokens: '0', pct: 0 });

      if (bSys) bSys.style.width = '0%';
      if (bFiles) bFiles.style.width = '0%';
      if (bCmds) bCmds.style.width = '0%';
      if (bDiag) bDiag.style.width = '0%';

      if (tabFilesBtn) tabFilesBtn.innerHTML = t('tabFiles', { count: 0 });
      if (tabCmdsBtn) tabCmdsBtn.innerHTML = t('tabCommands', { count: 0 });

      renderModalTab(activeTab, null);
      return;
    }

    const totalTokens = data.totalTokens;
    const pct = Math.round((totalTokens / SMART_LIMIT) * 1000) / 10;
    const rawPct = Math.round((totalTokens / RAW_LIMIT) * 1000) / 10;
    const zone = getZone(pct);
    const costs = data.costs || calculateCosts(data.inputTokens, data.cachedTokens, data.outputTokens, data.pricing || getModelPricing(data.latestUsage?.model, totalTokens));

    if (mTag) {
      mTag.innerText = zone.tag;
      mTag.style.color = zone.color;
      mTag.style.background = zone.bg;
    }
    if (mTotal) mTotal.innerText = formatTokens(totalTokens) + ' / 250k';
    if (mPct) {
      mPct.innerText = t('ofSmartLimit', { pct }) + ' (' + zone.tag + ')';
      mPct.style.color = zone.color;
    }
    if (mCache) mCache.innerText = formatTokens(data.cachedTokens);
    if (mCachePct) mCachePct.innerText = t('inFastCache', { pct: data.cachePct });

    if (mCost) mCost.innerText = '~' + formatUSD(costs.totalCost);
    if (mCostSub) {
      mCostSub.innerText = t('cacheSavingsDesc', { discount: costs.pricing.cacheDiscountPct, usd: formatUSD(costs.savedCost) });
      mCostSub.title = t('cacheSavingsTooltip', { usd: formatUSD(costs.savedCost) });
    }

    if (mFiles) mFiles.innerText = t('filesCountUnit', { count: data.filesCount });
    if (mFilesTokens) mFilesTokens.innerText = t('estTokens', { tokens: formatTokens(data.breakdown.files) });

    if (mCmds) mCmds.innerText = t('cmdsCountUnit', { count: data.commandsCount });
    if (mCmdsTokens) mCmdsTokens.innerText = t('estTokens', { tokens: formatTokens(data.breakdown.commands) });

    if (mRawRatio) mRawRatio.innerText = t('rawRatioText', { tokens: formatTokens(totalTokens), pct: rawPct });

    // Load category segment bar normalization
    const rawSum = (data.breakdown.system || 0) + (data.breakdown.files || 0) + (data.breakdown.commands || 0) + (data.breakdown.dialogue || 0);
    const normBase = Math.max(totalTokens, rawSum, 1);
    const bSysPct = Math.round(((data.breakdown.system || 0) / normBase) * 100);
    const bFilesPct = Math.round(((data.breakdown.files || 0) / normBase) * 100);
    const bCmdsPct = Math.round(((data.breakdown.commands || 0) / normBase) * 100);
    const bDiagPct = Math.max(0, 100 - (bSysPct + bFilesPct + bCmdsPct));

    if (bSys) bSys.style.width = bSysPct + '%';
    if (bFiles) bFiles.style.width = bFilesPct + '%';
    if (bCmds) bCmds.style.width = bCmdsPct + '%';
    if (bDiag) bDiag.style.width = bDiagPct + '%';

    if (tabFilesBtn) tabFilesBtn.innerHTML = t('tabFiles', { count: data.filesCount });
    if (tabCmdsBtn) tabCmdsBtn.innerHTML = t('tabCommands', { count: data.commandsCount });

    renderModalTab(activeTab, data);
  }

  function openModal(data, scopeTitle, selectedCascadeId) {
    const targetData = data || currentContextData;
    const targetScope = scopeTitle || t('scopeMainConversation');

    const select = modal.querySelector('#agy-session-select');
    if (select) {
      select.innerHTML = '';
      const mainOpt = document.createElement('option');
      mainOpt.value = 'main';
      mainOpt.innerText = t('optMainConversation', { tokens: formatTokens(currentContextData?.totalTokens || 0) });
      select.appendChild(mainOpt);

      latestSubagentsList.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.cascadeId;
        opt.innerText = '🤖 ' + s.name + ' (~' + formatTokens(s.totalTokens) + ')';
        select.appendChild(opt);
      });

      if (selectedCascadeId && selectedCascadeId !== 'main') {
        select.value = selectedCascadeId;
      } else if (data && currentContextData && data.cascadeId !== currentContextData.cascadeId) {
        select.value = data.cascadeId;
      } else {
        select.value = 'main';
      }
    }

    updateStaticLabels();
    renderModalWithData(targetData, targetScope);
    modal.style.display = 'flex';
  }

  // Modal tab renderers
  function renderModalTab(tab, activeData) {
    const container = modal.querySelector('#agy-tab-content');
    if (!container) return;

    const data = activeData || activeModalData;
    if (!data) {
      container.innerHTML = \`
        <div style="text-align: center; padding: 40px 20px; color: var(--muted-foreground, #888);">
          <div style="font-size: 28px; margin-bottom: 8px;">✨</div>
          <div style="font-weight: 600; font-size: 13px; color: var(--foreground, #eee); margin-bottom: 4px;">\${t('emptyTitle')}</div>
          <div style="font-size: 11px;">\${t('emptyDesc')}</div>
        </div>
      \`;
      return;
    }

    const isSubagent = isScopeSubagent(data, activeModalScope);

    if (tab === 'overview') {
      container.innerHTML = \`
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          \${isSubagent ? \`
            <div style="padding: 10px 12px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 8px; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
              <div style="display: flex; align-items: flex-start; gap: 8px;">
                <span style="font-size: 16px;">🤖</span>
                <div>
                  <div style="font-weight: 600; color: #c084fc; font-size: 11.5px;">\${t('subagentBannerTitle')}</div>
                  <div style="font-size: 10.5px; color: var(--muted-foreground, #aaa); margin-top: 2px; line-height: 1.4;">
                    \${t('subagentBannerDesc')}
                  </div>
                </div>
              </div>
              <button id="agy-btn-back-main" type="button" style="background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); color: #c084fc; border-radius: 6px; padding: 4px 8px; font-size: 10px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.15s ease;">
                \${t('backToMainBtn')}
              </button>
            </div>
          \` : ''}

          \${data.compactionCount > 0 ? \`
            <div style="padding: 10px 12px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 16px;">🔄</span>
              <div>
                <div style="font-weight: 600; color: #60a5fa; font-size: 11.5px; display: flex; align-items: center; gap: 6px;">
                  <span>\${t('compactionBannerTitle', { count: data.compactionCount })}</span>
                  <span style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px; background: rgba(59, 130, 246, 0.2); color: #93c5fd;">\${t('compactionNormal')}</span>
                </div>
                <div style="font-size: 10.5px; color: var(--muted-foreground, #aaa); margin-top: 2px; line-height: 1.4;">
                  \${t('compactionBannerDesc', { tokens: formatTokens(data.totalTokens) })}
                </div>
              </div>
            </div>
          \` : ''}

          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 12px; display: flex; justify-content: space-between;">
              <span>\${t('categoryBreakdownTitle')}</span>
              <span style="color: var(--muted-foreground, #999); font-weight: 400;">\${t('totalActiveTokens', { tokens: formatTokens(data.totalTokens) })}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div style="padding: 8px; background: rgba(168, 85, 247, 0.08); border-radius: 6px; border-left: 3px solid #a855f7;">
                <div style="font-weight: 600; color: #c084fc;">\${t('cardSystemTitle', { tokens: formatTokens(data.breakdown.system) })}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">\${t('cardSystemDesc')}</div>
              </div>
              <div style="padding: 8px; background: rgba(59, 130, 246, 0.08); border-radius: 6px; border-left: 3px solid #3b82f6;">
                <div style="font-weight: 600; color: #60a5fa;">\${t('cardFilesTitle', { tokens: formatTokens(data.breakdown.files) })}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">\${t('cardFilesDesc', { count: data.filesCount })}</div>
              </div>
              <div style="padding: 8px; background: rgba(249, 115, 22, 0.08); border-radius: 6px; border-left: 3px solid #f97316;">
                <div style="font-weight: 600; color: #fb923c;">\${t('cardCmdsTitle', { tokens: formatTokens(data.breakdown.commands) })}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">\${t('cardCmdsDesc', { count: data.commandsCount })}</div>
              </div>
              <div style="padding: 8px; background: rgba(16, 185, 129, 0.08); border-radius: 6px; border-left: 3px solid #10b981;">
                <div style="font-weight: 600; color: #34d399;">\${t('cardDialogueTitle', { tokens: formatTokens(data.breakdown.dialogue) })}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">\${t('cardDialogueDesc')}</div>
              </div>
            </div>
          </div>

          <!-- Top 5 Files -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px; display: flex; justify-content: space-between;">
              <span>\${t('topConsumersTitle')}</span>
              <button id="agy-link-all-files" type="button" style="background: none; border: none; color: #38bdf8; font-size: 10.5px; cursor: pointer; text-decoration: underline;">\${t('viewAllBtn', { count: data.filesCount })}</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              \${data.files.slice(0, 5).map((f, idx) => \`
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; background: rgba(255,255,255,0.02); border-radius: 4px; font-size: 11px;">
                  <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                    <span style="opacity: 0.6; font-size: 10px;">#\${idx + 1}</span>
                    <span style="font-weight: 500; color: var(--foreground, #fff); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${f.path}">\${f.name}</span>
                    <span style="font-size: 9.5px; opacity: 0.6;">(\${formatBytes(f.bytes)})</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <span style="color: #60a5fa; font-weight: 600; font-variant-numeric: tabular-nums;">~\${formatTokens(f.tokensEst)} tokens</span>
                    <span style="font-size: 9px; opacity: 0.6; background: rgba(255,255,255,0.06); padding: 1px 4px; border-radius: 3px;">\${f.count}x</span>
                  </div>
                </div>
              \`).join('')}
              \${data.files.length === 0 ? '<div style="color: var(--muted-foreground, #888); font-size: 11px; text-align: center; padding: 10px;">' + t('noFilesYet') + '</div>' : ''}
            </div>
          </div>

        </div>
      \`;

      container.querySelector('#agy-btn-back-main')?.addEventListener('click', () => {
        const select = modal.querySelector('#agy-session-select');
        if (select) select.value = 'main';
        renderModalWithData(currentContextData, t('scopeMainConversation'));
      });

      container.querySelector('#agy-link-all-files')?.addEventListener('click', () => {
        const btn = document.querySelector('.agy-tab-btn[data-tab="files"]');
        if (btn) btn.click();
      });

    } else if (tab === 'costs') {
      const pricing = data.pricing || getModelPricing(data.latestUsage?.model, data.totalTokens);
      const costs = data.costs || calculateCosts(data.inputTokens, data.cachedTokens, data.outputTokens, pricing);
      const projections = calculateProjections(data.cachePct / 100, data.outputTokens, pricing);

      container.innerHTML = \`
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Model and Plan Callout -->
          <div style="padding: 10px 12px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 16px;">ℹ️</span>
            <div>
              <div style="font-weight: 600; color: #38bdf8; font-size: 11.5px;">\${t('pricingCalloutTitle')}</div>
              <div style="font-size: 10.5px; color: var(--muted-foreground, #aaa); margin-top: 2px; line-height: 1.4;">
                \${t('pricingCalloutDesc', { provider: pricing.provider, model: pricing.displayName })}
              </div>
            </div>
          </div>

          <!-- Context Cache Savings Card -->
          <div style="background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 8px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <span style="font-weight: 600; color: #22c55e; font-size: 12px;">\${t('cachingEfficiencyTitle')}</span>
              <span style="font-size: 11px; color: #22c55e; font-weight: 700;">\${t('inFastCacheTag', { pct: data.cachePct })}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 8px;">
              <div style="padding: 8px; background: rgba(0,0,0,0.25); border-radius: 6px;">
                <div style="font-size: 10px; color: var(--muted-foreground, #999);">\${t('currentCostCached')}</div>
                <div style="font-size: 15px; font-weight: 700; color: #22c55e; margin-top: 2px;">\${formatUSD(costs.totalCost)}</div>
                \${currentLocale === 'pt' ? \`<div style="font-size: 9.5px; color: var(--muted-foreground, #888);">\${formatBRL(costs.totalCost)}</div>\` : ''}
              </div>
              <div style="padding: 8px; background: rgba(0,0,0,0.25); border-radius: 6px;">
                <div style="font-size: 10px; color: var(--muted-foreground, #999);">\${t('withoutCache')}</div>
                <div style="font-size: 15px; font-weight: 700; color: var(--muted-foreground, #aaa); margin-top: 2px;">\${formatUSD(costs.costWithoutCache)}</div>
                \${currentLocale === 'pt' ? \`<div style="font-size: 9.5px; color: var(--muted-foreground, #888);">\${formatBRL(costs.costWithoutCache)}</div>\` : ''}
              </div>
              <div style="padding: 8px; background: rgba(34, 197, 94, 0.12); border-radius: 6px; border: 1px solid rgba(34, 197, 94, 0.3);">
                <div style="font-size: 10px; color: #22c55e; font-weight: 600;">\${t('realSavings')}</div>
                <div style="font-size: 15px; font-weight: 700; color: #22c55e; margin-top: 2px;">-\${formatUSD(costs.savedCost)}</div>
                <div style="font-size: 9.5px; color: #22c55e;">\${currentLocale === 'pt' ? \`-\${formatBRL(costs.savedCost)} \` : ''}\${t('offDiscount', { discount: pricing.cacheDiscountPct })}</div>
              </div>
            </div>
          </div>

          <!-- Pricing Table and Zone Projections -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 12px;">\${t('refPricingTitle', { model: pricing.displayName })}</div>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; font-size: 10.5px; padding: 4px 6px; color: var(--muted-foreground, #888); border-bottom: 1px solid var(--border, rgba(255,255,255,0.08)); font-weight: 600;">
              <span>\${t('colCategory')}</span>
              <span style="text-align: right;">\${t('colQuantity')}</span>
              <span style="text-align: right;">\${t('colRate')}</span>
              <span style="text-align: right;">\${t('colEstTotal')}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px; font-size: 11px;">
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 3px 6px; align-items: center;">
                <span>\${t('rowCached')}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums;">\${formatTokens(data.cachedTokens)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums; color: #38bdf8;">$\${pricing.cachePricePerM.toFixed(4)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; color: #38bdf8;">\${formatUSD(costs.costCache)}</span>
              </div>
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 3px 6px; align-items: center;">
                <span>\${t('rowUncached')}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums;">\${formatTokens(data.inputTokens)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums;">$\${pricing.inputPricePerM.toFixed(2)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 600;">\${formatUSD(costs.costInput)}</span>
              </div>
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 3px 6px; align-items: center;">
                <span>\${t('rowOutput')}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums;">\${formatTokens(data.outputTokens)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums;">$\${pricing.outputPricePerM.toFixed(2)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 600;">\${formatUSD(costs.costOutput)}</span>
              </div>
            </div>
          </div>

          <!-- Smart Zone vs Dumb Zone Projection -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px;">\${t('projectionsTitle')}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px;">
              <div style="padding: 10px; background: rgba(34, 197, 94, 0.08); border-radius: 6px; border-left: 3px solid #22c55e;">
                <div style="font-weight: 600; color: #22c55e; font-size: 11px;">\${t('smartZoneTitle')}</div>
                <div style="font-size: 16px; font-weight: 700; color: #22c55e; margin: 3px 0;">\${formatUSD(projections.smart.totalCost)} \${currentLocale === 'pt' ? \`<span style="font-size: 10px; font-weight: 400; color: var(--muted-foreground, #aaa);">(\${formatBRL(projections.smart.totalCost)})</span>\` : ''}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa);">\${t('smartZoneDesc')}</div>
              </div>
              <div style="padding: 10px; background: rgba(239, 68, 68, 0.08); border-radius: 6px; border-left: 3px solid #ef4444;">
                <div style="font-weight: 600; color: #ef4444; font-size: 11px;">\${t('dumbZoneTitle')}</div>
                <div style="font-size: 16px; font-weight: 700; color: #ef4444; margin: 3px 0;">\${formatUSD(projections.raw.totalCost)} \${currentLocale === 'pt' ? \`<span style="font-size: 10px; font-weight: 400; color: var(--muted-foreground, #aaa);">(\${formatBRL(projections.raw.totalCost)})</span>\` : ''}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa);">\${t('dumbZoneDesc')}</div>
              </div>
            </div>
          </div>

        </div>
      \`;
    } else if (tab === 'files') {
      if (data.files.length === 0) {
        container.innerHTML = \`<div style="text-align:center; padding: 30px; color: var(--muted-foreground, #888);">\${t('noFilesSession')}</div>\`;
        return;
      }
      container.innerHTML = \`
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: grid; grid-template-columns: 2fr 100px 100px 80px; padding: 6px 8px; font-weight: 600; font-size: 10.5px; color: var(--muted-foreground, #888); border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));">
            <span>\${t('colFileName')}</span>
            <span style="text-align: right;">\${t('colFileSize')}</span>
            <span style="text-align: right;">\${t('colFileTokens')}</span>
            <span style="text-align: right;">\${t('colFileReads')}</span>
          </div>
          \${data.files.map(f => \`
            <div class="agy-table-row" style="display: grid; grid-template-columns: 2fr 100px 100px 80px; padding: 6px 8px; border-radius: 6px; font-size: 11px; align-items: center; transition: background 0.1s;">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${f.path}">
                <span style="font-weight: 600; color: var(--foreground, #fff);">\${f.name}</span>
                <span style="font-size: 9.5px; color: var(--muted-foreground, #888); margin-left: 6px;">\${f.path.replace('/home/ph/projects/', '')}</span>
              </div>
              <span style="text-align: right; color: var(--muted-foreground, #aaa); font-variant-numeric: tabular-nums;">\${formatBytes(f.bytes)}</span>
              <span style="text-align: right; font-weight: 600; color: #60a5fa; font-variant-numeric: tabular-nums;">~\${formatTokens(f.tokensEst)}</span>
              <span style="text-align: right; color: var(--muted-foreground, #aaa); font-variant-numeric: tabular-nums;">\${f.count}x</span>
            </div>
          \`).join('')}
        </div>
      \`;
    } else if (tab === 'commands') {
      if (data.commands.length === 0) {
        container.innerHTML = \`<div style="text-align:center; padding: 30px; color: var(--muted-foreground, #888);">\${t('noCommandsSession')}</div>\`;
        return;
      }
      container.innerHTML = \`
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: grid; grid-template-columns: 3fr 100px 100px; padding: 6px 8px; font-weight: 600; font-size: 10.5px; color: var(--muted-foreground, #888); border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));">
            <span>\${t('colCommand')}</span>
            <span style="text-align: right;">\${t('colOutput')}</span>
            <span style="text-align: right;">\${t('colFileTokens')}</span>
          </div>
          \${data.commands.map(c => \`
            <div class="agy-table-row" style="display: grid; grid-template-columns: 3fr 100px 100px; padding: 6px 8px; border-radius: 6px; font-size: 11px; align-items: center; transition: background 0.1s;">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 10.5px; color: #fb923c;" title="\${c.fullCmd}">
                \${c.cmd}
              </div>
              <span style="text-align: right; color: var(--muted-foreground, #aaa); font-variant-numeric: tabular-nums;">\${formatBytes(c.outBytes)}</span>
              <span style="text-align: right; font-weight: 600; color: #fb923c; font-variant-numeric: tabular-nums;">~\${formatTokens(c.tokensEst)}</span>
            </div>
          \`).join('')}
        </div>
      \`;
    } else if (tab === 'subagents') {
      if (latestSubagentsList.length === 0) {
        container.innerHTML = \`<div style="text-align:center; padding: 30px; color: var(--muted-foreground, #888);">\${t('noSubagentsSession')}</div>\`;
        return;
      }

      container.innerHTML = \`
        <div style="display: flex; flex-direction: column; gap: 8px;">
          
          <div style="padding: 10px 12px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 16px;">🛡️</span>
            <div>
              <div style="font-weight: 600; color: #4ade80; font-size: 11.5px;">\${t('subagentsGuaranteeTitle')}</div>
              <div style="font-size: 10.5px; color: var(--muted-foreground, #aaa); margin-top: 2px; line-height: 1.4;">
                \${t('subagentsGuaranteeDesc')}
              </div>
            </div>
          </div>

          <div style="font-size: 11px; color: var(--muted-foreground, #aaa); margin-bottom: 2px;">
            \${t('subagentsClickHint')}
          </div>

          \${latestSubagentsList.map(s => {
            const isCurrent = activeModalData && activeModalData.cascadeId === s.cascadeId;
            return \`
              <div style="padding: 10px 14px; background: \${isCurrent ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255,255,255,0.03)'}; border: 1px solid \${isCurrent ? 'rgba(34, 197, 94, 0.3)' : 'var(--border, rgba(255,255,255,0.08))'}; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <div style="min-width: 0; flex: 1;">
                  <div style="font-weight: 600; color: var(--foreground, #fff); font-size: 12px; display: flex; align-items: center; gap: 6px;">
                    <span>🤖 \${s.name}</span>
                    \${isCurrent ? '<span style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px; background: rgba(34, 197, 94, 0.2); color: #22c55e;">' + t('currentlySelected') + '</span>' : ''}
                  </div>
                  <div style="font-size: 10px; color: var(--muted-foreground, #888); margin-top: 2px;">
                    \${t('subagentCardDetails', { color: s.zone.color, tokens: formatTokens(s.totalTokens), pct: s.pct, files: s.details?.filesCount || 0, cmds: s.details?.commandsCount || 0 })}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 700; font-size: 10.5px; padding: 2px 7px; border-radius: 4px; background: \${s.zone.bg}; color: \${s.zone.color};">
                    \${s.zone.tag}
                  </span>
                  <button type="button" class="agy-inspect-subagent-btn" data-cascade-id="\${s.cascadeId}" style="background: var(--secondary, rgba(255,255,255,0.08)); border: 1px solid var(--border, rgba(255,255,255,0.15)); color: var(--foreground, #eee); border-radius: 6px; padding: 4px 8px; font-size: 10.5px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;">
                    \${t('btnInspectArrow')}
                  </button>
                </div>
              </div>
            \`;
          }).join('')}
        </div>
      \`;

      container.querySelectorAll('.agy-inspect-subagent-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cascadeId = btn.getAttribute('data-cascade-id');
          const sub = latestSubagentsList.find(s => s.cascadeId === cascadeId);
          if (sub && sub.details) {
            const select = modal.querySelector('#agy-session-select');
            if (select) select.value = cascadeId;
            renderModalWithData(sub.details, '🤖 ' + sub.name);
          }
        });
      });
    } else if (tab === 'tips') {
      container.innerHTML = \`
        <div style="display: flex; flex-direction: column; gap: 10px; line-height: 1.5; color: var(--foreground, #ddd);">
          <div style="padding: 10px; background: rgba(34, 197, 94, 0.08); border-radius: 6px; border-left: 3px solid #22c55e;">
            <div style="font-weight: 600; color: #22c55e; margin-bottom: 2px;">\${t('tip1Title')}</div>
            <div style="font-size: 11px;">\${t('tip1Desc')}</div>
          </div>

          <div style="padding: 10px; background: rgba(59, 130, 246, 0.08); border-radius: 6px; border-left: 3px solid #3b82f6;">
            <div style="font-weight: 600; color: #60a5fa; margin-bottom: 2px;">\${t('tip2Title')}</div>
            <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 10.5px;">
              <li>\${t('tip2Item1')}</li>
              <li>\${t('tip2Item2')}</li>
              <li>\${t('tip2Item3')}</li>
              <li>\${t('tip2Item4')}</li>
            </ul>
          </div>

          <div style="padding: 10px 12px; background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 4px;">
            <div>
              <div style="font-weight: 600; color: #fb7185; font-size: 11.5px; display: flex; align-items: center; gap: 6px;">
                <span>💖 Vitalf Technologies Open Source</span>
              </div>
              <div style="font-size: 10.5px; color: var(--muted-foreground, #aaa); margin-top: 2px;">
                \${t('sponsorTooltip')}
              </div>
            </div>
            <a href="https://github.com/sponsors/vitalfin" target="_blank" rel="noopener noreferrer" style="text-decoration: none; background: #e11d48; color: #fff; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 600; white-space: nowrap; transition: opacity 0.15s ease;">
              \${t('sponsorBtn')} ↗
            </a>
          </div>
        </div>
      \`;
    }
  }

  // 6. WIDGET HOVER AND CLICK EVENTS
  function getActiveBreadcrumbSubagent() {
    const breadcrumbs = Array.from(document.querySelectorAll('[data-testid="breadcrumb-segment"]'));
    if (breadcrumbs.length <= 2) return null; // [workspace, Task Title]
    const last = breadcrumbs[breadcrumbs.length - 1];
    const text = (last?.innerText || '').trim().toLowerCase();
    if (!text || text === 'workspace') return null;

    return latestSubagentsList.find(s => {
      const sName = (s.name || '').toLowerCase();
      return sName === text || text.includes(sName) || sName.includes(text);
    }) || null;
  }

  widget.addEventListener('mouseenter', () => {
    widget.style.backgroundColor = 'var(--secondary, rgba(255, 255, 255, 0.08))';
    const activeSub = getActiveBreadcrumbSubagent();
    if (activeSub && activeSub.details) {
      showPopover(widget, activeSub.details, '🤖 ' + t('scopeSubagent') + ': ' + activeSub.name, true);
    } else {
      showPopover(widget, currentContextData, t('scopeContextWindow'), false);
    }
  });

  widget.addEventListener('mouseleave', () => {
    widget.style.backgroundColor = 'transparent';
    scheduleHidePopover();
  });

  widget.addEventListener('click', (e) => {
    e.stopPropagation();
    scheduleHidePopover();
    const activeSub = getActiveBreadcrumbSubagent();
    if (activeSub && activeSub.details) {
      openModal(activeSub.details, '🤖 ' + activeSub.name, activeSub.cascadeId);
    } else {
      openModal(currentContextData, t('scopeMainConversation'), 'main');
    }
  });

  breadcrumbWidget.addEventListener('mouseenter', () => {
    breadcrumbWidget.style.backgroundColor = 'var(--secondary, rgba(255, 255, 255, 0.08))';
    const activeSub = getActiveBreadcrumbSubagent();
    if (activeSub && activeSub.details) {
      showPopover(breadcrumbWidget, activeSub.details, '🤖 ' + t('scopeSubagent') + ': ' + activeSub.name, true);
    } else {
      showPopover(breadcrumbWidget, currentContextData, t('scopeContextWindow'), false);
    }
  });

  breadcrumbWidget.addEventListener('mouseleave', () => {
    breadcrumbWidget.style.backgroundColor = 'transparent';
    scheduleHidePopover();
  });

  breadcrumbWidget.addEventListener('click', (e) => {
    e.stopPropagation();
    scheduleHidePopover();
    const activeSub = getActiveBreadcrumbSubagent();
    if (activeSub && activeSub.details) {
      openModal(activeSub.details, '🤖 ' + activeSub.name, activeSub.cascadeId);
    } else {
      openModal(currentContextData, t('scopeMainConversation'), 'main');
    }
  });

  // 7. DOM WIDGET MOUNTING
  function ensureWidgetMounted() {
    const anchor = document.querySelector('button[data-testid="model-selector-trigger"]')
      || document.querySelector('button[aria-label="Add context"]')
      || document.querySelector('[data-testid="agent-input-box"] button');

    if (anchor && anchor.parentElement) {
      if (widget.parentElement !== anchor.parentElement || widget.previousElementSibling !== anchor) {
        anchor.after(widget);
      }
    } else if (widget.parentElement) {
      widget.remove();
    }

    const breadcrumbs = Array.from(document.querySelectorAll('[data-testid="breadcrumb-segment"]'));
    if (breadcrumbs.length > 0) {
      const last = breadcrumbs[breadcrumbs.length - 1];
      if (last && last.parentElement) {
        if (breadcrumbWidget.parentElement !== last.parentElement || breadcrumbWidget.previousElementSibling !== last) {
          last.after(breadcrumbWidget);
        }
      }
    } else if (breadcrumbWidget.parentElement) {
      breadcrumbWidget.remove();
    }
  }

  // 8. COMPLETE RESET FOR NEW CONVERSATION
  function resetToEmptyState() {
    currentContextData = null;

    const ring = document.getElementById('agy-zone-ring');
    if (ring) {
      ring.style.stroke = '#22c55e';
      ring.style.strokeDashoffset = CIRCLE_C;
    }
    const bRing = document.getElementById('agy-breadcrumb-ring');
    if (bRing) {
      bRing.style.stroke = '#22c55e';
      bRing.style.strokeDashoffset = CIRCLE_C;
    }

    if (popover.style.display === 'block') {
      populatePopoverData(null, t('scopeContextWindow'), false);
    }

    widget.title = \`\${t('scopeContextWindow')}: 0 / 250k (0%) — \${t('zoneSmartTag')}\`;
    breadcrumbWidget.title = \`\${t('scopeContextWindow')}: 0 / 250k (0%) — \${t('zoneSmartTag')}\`;

    document.querySelectorAll('.agy-subagent-badge').forEach(b => b.remove());

    if (modal.style.display === 'flex') {
      renderModalWithData(null, t('scopeMainConversation'));
    }
  }

  // 9. UPDATE INTERACTIVE BADGES ON SUBAGENT CARDS
  async function updateSubagentNodes() {
    const nodes = Array.from(document.querySelectorAll('[data-testid="subagent-node"]'));
    const subagentsList = [];

    for (const node of nodes) {
      const cascadeId = node.getAttribute('data-cascade-id');
      if (!cascadeId) continue;

      const details = await fetchContextDetails(cascadeId);
      const name = (node.querySelector('span')?.innerText || '').split('\\n')[0].trim() || t('scopeSubagent');
      const totalTokens = details?.totalTokens || 0;
      const pct = Math.round((totalTokens / SMART_LIMIT) * 1000) / 10;
      const visualPct = Math.min(100, Math.max(0, pct));
      const zone = getZone(pct);

      const subItem = { name, cascadeId, details, totalTokens, pct, visualPct, zone };
      subagentsList.push(subItem);

      let badge = node.querySelector('.agy-subagent-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'agy-subagent-badge';
        badge.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 9999px; margin-top: 3px; width: fit-content; transition: all 0.15s ease; cursor: pointer; user-select: none;';
        node.appendChild(badge);

        badge.addEventListener('mouseenter', () => {
          badge.style.filter = 'brightness(1.25)';
          const item = node.__agySubagentData;
          if (item) {
            showPopover(badge, item.details, '🤖 ' + t('scopeSubagent') + ': ' + item.name, true);
          }
        });

        badge.addEventListener('mouseleave', () => {
          badge.style.filter = 'none';
          scheduleHidePopover();
        });

        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          scheduleHidePopover();
          const item = node.__agySubagentData;
          if (item) {
            openModal(item.details, '🤖 ' + item.name, item.cascadeId);
          }
        });
      }

      node.__agySubagentData = subItem;
      badge.style.background = zone.bg;
      badge.style.color = zone.color;
      badge.innerHTML = \`<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:\${zone.color};"></span><span>\${formatTokens(totalTokens)} / 250k (\${pct}%)</span>\`;
      badge.title = \`\${name}: \${zone.tag} — \${t('btnInspectArrow')}\`;
    }

    latestSubagentsList = subagentsList;
    return subagentsList;
  }

  // 10. OVERALL CONTEXT UPDATE
  async function updateAll() {
    ensureWidgetMounted();

    const path = location.pathname;
    const match = path.match(/\\/c\\/([a-zA-Z0-9_-]+)/);

    // New conversation route without ID
    if (!match) {
      resetToEmptyState();
      return;
    }

    const currentCascadeId = match[1];

    // Update badges on subagent cards if present
    const subagents = await updateSubagentNodes();

    // Fetch active conversation details
    const details = await fetchContextDetails(currentCascadeId);

    if (!details || details.totalTokens === 0) {
      resetToEmptyState();
      return;
    }

    currentContextData = details;

    const activeSub = getActiveBreadcrumbSubagent();
    const isInsideSubagent = !!(activeSub && activeSub.details);
    const activeData = isInsideSubagent ? activeSub.details : details;
    const activeScope = isInsideSubagent ? '🤖 ' + activeSub.name : t('scopeMainConversation');

    const totalTokens = activeData.totalTokens;
    const pct = Math.round((totalTokens / SMART_LIMIT) * 1000) / 10;
    const visualPct = Math.min(100, Math.max(0, pct));
    const rawPct = Math.round((totalTokens / RAW_LIMIT) * 1000) / 10;
    const zone = getZone(pct);

    // Update SVG ring of main widget
    const ring = document.getElementById('agy-zone-ring');
    const offset = Math.max(0, CIRCLE_C - (visualPct / 100) * CIRCLE_C);
    if (ring) {
      ring.style.stroke = isInsideSubagent ? '#a855f7' : zone.color;
      ring.style.strokeDashoffset = offset;
    }
    widget.title = isInsideSubagent
      ? \`\${t('scopeSubagent')} \${activeSub.name}: \${formatTokens(totalTokens)} / 250k (\${pct}%) — \${zone.tag}\`
      : \`\${t('scopeContextWindow')}: \${formatTokens(totalTokens)} / 250k (\${pct}%) — \${zone.tag}\`;

    // Update SVG ring of breadcrumb widget
    const bRing = document.getElementById('agy-breadcrumb-ring');
    if (bRing) {
      if (activeSub && activeSub.details) {
        const subVisualPct = Math.min(100, Math.max(0, activeSub.pct));
        const subOffset = Math.max(0, CIRCLE_C - (subVisualPct / 100) * CIRCLE_C);
        bRing.style.stroke = activeSub.zone.color;
        bRing.style.strokeDashoffset = subOffset;
        breadcrumbWidget.title = \`\${t('scopeSubagent')} \${activeSub.name}: \${formatTokens(activeSub.totalTokens)} / 250k (\${activeSub.pct}%) — \${activeSub.zone.tag}\`;
      } else {
        bRing.style.stroke = zone.color;
        bRing.style.strokeDashoffset = offset;
        breadcrumbWidget.title = \`\${t('scopeContextWindow')}: \${formatTokens(totalTokens)} / 250k (\${pct}%) — \${zone.tag}\`;
      }
    }

    // If modal is open, refresh currently selected session
    if (modal.style.display === 'flex') {
      const select = modal.querySelector('#agy-session-select');
      const selectedVal = select ? select.value : 'main';
      if (selectedVal === 'main') {
        renderModalWithData(currentContextData, t('scopeMainConversation'));
      } else {
        const sub = latestSubagentsList.find(s => s.cascadeId === selectedVal);
        if (sub && sub.details) {
          renderModalWithData(sub.details, '🤖 ' + sub.name);
        }
      }
    }
  }

  window.__agyWidgetInterval = setInterval(updateAll, 2500);
  updateAll();
})();
`;

fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'widget.js'), widgetJsContent, 'utf8');
console.log('✅ widget.js v1.5.1 generated successfully!');
