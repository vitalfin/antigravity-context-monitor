<div align="center">

# 🛸 Monitor de Context Window para o Antigravity

**Monitor autônomo em tempo real de context window, inspetor de subagentes, estimador de custos de API e guardião de memória para o Google Antigravity.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/versão-1.5.0-emerald.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20PT%20%7C%20ES%20%7C%20JA%20%7C%20ZH%20%7C%20FR%20%7C%20DE-blueviolet.svg)](#internacionalização-i18n)
[![Sponsor](https://img.shields.io/badge/Apoiar-Vitalf%20Technologies-ff69b4.svg)](https://github.com/sponsors/vitalfin)

[English](README.md) • [Português](README.pt-BR.md)

</div>

---

## 📖 Visão Geral

Ao desenvolver com LLMs de ponta (como **Gemini 3.8 Flash**, **Gemini 3.1 Pro** e **Claude Sonnet 4.6**) dentro do **Google Antigravity**, o inchaço descontrolado da janela de contexto é a principal causa de alucinações, esquecimento de instruções e lentidão nas respostas.

Embora os modelos atuais suportem limites físicos de mais de 1 milhão de tokens, a retenção de detalhes finos e o raciocínio lógico sofrem degradação atencional acentuada acima de **250k tokens** (*"needle in a haystack"*).

O **Antigravity Context Window Monitor** é uma ferramenta open-source e não intrusiva que se conecta à sua sessão do Antigravity via Chrome DevTools Protocol (CDP), fornecendo observabilidade instantânea, detalhamento de carga, detecção de compactações e cálculo do retorno sobre investimento do cache de tokens.

---

## 🎯 Zonas de Qualidade Cognitiva

| Zona | Uso Operacional | Status | Descrição |
| :--- | :---: | :---: | :--- |
| 🟢 **SMART ZONE** | `0% - 40%` (< 100k) | **Excelente ✓** | Alta precisão, zero alucinações e tempo de resposta ultrarrápido. |
| 🟡 **ATENÇÃO** | `40% - 60%` (100k - 250k) | **Degrada ⚠️** | Degradação perceptível de contexto. Recomenda-se delegar a subagentes. |
| 🔴 **DUMB ZONE** | `> 60%` (> 250k) | **Crítica ✗** | Risco alto de perda atencional e alucinação. Inicie nova conversa. |

---

## ✨ Recursos Principais

### 1. 🔄 Anel Duplo de Observabilidade
- **Widget do Rodapé**: Anel SVG discreto e moderno posicionado ao lado do seletor de modelos.
- **Widget do Topo (Breadcrumb)**: Sincronizado dinamicamente no cabeçalho superior.

### 2. 🛡️ Isolamento Estrito de Subagentes
- Cada subagente roda em processo independente com janela própria.
- **Garantia de Isolamento**: O consumo de tokens dos subagentes nunca é somado indevidamente à conversa principal.
- Badges interativas nos cards de subagentes para inspeção instantânea em 1 clique.

### 3. 🔄 Detecção Automática de Compactação
- Detecta checkpoints criados automaticamente pelo Antigravity ao atingir ~250k tokens.
- Exibe tags visuais informativas (`🔄 1x`, `🔄 2x`) e rastreia o contexto ativo pós-compactação.

### 4. 💳 Estimativa de Custos e Economia via Cache
- Tabelas de tarifas para **Google AI Studio** e **Anthropic**.
- Demonstra a economia gerada pelo **Gemini Context Caching** (descontos de 75% a 90% em tokens lidos da memória).
- Callout explicativo para usuários do plano Google AI Pro (custo marginal zero dentro da cota).

### 5. 🔍 Modal Detalhado de Inspeção (6 Abas)
- **Visão Geral**: Barra segmentada por tipo de carga (Sistema, Arquivos, Saídas de Terminal, Histórico de Diálogo).
- **💳 Custos & Créditos**: Tabela completa de tarifas e projeções de gastos.
- **Arquivos**: Top consumidores com bytes, estimativa de tokens e leituras.
- **Comandos**: Comandos executados e volume de saída retido.
- **Subagentes**: Lista completa com alternância de escopo.
- **Boas Práticas**: Dicas de engenharia para manter sessões leves.

### 6. 🌐 Suporte a 7 Idiomas (i18n)
Por padrão em **Inglês (`en`)**, com seletor interativo e memória permanente para:
- 🇺🇸 **Inglês** (`en`) — *Padrão*
- 🇧🇷 **Português** (`pt`)
- 🇪🇸 **Espanhol** (`es`)
- 🇯🇵 **Japonês** (`ja`)
- 🇨🇳 **Chinês** (`zh`)
- 🇫🇷 **Francês** (`fr`)
- 🇩🇪 **Alemão** (`de`)

---

## 🚀 Como Executar

```bash
git clone https://github.com/vitalfin/antigravity-context-monitor.git
cd antigravity-context-monitor
npm start
```

O daemon monitora a porta ativa do Antigravity (`~/.config/Antigravity/DevToolsActivePort`) e realiza a injeção automática em tempo real.

---

## 🧪 Testes Automatizados

```bash
# Testes unitários (simetria de dicionários i18n e cálculos de custo)
npm test

# Testes de integração ao vivo via CDP no Antigravity IDE
npm run test:cdp

# Rodar todos os testes
npm run test:all
```

---

## 💖 Apoie o Projeto

Desenvolvido com carinho pela **Vitalf Technologies**. Se esta ferramenta acelerou seu fluxo de trabalho, considere apoiar nosso desenvolvimento open source:

👉 **[Apoiar a Vitalf no GitHub Sponsors](https://github.com/sponsors/vitalfin)**

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
