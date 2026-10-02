(() => {
  const WIDGET_ID = 'agy-context-zone-widget';
  const BREADCRUMB_WIDGET_ID = 'agy-breadcrumb-context-widget';
  const MODAL_ID = 'agy-context-inspector-modal';
  const VERSION = '1.1.0-context-inspector';

  if (window.__agyWidgetVersion === VERSION && (document.getElementById(WIDGET_ID) || document.getElementById(BREADCRUMB_WIDGET_ID))) {
    return;
  }

  // Limpeza de instâncias antigas
  document.querySelectorAll('#' + WIDGET_ID + ', #' + BREADCRUMB_WIDGET_ID + ', #' + MODAL_ID).forEach(el => el.remove());
  document.querySelectorAll('.agy-subagent-badge').forEach(el => el.remove());
  if (window.__agyWidgetInterval) clearInterval(window.__agyWidgetInterval);

  window.__agyWidgetVersion = VERSION;

  const SMART_LIMIT = 250000; // Limite operacional de qualidade (~250k)
  const RAW_LIMIT = 1000000;   // Limite bruto do modelo (~1M)
  const CIRCLE_C = 81.6814;    // 2 * Math.PI * 13

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
        tag: 'DUMB ZONE ✗',
        bg: 'rgba(239, 68, 68, 0.18)',
        desc: 'Qualidade baixa (risco de degradação/alucinação)'
      };
    } else if (pct >= 40) {
      return {
        color: '#eab308',
        tag: 'ATENÇÃO ! Degrada',
        bg: 'rgba(234, 179, 8, 0.20)',
        desc: 'Atenção! Degradação perceptível de contexto'
      };
    }
    return {
      color: '#22c55e',
      tag: 'SMART ZONE ✓',
      bg: 'rgba(34, 197, 94, 0.18)',
      desc: 'Qualidade alta (respostas precisas)'
    };
  }

  // Estado global do contexto atual
  let currentContextData = null;
  let activeTab = 'overview';

  // Cache de contexto por cascadeId
  const contextCache = new Map();

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
          endIndex: 500,
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
      const filesMap = new Map();
      const commandsList = [];
      let userChars = 0;
      let assistantChars = 0;

      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
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
              cmd: cmd.trim().split('\n')[0].slice(0, 90),
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

      // Base system prompt tokens (instruções base, regras do repo, schemas MCP)
      const systemTokensEst = firstUsage ? Math.max(5000, Number(firstUsage.inputTokens || 0) - totalUserTokens) : 19000;

      const result = {
        cascadeId,
        totalTokens,
        cachedTokens,
        inputTokens,
        outputTokens,
        cachePct: (cachedTokens + inputTokens) > 0 ? Math.round((cachedTokens / (cachedTokens + inputTokens)) * 100) : 0,
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

  // 1. CRIAR WIDGET PRINCIPAL
  const widget = document.createElement('div');
  widget.id = WIDGET_ID;
  widget.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; height: 28px; width: 28px; border-radius: 8px; cursor: pointer; user-select: none; position: relative; margin-left: 6px; vertical-align: middle; transition: background-color 0.15s ease; flex-shrink: 0;';

  widget.innerHTML = `
    <div id="agy-badge" style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; position: relative;">
      <svg viewBox="0 0 32 32" style="width: 17px; height: 17px; transform: rotate(-90deg); display: block;">
        <circle cx="16" cy="16" r="13" fill="transparent" stroke="color-mix(in srgb, var(--foreground, #fff) 12%, transparent)" stroke-width="3.2" />
        <circle id="agy-zone-ring" cx="16" cy="16" r="13" fill="transparent" stroke="#22c55e" stroke-width="3.8" stroke-linecap="round" stroke-dasharray="${CIRCLE_C}" stroke-dashoffset="${CIRCLE_C}" style="transition: stroke-dashoffset 0.35s ease, stroke 0.3s ease;" />
      </svg>
    </div>

    <!-- POPOVER HOVER -->
    <div id="agy-zone-popover" style="display: none; position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); width: 280px; background: var(--card, #1c1c1f); color: var(--foreground, #f2f2f2); border: 1px solid var(--border, rgba(255, 255, 255, 0.12)); border-radius: 10px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3); padding: 12px; z-index: 999999; font-family: var(--font-sans, system-ui, -apple-system, sans-serif); pointer-events: auto; box-sizing: border-box; font-size: 11.5px; line-height: 1.4;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span id="agy-scope-title" style="font-weight: 600; font-size: 11px; opacity: 0.85; letter-spacing: 0.03em;">CONTEXT WINDOW</span>
        <span id="agy-zone-tag" style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(34, 197, 94, 0.18); color: #22c55e; letter-spacing: 0.02em;">
          SMART ZONE ✓
        </span>
      </div>

      <div style="height: 5px; width: 100%; background: color-mix(in srgb, var(--foreground, #fff) 10%, transparent); border-radius: 9999px; overflow: hidden; margin-bottom: 8px; position: relative;">
        <div id="agy-zone-bar" style="width: 0%; height: 100%; background: #22c55e; border-radius: 9999px; transition: width 0.35s ease, background 0.3s ease;"></div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px;">
        <span style="font-size: 11px; color: var(--muted-foreground, #999);">Uso Operacional:</span>
        <span id="agy-zone-used" style="font-weight: 600; font-size: 12px; font-variant-numeric: tabular-nums;">0 / 250k (0%)</span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; font-size: 10px; color: var(--muted-foreground, #888);">
        <span>Capacidade Bruta:</span>
        <span id="agy-zone-raw" style="font-variant-numeric: tabular-nums;">0 / 1.0M (0%)</span>
      </div>

      <div id="agy-zone-desc" style="font-size: 10px; padding: 4px 6px; border-radius: 4px; background: color-mix(in srgb, var(--foreground, #fff) 5%, transparent); color: #22c55e; text-align: center; font-weight: 500; margin-bottom: 8px;">
        Qualidade alta (respostas precisas)
      </div>

      <!-- COMPOSIÇÃO RESUMIDA DO CONTEXTO -->
      <div id="agy-composition-section" style="padding-top: 6px; border-top: 1px solid var(--border, rgba(255,255,255,0.1)); margin-bottom: 6px;">
        <div style="font-size: 10px; font-weight: 600; color: var(--muted-foreground, #999); text-transform: uppercase; margin-bottom: 5px; display: flex; justify-content: space-between;">
          <span>Distribuição de Contexto</span>
          <span id="agy-cache-badge" style="color: #38bdf8; font-weight: 600; text-transform: none;">⚡ Cache: 0%</span>
        </div>
        
        <div id="agy-breakdown-tags" style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 9.5px; margin-bottom: 6px;">
          <span id="agy-tag-system" style="padding: 2px 5px; border-radius: 3px; background: rgba(168, 85, 247, 0.15); color: #c084fc;">🧠 Sistema: 0</span>
          <span id="agy-tag-files" style="padding: 2px 5px; border-radius: 3px; background: rgba(59, 130, 246, 0.15); color: #60a5fa;">📄 Arquivos: 0</span>
          <span id="agy-tag-cmds" style="padding: 2px 5px; border-radius: 3px; background: rgba(249, 115, 22, 0.15); color: #fb923c;">💻 Saídas: 0</span>
        </div>

        <!-- Top consumidores preview -->
        <div id="agy-top-consumers" style="font-size: 10px; color: var(--muted-foreground, #aaa); display: flex; flex-direction: column; gap: 2px;"></div>
      </div>

      <!-- SEÇÃO DINÂMICA DE SUBAGENTES -->
      <div id="agy-subagents-section" style="display: none; padding-top: 6px; border-top: 1px solid var(--border, rgba(255,255,255,0.1)); margin-bottom: 6px;">
        <div style="font-size: 10px; font-weight: 600; color: var(--muted-foreground, #999); text-transform: uppercase; margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Subagentes</span>
          <span id="agy-subagents-count" style="font-weight: 700;">0</span>
        </div>
        <div id="agy-subagents-list" style="display: flex; flex-direction: column; gap: 3px; font-size: 10.5px;"></div>
      </div>

      <!-- BOTÃO INSPECIONAR CONTEXTO COMPLETO -->
      <div style="padding-top: 6px; border-top: 1px solid var(--border, rgba(255,255,255,0.1));">
        <button id="agy-btn-inspect" type="button" style="width: 100%; border: 1px solid var(--border, rgba(255,255,255,0.15)); background: var(--secondary, rgba(255,255,255,0.06)); color: var(--foreground, #f2f2f2); border-radius: 6px; padding: 5px 8px; font-size: 10.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: background 0.15s ease;">
          <span>🔍 Inspecionar Contexto Completo</span>
        </button>
      </div>

      <!-- Ponta da seta -->
      <div style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 8px; height: 8px; background: var(--card, #1c1c1f); border-right: 1px solid var(--border, rgba(255, 255, 255, 0.12)); border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.12));"></div>
    </div>
  `;

  // 2. MODAL DE INSPEÇÃO DETALHADA DO CONTEXTO (ESTILO VSCODE / CODEX)
  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(5px); z-index: 9999999; align-items: center; justify-content: center; font-family: var(--font-sans, system-ui, -apple-system, sans-serif); color: var(--foreground, #f2f2f2); box-sizing: border-box;';

  modal.innerHTML = `
    <div id="agy-modal-card" style="width: 680px; max-width: 92vw; max-height: 85vh; background: var(--card, #18181b); border: 1px solid var(--border, rgba(255, 255, 255, 0.14)); border-radius: 14px; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; overflow: hidden; animation: agyFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);">
      
      <!-- Modal Header -->
      <div style="padding: 14px 18px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.1)); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 15px; font-weight: 700; letter-spacing: -0.01em;">Context Window Inspector</span>
          <span id="agy-modal-tag" style="font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: rgba(34, 197, 94, 0.18); color: #22c55e;">
            SMART ZONE ✓
          </span>
        </div>
        <button id="agy-modal-close" type="button" style="background: transparent; border: none; color: var(--muted-foreground, #999); font-size: 18px; line-height: 1; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: color 0.15s, background 0.15s;">✕</button>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div style="padding: 12px 18px; background: color-mix(in srgb, var(--foreground, #fff) 2.5%, transparent); border-bottom: 1px solid var(--border, rgba(255,255,255,0.08)); display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 10px; color: var(--muted-foreground, #888); text-transform: uppercase; font-weight: 600;">Consumo Ativo</span>
          <span id="agy-m-total" style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 1px;">0 tokens</span>
          <span id="agy-m-pct" style="font-size: 10.5px; color: #22c55e;">0% do limite inteligente</span>
        </div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 10px; color: var(--muted-foreground, #888); text-transform: uppercase; font-weight: 600;">Gemini Cache</span>
          <span id="agy-m-cache" style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: #38bdf8; margin-top: 1px;">0 tokens</span>
          <span id="agy-m-cache-pct" style="font-size: 10.5px; color: #38bdf8;">0% em cache rápido</span>
        </div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 10px; color: var(--muted-foreground, #888); text-transform: uppercase; font-weight: 600;">Arquivos em Contexto</span>
          <span id="agy-m-files" style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: #60a5fa; margin-top: 1px;">0 arq</span>
          <span id="agy-m-files-tokens" style="font-size: 10.5px; color: var(--muted-foreground, #999);">0 tokens est.</span>
        </div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 10px; color: var(--muted-foreground, #888); text-transform: uppercase; font-weight: 600;">Saídas de Comandos</span>
          <span id="agy-m-cmds" style="font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: #fb923c; margin-top: 1px;">0 cmds</span>
          <span id="agy-m-cmds-tokens" style="font-size: 10.5px; color: var(--muted-foreground, #999);">0 tokens est.</span>
        </div>
      </div>

      <!-- Distribution Stacked Bar -->
      <div style="padding: 10px 18px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));">
        <div style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 4px; color: var(--muted-foreground, #aaa);">
          <span>Distribuição Visual de Carga</span>
          <span id="agy-m-raw-ratio">0 / 1.0M (0% capacidade física)</span>
        </div>
        <div style="height: 10px; width: 100%; background: rgba(255,255,255,0.08); border-radius: 9999px; overflow: hidden; display: flex;">
          <div id="agy-bar-sys" style="width: 0%; background: #a855f7; height: 100%; transition: width 0.3s;" title="Sistema & Regras"></div>
          <div id="agy-bar-files" style="width: 0%; background: #3b82f6; height: 100%; transition: width 0.3s;" title="Arquivos Lidos"></div>
          <div id="agy-bar-cmds" style="width: 0%; background: #f97316; height: 100%; transition: width 0.3s;" title="Saídas de Comandos"></div>
          <div id="agy-bar-dialog" style="width: 0%; background: #10b981; height: 100%; transition: width 0.3s;" title="Diálogo & Mensagens"></div>
        </div>
        <div style="display: flex; gap: 14px; font-size: 10px; margin-top: 6px; flex-wrap: wrap;">
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #a855f7;"></span> Sistema & Regras</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #3b82f6;"></span> Arquivos Injetados</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #f97316;"></span> Comandos de Terminal</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span> Histórico de Diálogo</span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; padding: 0 18px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.1)); background: color-mix(in srgb, var(--foreground, #fff) 1.5%, transparent); gap: 16px;">
        <button id="agy-tab-btn-overview" type="button" class="agy-tab-btn" data-tab="overview" style="background: transparent; border: none; border-bottom: 2px solid #22c55e; color: #22c55e; font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">Visão Geral</button>
        <button id="agy-tab-btn-files" type="button" class="agy-tab-btn" data-tab="files" style="background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--muted-foreground, #999); font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">Arquivos (<span id="agy-tab-count-files">0</span>)</button>
        <button id="agy-tab-btn-commands" type="button" class="agy-tab-btn" data-tab="commands" style="background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--muted-foreground, #999); font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">Comandos (<span id="agy-tab-count-commands">0</span>)</button>
        <button id="agy-tab-btn-subagents" type="button" class="agy-tab-btn" data-tab="subagents" style="background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--muted-foreground, #999); font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">Subagentes (<span id="agy-tab-count-subagents">0</span>)</button>
        <button id="agy-tab-btn-tips" type="button" class="agy-tab-btn" data-tab="tips" style="background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--muted-foreground, #999); font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">Boas Práticas</button>
      </div>

      <!-- Tab Content Area -->
      <div id="agy-tab-content" style="padding: 14px 18px; overflow-y: auto; flex: 1; font-size: 11.5px;">
        <!-- Injetado dinamicamente via renderModalTab() -->
      </div>
      
    </div>
  `;

  // Animação de fade-in
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes agyFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    .agy-tab-btn:hover { color: var(--foreground, #fff) !important; }
    .agy-table-row:hover { background: rgba(255, 255, 255, 0.04) !important; }
  `;
  document.head.appendChild(styleEl);

  // Inserção do modal no body
  document.body.appendChild(modal);

  // Fechar modal
  function closeModal() {
    modal.style.display = 'none';
  }

  function openModal() {
    modal.style.display = 'flex';
    renderModalTab(activeTab);
  }

  modal.querySelector('#agy-modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
  });

  // Troca de abas do modal
  modal.querySelectorAll('.agy-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      modal.querySelectorAll('.agy-tab-btn').forEach(b => {
        b.style.borderBottomColor = 'transparent';
        b.style.color = 'var(--muted-foreground, #999)';
      });
      btn.style.borderBottomColor = '#22c55e';
      btn.style.color = '#22c55e';
      renderModalTab(activeTab);
    });
  });

  // Renderizador de abas do modal
  function renderModalTab(tab) {
    const container = modal.querySelector('#agy-tab-content');
    if (!container) return;

    const data = currentContextData;
    if (!data) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--muted-foreground, #888);">
          <div style="font-size: 28px; margin-bottom: 8px;">✨</div>
          <div style="font-weight: 600; font-size: 13px; color: var(--foreground, #eee); margin-bottom: 4px;">Nova Conversa — Contexto Limpo</div>
          <div style="font-size: 11px;">Ainda não há mensagens ou ferramentas executadas nesta sessão. O contexto começará a ser consumido assim que você enviar a primeira mensagem.</div>
        </div>
      `;
      return;
    }

    if (tab === 'overview') {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 12px; display: flex; justify-content: space-between;">
              <span>Detalhamento por Categoria de Carga</span>
              <span style="color: var(--muted-foreground, #999); font-weight: 400;">Total: ${formatTokens(data.totalTokens)} tokens</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div style="padding: 8px; background: rgba(168, 85, 247, 0.08); border-radius: 6px; border-left: 3px solid #a855f7;">
                <div style="font-weight: 600; color: #c084fc;">🧠 Sistema & Regras (~${formatTokens(data.breakdown.system)})</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">Prompt base, diretrizes de workspace (AGENTS.md, regras) e definições MCP.</div>
              </div>
              <div style="padding: 8px; background: rgba(59, 130, 246, 0.08); border-radius: 6px; border-left: 3px solid #3b82f6;">
                <div style="font-weight: 600; color: #60a5fa;">📄 Arquivos em Contexto (~${formatTokens(data.breakdown.files)})</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">${data.filesCount} arquivos lidos diretamente na sessão via view_file.</div>
              </div>
              <div style="padding: 8px; background: rgba(249, 115, 22, 0.08); border-radius: 6px; border-left: 3px solid #f97316;">
                <div style="font-weight: 600; color: #fb923c;">💻 Saídas de Comandos (~${formatTokens(data.breakdown.commands)})</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">${data.commandsCount} comandos bash executados e suas saídas mantidas no histórico.</div>
              </div>
              <div style="padding: 8px; background: rgba(16, 185, 129, 0.08); border-radius: 6px; border-left: 3px solid #10b981;">
                <div style="font-weight: 600; color: #34d399;">💬 Diálogo & Raciocínio (~${formatTokens(data.breakdown.dialogue)})</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">Prompts do usuário, respostas do modelo e cadeias de pensamento.</div>
              </div>
            </div>
          </div>

          <!-- Gemini Context Caching Info -->
          <div style="background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-weight: 600; color: #38bdf8; font-size: 11.5px;">⚡ Gemini Context Caching Ativo (${data.cachePct}%)</div>
              <div style="font-size: 10.5px; color: var(--muted-foreground, #bbb); margin-top: 2px;">${formatTokens(data.cachedTokens)} dos tokens desta sessão foram servidos pelo cache prefixado do Google, garantindo respostas rápidas e sem custo redundante de reprocessamento.</div>
            </div>
          </div>

        </div>
      `;
    } else if (tab === 'files') {
      if (data.files.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--muted-foreground, #888);">Nenhum arquivo foi lido para o contexto nesta conversa até o momento.</div>`;
        return;
      }
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: grid; grid-template-columns: 2fr 100px 100px 80px; padding: 6px 8px; font-weight: 600; font-size: 10.5px; color: var(--muted-foreground, #888); border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));">
            <span>ARQUIVO</span>
            <span style="text-align: right;">TAMANHO</span>
            <span style="text-align: right;">TOKENS EST.</span>
            <span style="text-align: right;">LEITURAS</span>
          </div>
          ${data.files.map(f => `
            <div class="agy-table-row" style="display: grid; grid-template-columns: 2fr 100px 100px 80px; padding: 6px 8px; border-radius: 6px; font-size: 11px; align-items: center; transition: background 0.1s;">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.path}">
                <span style="font-weight: 600; color: var(--foreground, #fff);">${f.name}</span>
                <span style="font-size: 9.5px; color: var(--muted-foreground, #888); margin-left: 6px;">${f.path.replace('/home/ph/projects/', '')}</span>
              </div>
              <span style="text-align: right; color: var(--muted-foreground, #aaa); font-variant-numeric: tabular-nums;">${formatBytes(f.bytes)}</span>
              <span style="text-align: right; font-weight: 600; color: #60a5fa; font-variant-numeric: tabular-nums;">~${formatTokens(f.tokensEst)}</span>
              <span style="text-align: right; color: var(--muted-foreground, #aaa); font-variant-numeric: tabular-nums;">${f.count}x</span>
            </div>
          `).join('')}
        </div>
      `;
    } else if (tab === 'commands') {
      if (data.commands.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--muted-foreground, #888);">Nenhum comando foi executado nesta sessão.</div>`;
        return;
      }
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: grid; grid-template-columns: 3fr 100px 100px; padding: 6px 8px; font-weight: 600; font-size: 10.5px; color: var(--muted-foreground, #888); border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));">
            <span>COMANDO</span>
            <span style="text-align: right;">OUTPUT</span>
            <span style="text-align: right;">TOKENS EST.</span>
          </div>
          ${data.commands.map(c => `
            <div class="agy-table-row" style="display: grid; grid-template-columns: 3fr 100px 100px; padding: 6px 8px; border-radius: 6px; font-size: 11px; align-items: center; transition: background 0.1s;">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 10.5px; color: #fb923c;" title="${c.fullCmd}">
                ${c.cmd}
              </div>
              <span style="text-align: right; color: var(--muted-foreground, #aaa); font-variant-numeric: tabular-nums;">${formatBytes(c.outBytes)}</span>
              <span style="text-align: right; font-weight: 600; color: #fb923c; font-variant-numeric: tabular-nums;">~${formatTokens(c.tokensEst)}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else if (tab === 'subagents') {
      const subagentNodes = Array.from(document.querySelectorAll('[data-testid="subagent-node"]'));
      if (subagentNodes.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--muted-foreground, #888);">Nenhum subagente foi criado a partir desta sessão.</div>`;
        return;
      }
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 11px; color: var(--muted-foreground, #aaa); margin-bottom: 4px;">Subagentes operam com seus próprios contextos em paralelo, preservando a janela de contexto da conversa principal.</div>
          ${subagentNodes.map(node => {
            const name = node.querySelector('span')?.innerText?.trim() || 'Subagente';
            const badge = node.querySelector('.agy-subagent-badge')?.innerText || 'Ativo';
            return `
              <div style="padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 600; color: var(--foreground, #fff); font-size: 12px;">🤖 ${name}</div>
                  <div style="font-size: 10px; color: var(--muted-foreground, #888); margin-top: 2px;">Contexto segregado e isolado</div>
                </div>
                <div style="font-weight: 600; font-size: 11px; color: #22c55e;">${badge}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (tab === 'tips') {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; line-height: 1.5; color: var(--foreground, #ddd);">
          <div style="padding: 10px; background: rgba(34, 197, 94, 0.08); border-radius: 6px; border-left: 3px solid #22c55e;">
            <div style="font-weight: 600; color: #22c55e; margin-bottom: 2px;">🎯 Por que manter na Smart Zone (&lt; 250k tokens)?</div>
            <div style="font-size: 11px;">Modelos de 1M+ suportam contextos massivos, mas a retenção de detalhes finos e a precisão do raciocínio são significativamente superiores até 250k tokens. Acima desse patamar ("Atenção" e "Dumb Zone"), pode ocorrer degradação atencional ("needle in a haystack").</div>
          </div>

          <div style="padding: 10px; background: rgba(59, 130, 246, 0.08); border-radius: 6px; border-left: 3px solid #3b82f6;">
            <div style="font-weight: 600; color: #60a5fa; margin-bottom: 2px;">✂️ Como manter o contexto leve</div>
            <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 10.5px;">
              <li>Prefira ler apenas fatias de arquivos com StartLine e EndLine em vez de arquivos inteiros de milhares de linhas.</li>
              <li>Evite comandos de terminal com saídas gigantescas desnecessárias (use grep, head, tail).</li>
              <li>Ao concluir um objetivo ou mudar de assunto, inicie uma <strong>Nova Conversa</strong> com contexto 100% renovado.</li>
            </ul>
          </div>
        </div>
      `;
    }
  }

  // Hover Popover
  const popover = widget.querySelector('#agy-zone-popover');
  let hideTimer = null;
  widget.addEventListener('mouseenter', () => {
    clearTimeout(hideTimer);
    widget.style.backgroundColor = 'var(--secondary, rgba(255, 255, 255, 0.08))';
    if (widget.dataset.position === 'top') {
      popover.style.bottom = 'auto';
      popover.style.top = 'calc(100% + 8px)';
      const arrow = popover.querySelector('div:last-child');
      if (arrow) {
        arrow.style.bottom = 'auto';
        arrow.style.top = '-5px';
        arrow.style.borderRight = 'none';
        arrow.style.borderBottom = 'none';
        arrow.style.borderLeft = '1px solid var(--border, rgba(255, 255, 255, 0.12))';
        arrow.style.borderTop = '1px solid var(--border, rgba(255, 255, 255, 0.12))';
      }
    } else {
      popover.style.top = 'auto';
      popover.style.bottom = 'calc(100% + 10px)';
      const arrow = popover.querySelector('div:last-child');
      if (arrow) {
        arrow.style.top = 'auto';
        arrow.style.bottom = '-5px';
        arrow.style.borderLeft = 'none';
        arrow.style.borderTop = 'none';
        arrow.style.borderRight = '1px solid var(--border, rgba(255, 255, 255, 0.12))';
        arrow.style.borderBottom = '1px solid var(--border, rgba(255, 255, 255, 0.12));';
      }
    }
    popover.style.display = 'block';
  });

  widget.addEventListener('mouseleave', () => {
    hideTimer = setTimeout(() => {
      widget.style.backgroundColor = 'transparent';
      popover.style.display = 'none';
    }, 120);
  });
  popover.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  popover.addEventListener('mouseleave', () => {
    widget.style.backgroundColor = 'transparent';
    popover.style.display = 'none';
  });

  // Clique no botão ou widget abre o Context Inspector Modal
  widget.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal();
  });
  popover.querySelector('#agy-btn-inspect')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal();
  });

  // Localiza âncora: barra de input do modelo OU breadcrumb no topo
  function ensureWidgetMounted() {
    const modelTrigger = document.querySelector('button[data-testid="model-selector-trigger"]');
    if (modelTrigger && modelTrigger.parentElement) {
      widget.dataset.position = 'bottom';
      if (widget.parentElement !== modelTrigger.parentElement || widget.previousElementSibling !== modelTrigger) {
        modelTrigger.after(widget);
      }
      return true;
    }

    const breadcrumbs = Array.from(document.querySelectorAll('[data-testid="breadcrumb-segment"]'));
    if (breadcrumbs.length > 0) {
      const last = breadcrumbs[breadcrumbs.length - 1];
      if (last && last.parentElement) {
        widget.dataset.position = 'top';
        if (widget.parentElement !== last.parentElement || widget.previousElementSibling !== last) {
          last.after(widget);
        }
        return true;
      }
    }

    return false;
  }

  // 3. RESET COMPLETO PARA NOVA CONVERSA (CORREÇÃO DO BUG 1)
  function resetToEmptyState() {
    currentContextData = null;

    // Anel SVG vazio
    const ring = document.getElementById('agy-zone-ring');
    if (ring) {
      ring.style.stroke = '#22c55e';
      ring.style.strokeDashoffset = CIRCLE_C;
    }

    // Título e escopo
    const scopeEl = document.getElementById('agy-scope-title');
    if (scopeEl) scopeEl.innerText = 'CONTEXT WINDOW';

    const tagEl = document.getElementById('agy-zone-tag');
    if (tagEl) {
      tagEl.innerText = 'SMART ZONE ✓';
      tagEl.style.color = '#22c55e';
      tagEl.style.background = 'rgba(34, 197, 94, 0.18)';
    }

    const barEl = document.getElementById('agy-zone-bar');
    if (barEl) {
      barEl.style.width = '0%';
      barEl.style.background = '#22c55e';
    }

    const usedEl = document.getElementById('agy-zone-used');
    if (usedEl) {
      usedEl.innerText = '0 / 250k (0%)';
      usedEl.style.color = '#22c55e';
    }

    const rawEl = document.getElementById('agy-zone-raw');
    if (rawEl) rawEl.innerText = '0 / 1.0M (0%)';

    const descEl = document.getElementById('agy-zone-desc');
    if (descEl) {
      descEl.innerText = 'Nova conversa (contexto limpo)';
      descEl.style.color = '#22c55e';
    }

    // Composição e cache
    const cacheBadge = document.getElementById('agy-cache-badge');
    if (cacheBadge) cacheBadge.innerText = '⚡ Cache: 0%';

    const tagSys = document.getElementById('agy-tag-system');
    if (tagSys) tagSys.innerText = '🧠 Sistema: 0';
    const tagFiles = document.getElementById('agy-tag-files');
    if (tagFiles) tagFiles.innerText = '📄 Arquivos: 0';
    const tagCmds = document.getElementById('agy-tag-cmds');
    if (tagCmds) tagCmds.innerText = '💻 Saídas: 0';

    const topConsumers = document.getElementById('agy-top-consumers');
    if (topConsumers) topConsumers.innerHTML = '<span style="font-style: italic; opacity: 0.7;">Pronto para nova tarefa.</span>';

    // Subagentes
    const sectionEl = document.getElementById('agy-subagents-section');
    if (sectionEl) sectionEl.style.display = 'none';

    // Remove badges órfãs de subagentes anteriores
    document.querySelectorAll('.agy-subagent-badge').forEach(b => b.remove());

    // Se o modal estiver aberto, atualiza para o estado limpo
    if (modal.style.display === 'flex') {
      renderModalTab(activeTab);
    }
  }

  // 4. ATUALIZAR BADGES NOS CARDS DE SUBAGENTES
  async function updateSubagentNodes() {
    const nodes = Array.from(document.querySelectorAll('[data-testid="subagent-node"]'));
    const subagentsList = [];

    for (const node of nodes) {
      const cascadeId = node.getAttribute('data-cascade-id');
      if (!cascadeId) continue;

      const details = await fetchContextDetails(cascadeId);
      const name = node.querySelector('span')?.innerText?.trim() || 'Subagente';
      const totalTokens = details?.totalTokens || 0;
      const pct = Math.min(100, Math.round((totalTokens / SMART_LIMIT) * 1000) / 10);
      const zone = getZone(pct);

      subagentsList.push({ name, totalTokens, pct, zone });

      let badge = node.querySelector('.agy-subagent-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'agy-subagent-badge';
        badge.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 9999px; margin-top: 3px; width: fit-content; transition: background 0.3s, color 0.3s;';
        node.appendChild(badge);
      }

      badge.style.background = zone.bg;
      badge.style.color = zone.color;
      badge.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${zone.color};"></span><span>${formatTokens(totalTokens)} / 250k (${pct}%)</span>`;
      badge.title = `${name}: ${zone.tag} - ${formatTokens(totalTokens)} tokens`;
    }

    return subagentsList;
  }

  // 5. ATUALIZAÇÃO GERAL DO CONTEXTO
  async function updateAll() {
    ensureWidgetMounted();

    const path = location.pathname;
    const match = path.match(/\/c\/([a-zA-Z0-9_-]+)/);

    // Se estiver em rota de nova conversa (/ ou sem /c/<id>), reseta imediatamente!
    if (!match) {
      resetToEmptyState();
      return;
    }

    const currentCascadeId = match[1];

    // Atualiza badges nos cards se existirem
    const subagents = await updateSubagentNodes();

    // Busca detalhes da conversa ativa
    const details = await fetchContextDetails(currentCascadeId);

    // Se a conversa não tem dados/passos ainda, reseta para nova conversa
    if (!details || details.totalTokens === 0) {
      resetToEmptyState();
      return;
    }

    currentContextData = details;

    const totalTokens = details.totalTokens;
    const pct = Math.min(100, Math.round((totalTokens / SMART_LIMIT) * 1000) / 10);
    const rawPct = Math.min(100, Math.round((totalTokens / RAW_LIMIT) * 1000) / 10);
    const zone = getZone(pct);

    // Atualiza anel SVG
    const ring = document.getElementById('agy-zone-ring');
    if (ring) {
      ring.style.stroke = zone.color;
      const offset = Math.max(0, CIRCLE_C - (pct / 100) * CIRCLE_C);
      ring.style.strokeDashoffset = offset;
    }

    // Título do escopo
    const scopeEl = document.getElementById('agy-scope-title');
    const isSubagentView = widget.dataset.position === 'top';
    if (scopeEl) {
      scopeEl.innerText = isSubagentView ? 'SUBAGENTE CONTEXT' : 'CONTEXT WINDOW';
    }

    // Popover labels
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
      barEl.style.width = pct + '%';
      barEl.style.background = zone.color;
    }
    if (usedEl) {
      usedEl.innerText = `${formatTokens(totalTokens)} / 250k (${pct}%)`;
      usedEl.style.color = zone.color;
    }
    if (rawEl) {
      rawEl.innerText = `${formatTokens(totalTokens)} / 1.0M (${rawPct}%)`;
    }
    if (descEl) {
      descEl.innerText = zone.desc;
      descEl.style.color = zone.color;
    }

    // Composição e cache no popover
    const cacheBadge = document.getElementById('agy-cache-badge');
    if (cacheBadge) {
      cacheBadge.innerText = `⚡ Cache: ${details.cachePct}%`;
      cacheBadge.title = `${formatTokens(details.cachedTokens)} tokens em cache rápido`;
    }

    const tagSys = document.getElementById('agy-tag-system');
    if (tagSys) tagSys.innerText = `🧠 Sistema: ~${formatTokens(details.breakdown.system)}`;
    const tagFiles = document.getElementById('agy-tag-files');
    if (tagFiles) tagFiles.innerText = `📄 Arquivos: ~${formatTokens(details.breakdown.files)}`;
    const tagCmds = document.getElementById('agy-tag-cmds');
    if (tagCmds) tagCmds.innerText = `💻 Saídas: ~${formatTokens(details.breakdown.commands)}`;

    // Top consumidores preview no popover
    const topConsumers = document.getElementById('agy-top-consumers');
    if (topConsumers) {
      const topItems = [];
      if (details.files[0]) topItems.push(`📄 ${details.files[0].name} (~${formatTokens(details.files[0].tokensEst)})`);
      if (details.files[1]) topItems.push(`📄 ${details.files[1].name} (~${formatTokens(details.files[1].tokensEst)})`);
      if (details.commands[0]) topItems.push(`💻 ${details.commands[0].cmd.slice(0, 24)}... (~${formatTokens(details.commands[0].tokensEst)})`);

      if (topItems.length > 0) {
        topConsumers.innerHTML = topItems.slice(0, 2).map(it => `
          <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.85;">${it}</div>
        `).join('');
      } else {
        topConsumers.innerHTML = '<span style="opacity: 0.7;">Consumo equilibrado</span>';
      }
    }

    // Seção de subagentes no popover
    const sectionEl = document.getElementById('agy-subagents-section');
    const countEl = document.getElementById('agy-subagents-count');
    const listEl = document.getElementById('agy-subagents-list');

    if (sectionEl && listEl && countEl) {
      if (subagents && subagents.length > 0) {
        sectionEl.style.display = 'block';
        countEl.innerText = String(subagents.length);
        listEl.innerHTML = subagents.map(s => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 2px 0;">
            <span style="opacity: 0.9; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">• ${s.name}</span>
            <span style="color: ${s.zone.color}; font-weight: 600; font-variant-numeric: tabular-nums;">${formatTokens(s.totalTokens)} (${s.pct}%)</span>
          </div>
        `).join('');
      } else {
        sectionEl.style.display = 'none';
      }
    }

    // Atualiza Modal (se estiver aberto)
    const mTotal = document.getElementById('agy-m-total');
    if (mTotal) {
      mTotal.innerText = `${formatTokens(totalTokens)} / 250k`;
      document.getElementById('agy-m-pct').innerText = `${pct}% do limite inteligente (${zone.tag})`;
      document.getElementById('agy-m-pct').style.color = zone.color;
      document.getElementById('agy-modal-tag').innerText = zone.tag;
      document.getElementById('agy-modal-tag').style.color = zone.color;
      document.getElementById('agy-modal-tag').style.background = zone.bg;

      document.getElementById('agy-m-cache').innerText = `${formatTokens(details.cachedTokens)}`;
      document.getElementById('agy-m-cache-pct').innerText = `${details.cachePct}% em cache rápido`;

      document.getElementById('agy-m-files').innerText = `${details.filesCount} arquivos`;
      document.getElementById('agy-m-files-tokens').innerText = `~${formatTokens(details.breakdown.files)} tokens`;

      document.getElementById('agy-m-cmds').innerText = `${details.commandsCount} cmds`;
      document.getElementById('agy-m-cmds-tokens').innerText = `~${formatTokens(details.breakdown.commands)} tokens`;

      document.getElementById('agy-m-raw-ratio').innerText = `${formatTokens(totalTokens)} / 1.0M (${rawPct}% bruto)`;

      // Barras segmentadas
      const bSys = Math.min(100, (details.breakdown.system / totalTokens) * 100);
      const bFiles = Math.min(100, (details.breakdown.files / totalTokens) * 100);
      const bCmds = Math.min(100, (details.breakdown.commands / totalTokens) * 100);
      const bDiag = Math.max(0, 100 - (bSys + bFiles + bCmds));

      document.getElementById('agy-bar-sys').style.width = bSys + '%';
      document.getElementById('agy-bar-files').style.width = bFiles + '%';
      document.getElementById('agy-bar-cmds').style.width = bCmds + '%';
      document.getElementById('agy-bar-dialog').style.width = bDiag + '%';

      // Counts nas abas
      document.getElementById('agy-tab-count-files').innerText = String(details.filesCount);
      document.getElementById('agy-tab-count-commands').innerText = String(details.commandsCount);
      document.getElementById('agy-tab-count-subagents').innerText = String(subagents.length);

      if (modal.style.display === 'flex') {
        renderModalTab(activeTab);
      }
    }
  }

  window.__agyWidgetInterval = setInterval(updateAll, 2500);
  updateAll();
})();
