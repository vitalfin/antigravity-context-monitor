(() => {
  const WIDGET_ID = 'agy-context-zone-widget';
  const BREADCRUMB_WIDGET_ID = 'agy-breadcrumb-context-widget';
  const MODAL_ID = 'agy-context-inspector-modal';
  const POPOVER_ID = 'agy-zone-popover';
  const VERSION = '1.6.0';

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

  const TRANSLATIONS = {
  "en": {
    "zoneSmartTag": "SMART ZONE ✓",
    "zoneSmartDesc": "High quality (accurate, sharp responses)",
    "zoneWarnTag": "WARNING ! Degrading",
    "zoneWarnDesc": "Warning! Noticeable context degradation",
    "zoneDumbTag": "DUMB ZONE ✗",
    "zoneDumbDesc": "Low quality (risk of hallucination / context loss)",
    "scopeContextWindow": "CONTEXT WINDOW",
    "scopeSubagent": "SUBAGENT",
    "scopeMainConversation": "Main Conversation",
    "compactionBadgeTitle": "Antigravity automatically compacted chat history {count}x to maintain sharp model attention. Active context: {tokens}.",
    "operationalUsage": "Operational Usage:",
    "rawCapacity": "Raw Capacity:",
    "cleanContext": "Clean context",
    "contextDistribution": "Context Distribution",
    "cacheBadge": "⚡ Cache: {pct}%",
    "cacheTooltip": "{tokens} tokens in fast cache",
    "estCost": "💰 Est. Cost:",
    "savings": "Saved:",
    "savingsTooltip": "Real cache savings: {usd}",
    "tagSystem": "🧠 System: {val}",
    "tagFiles": "📄 Files: {val}",
    "tagCmds": "💻 Outputs: {val}",
    "readyForTasks": "Ready for tasks.",
    "balancedConsumption": "Balanced consumption",
    "subagentsIsolated": "Subagents (Isolated)",
    "subagentsHint": "Independent contexts (do not count toward main):",
    "btnInspect": "🔍 Inspect Full Context",
    "modalTitle": "Context Window Inspector",
    "modalSubagentTag": "🤖 SUBAGENT",
    "modalCompactedTag": "COMPACTED ({count}x)",
    "modalCompactedTooltip": "Antigravity performed {count} automatic compaction(s) of history in this session to preserve model attention.",
    "scopeLabel": "Scope:",
    "optMainConversation": "🌐 Main Conversation (~{tokens})",
    "activeConsumption": "Active Consumption",
    "ofSmartLimit": "{pct}% of smart limit",
    "fastCache": "Fast Cache",
    "inFastCache": "{pct}% in fast cache",
    "estCostApi": "Est. Cost (API)",
    "cacheSavingsDesc": "{discount}% savings via Cache (-{usd})",
    "cacheSavingsTooltip": "Real calculated savings: {usd}",
    "filesInContext": "Files in Context",
    "filesCountUnit": "{count} files",
    "estTokens": "~{tokens} tokens",
    "commandOutputs": "Command Outputs",
    "cmdsCountUnit": "{count} cmds",
    "loadDistribution": "Visual Load Distribution",
    "rawRatioText": "{tokens} / 1.0M ({pct}% raw capacity)",
    "legendSystem": "System & Rules",
    "legendFiles": "Injected Files",
    "legendCmds": "Terminal Commands",
    "legendDialogue": "Dialogue History",
    "tabOverview": "Overview",
    "tabCosts": "💳 Costs & Credits",
    "tabFiles": "Files ({count})",
    "tabCommands": "Commands ({count})",
    "tabSubagents": "Subagents ({count})",
    "tabTips": "Best Practices",
    "emptyTitle": "New Conversation — Clean Context",
    "emptyDesc": "No messages or tools executed in this session yet. Context consumption begins as soon as you send your first message.",
    "subagentBannerTitle": "Isolated Subagent Context",
    "subagentBannerDesc": "This subagent operates in its own independent process. The file reads and commands below belong exclusively to it and <strong>do not burden the Main Conversation's context window</strong>.",
    "backToMainBtn": "⬅ Main Conversation",
    "compactionBannerTitle": "History Compacted by Antigravity ({count}x)",
    "compactionNormal": "Normal",
    "compactionBannerDesc": "Upon reaching the operational threshold (~250k–270k tokens), Antigravity summarizes prior conversation into a checkpoint to preserve attention and prevent hallucinations. <strong>The displayed value ({tokens}) represents active post-compaction context.</strong>",
    "categoryBreakdownTitle": "Breakdown by Load Category",
    "totalActiveTokens": "Active Total: {tokens} tokens",
    "cardSystemTitle": "🧠 System & Rules (~{tokens})",
    "cardSystemDesc": "Base prompt, workspace guidelines (AGENTS.md, rules), and MCP definitions.",
    "cardFilesTitle": "📄 Files in Context (~{tokens})",
    "cardFilesDesc": "{count} files read directly in session via view_file.",
    "cardCmdsTitle": "💻 Command Outputs (~{tokens})",
    "cardCmdsDesc": "{count} bash commands executed and retained in history.",
    "cardDialogueTitle": "💬 Dialogue & Reasoning (~{tokens})",
    "cardDialogueDesc": "User prompts, model replies, and thought chains.",
    "topConsumersTitle": "Top Context Consumers",
    "viewAllBtn": "View all ({count})",
    "noFilesYet": "No files read yet.",
    "pricingCalloutTitle": "Google AI Pro Plan (Subscription quota with no per-token fee)",
    "pricingCalloutDesc": "This estimate reflects market rates via <strong>{provider}</strong> for <strong>{model}</strong>. If you use Gemini Pro / Antigravity with included quota, your direct marginal cost is $0.00 up to your quota limit.",
    "cachingEfficiencyTitle": "⚡ Gemini Context Caching Efficiency",
    "inFastCacheTag": "{pct}% in Fast Cache",
    "currentCostCached": "Current Cost with Cache",
    "withoutCache": "Without Cache (Full Rate)",
    "realSavings": "Net Cost Savings",
    "offDiscount": "(-{discount}% off)",
    "refPricingTitle": "Reference Pricing ({model})",
    "colCategory": "TOKEN CATEGORY",
    "colQuantity": "QUANTITY",
    "colRate": "RATE / 1M",
    "colEstTotal": "ESTIMATED TOTAL",
    "rowCached": "⚡ Cached Input (Cache Read)",
    "rowUncached": "📥 Uncached Input (Prompt Tokens)",
    "rowOutput": "📤 Output / Generation (Output Tokens)",
    "projectionsTitle": "Cost Projection by Operating Window",
    "smartZoneTitle": "Smart Zone (250k tokens)",
    "smartZoneDesc": "Peak reasoning accuracy, zero hallucination, and ultra-fast response times.",
    "dumbZoneTitle": "Dumb Zone / Physical Limit (1.0M tokens)",
    "dumbZoneDesc": "Higher latency and progressive attention decay. Starting a new chat is strongly recommended.",
    "noFilesSession": "No files have been read into context in this session so far.",
    "colFileName": "FILE",
    "colFileSize": "SIZE",
    "colFileTokens": "EST. TOKENS",
    "colFileReads": "READS",
    "noCommandsSession": "No commands have been executed in this session.",
    "colCommand": "COMMAND",
    "colOutput": "OUTPUT",
    "noSubagentsSession": "No subagents have been created in this session.",
    "subagentsGuaranteeTitle": "Context Isolation Guarantee",
    "subagentsGuaranteeDesc": "Each subagent operates with its own dedicated context window. The token consumption below is exclusive to each subagent and <strong>is NOT added to the Main Conversation</strong>.",
    "subagentsClickHint": "Click any subagent below to inspect its read files, commands, and metrics:",
    "currentlySelected": "Currently Selected",
    "subagentCardDetails": "Tokens: <strong style=\"color: {color};\">{tokens}</strong> ({pct}% of Smart Zone) • {files} files • {cmds} commands",
    "btnInspectArrow": "Inspect ↗",
    "tip1Title": "🎯 Why stay in the Smart Zone (< 250k tokens)?",
    "tip1Desc": "While 1M+ models accept massive context, fine-grained detail retention and reasoning precision are vastly superior under 250k tokens. Above this threshold (\"Warning\" and \"Dumb Zone\"), \"needle in a haystack\" degradation can occur. When reaching ~250k, Antigravity automatically triggers compaction to keep context sharp.",
    "tip2Title": "✂️ How to keep context lean",
    "tip2Item1": "Prefer viewing specific line ranges (StartLine and EndLine) instead of reading entire files with thousands of lines.",
    "tip2Item2": "Avoid terminal commands that generate huge outputs (pipe to grep, head, or tail).",
    "tip2Item3": "Delegate heavy or long-running tasks to <strong>Subagents</strong> — they operate in isolated context and keep the main chat clean.",
    "tip2Item4": "When completing a milestone or changing topics, start a <strong>New Conversation</strong> with 100% fresh context.",
    "sponsorBtn": "💖 Sponsor",
    "sponsorTooltip": "Support Vitalf open-source tools on GitHub Sponsors",
    "languageLabel": "Language:",
    "tabSystem": "🧠 Rules & System ({count})",
    "btnInspectSystem": "Inspect Rules & System ↗",
    "systemBannerTitle": "System Prompt & Rules Architecture",
    "systemBannerDesc": "The System category (~{tokens} tokens) is preloaded by Antigravity on every turn. It is composed of active workspace rules, global guidelines, skills catalogs, native tool schemas, and platform instructions.",
    "sectionRulesTitle": "Active Workspace & Global Rules",
    "sectionSkillsTitle": "Skills Catalog (Progressive Disclosure)",
    "sectionNativeTitle": "Harness Native Tools & System Sections",
    "sectionMcpsTitle": "Connected MCP Servers & Tools",
    "colRuleName": "RULE FILE",
    "colRuleScope": "SCOPE",
    "colRuleTokens": "EST. TOKENS",
    "colRuleStatus": "TYPE / STATUS",
    "ruleAlwaysOn": "Always-On (Injected)",
    "ruleConditional": "Conditional (On-Demand)",
    "noRulesFound": "No explicit rule files found for this workspace.",
    "previewBtn": "Preview",
    "scopeWorkspace": "Workspace",
    "scopeGlobal": "Global",
    "scopeBuiltin": "Built-in",
    "skillsSummaryText": "{count} skills registered ({wsCount} workspace, {globCount} global/plugin, {builtCount} built-in). Their full descriptions are injected into the system prompt for progressive disclosure.",
    "nativeSummaryText": "{toolsCount} native tools declared ({toolsList}) and {sectionsCount} prompt governance sections active.",
    "mcpsSummaryText": "{count} MCP server(s) providing {toolsCount} external tools to the system prompt manifest."
  },
  "pt": {
    "zoneSmartTag": "SMART ZONE ✓",
    "zoneSmartDesc": "Qualidade alta (respostas precisas)",
    "zoneWarnTag": "ATENÇÃO ! Degrada",
    "zoneWarnDesc": "Atenção! Degradação perceptível de contexto",
    "zoneDumbTag": "DUMB ZONE ✗",
    "zoneDumbDesc": "Qualidade baixa (risco de degradação/alucinação)",
    "scopeContextWindow": "JANELA DE CONTEXTO",
    "scopeSubagent": "SUBAGENTE",
    "scopeMainConversation": "Conversa Principal",
    "compactionBadgeTitle": "O Antigravity compactou o histórico {count}x para manter a atenção afiada do modelo. Contexto ativo: {tokens}.",
    "operationalUsage": "Uso Operacional:",
    "rawCapacity": "Capacidade Bruta:",
    "cleanContext": "Contexto limpo",
    "contextDistribution": "Distribuição de Contexto",
    "cacheBadge": "⚡ Cache: {pct}%",
    "cacheTooltip": "{tokens} tokens em cache rápido",
    "estCost": "💰 Custo Est.:",
    "savings": "Economia:",
    "savingsTooltip": "Economia real via cache: {usd}",
    "tagSystem": "🧠 Sistema: {val}",
    "tagFiles": "📄 Arquivos: {val}",
    "tagCmds": "💻 Saídas: {val}",
    "readyForTasks": "Pronto para tarefas.",
    "balancedConsumption": "Consumo equilibrado",
    "subagentsIsolated": "Subagentes (Isolados)",
    "subagentsHint": "Contextos independentes (não somam na principal):",
    "btnInspect": "🔍 Inspecionar Contexto Completo",
    "modalTitle": "Context Window Inspector",
    "modalSubagentTag": "🤖 SUBAGENTE",
    "modalCompactedTag": "COMPACTADO ({count}x)",
    "modalCompactedTooltip": "O Antigravity realizou {count} compactação(ões) automática(s) de histórico nesta sessão para manter a atenção afiada do modelo.",
    "scopeLabel": "Escopo:",
    "optMainConversation": "🌐 Conversa Principal (~{tokens})",
    "activeConsumption": "Consumo Ativo",
    "ofSmartLimit": "{pct}% do limite inteligente",
    "fastCache": "Gemini Cache",
    "inFastCache": "{pct}% em cache rápido",
    "estCostApi": "Custo Estimado (API)",
    "cacheSavingsDesc": "Economia de {discount}% via Cache (-{usd})",
    "cacheSavingsTooltip": "Economia real calculada: {usd}",
    "filesInContext": "Arquivos em Contexto",
    "filesCountUnit": "{count} arq",
    "estTokens": "~{tokens} tokens",
    "commandOutputs": "Saídas de Comandos",
    "cmdsCountUnit": "{count} cmds",
    "loadDistribution": "Distribuição Visual de Carga",
    "rawRatioText": "{tokens} / 1.0M ({pct}% capacidade física)",
    "legendSystem": "Sistema & Regras",
    "legendFiles": "Arquivos Injetados",
    "legendCmds": "Comandos de Terminal",
    "legendDialogue": "Histórico de Diálogo",
    "tabOverview": "Visão Geral",
    "tabCosts": "💳 Custos & Créditos",
    "tabFiles": "Arquivos ({count})",
    "tabCommands": "Comandos ({count})",
    "tabSubagents": "Subagentes ({count})",
    "tabTips": "Boas Práticas",
    "emptyTitle": "Nova Conversa — Contexto Limpo",
    "emptyDesc": "Ainda não há mensagens ou ferramentas executadas nesta sessão. O contexto começará a ser consumido assim que você enviar a primeira mensagem.",
    "subagentBannerTitle": "Contexto Isolado de Subagente",
    "subagentBannerDesc": "Este subagente opera em seu próprio processo independente. As leituras e comandos abaixo pertencem exclusivamente a ele e <strong>não pesam na context window da Conversa Principal</strong>.",
    "backToMainBtn": "⬅ Conversa Principal",
    "compactionBannerTitle": "Histórico Compactado pelo Antigravity ({count}x)",
    "compactionNormal": "Normal",
    "compactionBannerDesc": "Ao atingir o limite operacional (~250k–270k tokens), o Antigravity resume a conversa anterior em um checkpoint para evitar perda de atenção e alucinações. <strong>O valor exibido ({tokens}) representa o contexto ativo pós-compactação.</strong>",
    "categoryBreakdownTitle": "Detalhamento por Categoria de Carga",
    "totalActiveTokens": "Total Ativo: {tokens} tokens",
    "cardSystemTitle": "🧠 Sistema & Regras (~{tokens})",
    "cardSystemDesc": "Prompt base, diretrizes de workspace (AGENTS.md, regras) e definições MCP.",
    "cardFilesTitle": "📄 Arquivos em Contexto (~{tokens})",
    "cardFilesDesc": "{count} arquivos lidos diretamente na sessão via view_file.",
    "cardCmdsTitle": "💻 Saídas de Comandos (~{tokens})",
    "cardCmdsDesc": "{count} comandos bash executados e suas saídas mantidas no histórico.",
    "cardDialogueTitle": "💬 Diálogo & Raciocínio (~{tokens})",
    "cardDialogueDesc": "Prompts do usuário, respostas do modelo e cadeias de pensamento.",
    "topConsumersTitle": "Principais Consumidores de Contexto",
    "viewAllBtn": "Ver todos ({count})",
    "noFilesYet": "Nenhum arquivo lido ainda.",
    "pricingCalloutTitle": "Plano Google AI Pro (cota de assinatura sem custo adicional por token)",
    "pricingCalloutDesc": "Esta estimativa reflete o valor de mercado via <strong>{provider}</strong> para o modelo <strong>{model}</strong>. Se você usa o plano Gemini Pro / Antigravity com cota inclusa, seu custo marginal direto é R$ 0,00 até o limite da sua cota.",
    "cachingEfficiencyTitle": "⚡ Eficiência do Gemini Context Caching",
    "inFastCacheTag": "{pct}% em Cache Rápido",
    "currentCostCached": "Custo Atual com Cache",
    "withoutCache": "Sem Cache (Tarifa Cheia)",
    "realSavings": "Economia Real Obtida",
    "offDiscount": "({discount}% off)",
    "refPricingTitle": "Tarifas de Referência ({model})",
    "colCategory": "CATEGORIA DE TOKEN",
    "colQuantity": "QUANTIDADE",
    "colRate": "TARIFA / 1M",
    "colEstTotal": "TOTAL ESTIMADO",
    "rowCached": "⚡ Entrada em Cache (Cache Read)",
    "rowUncached": "📥 Entrada sem Cache (Prompt Tokens)",
    "rowOutput": "📤 Saída / Geração (Output Tokens)",
    "projectionsTitle": "Projeção de Custo por Janela de Operação",
    "smartZoneTitle": "Smart Zone (250k tokens)",
    "smartZoneDesc": "Máxima precisão de raciocínio, sem alucinação e com tempo de resposta ultrarrápido.",
    "dumbZoneTitle": "Dumb Zone / Limite Físico (1.0M tokens)",
    "dumbZoneDesc": "Aumento de latência e degradação atencional progressiva. Recomendado reiniciar conversa.",
    "noFilesSession": "Nenhum arquivo foi lido para o contexto nesta sessão até o momento.",
    "colFileName": "ARQUIVO",
    "colFileSize": "TAMANHO",
    "colFileTokens": "TOKENS EST.",
    "colFileReads": "LEITURAS",
    "noCommandsSession": "Nenhum comando foi executado nesta sessão.",
    "colCommand": "COMANDO",
    "colOutput": "OUTPUT",
    "noSubagentsSession": "Nenhum subagente foi criado a partir desta sessão.",
    "subagentsGuaranteeTitle": "Garantia de Isolamento de Contexto",
    "subagentsGuaranteeDesc": "Cada subagente opera com uma context window própria. O consumo de tokens mostrado em cada card abaixo é exclusivo do respectivo subagente e <strong>NÃO é somado à context window da Conversa Principal</strong>.",
    "subagentsClickHint": "Clique em qualquer subagente abaixo para inspecionar seus arquivos lidos, comandos e métricas:",
    "currentlySelected": "Atualmente Selecionado",
    "subagentCardDetails": "Tokens: <strong style=\"color: {color};\">{tokens}</strong> ({pct}% da Smart Zone) • {files} arquivos • {cmds} comandos",
    "btnInspectArrow": "Inspecionar ↗",
    "tip1Title": "🎯 Por que manter na Smart Zone (< 250k tokens)?",
    "tip1Desc": "Modelos de 1M+ suportam contextos massivos, mas a retenção de detalhes finos e a precisão do raciocínio são significativamente superiores até 250k tokens. Acima desse patamar (\"Atenção\" e \"Dumb Zone\"), pode ocorrer degradação atencional (\"needle in a haystack\"). Ao atingir ~250k, o Antigravity pode executar uma compactação automática para proteger o contexto.",
    "tip2Title": "✂️ Como manter o contexto leve",
    "tip2Item1": "Prefira ler apenas fatias de arquivos com StartLine e EndLine em vez de arquivos inteiros de milhares de linhas.",
    "tip2Item2": "Evite comandos de terminal com saídas gigantescas desnecessárias (use grep, head, tail).",
    "tip2Item3": "Delegue tarefas pesadas para <strong>Subagentes</strong> — eles rodam em contexto isolado e não sobrecarregam a conversa principal.",
    "tip2Item4": "Ao concluir um objetivo ou mudar de assunto, inicie uma <strong>Nova Conversa</strong> com contexto 100% renovado.",
    "sponsorBtn": "💖 Apoiar",
    "sponsorTooltip": "Apoie as ferramentas open-source da Vitalf no GitHub Sponsors",
    "languageLabel": "Idioma:",
    "tabSystem": "🧠 Regras & Sistema ({count})",
    "btnInspectSystem": "Inspecionar Regras & Sistema ↗",
    "systemBannerTitle": "Arquitetura do System Prompt & Regras",
    "systemBannerDesc": "A categoria System (~{tokens} tokens) é pré-carregada pelo Antigravity a cada turno. Ela é composta por regras de workspace ativas, diretrizes globais, catálogo de skills, schemas de ferramentas nativas e instruções da plataforma.",
    "sectionRulesTitle": "Regras Ativas de Workspace & Globais",
    "sectionSkillsTitle": "Catálogo de Skills (Progressive Disclosure)",
    "sectionNativeTitle": "Ferramentas Nativas do Harness & Seções do Sistema",
    "sectionMcpsTitle": "Servidores MCP & Ferramentas Conectadas",
    "colRuleName": "ARQUIVO DE REGRA",
    "colRuleScope": "ESCOPO",
    "colRuleTokens": "TOKENS EST.",
    "colRuleStatus": "TIPO / STATUS",
    "ruleAlwaysOn": "Sempre Ativa (Injetada)",
    "ruleConditional": "Condicional (Sob Demanda)",
    "noRulesFound": "Nenhum arquivo de regra explícito encontrado para este workspace.",
    "previewBtn": "Visualizar",
    "scopeWorkspace": "Workspace",
    "scopeGlobal": "Global",
    "scopeBuiltin": "Embutida",
    "skillsSummaryText": "{count} skills registradas ({wsCount} do workspace, {globCount} globais/plugins, {builtCount} nativas). Suas descrições completas são injetadas no prompt de sistema para progressive disclosure.",
    "nativeSummaryText": "{toolsCount} ferramentas nativas declaradas ({toolsList}) e {sectionsCount} seções de governança do prompt ativas.",
    "mcpsSummaryText": "{count} servidor(es) MCP fornecendo {toolsCount} ferramentas externas ao manifesto do system prompt."
  },
  "es": {
    "zoneSmartTag": "ZONA INTELIGENTE ✓",
    "zoneSmartDesc": "Alta calidad (respuestas precisas)",
    "zoneWarnTag": "¡ATENCIÓN! Degrada",
    "zoneWarnDesc": "¡Atención! Degradación perceptible del contexto",
    "zoneDumbTag": "ZONA DEGRADADA ✗",
    "zoneDumbDesc": "Baja calidad (riesgo de alucinación/pérdida)",
    "scopeContextWindow": "VENTANA DE CONTEXTO",
    "scopeSubagent": "SUBAGENTE",
    "scopeMainConversation": "Conversación Principal",
    "compactionBadgeTitle": "Antigravity compactó automáticamente el historial {count}x para mantener la atención del modelo. Contexto activo: {tokens}.",
    "operationalUsage": "Uso Operativo:",
    "rawCapacity": "Capacidad Bruta:",
    "cleanContext": "Contexto limpio",
    "contextDistribution": "Distribución del Contexto",
    "cacheBadge": "⚡ Caché: {pct}%",
    "cacheTooltip": "{tokens} tokens en caché rápida",
    "estCost": "💰 Coste Est.:",
    "savings": "Ahorro:",
    "savingsTooltip": "Ahorro real por caché: {usd}",
    "tagSystem": "🧠 Sistema: {val}",
    "tagFiles": "📄 Archivos: {val}",
    "tagCmds": "💻 Salidas: {val}",
    "readyForTasks": "Listo para tareas.",
    "balancedConsumption": "Consumo equilibrado",
    "subagentsIsolated": "Subagentes (Aislados)",
    "subagentsHint": "Contextos independientes (no suman a la principal):",
    "btnInspect": "🔍 Inspeccionar Contexto Completo",
    "modalTitle": "Inspector de Ventana de Contexto",
    "modalSubagentTag": "🤖 SUBAGENTE",
    "modalCompactedTag": "COMPACTADO ({count}x)",
    "modalCompactedTooltip": "Antigravity realizó {count} compactación(es) automática(s) del historial en esta sesión para mantener la atención del modelo.",
    "scopeLabel": "Ámbito:",
    "optMainConversation": "🌐 Conversación Principal (~{tokens})",
    "activeConsumption": "Consumo Activo",
    "ofSmartLimit": "{pct}% del límite inteligente",
    "fastCache": "Caché Rápida",
    "inFastCache": "{pct}% en caché rápida",
    "estCostApi": "Coste Estimado (API)",
    "cacheSavingsDesc": "Ahorro del {discount}% vía Caché (-{usd})",
    "cacheSavingsTooltip": "Ahorro real calculado: {usd}",
    "filesInContext": "Archivos en Contexto",
    "filesCountUnit": "{count} arch",
    "estTokens": "~{tokens} tokens",
    "commandOutputs": "Salidas de Comandos",
    "cmdsCountUnit": "{count} cmds",
    "loadDistribution": "Distribución Visual de Carga",
    "rawRatioText": "{tokens} / 1.0M ({pct}% capacidad física)",
    "legendSystem": "Sistema y Reglas",
    "legendFiles": "Archivos Inyectados",
    "legendCmds": "Comandos de Terminal",
    "legendDialogue": "Historial de Diálogo",
    "tabOverview": "Visión General",
    "tabCosts": "💳 Costes y Créditos",
    "tabFiles": "Archivos ({count})",
    "tabCommands": "Comandos ({count})",
    "tabSubagents": "Subagentes ({count})",
    "tabTips": "Buenas Prácticas",
    "emptyTitle": "Nueva Conversación — Contexto Limpio",
    "emptyDesc": "Aún no hay mensajes ni herramientas ejecutadas en esta sesión. El consumo de contexto comenzará en cuanto envíes tu primer mensaje.",
    "subagentBannerTitle": "Contexto Aislado de Subagente",
    "subagentBannerDesc": "Este subagente opera en su propio proceso independiente. Las lecturas y comandos a continuación le pertenecen exclusivamente y <strong>no cargan la ventana de contexto de la Conversación Principal</strong>.",
    "backToMainBtn": "⬅ Conversación Principal",
    "compactionBannerTitle": "Historial Compactado por Antigravity ({count}x)",
    "compactionNormal": "Normal",
    "compactionBannerDesc": "Al alcanzar el límite operativo (~250k–270k tokens), Antigravity resume la conversación anterior en un punto de control para evitar pérdida de atención y alucinaciones. <strong>El valor mostrado ({tokens}) representa el contexto activo post-compactación.</strong>",
    "categoryBreakdownTitle": "Desglose por Categoría de Carga",
    "totalActiveTokens": "Total Activo: {tokens} tokens",
    "cardSystemTitle": "🧠 Sistema y Reglas (~{tokens})",
    "cardSystemDesc": "Prompt base, directrices del espacio de trabajo (AGENTS.md, reglas) y definiciones MCP.",
    "cardFilesTitle": "📄 Archivos en Contexto (~{tokens})",
    "cardFilesDesc": "{count} archivos leídos directamente en la sesión vía view_file.",
    "cardCmdsTitle": "💻 Salidas de Comandos (~{tokens})",
    "cardCmdsDesc": "{count} comandos bash ejecutados y sus salidas conservadas en el historial.",
    "cardDialogueTitle": "💬 Diálogo y Razonamiento (~{tokens})",
    "cardDialogueDesc": "Prompts de usuario, respuestas del modelo y cadenas de pensamiento.",
    "topConsumersTitle": "Principales Consumidores de Contexto",
    "viewAllBtn": "Ver todos ({count})",
    "noFilesYet": "Aún no se han leído archivos.",
    "pricingCalloutTitle": "Plan Google AI Pro (Cuota de suscripción sin coste por token)",
    "pricingCalloutDesc": "Esta estimación refleja el valor de mercado vía <strong>{provider}</strong> para el modelo <strong>{model}</strong>. Si utilizas Gemini Pro / Antigravity con cuota incluida, tu coste marginal directo es $0.00 hasta agotar tu cuota.",
    "cachingEfficiencyTitle": "⚡ Eficiencia de Gemini Context Caching",
    "inFastCacheTag": "{pct}% en Caché Rápida",
    "currentCostCached": "Coste Actual con Caché",
    "withoutCache": "Sin Caché (Tarifa Completa)",
    "realSavings": "Ahorro Real Obtenido",
    "offDiscount": "(-{discount}% dto)",
    "refPricingTitle": "Tarifas de Referencia ({model})",
    "colCategory": "CATEGORÍA DE TOKEN",
    "colQuantity": "CANTIDAD",
    "colRate": "TARIFA / 1M",
    "colEstTotal": "TOTAL ESTIMADO",
    "rowCached": "⚡ Entrada en Caché (Cache Read)",
    "rowUncached": "📥 Entrada sin Caché (Prompt Tokens)",
    "rowOutput": "📤 Salida / Generación (Output Tokens)",
    "projectionsTitle": "Proyección de Coste por Ventana de Operación",
    "smartZoneTitle": "Smart Zone (250k tokens)",
    "smartZoneDesc": "Máxima precisión de razonamiento, sin alucinaciones y tiempo de respuesta ultrarrápido.",
    "dumbZoneTitle": "Dumb Zone / Límite Físico (1.0M tokens)",
    "dumbZoneDesc": "Aumento de latencia y degradación atencional progresiva. Se recomienda reiniciar la conversación.",
    "noFilesSession": "No se ha leído ningún archivo para el contexto en esta sesión hasta el momento.",
    "colFileName": "ARCHIVO",
    "colFileSize": "TAMAÑO",
    "colFileTokens": "TOKENS EST.",
    "colFileReads": "LECTURAS",
    "noCommandsSession": "No se ha ejecutado ningún comando en esta sesión.",
    "colCommand": "COMANDO",
    "colOutput": "SALIDA",
    "noSubagentsSession": "No se ha creado ningún subagente a partir de esta sesión.",
    "subagentsGuaranteeTitle": "Garantía de Aislamiento de Contexto",
    "subagentsGuaranteeDesc": "Cada subagente opera con su propia ventana de contexto. El consumo de tokens mostrado abajo es exclusivo de cada uno y <strong>NO se suma a la Conversación Principal</strong>.",
    "subagentsClickHint": "Haz clic en cualquier subagente abajo para inspeccionar sus archivos, comandos y métricas:",
    "currentlySelected": "Seleccionado Actualmente",
    "subagentCardDetails": "Tokens: <strong style=\"color: {color};\">{tokens}</strong> ({pct}% de Smart Zone) • {files} archivos • {cmds} comandos",
    "btnInspectArrow": "Inspeccionar ↗",
    "tip1Title": "🎯 ¿Por qué mantenerse en la Smart Zone (< 250k tokens)?",
    "tip1Desc": "Aunque los modelos de 1M+ admiten contextos enormes, la retención de detalles y la precisión del razonamiento son muy superiores por debajo de 250k tokens. Por encima de este umbral (\"Atención\" y \"Zona Degradada\"), puede ocurrir degradación atencional (\"aguja en un pajar\"). Al alcanzar ~250k, Antigravity puede compactar automáticamente.",
    "tip2Title": "✂️ Cómo mantener el contexto ligero",
    "tip2Item1": "Prefiere leer solo fragmentos de archivos con StartLine y EndLine en lugar de archivos enteros de miles de líneas.",
    "tip2Item2": "Evita comandos de terminal con salidas descomunales e innecesarias (utiliza grep, head, tail).",
    "tip2Item3": "Delega tareas complejas a <strong>Subagentes</strong>: operan en contexto aislado y no sobrecargan la conversación principal.",
    "tip2Item4": "Al finalizar un objetivo o cambiar de tema, inicia una <strong>Nueva Conversación</strong> con contexto 100% renovado.",
    "sponsorBtn": "💖 Patrocinar",
    "sponsorTooltip": "Apoya las herramientas de código abierto de Vitalf en GitHub Sponsors",
    "languageLabel": "Idioma:",
    "tabSystem": "🧠 Reglas y Sistema ({count})",
    "btnInspectSystem": "Inspeccionar Reglas y Sistema ↗",
    "systemBannerTitle": "Arquitectura del System Prompt y Reglas",
    "systemBannerDesc": "La categoría System (~{tokens} tokens) se precarga en cada turno de Antigravity. Está compuesta por reglas activas del espacio de trabajo, directrices globales, catálogos de skills, esquemas de herramientas nativas e instrucciones de la plataforma.",
    "sectionRulesTitle": "Reglas Activas del Espacio de Trabajo y Globales",
    "sectionSkillsTitle": "Catálogo de Skills (Divulgación Progresiva)",
    "sectionNativeTitle": "Herramientas Nativas del Harness y Secciones del Sistema",
    "sectionMcpsTitle": "Servidores MCP y Herramientas Conectadas",
    "colRuleName": "ARCHIVO DE REGLA",
    "colRuleScope": "ÁMBITO",
    "colRuleTokens": "TOKENS EST.",
    "colRuleStatus": "TIPO / ESTADO",
    "ruleAlwaysOn": "Siempre Activa (Inyectada)",
    "ruleConditional": "Condicional (Bajo Demanda)",
    "noRulesFound": "No se encontraron archivos de reglas explícitos para este espacio de trabajo.",
    "previewBtn": "Vista Previa",
    "scopeWorkspace": "Espacio de Trabajo",
    "scopeGlobal": "Global",
    "scopeBuiltin": "Incorporada",
    "skillsSummaryText": "{count} skills registradas ({wsCount} del espacio de trabajo, {globCount} globales/plugins, {builtCount} nativas). Sus descripciones completas se inyectan en el prompt de sistema para divulgación progresiva.",
    "nativeSummaryText": "{toolsCount} herramientas nativas declaradas ({toolsList}) y {sectionsCount} secciones de gobernanza del prompt activas.",
    "mcpsSummaryText": "{count} servidor(es) MCP que proporcionan {toolsCount} herramientas externas al manifiesto del system prompt."
  },
  "ja": {
    "zoneSmartTag": "スマートゾーン ✓",
    "zoneSmartDesc": "高品質（高精度な応答）",
    "zoneWarnTag": "警告！性能低下",
    "zoneWarnDesc": "警告！コンテキストの明らかな低下",
    "zoneDumbTag": "ダムゾーン ✗",
    "zoneDumbDesc": "低品質（ハルシネーション・忘却のリスク）",
    "scopeContextWindow": "コンテキストウィンドウ",
    "scopeSubagent": "サブエージェント",
    "scopeMainConversation": "メイン会話",
    "compactionBadgeTitle": "Antigravityはモデルの注意力を維持するため履歴を自動で{count}回圧縮しました。有効コンテキスト: {tokens}。",
    "operationalUsage": "運用利用量:",
    "rawCapacity": "物理容量:",
    "cleanContext": "クリーンなコンテキスト",
    "contextDistribution": "コンテキストの内訳",
    "cacheBadge": "⚡ キャッシュ: {pct}%",
    "cacheTooltip": "高速キャッシュ内 {tokens} トークン",
    "estCost": "💰 推定コスト:",
    "savings": "削減額:",
    "savingsTooltip": "キャッシュによる実質削減額: {usd}",
    "tagSystem": "🧠 システム: {val}",
    "tagFiles": "📄 ファイル: {val}",
    "tagCmds": "💻 出力: {val}",
    "readyForTasks": "タスクの準備完了。",
    "balancedConsumption": "バランスのとれた消費",
    "subagentsIsolated": "サブエージェント（分離）",
    "subagentsHint": "独立コンテキスト（メインセッションには加算されません）:",
    "btnInspect": "🔍 詳細コンテキストの確認",
    "modalTitle": "コンテキストウィンドウ・インスペクター",
    "modalSubagentTag": "🤖 サブエージェント",
    "modalCompactedTag": "圧縮済み ({count}x)",
    "modalCompactedTooltip": "Antigravityはモデルの注意力を維持するため、このセッションで履歴の自動圧縮を{count}回実行しました。",
    "scopeLabel": "対象スコープ:",
    "optMainConversation": "🌐 メイン会話 (~{tokens})",
    "activeConsumption": "アクティブ消費量",
    "ofSmartLimit": "スマート上限の {pct}%",
    "fastCache": "高速キャッシュ",
    "inFastCache": "高速キャッシュ内 {pct}%",
    "estCostApi": "推定コスト (API)",
    "cacheSavingsDesc": "キャッシュにより{discount}%削減 (-{usd})",
    "cacheSavingsTooltip": "算出された実質削減額: {usd}",
    "filesInContext": "コンテキスト内ファイル",
    "filesCountUnit": "{count} 件",
    "estTokens": "約 {tokens} トークン",
    "commandOutputs": "コマンド出力",
    "cmdsCountUnit": "{count} 回",
    "loadDistribution": "視覚的な負荷分布",
    "rawRatioText": "{tokens} / 1.0M ({pct}% 物理容量)",
    "legendSystem": "システム＆ルール",
    "legendFiles": "読み込みファイル",
    "legendCmds": "ターミナルコマンド",
    "legendDialogue": "対話履歴",
    "tabOverview": "概要",
    "tabCosts": "💳 コスト＆クレジット",
    "tabFiles": "ファイル ({count})",
    "tabCommands": "コマンド ({count})",
    "tabSubagents": "サブエージェント ({count})",
    "tabTips": "ベストプラクティス",
    "emptyTitle": "新しい会話 — クリーンなコンテキスト",
    "emptyDesc": "このセッションではまだメッセージやツールの実行はありません。最初のメッセージを送信するとコンテキストの消費が開始されます。",
    "subagentBannerTitle": "分離されたサブエージェントのコンテキスト",
    "subagentBannerDesc": "このサブエージェントは独立した独自プロセスで動作します。以下のファイル読み込みやコマンドはこれ専用であり、<strong>メイン会話のコンテキストウィンドウを消費しません</strong>。",
    "backToMainBtn": "⬅ メイン会話",
    "compactionBannerTitle": "Antigravityによる履歴圧縮 ({count}x)",
    "compactionNormal": "正常",
    "compactionBannerDesc": "運用上限（約250k〜270kトークン）に達すると、Antigravityは注意力の低下や幻覚を防ぐために以前の会話を要約チェックポイントにまとめます。<strong>表示値（{tokens}）は圧縮後の有効コンテキストを表しています。</strong>",
    "categoryBreakdownTitle": "負荷カテゴリ別詳細",
    "totalActiveTokens": "有効合計: {tokens} トークン",
    "cardSystemTitle": "🧠 システム＆ルール (~{tokens})",
    "cardSystemDesc": "基本プロンプト、ワークスペースガイドライン（AGENTS.md、ルール）、MCP定義。",
    "cardFilesTitle": "📄 コンテキスト内ファイル (~{tokens})",
    "cardFilesDesc": "view_file経由でセッション中に直接読み込まれた {count} 件のファイル。",
    "cardCmdsTitle": "💻 コマンド出力 (~{tokens})",
    "cardCmdsDesc": "実行され履歴に保持されている {count} 回のbashコマンド出力。",
    "cardDialogueTitle": "💬 対話＆推論 (~{tokens})",
    "cardDialogueDesc": "ユーザープロンプト、モデル応答、および思考プロセス。",
    "topConsumersTitle": "コンテキストの主な消費項目",
    "viewAllBtn": "すべて表示 ({count})",
    "noFilesYet": "まだ読み込まれたファイルはありません。",
    "pricingCalloutTitle": "Google AI Pro プラン（トークン従量課金なしのサブスクリプション枠）",
    "pricingCalloutDesc": "この見積もりは <strong>{provider}</strong> による <strong>{model}</strong> の市場標準価格を反映しています。割り当て枠付きのGemini Pro / Antigravityをご利用の場合、枠内での直接限界費用は $0.00 です。",
    "cachingEfficiencyTitle": "⚡ Geminiコンテキストキャッシュの効率",
    "inFastCacheTag": "高速キャッシュ率 {pct}%",
    "currentCostCached": "キャッシュ適用後コスト",
    "withoutCache": "キャッシュなし（定価）",
    "realSavings": "実質削減コスト",
    "offDiscount": "({discount}% オフ)",
    "refPricingTitle": "基準料金 ({model})",
    "colCategory": "トークン分類",
    "colQuantity": "数量",
    "colRate": "単価 / 100万",
    "colEstTotal": "推定合計",
    "rowCached": "⚡ キャッシュ入力 (Cache Read)",
    "rowUncached": "📥 未キャッシュ入力 (Prompt Tokens)",
    "rowOutput": "📤 出力 / 生成 (Output Tokens)",
    "projectionsTitle": "動作ウィンドウ別コスト予測",
    "smartZoneTitle": "スマートゾーン (250k トークン)",
    "smartZoneDesc": "最高の推論精度、幻覚ゼロ、そして超高速な応答速度。",
    "dumbZoneTitle": "ダムゾーン / 物理的上限 (1.0M トークン)",
    "dumbZoneDesc": "遅延の増大と段階的な注意力の低下。会話を新規作成することを強くお勧めします。",
    "noFilesSession": "このセッションではコンテキストに読み込まれたファイルはまだありません。",
    "colFileName": "ファイル名",
    "colFileSize": "サイズ",
    "colFileTokens": "推定トークン",
    "colFileReads": "読込回数",
    "noCommandsSession": "このセッションではコマンドが実行されていません。",
    "colCommand": "コマンド",
    "colOutput": "出力サイズ",
    "noSubagentsSession": "このセッションから作成されたサブエージェントはありません。",
    "subagentsGuaranteeTitle": "コンテキスト完全分離の保証",
    "subagentsGuaranteeDesc": "各サブエージェントは専用のコンテキストウィンドウで動作します。以下のトークン消費は各サブエージェント独自のものであり、<strong>メイン会話には一切加算されません</strong>。",
    "subagentsClickHint": "以下のサブエージェントをクリックしてファイル・コマンド・メトリクスを確認:",
    "currentlySelected": "選択中",
    "subagentCardDetails": "トークン: <strong style=\"color: {color};\">{tokens}</strong> (スマートゾーンの {pct}%) • {files} ファイル • {cmds} コマンド",
    "btnInspectArrow": "確認 ↗",
    "tip1Title": "🎯 なぜスマートゾーン（250kトークン未満）に保つべきなのか？",
    "tip1Desc": "100万以上のモデルは膨大なコンテキストをサポートしていますが、250k未満の方が詳細の保持力と推論の精度が圧倒的に優れています。これを超えると注意力の低下が生じやすくなります。約250kに達するとAntigravityは自動圧縮を行ってコンテキストを保護します。",
    "tip2Title": "✂️ コンテキストをスリムに保つ方法",
    "tip2Item1": "数千行のファイル全体を読み込むのではなく、StartLineとEndLineで必要な部分だけを読み込むようにしてください。",
    "tip2Item2": "不要に長大な出力となるターミナルコマンドを避け、grep、head、tailなどを活用してください。",
    "tip2Item3": "重いタスクは<strong>サブエージェント</strong>に委託してください — 独立したコンテキストで動作しメイン会話を圧迫しません。",
    "tip2Item4": "目標が完了したり話題を切り替える際は、<strong>新しい会話</strong>を開始してコンテキストを100%リフレッシュしてください。",
    "sponsorBtn": "💖 スポンサー",
    "sponsorTooltip": "GitHub SponsorsでVitalfのオープンソース開発を支援",
    "languageLabel": "言語:",
    "tabSystem": "🧠 ルール＆システム ({count})",
    "btnInspectSystem": "ルール＆システムを検査 ↗",
    "systemBannerTitle": "システムプロンプトとルールのアーキテクチャ",
    "systemBannerDesc": "Systemカテゴリ（~{tokens}トークン）は、Antigravityによって毎ターン事前に読み込まれます。ワークスペースルール、グローバルルール、スキルカタログ、ネイティブツールのスキーマ、プラットフォーム指示で構成されます。",
    "sectionRulesTitle": "アクティブなワークスペースおよびグローバルルール",
    "sectionSkillsTitle": "スキルカタログ（プログレッシブ・ディスクロージャー）",
    "sectionNativeTitle": "ハーネスネイティブツールとシステムセクション",
    "sectionMcpsTitle": "接続中のMCPサーバーとツール",
    "colRuleName": "ルールファイル",
    "colRuleScope": "スコープ",
    "colRuleTokens": "推定トークン",
    "colRuleStatus": "タイプ / 状態",
    "ruleAlwaysOn": "常時有効（注入済み）",
    "ruleConditional": "条件付き（オンデマンド）",
    "noRulesFound": "このワークスペースの明示的なルールファイルが見つかりません。",
    "previewBtn": "プレビュー",
    "scopeWorkspace": "ワークスペース",
    "scopeGlobal": "グローバル",
    "scopeBuiltin": "組み込み",
    "skillsSummaryText": "{count}個のスキルが登録されています（ワークスペース: {wsCount}、グローバル/プラグイン: {globCount}、組み込み: {builtCount}）。プログレッシブ・ディスクロージャーのために完全な説明がシステムプロンプトに注入されます。",
    "nativeSummaryText": "{toolsCount}個のネイティブツールが宣言され（{toolsList}）、{sectionsCount}個のプロンプトガバナンスセクションがアクティブです。",
    "mcpsSummaryText": "{count}個のMCPサーバーが{toolsCount}個の外部ツールをシステムプロンプトマニフェストに提供しています。"
  },
  "zh": {
    "zoneSmartTag": "智能区间 ✓",
    "zoneSmartDesc": "高质量（精准回答）",
    "zoneWarnTag": "注意！性能衰减",
    "zoneWarnDesc": "注意！上下文出现明显衰减",
    "zoneDumbTag": "迟钝区间 ✗",
    "zoneDumbDesc": "低质量（存在幻觉与遗忘风险）",
    "scopeContextWindow": "上下文窗口",
    "scopeSubagent": "子智能体",
    "scopeMainConversation": "主会话",
    "compactionBadgeTitle": "Antigravity 已自动压缩历史记录 {count} 次，以保持模型的敏锐注意力。活跃上下文: {tokens}。",
    "operationalUsage": "运行用量:",
    "rawCapacity": "原始容量:",
    "cleanContext": "空白上下文",
    "contextDistribution": "上下文分布",
    "cacheBadge": "⚡ 缓存: {pct}%",
    "cacheTooltip": "快速缓存中的 {tokens} 个 token",
    "estCost": "💰 预估费用:",
    "savings": "节省:",
    "savingsTooltip": "缓存带来的实际节省: {usd}",
    "tagSystem": "🧠 系统: {val}",
    "tagFiles": "📄 文件: {val}",
    "tagCmds": "💻 输出: {val}",
    "readyForTasks": "准备就绪。",
    "balancedConsumption": "消耗均衡",
    "subagentsIsolated": "子智能体（独立隔离）",
    "subagentsHint": "独立上下文（不占用主会话窗口）:",
    "btnInspect": "🔍 查看完整上下文详情",
    "modalTitle": "上下文窗口检查器",
    "modalSubagentTag": "🤖 子智能体",
    "modalCompactedTag": "已压缩 ({count}x)",
    "modalCompactedTooltip": "Antigravity 在此会话中执行了 {count} 次自动历史压缩，以保持模型的敏锐注意力。",
    "scopeLabel": "作用域:",
    "optMainConversation": "🌐 主会话 (~{tokens})",
    "activeConsumption": "活跃用量",
    "ofSmartLimit": "智能上限的 {pct}%",
    "fastCache": "快速缓存",
    "inFastCache": "快速缓存中 {pct}%",
    "estCostApi": "预估费用 (API)",
    "cacheSavingsDesc": "通过缓存节省 {discount}% (-{usd})",
    "cacheSavingsTooltip": "计算得出的实际节省额: {usd}",
    "filesInContext": "上下文内文件",
    "filesCountUnit": "{count} 个文件",
    "estTokens": "约 {tokens} token",
    "commandOutputs": "命令输出",
    "cmdsCountUnit": "{count} 次",
    "loadDistribution": "负载可视化分布",
    "rawRatioText": "{tokens} / 1.0M ({pct}% 物理容量)",
    "legendSystem": "系统与规则",
    "legendFiles": "载入文件",
    "legendCmds": "终端命令",
    "legendDialogue": "对话历史",
    "tabOverview": "概览",
    "tabCosts": "💳 费用与额度",
    "tabFiles": "文件 ({count})",
    "tabCommands": "命令 ({count})",
    "tabSubagents": "子智能体 ({count})",
    "tabTips": "最佳实践",
    "emptyTitle": "新对话 — 上下文干净",
    "emptyDesc": "此会话中尚未执行任何消息或工具。发送第一条消息后将开始占用上下文。",
    "subagentBannerTitle": "子智能体独立上下文",
    "subagentBannerDesc": "该子智能体在独立的进程中运行。下列文件读取与命令仅属于该智能体，<strong>不会增加主会话的上下文窗口负担</strong>。",
    "backToMainBtn": "⬅ 主会话",
    "compactionBannerTitle": "Antigravity 已压缩历史 ({count}x)",
    "compactionNormal": "正常",
    "compactionBannerDesc": "当达到运行上限（约 250k–270k token）时，Antigravity 会将之前的对话汇总为一个检查点，以避免注意力衰减与幻觉。<strong>显示的值（{tokens}）代表压缩后的活跃上下文。</strong>",
    "categoryBreakdownTitle": "负载分类明细",
    "totalActiveTokens": "当前活跃总量: {tokens} token",
    "cardSystemTitle": "🧠 系统与规则 (~{tokens})",
    "cardSystemDesc": "基础系统提示词、工作区规范（AGENTS.md、规则）和 MCP 定义。",
    "cardFilesTitle": "📄 上下文内文件 (~{tokens})",
    "cardFilesDesc": "会话中通过 view_file 直接读取的 {count} 个文件。",
    "cardCmdsTitle": "💻 命令输出 (~{tokens})",
    "cardCmdsDesc": "执行并在历史中保留输出的 {count} 个 bash 命令。",
    "cardDialogueTitle": "💬 对话与思考 (~{tokens})",
    "cardDialogueDesc": "用户输入、模型回答以及内部思考链条。",
    "topConsumersTitle": "主要上下文消耗来源",
    "viewAllBtn": "查看全部 ({count})",
    "noFilesYet": "尚未读取任何文件。",
    "pricingCalloutTitle": "Google AI Pro 计划（包含订阅额度，无需按 token 额外付费）",
    "pricingCalloutDesc": "此预估基于 <strong>{provider}</strong> 针对 <strong>{model}</strong> 的公开市场费率。若使用包含额度的 Gemini Pro / Antigravity，在额度限制内直接边际费用为 $0.00。",
    "cachingEfficiencyTitle": "⚡ Gemini 上下文缓存效率",
    "inFastCacheTag": "快速缓存率 {pct}%",
    "currentCostCached": "当前实际费用（带缓存）",
    "withoutCache": "无缓存（全额单价）",
    "realSavings": "实际节省金额",
    "offDiscount": "（省 {discount}%）",
    "refPricingTitle": "参考计费标准 ({model})",
    "colCategory": "TOKEN 类别",
    "colQuantity": "数量",
    "colRate": "单价 / 百万",
    "colEstTotal": "预估小计",
    "rowCached": "⚡ 缓存输入 (Cache Read)",
    "rowUncached": "📥 未缓存输入 (Prompt Tokens)",
    "rowOutput": "📤 输出 / 生成 (Output Tokens)",
    "projectionsTitle": "各运行区间的成本预估",
    "smartZoneTitle": "智能区间 (250k token)",
    "smartZoneDesc": "极致推理精度，无幻觉，毫秒级极速响应。",
    "dumbZoneTitle": "迟钝区间 / 物理上限 (1.0M token)",
    "dumbZoneDesc": "延迟增加并伴随渐进式注意力衰退。强烈建议开启新对话。",
    "noFilesSession": "截至目前，此会话尚未读取任何文件。",
    "colFileName": "文件名",
    "colFileSize": "大小",
    "colFileTokens": "预估 TOKEN",
    "colFileReads": "读取次数",
    "noCommandsSession": "此会话中尚未执行任何命令。",
    "colCommand": "执行命令",
    "colOutput": "输出大小",
    "noSubagentsSession": "此会话中未派生任何子智能体。",
    "subagentsGuaranteeTitle": "上下文隔离保障",
    "subagentsGuaranteeDesc": "每个子智能体都在独立的上下文窗口中运行。下方显示的 token 消耗为子智能体独有，<strong>绝不会叠加到主会话中</strong>。",
    "subagentsClickHint": "点击下方任意子智能体，即可检查其读取的文件、命令与各项指标:",
    "currentlySelected": "当前已选中",
    "subagentCardDetails": "Tokens: <strong style=\"color: {color};\">{tokens}</strong> (智能区间的 {pct}%) • {files} 个文件 • {cmds} 个命令",
    "btnInspectArrow": "检查 ↗",
    "tip1Title": "🎯 为什么要保持在智能区间（< 250k token）？",
    "tip1Desc": "尽管 1M+ 模型支持海量上下文，但在 250k token 以内，细节保留与逻辑推理精度显著更高。超出该区间（“注意”和“迟钝区间”）时可能出现大海捞针式的注意力衰减。达到约 250k 时，Antigravity 会自动触发压缩以保护上下文。",
    "tip2Title": "✂️ 如何保持上下文精简",
    "tip2Item1": "优先使用 StartLine 和 EndLine 读取文件切片，避免一次性载入成千上万行的完整文件。",
    "tip2Item2": "避免在终端中运行产生海量无用输出的命令（善用 grep、head、tail 过滤）。",
    "tip2Item3": "将繁重任务委派给<strong>子智能体</strong> — 它们在隔离的上下文中执行，不会挤占主会话空间。",
    "tip2Item4": "完成阶段目标或切换话题时，开启<strong>新对话</strong>以获得 100% 全新的上下文。",
    "sponsorBtn": "💖 赞助项目",
    "sponsorTooltip": "在 GitHub Sponsors 上支持 Vitalf 开源工具开发",
    "languageLabel": "语言:",
    "tabSystem": "🧠 规则与系统 ({count})",
    "btnInspectSystem": "检查规则与系统 ↗",
    "systemBannerTitle": "系统提示词与规则架构",
    "systemBannerDesc": "System 类别（~{tokens} tokens）在每个回合均由 Antigravity 预先加载。它由活跃工作区规则、全局规范、技能目录、原生工具结构定义和平台指令组成。",
    "sectionRulesTitle": "活跃工作区与全局规则",
    "sectionSkillsTitle": "技能目录（渐进式披露）",
    "sectionNativeTitle": "原生工具与系统指令章节",
    "sectionMcpsTitle": "已连接的 MCP 服务器与工具",
    "colRuleName": "规则文件",
    "colRuleScope": "作用域",
    "colRuleTokens": "预估 TOKENS",
    "colRuleStatus": "类型 / 状态",
    "ruleAlwaysOn": "始终启用（已注入）",
    "ruleConditional": "条件触发（按需加载）",
    "noRulesFound": "未找到此工作区的明确规则文件。",
    "previewBtn": "预览",
    "scopeWorkspace": "工作区",
    "scopeGlobal": "全局",
    "scopeBuiltin": "内置",
    "skillsSummaryText": "已注册 {count} 项技能（工作区 {wsCount} 项，全局/插件 {globCount} 项，内置 {builtCount} 项）。完整描述均已注入系统提示词以供渐进式发现。",
    "nativeSummaryText": "已声明 {toolsCount} 个原生工具（{toolsList}），激活了 {sectionsCount} 个提示词治理章节。",
    "mcpsSummaryText": "{count} 个 MCP 服务器为系统提示词清单提供了 {toolsCount} 个外部工具。"
  },
  "fr": {
    "zoneSmartTag": "ZONE INTELLIGENTE ✓",
    "zoneSmartDesc": "Haute qualité (réponses précises)",
    "zoneWarnTag": "ATTENTION ! Dégradation",
    "zoneWarnDesc": "Attention ! Dégradation perceptible du contexte",
    "zoneDumbTag": "ZONE LENTE ✗",
    "zoneDumbDesc": "Basse qualité (risque d'hallucination/perte)",
    "scopeContextWindow": "FENÊTRE DE CONTEXTE",
    "scopeSubagent": "SOUS-AGENT",
    "scopeMainConversation": "Conversation Principale",
    "compactionBadgeTitle": "Antigravity a automatiquement compacté l'historique {count}x pour maintenir l'attention du modèle. Contexte actif : {tokens}.",
    "operationalUsage": "Utilisation Opérationnelle :",
    "rawCapacity": "Capacité Brute :",
    "cleanContext": "Contexte propre",
    "contextDistribution": "Distribution du Contexte",
    "cacheBadge": "⚡ Cache : {pct}%",
    "cacheTooltip": "{tokens} tokens en cache rapide",
    "estCost": "💰 Coût Est. :",
    "savings": "Économie :",
    "savingsTooltip": "Économie réelle grâce au cache : {usd}",
    "tagSystem": "🧠 Système : {val}",
    "tagFiles": "📄 Fichiers : {val}",
    "tagCmds": "💻 Sorties : {val}",
    "readyForTasks": "Prêt pour les tâches.",
    "balancedConsumption": "Consommation équilibrée",
    "subagentsIsolated": "Sous-agents (Isolés)",
    "subagentsHint": "Contextes indépendants (ne s'ajoutent pas au principal) :",
    "btnInspect": "🔍 Inspecter le Contexte Complet",
    "modalTitle": "Inspecteur de Fenêtre de Contexte",
    "modalSubagentTag": "🤖 SOUS-AGENT",
    "modalCompactedTag": "COMPACTÉ ({count}x)",
    "modalCompactedTooltip": "Antigravity a effectué {count} compactage(s) automatique(s) de l'historique dans cette session pour maintenir l'attention du modèle.",
    "scopeLabel": "Portée :",
    "optMainConversation": "🌐 Conversation Principale (~{tokens})",
    "activeConsumption": "Consommation Active",
    "ofSmartLimit": "{pct}% de la limite intelligente",
    "fastCache": "Cache Rapide",
    "inFastCache": "{pct}% en cache rapide",
    "estCostApi": "Coût Estimé (API)",
    "cacheSavingsDesc": "Économie de {discount}% via Cache (-{usd})",
    "cacheSavingsTooltip": "Économie réelle calculée : {usd}",
    "filesInContext": "Fichiers en Contexte",
    "filesCountUnit": "{count} fich",
    "estTokens": "~{tokens} tokens",
    "commandOutputs": "Sorties de Commandes",
    "cmdsCountUnit": "{count} cmds",
    "loadDistribution": "Distribution Visuelle de la Charge",
    "rawRatioText": "{tokens} / 1.0M ({pct}% capacité physique)",
    "legendSystem": "Système & Règles",
    "legendFiles": "Fichiers Injectés",
    "legendCmds": "Commandes Terminal",
    "legendDialogue": "Historique de Dialogue",
    "tabOverview": "Vue d'ensemble",
    "tabCosts": "💳 Coûts & Crédits",
    "tabFiles": "Fichiers ({count})",
    "tabCommands": "Commandes ({count})",
    "tabSubagents": "Sous-agents ({count})",
    "tabTips": "Bonnes Pratiques",
    "emptyTitle": "Nouvelle conversation — Contexte propre",
    "emptyDesc": "Aucun message ou outil exécuté dans cette session pour l'instant. La consommation du contexte débutera dès l'envoi du premier message.",
    "subagentBannerTitle": "Contexte Isolé de Sous-agent",
    "subagentBannerDesc": "Ce sous-agent opère dans son propre processus indépendant. Les lectures et commandes ci-dessous lui appartiennent exclusivement et <strong>ne pèsent pas sur la fenêtre de contexte de la Conversation Principale</strong>.",
    "backToMainBtn": "⬅ Conversation Principale",
    "compactionBannerTitle": "Historique compacté par Antigravity ({count}x)",
    "compactionNormal": "Normal",
    "compactionBannerDesc": "En atteignant le seuil opérationnel (~250k–270k tokens), Antigravity résume la conversation précédente dans un point de contrôle pour préserver l'attention et éviter les hallucinations. <strong>La valeur affichée ({tokens}) représente le contexte actif après compactage.</strong>",
    "categoryBreakdownTitle": "Détail par Catégorie de Charge",
    "totalActiveTokens": "Total Actif : {tokens} tokens",
    "cardSystemTitle": "🧠 Système & Règles (~{tokens})",
    "cardSystemDesc": "Prompt de base, directives d'espace de travail (AGENTS.md, règles) et définitions MCP.",
    "cardFilesTitle": "📄 Fichiers en Contexte (~{tokens})",
    "cardFilesDesc": "{count} fichiers lus directement au cours de la session via view_file.",
    "cardCmdsTitle": "💻 Sorties de Commandes (~{tokens})",
    "cardCmdsDesc": "{count} commandes bash exécutées et leurs sorties conservées dans l'historique.",
    "cardDialogueTitle": "💬 Dialogue & Raisonnement (~{tokens})",
    "cardDialogueDesc": "Invites utilisateur, réponses du modèle et chaînes de pensée.",
    "topConsumersTitle": "Principaux Consommateurs de Contexte",
    "viewAllBtn": "Voir tous ({count})",
    "noFilesYet": "Aucun fichier lu pour l'instant.",
    "pricingCalloutTitle": "Forfait Google AI Pro (Quota d'abonnement sans frais par token)",
    "pricingCalloutDesc": "Cette estimation reflète les tarifs de marché via <strong>{provider}</strong> pour le modèle <strong>{model}</strong>. Si vous utilisez Gemini Pro / Antigravity avec quota inclus, votre coût marginal direct est de $0.00 dans la limite de votre quota.",
    "cachingEfficiencyTitle": "⚡ Efficacité du Gemini Context Caching",
    "inFastCacheTag": "{pct}% en Cache Rapide",
    "currentCostCached": "Coût actuel avec cache",
    "withoutCache": "Sans cache (Plein tarif)",
    "realSavings": "Économie réelle obtenue",
    "offDiscount": "(-{discount}% de réd.)",
    "refPricingTitle": "Tarifs de référence ({model})",
    "colCategory": "CATÉGORIE DE TOKEN",
    "colQuantity": "QUANTITÉ",
    "colRate": "TARIF / 1M",
    "colEstTotal": "TOTAL ESTIMÉ",
    "rowCached": "⚡ Entrée en cache (Lecture cache)",
    "rowUncached": "📥 Entrée non cachée (Tokens de prompt)",
    "rowOutput": "📤 Sortie / Génération (Tokens de sortie)",
    "projectionsTitle": "Projection des coûts par fenêtre d'opération",
    "smartZoneTitle": "Zone Intelligente (250k tokens)",
    "smartZoneDesc": "Précision maximale de raisonnement, zéro hallucination et temps de réponse ultra-rapides.",
    "dumbZoneTitle": "Zone Lente / Limite Physique (1.0M tokens)",
    "dumbZoneDesc": "Augmentation de la latence et dégradation progressive de l'attention. Nouveau chat fortement recommandé.",
    "noFilesSession": "Aucun fichier n'a été lu dans le contexte pour l'instant au cours de cette session.",
    "colFileName": "FICHIER",
    "colFileSize": "TAILLE",
    "colFileTokens": "TOKENS EST.",
    "colFileReads": "LECTURES",
    "noCommandsSession": "Aucune commande n'a été exécutée dans cette session.",
    "colCommand": "COMMANDE",
    "colOutput": "SORTIE",
    "noSubagentsSession": "Aucun sous-agent n'a été créé depuis cette session.",
    "subagentsGuaranteeTitle": "Garantie d'Isolation de Contexte",
    "subagentsGuaranteeDesc": "Chaque sous-agent opère avec sa propre fenêtre de contexte. La consommation de tokens ci-dessous est exclusive et <strong>N'EST PAS ajoutée à la Conversation Principale</strong>.",
    "subagentsClickHint": "Cliquez sur un sous-agent ci-dessous pour inspecter ses fichiers lus, commandes et métriques :",
    "currentlySelected": "Actuellement Sélectionné",
    "subagentCardDetails": "Tokens : <strong style=\"color: {color};\">{tokens}</strong> ({pct}% de Zone Intelligente) • {files} fichiers • {cmds} commandes",
    "btnInspectArrow": "Inspecter ↗",
    "tip1Title": "🎯 Pourquoi rester dans la Zone Intelligente (< 250k tokens) ?",
    "tip1Desc": "Bien que les modèles 1M+ gèrent d'immenses contextes, la rétention des détails et la précision du raisonnement sont nettement supérieures sous 250k tokens. Au-delà, une dégradation attentionnelle peut survenir. À environ 250k, Antigravity exécute un compactage automatique.",
    "tip2Title": "✂️ Comment garder un contexte léger",
    "tip2Item1": "Préférez lire des portions spécifiques de fichiers avec StartLine et EndLine plutôt que des fichiers entiers de milliers de lignes.",
    "tip2Item2": "Évitez les commandes terminal générant d'immenses sorties inutiles (utilisez grep, head, tail).",
    "tip2Item3": "Déléguez les tâches lourdes à des <strong>Sous-agents</strong> — ils s'exécutent en contexte isolé sans surcharger la conversation principale.",
    "tip2Item4": "Lorsque vous terminez un objectif ou changez de sujet, démarrez une <strong>Nouvelle Conversation</strong> avec un contexte 100% neuf.",
    "sponsorBtn": "💖 Sponsoriser",
    "sponsorTooltip": "Soutenez les outils open-source de Vitalf sur GitHub Sponsors",
    "languageLabel": "Langue :",
    "tabSystem": "🧠 Règles & Système ({count})",
    "btnInspectSystem": "Inspecter Règles & Système ↗",
    "systemBannerTitle": "Architecture du System Prompt & Règles",
    "systemBannerDesc": "La catégorie System (~{tokens} tokens) est préchargée à chaque tour par Antigravity. Elle comprend les règles d'espace de travail actives, les directives globales, les catalogues de skills, les schémas d'outils natifs et les instructions de plateforme.",
    "sectionRulesTitle": "Règles Actives d'Espace de Travail & Globales",
    "sectionSkillsTitle": "Catalogue de Skills (Divulgation Progressive)",
    "sectionNativeTitle": "Outils Natifs du Harness & Sections Système",
    "sectionMcpsTitle": "Serveurs MCP & Outils Connectés",
    "colRuleName": "FICHIER DE RÈGLE",
    "colRuleScope": "PORTÉE",
    "colRuleTokens": "TOKENS EST.",
    "colRuleStatus": "TYPE / STATUT",
    "ruleAlwaysOn": "Toujours Active (Injectée)",
    "ruleConditional": "Conditionnelle (À la Demande)",
    "noRulesFound": "Aucun fichier de règle explicite trouvé pour cet espace de travail.",
    "previewBtn": "Aperçu",
    "scopeWorkspace": "Espace de Travail",
    "scopeGlobal": "Global",
    "scopeBuiltin": "Intégré",
    "skillsSummaryText": "{count} skills enregistrées ({wsCount} d'espace de travail, {globCount} globales/plugins, {builtCount} intégrées). Leurs descriptions complètes sont injectées dans le system prompt pour la divulgation progressive.",
    "nativeSummaryText": "{toolsCount} outils natifs déclarés ({toolsList}) et {sectionsCount} sections de gouvernance du prompt actives.",
    "mcpsSummaryText": "{count} serveur(s) MCP fournissant {toolsCount} outils externes au manifeste du system prompt."
  },
  "de": {
    "zoneSmartTag": "SMART-ZONE ✓",
    "zoneSmartDesc": "Hohe Qualität (präzise Antworten)",
    "zoneWarnTag": "ACHTUNG ! Leistungsabfall",
    "zoneWarnDesc": "Achtung! Spürbare Kontextdegradation",
    "zoneDumbTag": "DUMB-ZONE ✗",
    "zoneDumbDesc": "Niedrige Qualität (Halluzinationsrisiko)",
    "scopeContextWindow": "KONTEXTFENSTER",
    "scopeSubagent": "SUBAGENT",
    "scopeMainConversation": "Hauptunterhaltung",
    "compactionBadgeTitle": "Antigravity hat den Verlauf {count}x automatisch komprimiert, um die Modellaufmerksamkeit hochzuhalten. Aktiver Kontext: {tokens}.",
    "operationalUsage": "Operative Auslastung:",
    "rawCapacity": "Rohe Kapazität:",
    "cleanContext": "Sauberer Kontext",
    "contextDistribution": "Kontextverteilung",
    "cacheBadge": "⚡ Cache: {pct}%",
    "cacheTooltip": "{tokens} Tokens im Schnell-Cache",
    "estCost": "💰 Gesch. Kosten:",
    "savings": "Ersparnis:",
    "savingsTooltip": "Tatsächliche Ersparnis durch Cache: {usd}",
    "tagSystem": "🧠 System: {val}",
    "tagFiles": "📄 Dateien: {val}",
    "tagCmds": "💻 Ausgaben: {val}",
    "readyForTasks": "Bereit für Aufgaben.",
    "balancedConsumption": "Ausgewogener Verbrauch",
    "subagentsIsolated": "Subagenten (Isoliert)",
    "subagentsHint": "Unabhängige Kontexte (zählen nicht zum Hauptkontext):",
    "btnInspect": "🔍 Vollständigen Kontext prüfen",
    "modalTitle": "Kontextfenster-Inspektor",
    "modalSubagentTag": "🤖 SUBAGENT",
    "modalCompactedTag": "KOMPRIMIERT ({count}x)",
    "modalCompactedTooltip": "Antigravity hat in dieser Sitzung {count} automatische Verlaufs-Komprimierung(en) durchgeführt, um die Modellaufmerksamkeit zu wahren.",
    "scopeLabel": "Geltungsbereich:",
    "optMainConversation": "🌐 Hauptunterhaltung (~{tokens})",
    "activeConsumption": "Aktiver Verbrauch",
    "ofSmartLimit": "{pct}% des Smart-Limits",
    "fastCache": "Schnell-Cache",
    "inFastCache": "{pct}% im Schnell-Cache",
    "estCostApi": "Geschätzte Kosten (API)",
    "cacheSavingsDesc": "{discount}% Ersparnis durch Cache (-{usd})",
    "cacheSavingsTooltip": "Berechnete reale Ersparnis: {usd}",
    "filesInContext": "Dateien im Kontext",
    "filesCountUnit": "{count} Dat.",
    "estTokens": "~{tokens} Tokens",
    "commandOutputs": "Befehlsausgaben",
    "cmdsCountUnit": "{count} Befehle",
    "loadDistribution": "Visuelle Lastverteilung",
    "rawRatioText": "{tokens} / 1.0M ({pct}% physische Kapazität)",
    "legendSystem": "System & Regeln",
    "legendFiles": "Geladene Dateien",
    "legendCmds": "Terminalbefehle",
    "legendDialogue": "Dialogverlauf",
    "tabOverview": "Übersicht",
    "tabCosts": "💳 Kosten & Guthaben",
    "tabFiles": "Dateien ({count})",
    "tabCommands": "Befehle ({count})",
    "tabSubagents": "Subagenten ({count})",
    "tabTips": "Best Practices",
    "emptyTitle": "Neue Unterhaltung — Sauberer Kontext",
    "emptyDesc": "In dieser Sitzung wurden noch keine Nachrichten oder Tools ausgeführt. Der Kontextverbrauch beginnt mit Ihrer ersten Nachricht.",
    "subagentBannerTitle": "Isolierter Subagenten-Kontext",
    "subagentBannerDesc": "Dieser Subagent arbeitet in einem eigenen, unabhängigen Prozess. Die unten aufgeführten Dateien und Befehle gehören ausschließlich zu ihm und <strong>belasten nicht das Kontextfenster der Hauptunterhaltung</strong>.",
    "backToMainBtn": "⬅ Hauptunterhaltung",
    "compactionBannerTitle": "Verlauf durch Antigravity komprimiert ({count}x)",
    "compactionNormal": "Normal",
    "compactionBannerDesc": "Beim Erreichen des operativen Limits (~250k–270k Tokens) fasst Antigravity die bisherige Unterhaltung in einem Checkpoint zusammen, um Aufmerksamkeitsverlust und Halluzinationen zu verhindern. <strong>Der angezeigte Wert ({tokens}) stellt den aktiven Kontext nach der Komprimierung dar.</strong>",
    "categoryBreakdownTitle": "Aufschlüsselung nach Lastkategorie",
    "totalActiveTokens": "Aktive Summe: {tokens} Tokens",
    "cardSystemTitle": "🧠 System & Regeln (~{tokens})",
    "cardSystemDesc": "Basis-Prompt, Workspace-Richtlinien (AGENTS.md, Regeln) und MCP-Definitionen.",
    "cardFilesTitle": "📄 Dateien im Kontext (~{tokens})",
    "cardFilesDesc": "{count} Dateien direkt in der Sitzung über view_file gelesen.",
    "cardCmdsTitle": "💻 Befehlsausgaben (~{tokens})",
    "cardCmdsDesc": "{count} Bash-Befehle ausgeführt und im Verlauf aufbewahrt.",
    "cardDialogueTitle": "💬 Dialog & Argumentation (~{tokens})",
    "cardDialogueDesc": "Benutzerprompts, Modellantworten und Gedankengänge.",
    "topConsumersTitle": "Größte Kontextverbraucher",
    "viewAllBtn": "Alle anzeigen ({count})",
    "noFilesYet": "Noch keine Dateien gelesen.",
    "pricingCalloutTitle": "Google AI Pro Plan (Abonnement-Kontingent ohne zusätzliche Token-Gebühr)",
    "pricingCalloutDesc": "Diese Schätzung spiegelt die Marktpreise via <strong>{provider}</strong> für <strong>{model}</strong> wider. Wenn Sie Gemini Pro / Antigravity mit inkludiertem Kontingent nutzen, betragen Ihre direkten Grenzkosten bis zum Kontingentlimit $0,00.",
    "cachingEfficiencyTitle": "⚡ Effizienz des Gemini-Kontext-Cachings",
    "inFastCacheTag": "{pct}% im Schnell-Cache",
    "currentCostCached": "Aktuelle Kosten mit Cache",
    "withoutCache": "Ohne Cache (Voller Tarif)",
    "realSavings": "Erzielte Netto-Ersparnis",
    "offDiscount": "(-{discount}% Rabatt)",
    "refPricingTitle": "Referenztarife ({model})",
    "colCategory": "TOKEN-KATEGORIE",
    "colQuantity": "MENGE",
    "colRate": "TARIF / 1M",
    "colEstTotal": "GESCHÄTZTES TOTAL",
    "rowCached": "⚡ Gecachter Input (Cache-Read)",
    "rowUncached": "📥 Ungecachter Input (Prompt-Tokens)",
    "rowOutput": "📤 Ausgabe / Generierung (Output-Tokens)",
    "projectionsTitle": "Kostenprojektion nach Betriebsfenster",
    "smartZoneTitle": "Smart-Zone (250k Tokens)",
    "smartZoneDesc": "Höchste Denkpräzision, keine Halluzinationen und ultraschnelle Antwortzeiten.",
    "dumbZoneTitle": "Dumb-Zone / Physisches Limit (1.0M Tokens)",
    "dumbZoneDesc": "Erhöhte Latenz und fortschreitender Aufmerksamkeitsverlust. Ein neuer Chat wird dringend empfohlen.",
    "noFilesSession": "Bisher wurden in dieser Sitzung keine Dateien in den Kontext geladen.",
    "colFileName": "DATEI",
    "colFileSize": "GRÖSSE",
    "colFileTokens": "GESCH. TOKENS",
    "colFileReads": "LESUNGEN",
    "noCommandsSession": "In dieser Sitzung wurden keine Befehle ausgeführt.",
    "colCommand": "BEFEHL",
    "colOutput": "AUSGABE",
    "noSubagentsSession": "In dieser Sitzung wurden keine Subagenten erzeugt.",
    "subagentsGuaranteeTitle": "Garantie der Kontextisolierung",
    "subagentsGuaranteeDesc": "Jeder Subagent arbeitet mit einem eigenen Kontextfenster. Der unten angezeigte Token-Verbrauch gehört exklusiv zu ihm und <strong>wird NICHT zur Hauptunterhaltung hinzugerechnet</strong>.",
    "subagentsClickHint": "Klicken Sie auf einen beliebigen Subagenten, um dessen gelesene Dateien, Befehle und Metriken zu prüfen:",
    "currentlySelected": "Derzeit Ausgewählt",
    "subagentCardDetails": "Tokens: <strong style=\"color: {color};\">{tokens}</strong> ({pct}% der Smart-Zone) • {files} Dateien • {cmds} Befehle",
    "btnInspectArrow": "Prüfen ↗",
    "tip1Title": "🎯 Warum in der Smart-Zone (< 250k Tokens) bleiben?",
    "tip1Desc": "Obwohl 1M+-Modelle riesige Kontexte unterstützen, sind Detailtreue und Argumentationspräzision unter 250k Tokens deutlich überlegen. Oberhalb dieser Schwelle droht Aufmerksamkeitsverlust („Nadel im Heuhaufen“). Bei ~250k führt Antigravity eine automatische Komprimierung durch.",
    "tip2Title": "✂️ So halten Sie den Kontext schlank",
    "tip2Item1": "Lesen Sie gezielte Codebereiche mit StartLine und EndLine, statt komplette Dateien mit tausenden Zeilen einzulesen.",
    "tip2Item2": "Vermeiden Sie Terminalbefehle mit übermäßig langen Ausgaben (nutzen Sie grep, head, tail).",
    "tip2Item3": "Delegieren Sie aufwendige Aufgaben an <strong>Subagenten</strong> – diese laufen isoliert und belasten nicht den Hauptchat.",
    "tip2Item4": "Starten Sie nach Erreichen eines Meilensteins oder bei Themenwechseln eine <strong>Neue Unterhaltung</strong> mit 100% frischem Kontext.",
    "sponsorBtn": "💖 Sponsern",
    "sponsorTooltip": "Unterstützen Sie Vitalf Open-Source-Tools auf GitHub Sponsors",
    "languageLabel": "Sprache:",
    "tabSystem": "🧠 Regeln & System ({count})",
    "btnInspectSystem": "Regeln & System prüfen ↗",
    "systemBannerTitle": "System-Prompt- & Regelarchitektur",
    "systemBannerDesc": "Die System-Kategorie (~{tokens} Tokens) wird bei jedem Turn von Antigravity vorab geladen. Sie besteht aus aktiven Workspace-Regeln, globalen Richtlinien, Skill-Katalogen, nativen Tool-Schemas und Plattform-Instruktionen.",
    "sectionRulesTitle": "Aktive Workspace- & globale Regeln",
    "sectionSkillsTitle": "Skill-Katalog (Progressive Disclosure)",
    "sectionNativeTitle": "Native Harness-Tools & System-Abschnitte",
    "sectionMcpsTitle": "Verbundene MCP-Server & Tools",
    "colRuleName": "REGELDATEI",
    "colRuleScope": "GELTUNGSBEREICH",
    "colRuleTokens": "GESCH. TOKENS",
    "colRuleStatus": "TYP / STATUS",
    "ruleAlwaysOn": "Immer Aktiv (Injiziert)",
    "ruleConditional": "Bedingt (Bei Bedarf)",
    "noRulesFound": "Keine expliziten Regeldateien für diesen Workspace gefunden.",
    "previewBtn": "Vorschau",
    "scopeWorkspace": "Workspace",
    "scopeGlobal": "Global",
    "scopeBuiltin": "Integriert",
    "skillsSummaryText": "{count} Skills registriert ({wsCount} Workspace, {globCount} global/Plugin, {builtCount} integriert). Ihre vollständigen Beschreibungen werden für Progressive Disclosure in den System-Prompt eingefügt.",
    "nativeSummaryText": "{toolsCount} native Tools deklariert ({toolsList}) und {sectionsCount} Prompt-Governance-Abschnitte aktiv.",
    "mcpsSummaryText": "{count} MCP-Server stellen {toolsCount} externe Tools für das System-Prompt-Manifest bereit."
  }
};

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
      const subName = sessionSelect && sessionSelect.value !== 'main' ? (sessionSelect.options[sessionSelect.selectedIndex]?.text?.replace(/^[🤖🌐s]+/, '') || t('scopeSubagent')) : null;
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
      const ariaMatch = aria.match(/current:\s*([A-Za-z0-9.\s]+)/i);
      if (ariaMatch && ariaMatch[1]) {
        return ariaMatch[1].replace(/\s+(Medium|Low|High)$/i, '').trim();
      }
      const text = (btn.innerText || '').trim();
      if (text && text.length < 40 && (text.includes('Gemini') || text.includes('Claude') || text.includes('Flash') || text.includes('Pro') || text.includes('GPT'))) {
        return text.replace(/\s+(Medium|Low|High)$/i, '').trim();
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


  async function callLSS(endpoint, body = {}) {
    try {
      const token = window.__APP_CONFIG__?.csrfToken;
      const res = await fetch('/exa.language_server_pb.LanguageServerService/' + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-codeium-csrf-token': token
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

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

      // Base system prompt tokens
      const systemTokensEst = firstUsage ? Math.max(5000, Number(firstUsage.inputTokens || 0) - totalUserTokens) : 19000;


      // Discover workspace directory, active rules, skills, and MCPs
      let workspaceDir = null;
      for (const s of steps) {
        if (s.metadata?.toolCall?.argumentsJson) {
          try {
            const args = JSON.parse(s.metadata.toolCall.argumentsJson);
            const p = args.Cwd || args.AbsolutePath || args.TargetFile;
            if (p && typeof p === 'string' && p.startsWith('/')) {
              const wsIdx = p.indexOf('/workspace');
              if (wsIdx !== -1) {
                workspaceDir = p.slice(0, wsIdx + '/workspace'.length);
                break;
              }
            }
          } catch (e) {}
        }
      }
      if (!workspaceDir) {
        workspaceDir = '/home/ph/projects/vitalf/code/workspace';
      }

      const step0 = steps[0];
      const promptSections = step0?.userInput?.userConfig?.plannerConfig?.declarativeMixinConfig?.promptSections?.map(s => s.builtinName) || [];
      const nativeTools = step0?.userInput?.userConfig?.plannerConfig?.declarativeMixinConfig?.tools?.map(t => t.name) || [];

      // 1. Fetch Global Rules
      const rulesList = [];
      const allRulesRes = await callLSS('GetAllRules');
      if (allRulesRes?.memories) {
        for (const m of allRulesRes.memories) {
          const content = m.textMemory?.content || '';
          const bytes = content.length;
          rulesList.push({
            name: m.memoryId || 'user_global',
            path: m.absolutePath || m.discoveredIn || '~/.gemini/GEMINI.md',
            scope: 'global',
            status: 'always_on',
            bytes: bytes,
            tokensEst: toTokens(bytes),
            contentPreview: content.slice(0, 300)
          });
        }
      }

      // 2. Fetch Workspace Rules (AGENTS.md, GEMINI.md, and .agents/rules/*.md)
      if (workspaceDir) {
        const checkFiles = ['AGENTS.md', 'GEMINI.md'];
        for (const fn of checkFiles) {
          const filePath = workspaceDir + '/' + fn;
          const rf = await callLSS('ReadFile', { uri: 'file://' + filePath });
          if (rf?.content) {
            try {
              const raw = atob(rf.content);
              rulesList.push({
                name: fn,
                path: filePath,
                scope: 'workspace',
                status: 'always_on',
                bytes: raw.length,
                tokensEst: toTokens(raw.length),
                contentPreview: raw.slice(0, 350)
              });
            } catch (e) {}
          }
        }

        const dirRes = await callLSS('ReadDir', { uri: 'file://' + workspaceDir + '/.agents/rules' });
        if (dirRes?.entries) {
          for (const entry of dirRes.entries) {
            const p = entry.uri.replace('file://', '');
            const fn = p.split('/').pop();
            const rf = await callLSS('ReadFile', { uri: entry.uri });
            if (rf?.content) {
              try {
                const raw = atob(rf.content);
                const isConditional = raw.includes('trigger: model_decision') || fn.includes('how-to-run-tests');
                rulesList.push({
                  name: fn,
                  path: p,
                  scope: 'workspace',
                  status: isConditional ? 'conditional' : 'always_on',
                  bytes: raw.length,
                  tokensEst: toTokens(raw.length),
                  contentPreview: raw.slice(0, 350)
                });
              } catch (e) {}
            }
          }
        }
      }

      // 3. Fetch Skills & Plugins
      const custRes = await callLSS('GetCustomizationStates');
      const skillsList = [];
      if (custRes?.states) {
        for (const st of custRes.states) {
          if (st.type === 'REFRESH_CUSTOMIZATION_TYPE_SKILL' && st.status === 'STATUS_ENABLED') {
            skillsList.push({
              name: st.name,
              path: st.path,
              scope: st.scope === 'SCOPE_WORKSPACE' ? 'workspace' : (st.scope === 'SCOPE_BUILTIN' ? 'builtin' : 'global'),
              pluginName: st.pluginName
            });
          }
        }
      }

      // 4. Fetch MCP Servers
      const mcpRes = await callLSS('GetMcpServerStates');
      const mcpsList = [];
      if (mcpRes?.states) {
        for (const [k, v] of Object.entries(mcpRes.states)) {
          mcpsList.push({
            name: k,
            toolsCount: v.tools?.length || 0,
            status: v.status || 'CONNECTED'
          });
        }
      }

      const totalRulesTokens = rulesList.filter(r => r.status === 'always_on').reduce((acc, r) => acc + r.tokensEst, 0);

      const systemDetails = {
        workspaceDir,
        rules: rulesList,
        rulesCount: rulesList.length,
        rulesTokensTotal: totalRulesTokens,
        skills: skillsList,
        skillsCount: skillsList.length,
        mcps: mcpsList,
        mcpsCount: mcpsList.length,
        mcpsToolsCount: mcpsList.reduce((acc, m) => acc + m.toolsCount, 0),
        promptSections,
        nativeTools
      };

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
        latestUsage,
        systemDetails
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
  widget.innerHTML = `
    <div id="agy-badge" style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; position: relative;">
      <svg viewBox="0 0 32 32" style="width: 17px; height: 17px; transform: rotate(-90deg); display: block;">
        <circle cx="16" cy="16" r="13" fill="transparent" stroke="color-mix(in srgb, var(--foreground, #fff) 12%, transparent)" stroke-width="3.2" />
        <circle id="agy-zone-ring" cx="16" cy="16" r="13" fill="transparent" stroke="#22c55e" stroke-width="3.8" stroke-linecap="round" stroke-dasharray="${CIRCLE_C}" stroke-dashoffset="${CIRCLE_C}" style="transition: stroke-dashoffset 0.35s ease, stroke 0.3s ease;" />
      </svg>
    </div>
  `;

  // 2. CREATE BREADCRUMB WIDGET (TOP / HEADER)
  const breadcrumbWidget = document.createElement('div');
  breadcrumbWidget.id = BREADCRUMB_WIDGET_ID;
  breadcrumbWidget.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; height: 22px; width: 22px; border-radius: 6px; cursor: pointer; user-select: none; position: relative; margin-left: 6px; vertical-align: middle; transition: background-color 0.15s ease; flex-shrink: 0;';
  breadcrumbWidget.innerHTML = `
    <div id="agy-breadcrumb-badge" style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; position: relative;">
      <svg viewBox="0 0 32 32" style="width: 15px; height: 15px; transform: rotate(-90deg); display: block;">
        <circle cx="16" cy="16" r="13" fill="transparent" stroke="color-mix(in srgb, var(--foreground, #fff) 12%, transparent)" stroke-width="3.2" />
        <circle id="agy-breadcrumb-ring" cx="16" cy="16" r="13" fill="transparent" stroke="#22c55e" stroke-width="3.8" stroke-linecap="round" stroke-dasharray="${CIRCLE_C}" stroke-dashoffset="${CIRCLE_C}" style="transition: stroke-dashoffset 0.35s ease, stroke 0.3s ease;" />
      </svg>
    </div>
  `;

  // 3. SINGLETON POPOVER PORTALED DIRECTLY TO BODY
  const popover = document.createElement('div');
  popover.id = POPOVER_ID;
  popover.style.cssText = 'display: none; position: fixed; width: 310px; background: var(--card, #1c1c1f); color: var(--foreground, #f2f2f2); border: 1px solid var(--border, rgba(255, 255, 255, 0.12)); border-radius: 10px; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6), 0 3px 10px rgba(0, 0, 0, 0.4); padding: 12px; z-index: 99999999; font-family: var(--font-sans, system-ui, -apple-system, sans-serif); pointer-events: auto; box-sizing: border-box; font-size: 11.5px; line-height: 1.4;';

  popover.innerHTML = `
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
  `;

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
        topConsumers.innerHTML = topItems.slice(0, 2).map(it => `
          <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.85;">${it}</div>
        `).join('');
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
        listEl.innerHTML = latestSubagentsList.map(s => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 2px 0;">
            <span style="opacity: 0.9; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">• ${s.name}</span>
            <span style="color: ${s.zone.color}; font-weight: 600; font-variant-numeric: tabular-nums;">${formatTokens(s.totalTokens)} (${s.pct}%)</span>
          </div>
        `).join('');
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

  modal.innerHTML = `
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
        <button id="agy-tab-btn-system" type="button" class="agy-tab-btn" data-tab="system" style="background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--muted-foreground, #999); font-size: 11.5px; font-weight: 600; padding: 8px 2px; cursor: pointer;">🧠 Rules & System (<span id="agy-tab-count-rules">0</span>)</button>
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
  `;

  // Dynamic global styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes agyFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    .agy-tab-btn:hover { color: var(--foreground, #fff) !important; }
    .agy-table-row:hover { background: rgba(255, 255, 255, 0.04) !important; }
    .agy-subagent-badge:hover { filter: brightness(1.25) !important; }
    #agy-modal-sponsor:hover, #agy-btn-popover-sponsor:hover { background: rgba(244, 63, 94, 0.28) !important; }
  `;
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
    if (el('agy-tab-btn-system')) el('agy-tab-btn-system').innerHTML = t('tabSystem', { count: currentContextData?.systemDetails?.rules?.length || 0 });
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
        const sName = sub?.name || sessionSelect.options[sessionSelect.selectedIndex]?.text?.replace(/^[🤖🌐\s]+/, '') || t('scopeSubagent');
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
    const tabSystemBtn = document.getElementById('agy-tab-btn-system');

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
      if (tabSystemBtn) tabSystemBtn.innerHTML = t('tabSystem', { count: 0 });

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

    const breakdown = data.breakdown || { system: 0, files: 0, commands: 0, dialogue: 0 };
    if (mFiles) mFiles.innerText = t('filesCountUnit', { count: data.filesCount || 0 });
    if (mFilesTokens) mFilesTokens.innerText = t('estTokens', { tokens: formatTokens(breakdown.files) });

    if (mCmds) mCmds.innerText = t('cmdsCountUnit', { count: data.commandsCount || 0 });
    if (mCmdsTokens) mCmdsTokens.innerText = t('estTokens', { tokens: formatTokens(breakdown.commands) });

    if (mRawRatio) mRawRatio.innerText = t('rawRatioText', { tokens: formatTokens(totalTokens), pct: rawPct });

    // Load category segment bar normalization
    const rawSum = (breakdown.system || 0) + (breakdown.files || 0) + (breakdown.commands || 0) + (breakdown.dialogue || 0);
    const normBase = Math.max(totalTokens, rawSum, 1);
    const bSysPct = Math.round(((breakdown.system || 0) / normBase) * 100);
    const bFilesPct = Math.round(((breakdown.files || 0) / normBase) * 100);
    const bCmdsPct = Math.round(((breakdown.commands || 0) / normBase) * 100);
    const bDiagPct = Math.max(0, 100 - (bSysPct + bFilesPct + bCmdsPct));

    if (bSys) bSys.style.width = bSysPct + '%';
    if (bFiles) bFiles.style.width = bFilesPct + '%';
    if (bCmds) bCmds.style.width = bCmdsPct + '%';
    if (bDiag) bDiag.style.width = bDiagPct + '%';

    if (tabFilesBtn) tabFilesBtn.innerHTML = t('tabFiles', { count: data.filesCount });
    if (tabCmdsBtn) tabCmdsBtn.innerHTML = t('tabCommands', { count: data.commandsCount });
    if (tabSystemBtn) tabSystemBtn.innerHTML = t('tabSystem', { count: data.systemDetails?.rules?.length || 0 });

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
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--muted-foreground, #888);">
          <div style="font-size: 28px; margin-bottom: 8px;">✨</div>
          <div style="font-weight: 600; font-size: 13px; color: var(--foreground, #eee); margin-bottom: 4px;">${t('emptyTitle')}</div>
          <div style="font-size: 11px;">${t('emptyDesc')}</div>
        </div>
      `;
      return;
    }

    const isSubagent = isScopeSubagent(data, activeModalScope);

    if (tab === 'overview') {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          ${isSubagent ? `
            <div style="padding: 10px 12px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 8px; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
              <div style="display: flex; align-items: flex-start; gap: 8px;">
                <span style="font-size: 16px;">🤖</span>
                <div>
                  <div style="font-weight: 600; color: #c084fc; font-size: 11.5px;">${t('subagentBannerTitle')}</div>
                  <div style="font-size: 10.5px; color: var(--muted-foreground, #aaa); margin-top: 2px; line-height: 1.4;">
                    ${t('subagentBannerDesc')}
                  </div>
                </div>
              </div>
              <button id="agy-btn-back-main" type="button" style="background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); color: #c084fc; border-radius: 6px; padding: 4px 8px; font-size: 10px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.15s ease;">
                ${t('backToMainBtn')}
              </button>
            </div>
          ` : ''}

          ${data.compactionCount > 0 ? `
            <div style="padding: 10px 12px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 16px;">🔄</span>
              <div>
                <div style="font-weight: 600; color: #60a5fa; font-size: 11.5px; display: flex; align-items: center; gap: 6px;">
                  <span>${t('compactionBannerTitle', { count: data.compactionCount })}</span>
                  <span style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px; background: rgba(59, 130, 246, 0.2); color: #93c5fd;">${t('compactionNormal')}</span>
                </div>
                <div style="font-size: 10.5px; color: var(--muted-foreground, #aaa); margin-top: 2px; line-height: 1.4;">
                  ${t('compactionBannerDesc', { tokens: formatTokens(data.totalTokens) })}
                </div>
              </div>
            </div>
          ` : ''}

          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 12px; display: flex; justify-content: space-between;">
              <span>${t('categoryBreakdownTitle')}</span>
              <span style="color: var(--muted-foreground, #999); font-weight: 400;">${t('totalActiveTokens', { tokens: formatTokens(data.totalTokens) })}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div style="padding: 8px; background: rgba(168, 85, 247, 0.08); border-radius: 6px; border-left: 3px solid #a855f7; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-weight: 600; color: #c084fc;">${t('cardSystemTitle', { tokens: formatTokens(data.breakdown?.system || 0) })}</div>
                  <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">${t('cardSystemDesc')}</div>
                </div>
                <button id="agy-link-all-system" type="button" style="align-self: flex-start; margin-top: 6px; background: none; border: none; color: #c084fc; font-size: 10px; cursor: pointer; text-decoration: underline; padding: 0;">${t('btnInspectSystem')}</button>
              </div>
              <div style="padding: 8px; background: rgba(59, 130, 246, 0.08); border-radius: 6px; border-left: 3px solid #3b82f6;">
                <div style="font-weight: 600; color: #60a5fa;">${t('cardFilesTitle', { tokens: formatTokens(data.breakdown?.files || 0) })}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">${t('cardFilesDesc', { count: data.filesCount || 0 })}</div>
              </div>
              <div style="padding: 8px; background: rgba(249, 115, 22, 0.08); border-radius: 6px; border-left: 3px solid #f97316;">
                <div style="font-weight: 600; color: #fb923c;">${t('cardCmdsTitle', { tokens: formatTokens(data.breakdown?.commands || 0) })}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">${t('cardCmdsDesc', { count: data.commandsCount || 0 })}</div>
              </div>
              <div style="padding: 8px; background: rgba(16, 185, 129, 0.08); border-radius: 6px; border-left: 3px solid #10b981;">
                <div style="font-weight: 600; color: #34d399;">${t('cardDialogueTitle', { tokens: formatTokens(data.breakdown?.dialogue || 0) })}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-top: 2px;">${t('cardDialogueDesc')}</div>
              </div>
            </div>
          </div>

          <!-- Top 5 Files -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px; display: flex; justify-content: space-between;">
              <span>${t('topConsumersTitle')}</span>
              <button id="agy-link-all-files" type="button" style="background: none; border: none; color: #38bdf8; font-size: 10.5px; cursor: pointer; text-decoration: underline;">${t('viewAllBtn', { count: data.filesCount || 0 })}</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${(data.files || []).slice(0, 5).map((f, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; background: rgba(255,255,255,0.02); border-radius: 4px; font-size: 11px;">
                  <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                    <span style="opacity: 0.6; font-size: 10px;">#${idx + 1}</span>
                    <span style="font-weight: 500; color: var(--foreground, #fff); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.path}">${f.name}</span>
                    <span style="font-size: 9.5px; opacity: 0.6;">(${formatBytes(f.bytes)})</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <span style="color: #60a5fa; font-weight: 600; font-variant-numeric: tabular-nums;">~${formatTokens(f.tokensEst)} tokens</span>
                    <span style="font-size: 9px; opacity: 0.6; background: rgba(255,255,255,0.06); padding: 1px 4px; border-radius: 3px;">${f.count}x</span>
                  </div>
                </div>
              `).join('')}
              ${(!data.files || data.files.length === 0) ? '<div style="color: var(--muted-foreground, #888); font-size: 11px; text-align: center; padding: 10px;">' + t('noFilesYet') + '</div>' : ''}
            </div>
          </div>

        </div>
      `;

      container.querySelector('#agy-btn-back-main')?.addEventListener('click', () => {
        const select = modal.querySelector('#agy-session-select');
        if (select) select.value = 'main';
        renderModalWithData(currentContextData, t('scopeMainConversation'));
      });

      container.querySelector('#agy-link-all-system')?.addEventListener('click', () => {
        const btn = document.querySelector('.agy-tab-btn[data-tab="system"]');
        if (btn) btn.click();
      });

      container.querySelector('#agy-link-all-files')?.addEventListener('click', () => {
        const btn = document.querySelector('.agy-tab-btn[data-tab="files"]');
        if (btn) btn.click();
      });

    } else if (tab === 'system') {
      const sys = data.systemDetails || { rules: [], skills: [], mcps: [], promptSections: [], nativeTools: [] };
      const rules = sys.rules || [];
      const skills = sys.skills || [];
      const mcps = sys.mcps || [];
      const nativeTools = sys.nativeTools || [];
      const promptSections = sys.promptSections || [];
      const wsSkillsCount = skills.filter(s => s.scope === 'workspace').length;
      const globSkillsCount = skills.filter(s => s.scope === 'global').length;
      const builtSkillsCount = skills.filter(s => s.scope === 'builtin').length;

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">

          <!-- System Architecture Banner -->
          <div style="padding: 10px 14px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 18px;">🧠</span>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #c084fc; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span>${t('systemBannerTitle')}</span>
                <span style="font-size: 11px; padding: 2px 7px; border-radius: 4px; background: rgba(168, 85, 247, 0.2); color: #d8b4fe;">~${formatTokens(data.breakdown.system)} tokens</span>
              </div>
              <div style="font-size: 10.5px; color: var(--muted-foreground, #ccc); margin-top: 3px; line-height: 1.45;">
                ${t('systemBannerDesc', { tokens: formatTokens(data.breakdown.system) })}
              </div>
            </div>
          </div>

          <!-- Section 1: Active Rules & Context Files -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span>${t('sectionRulesTitle')}</span>
              <span style="font-size: 10px; color: #c084fc; font-weight: 600;">~${formatTokens(sys.rulesTokensTotal || 0)} tokens (${rules.length} files)</span>
            </div>
            ${rules.length === 0 ? `<div style="text-align: center; padding: 14px; color: var(--muted-foreground, #888); font-size: 11px;">${t('noRulesFound')}</div>` : `
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: grid; grid-template-columns: 2fr 110px 100px 140px; padding: 4px 8px; font-weight: 600; font-size: 10px; color: var(--muted-foreground, #888); border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));">
                  <span>${t('colRuleName')}</span>
                  <span>${t('colRuleScope')}</span>
                  <span style="text-align: right;">${t('colRuleTokens')}</span>
                  <span style="text-align: right;">${t('colRuleStatus')}</span>
                </div>
                ${rules.map((r) => `
                  <div class="agy-table-row" style="display: flex; flex-direction: column; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; padding: 7px 8px; font-size: 11px; transition: background 0.15s;">
                    <div style="display: grid; grid-template-columns: 2fr 110px 100px 140px; align-items: center;">
                      <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.path}">
                        <span style="font-weight: 600; color: #fff;">${r.name}</span>
                        <span style="font-size: 9.5px; opacity: 0.6; margin-left: 6px;">(${formatBytes(r.bytes)})</span>
                      </div>
                      <div>
                        <span style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px; background: ${r.scope === 'global' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(59, 130, 246, 0.15)'}; color: ${r.scope === 'global' ? '#fde047' : '#93c5fd'};">
                          ${r.scope === 'global' ? t('scopeGlobal') : t('scopeWorkspace')}
                        </span>
                      </div>
                      <span style="text-align: right; font-weight: 600; color: #c084fc; font-variant-numeric: tabular-nums;">~${formatTokens(r.tokensEst)}</span>
                      <div style="text-align: right;">
                        <span style="font-size: 9.5px; padding: 1px 6px; border-radius: 3px; background: ${r.status === 'always_on' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)'}; color: ${r.status === 'always_on' ? '#4ade80' : '#cbd5e1'}; font-weight: 500;">
                          ${r.status === 'always_on' ? t('ruleAlwaysOn') : t('ruleConditional')}
                        </span>
                      </div>
                    </div>
                    ${r.contentPreview ? `
                      <details style="margin-top: 5px; font-size: 10px;">
                        <summary style="cursor: pointer; color: #38bdf8; opacity: 0.85; user-select: none;">${t('previewBtn')}</summary>
                        <pre style="margin: 4px 0 0 0; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow-x: auto; white-space: pre-wrap; font-family: monospace; color: #bbb; max-height: 85px;">${r.contentPreview}...</pre>
                      </details>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Section 2: Skills Catalog -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span>${t('sectionSkillsTitle')}</span>
              <span style="font-size: 10px; color: #38bdf8; font-weight: 600;">${skills.length} skills (~${formatTokens(skills.length * 120)} tokens)</span>
            </div>
            <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-bottom: 8px; line-height: 1.4;">
              ${t('skillsSummaryText', { count: skills.length, wsCount: wsSkillsCount, globCount: globSkillsCount, builtCount: builtSkillsCount })}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
              ${skills.map(s => `
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); color: #7dd3fc;" title="${s.path}">
                  ${s.name} <span style="opacity: 0.6; font-size: 8.5px;">(${s.scope === 'builtin' ? t('scopeBuiltin') : (s.scope === 'workspace' ? t('scopeWorkspace') : t('scopeGlobal'))})</span>
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Section 3: Harness Native Tools & Governance Sections -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span>${t('sectionNativeTitle')}</span>
              <span style="font-size: 10px; color: #34d399; font-weight: 600;">~5.5k tokens</span>
            </div>
            <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-bottom: 8px; line-height: 1.4;">
              ${t('nativeSummaryText', { toolsCount: nativeTools.length, toolsList: nativeTools.slice(0, 4).join(', ') + '...', sectionsCount: promptSections.length })}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
              ${promptSections.map(sec => `
                <span style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); color: #6ee7b7;">
                  &lt;${sec}&gt;
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Section 4: MCP Servers -->
          ${mcps.length > 0 ? `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
              <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span>${t('sectionMcpsTitle')}</span>
                <span style="font-size: 10px; color: #f59e0b; font-weight: 600;">${mcps.length} servers (${sys.mcpsToolsCount} tools)</span>
              </div>
              <div style="font-size: 10px; color: var(--muted-foreground, #aaa); margin-bottom: 8px;">
                ${t('mcpsSummaryText', { count: mcps.length, toolsCount: sys.mcpsToolsCount })}
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${mcps.map(m => `
                  <div style="padding: 4px 8px; border-radius: 4px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); font-size: 10.5px; display: flex; align-items: center; gap: 6px;">
                    <span style="font-weight: 600; color: #fbbf24;">🔌 ${m.name}</span>
                    <span style="font-size: 9px; opacity: 0.7; color: #fef3c7;">${m.toolsCount} tools</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      `;

    } else if (tab === 'costs') {
      const pricing = data.pricing || getModelPricing(data.latestUsage?.model, data.totalTokens);
      const costs = data.costs || calculateCosts(data.inputTokens, data.cachedTokens, data.outputTokens, pricing);
      const projections = calculateProjections(data.cachePct / 100, data.outputTokens, pricing);

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Model and Plan Callout -->
          <div style="padding: 10px 12px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 16px;">ℹ️</span>
            <div>
              <div style="font-weight: 600; color: #38bdf8; font-size: 11.5px;">${t('pricingCalloutTitle')}</div>
              <div style="font-size: 10.5px; color: var(--muted-foreground, #aaa); margin-top: 2px; line-height: 1.4;">
                ${t('pricingCalloutDesc', { provider: pricing.provider, model: pricing.displayName })}
              </div>
            </div>
          </div>

          <!-- Context Cache Savings Card -->
          <div style="background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 8px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <span style="font-weight: 600; color: #22c55e; font-size: 12px;">${t('cachingEfficiencyTitle')}</span>
              <span style="font-size: 11px; color: #22c55e; font-weight: 700;">${t('inFastCacheTag', { pct: data.cachePct })}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 8px;">
              <div style="padding: 8px; background: rgba(0,0,0,0.25); border-radius: 6px;">
                <div style="font-size: 10px; color: var(--muted-foreground, #999);">${t('currentCostCached')}</div>
                <div style="font-size: 15px; font-weight: 700; color: #22c55e; margin-top: 2px;">${formatUSD(costs.totalCost)}</div>
                ${currentLocale === 'pt' ? `<div style="font-size: 9.5px; color: var(--muted-foreground, #888);">${formatBRL(costs.totalCost)}</div>` : ''}
              </div>
              <div style="padding: 8px; background: rgba(0,0,0,0.25); border-radius: 6px;">
                <div style="font-size: 10px; color: var(--muted-foreground, #999);">${t('withoutCache')}</div>
                <div style="font-size: 15px; font-weight: 700; color: var(--muted-foreground, #aaa); margin-top: 2px;">${formatUSD(costs.costWithoutCache)}</div>
                ${currentLocale === 'pt' ? `<div style="font-size: 9.5px; color: var(--muted-foreground, #888);">${formatBRL(costs.costWithoutCache)}</div>` : ''}
              </div>
              <div style="padding: 8px; background: rgba(34, 197, 94, 0.12); border-radius: 6px; border: 1px solid rgba(34, 197, 94, 0.3);">
                <div style="font-size: 10px; color: #22c55e; font-weight: 600;">${t('realSavings')}</div>
                <div style="font-size: 15px; font-weight: 700; color: #22c55e; margin-top: 2px;">-${formatUSD(costs.savedCost)}</div>
                <div style="font-size: 9.5px; color: #22c55e;">${currentLocale === 'pt' ? `-${formatBRL(costs.savedCost)} ` : ''}${t('offDiscount', { discount: pricing.cacheDiscountPct })}</div>
              </div>
            </div>
          </div>

          <!-- Pricing Table and Zone Projections -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 12px;">${t('refPricingTitle', { model: pricing.displayName })}</div>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; font-size: 10.5px; padding: 4px 6px; color: var(--muted-foreground, #888); border-bottom: 1px solid var(--border, rgba(255,255,255,0.08)); font-weight: 600;">
              <span>${t('colCategory')}</span>
              <span style="text-align: right;">${t('colQuantity')}</span>
              <span style="text-align: right;">${t('colRate')}</span>
              <span style="text-align: right;">${t('colEstTotal')}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px; font-size: 11px;">
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 3px 6px; align-items: center;">
                <span>${t('rowCached')}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums;">${formatTokens(data.cachedTokens)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums; color: #38bdf8;">$${pricing.cachePricePerM.toFixed(4)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; color: #38bdf8;">${formatUSD(costs.costCache)}</span>
              </div>
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 3px 6px; align-items: center;">
                <span>${t('rowUncached')}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums;">${formatTokens(data.inputTokens)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums;">$${pricing.inputPricePerM.toFixed(2)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 600;">${formatUSD(costs.costInput)}</span>
              </div>
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 3px 6px; align-items: center;">
                <span>${t('rowOutput')}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums;">${formatTokens(data.outputTokens)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums;">$${pricing.outputPricePerM.toFixed(2)}</span>
                <span style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 600;">${formatUSD(costs.costOutput)}</span>
              </div>
            </div>
          </div>

          <!-- Smart Zone vs Dumb Zone Projection -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; padding: 12px;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px;">${t('projectionsTitle')}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px;">
              <div style="padding: 10px; background: rgba(34, 197, 94, 0.08); border-radius: 6px; border-left: 3px solid #22c55e;">
                <div style="font-weight: 600; color: #22c55e; font-size: 11px;">${t('smartZoneTitle')}</div>
                <div style="font-size: 16px; font-weight: 700; color: #22c55e; margin: 3px 0;">${formatUSD(projections.smart.totalCost)} ${currentLocale === 'pt' ? `<span style="font-size: 10px; font-weight: 400; color: var(--muted-foreground, #aaa);">(${formatBRL(projections.smart.totalCost)})</span>` : ''}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa);">${t('smartZoneDesc')}</div>
              </div>
              <div style="padding: 10px; background: rgba(239, 68, 68, 0.08); border-radius: 6px; border-left: 3px solid #ef4444;">
                <div style="font-weight: 600; color: #ef4444; font-size: 11px;">${t('dumbZoneTitle')}</div>
                <div style="font-size: 16px; font-weight: 700; color: #ef4444; margin: 3px 0;">${formatUSD(projections.raw.totalCost)} ${currentLocale === 'pt' ? `<span style="font-size: 10px; font-weight: 400; color: var(--muted-foreground, #aaa);">(${formatBRL(projections.raw.totalCost)})</span>` : ''}</div>
                <div style="font-size: 10px; color: var(--muted-foreground, #aaa);">${t('dumbZoneDesc')}</div>
              </div>
            </div>
          </div>

        </div>
      `;
    } else if (tab === 'files') {
      const files = data.files || [];
      if (files.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--muted-foreground, #888);">${t('noFilesSession')}</div>`;
        return;
      }
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: grid; grid-template-columns: 2fr 100px 100px 80px; padding: 6px 8px; font-weight: 600; font-size: 10.5px; color: var(--muted-foreground, #888); border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));">
            <span>${t('colFileName')}</span>
            <span style="text-align: right;">${t('colFileSize')}</span>
            <span style="text-align: right;">${t('colFileTokens')}</span>
            <span style="text-align: right;">${t('colFileReads')}</span>
          </div>
          ${files.map(f => `
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
      const commands = data.commands || [];
      if (commands.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--muted-foreground, #888);">${t('noCommandsSession')}</div>`;
        return;
      }
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: grid; grid-template-columns: 3fr 100px 100px; padding: 6px 8px; font-weight: 600; font-size: 10.5px; color: var(--muted-foreground, #888); border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));">
            <span>${t('colCommand')}</span>
            <span style="text-align: right;">${t('colOutput')}</span>
            <span style="text-align: right;">${t('colFileTokens')}</span>
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
      if (latestSubagentsList.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--muted-foreground, #888);">${t('noSubagentsSession')}</div>`;
        return;
      }

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          
          <div style="padding: 10px 12px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 16px;">🛡️</span>
            <div>
              <div style="font-weight: 600; color: #4ade80; font-size: 11.5px;">${t('subagentsGuaranteeTitle')}</div>
              <div style="font-size: 10.5px; color: var(--muted-foreground, #aaa); margin-top: 2px; line-height: 1.4;">
                ${t('subagentsGuaranteeDesc')}
              </div>
            </div>
          </div>

          <div style="font-size: 11px; color: var(--muted-foreground, #aaa); margin-bottom: 2px;">
            ${t('subagentsClickHint')}
          </div>

          ${latestSubagentsList.map(s => {
            const isCurrent = activeModalData && activeModalData.cascadeId === s.cascadeId;
            return `
              <div style="padding: 10px 14px; background: ${isCurrent ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isCurrent ? 'rgba(34, 197, 94, 0.3)' : 'var(--border, rgba(255,255,255,0.08))'}; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <div style="min-width: 0; flex: 1;">
                  <div style="font-weight: 600; color: var(--foreground, #fff); font-size: 12px; display: flex; align-items: center; gap: 6px;">
                    <span>🤖 ${s.name}</span>
                    ${isCurrent ? '<span style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px; background: rgba(34, 197, 94, 0.2); color: #22c55e;">' + t('currentlySelected') + '</span>' : ''}
                  </div>
                  <div style="font-size: 10px; color: var(--muted-foreground, #888); margin-top: 2px;">
                    ${t('subagentCardDetails', { color: s.zone.color, tokens: formatTokens(s.totalTokens), pct: s.pct, files: s.details?.filesCount || 0, cmds: s.details?.commandsCount || 0 })}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 700; font-size: 10.5px; padding: 2px 7px; border-radius: 4px; background: ${s.zone.bg}; color: ${s.zone.color};">
                    ${s.zone.tag}
                  </span>
                  <button type="button" class="agy-inspect-subagent-btn" data-cascade-id="${s.cascadeId}" style="background: var(--secondary, rgba(255,255,255,0.08)); border: 1px solid var(--border, rgba(255,255,255,0.15)); color: var(--foreground, #eee); border-radius: 6px; padding: 4px 8px; font-size: 10.5px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;">
                    ${t('btnInspectArrow')}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

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
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; line-height: 1.5; color: var(--foreground, #ddd);">
          <div style="padding: 10px; background: rgba(34, 197, 94, 0.08); border-radius: 6px; border-left: 3px solid #22c55e;">
            <div style="font-weight: 600; color: #22c55e; margin-bottom: 2px;">${t('tip1Title')}</div>
            <div style="font-size: 11px;">${t('tip1Desc')}</div>
          </div>

          <div style="padding: 10px; background: rgba(59, 130, 246, 0.08); border-radius: 6px; border-left: 3px solid #3b82f6;">
            <div style="font-weight: 600; color: #60a5fa; margin-bottom: 2px;">${t('tip2Title')}</div>
            <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 10.5px;">
              <li>${t('tip2Item1')}</li>
              <li>${t('tip2Item2')}</li>
              <li>${t('tip2Item3')}</li>
              <li>${t('tip2Item4')}</li>
            </ul>
          </div>

          <div style="padding: 10px 12px; background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 4px;">
            <div>
              <div style="font-weight: 600; color: #fb7185; font-size: 11.5px; display: flex; align-items: center; gap: 6px;">
                <span>💖 Vitalf Technologies Open Source</span>
              </div>
              <div style="font-size: 10.5px; color: var(--muted-foreground, #aaa); margin-top: 2px;">
                ${t('sponsorTooltip')}
              </div>
            </div>
            <a href="https://github.com/sponsors/vitalfin" target="_blank" rel="noopener noreferrer" style="text-decoration: none; background: #e11d48; color: #fff; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 600; white-space: nowrap; transition: opacity 0.15s ease;">
              ${t('sponsorBtn')} ↗
            </a>
          </div>
        </div>
      `;
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

    widget.title = `${t('scopeContextWindow')}: 0 / 250k (0%) — ${t('zoneSmartTag')}`;
    breadcrumbWidget.title = `${t('scopeContextWindow')}: 0 / 250k (0%) — ${t('zoneSmartTag')}`;

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
      const name = (node.querySelector('span')?.innerText || '').split('\n')[0].trim() || t('scopeSubagent');
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
      badge.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${zone.color};"></span><span>${formatTokens(totalTokens)} / 250k (${pct}%)</span>`;
      badge.title = `${name}: ${zone.tag} — ${t('btnInspectArrow')}`;
    }

    latestSubagentsList = subagentsList;
    return subagentsList;
  }

  // 10. OVERALL CONTEXT UPDATE
  async function updateAll() {
    ensureWidgetMounted();

    const path = location.pathname;
    const match = path.match(/\/c\/([a-zA-Z0-9_-]+)/);

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
      ? `${t('scopeSubagent')} ${activeSub.name}: ${formatTokens(totalTokens)} / 250k (${pct}%) — ${zone.tag}`
      : `${t('scopeContextWindow')}: ${formatTokens(totalTokens)} / 250k (${pct}%) — ${zone.tag}`;

    // Update SVG ring of breadcrumb widget
    const bRing = document.getElementById('agy-breadcrumb-ring');
    if (bRing) {
      if (activeSub && activeSub.details) {
        const subVisualPct = Math.min(100, Math.max(0, activeSub.pct));
        const subOffset = Math.max(0, CIRCLE_C - (subVisualPct / 100) * CIRCLE_C);
        bRing.style.stroke = activeSub.zone.color;
        bRing.style.strokeDashoffset = subOffset;
        breadcrumbWidget.title = `${t('scopeSubagent')} ${activeSub.name}: ${formatTokens(activeSub.totalTokens)} / 250k (${activeSub.pct}%) — ${activeSub.zone.tag}`;
      } else {
        bRing.style.stroke = zone.color;
        bRing.style.strokeDashoffset = offset;
        breadcrumbWidget.title = `${t('scopeContextWindow')}: ${formatTokens(totalTokens)} / 250k (${pct}%) — ${zone.tag}`;
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
