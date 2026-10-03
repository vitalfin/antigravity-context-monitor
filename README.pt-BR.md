<div align="center">

# 🛸 Monitor de Context Window para o Antigravity

**Monitor em tempo real de janela de contexto, inspetor de subagentes e estimador de custos para o Google Antigravity.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/versão-1.5.0-emerald.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20PT%20%7C%20ES%20%7C%20JA%20%7C%20ZH%20%7C%20FR%20%7C%20DE-blueviolet.svg)](#-suporte-a-7-idiomas-i18n)
[![Sponsor](https://img.shields.io/badge/Apoiar-Vitalf%20Technologies-ff69b4.svg)](https://github.com/sponsors/vitalfin)

[English](README.md) • [Português](README.pt-BR.md)

<br/>

<img src="assets/modal-inspector.png" alt="Modal do Inspetor de Contexto" width="800" />

<br/>

<p align="center">
  <img src="assets/input-widget-popover.png" alt="Widget da Barra de Prompt e Popover" width="380" />
  &nbsp;&nbsp;
  <img src="assets/subagent-isolation.png" alt="Isolamento de Contexto de Subagente" width="380" />
</p>

</div>

---

## 📖 Visão Geral

Ao desenvolver com LLMs de ponta (Gemini 3.8 Flash, Gemini 3.1 Pro, Claude Sonnet 4.6) no **Google Antigravity**, o inchaço descontrolado do contexto é o principal fator de alucinações, perda de instruções e lentidão.

Embora os modelos suportem limites nominais de 1M+ tokens, o raciocínio fino e a atenção degradam bruscamente acima de **250k tokens** (*"needle in a haystack"*).

O **Antigravity Context Window Monitor** é um utilitário leve e não intrusivo que se conecta à sua sessão do Antigravity via Chrome DevTools Protocol (CDP), oferecendo observabilidade instantânea, divisão de carga, detecção de compactações e estimativa de custos de API em tempo real.

---

## 🚀 Início Rápido (Quick Start)

### Pré-requisitos
- Node.js >= 18.0.0
- Google Antigravity IDE em execução no Linux, macOS ou Windows

### 1. Clonar e Iniciar

```bash
git clone https://github.com/vitalfin/antigravity-context-monitor.git
cd antigravity-context-monitor
npm start
```

O daemon detecta automaticamente a porta CDP ativa do Antigravity no Linux (`~/.config/Antigravity/DevToolsActivePort`), macOS (`~/Library/Application Support/Antigravity/DevToolsActivePort`) e Windows (`%APPDATA%\Antigravity\DevToolsActivePort`) e injeta o monitor em tempo real.

### 2. Opcional: Executar como Serviço em Segundo Plano (Linux systemd)

Para manter o monitor executando continuamente em segundo plano no Linux:

```bash
mkdir -p ~/.config/systemd/user
cat << 'EOF' > ~/.config/systemd/user/antigravity-context-monitor.service
[Unit]
Description=Antigravity Context Window Monitor (Linux)
After=graphical-session.target

[Service]
Type=simple
ExecStart=/usr/bin/env node /home/ph/projects/vitalf/code/workspace/antigravity-context-monitor/monitor.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now antigravity-context-monitor.service
```

---

## 🎯 Zonas Operacionais de Qualidade

O monitor classifica o volume de tokens segundo critérios determinísticos de atenção:

| Zona | Uso Operacional | Status | Impacto no Raciocínio |
| :--- | :---: | :---: | :--- |
| 🟢 **SMART ZONE** | `0% - 40%` (< 100k) | **Excelente ✓** | Alta fidelidade atencional, zero alucinações e respostas rápidas. |
| 🟡 **AVISO** | `40% - 60%` (100k - 250k) | **Degrada ⚠️** | Queda perceptível de atenção. Recomenda-se delegar a subagentes. |
| 🔴 **DUMB ZONE** | `> 60%` (> 250k) | **Crítica ✗** | Risco alto de esquecimento de regras. Inicie nova conversa. |

---

## ✨ Recursos Principais

- **Anel Duplo Dinâmico**: Anel SVG discreto junto à caixa de prompt, sincronizado com o widget de status no breadcrumb superior.
- **🛡️ Isolamento de Subagentes**: Rastreamento independente. Tokens de subagentes ficam isolados e não poluem a conversa principal.
- **🔄 Detecção de Compactação**: Identifica checkpoints de compactação (`🔄 1x`, `🔄 2x`) e rastreia o contexto ativo pós-compactação.
- **💳 Custos e Economia via Cache**: Tarifas de mercado para Gemini e Claude, destacando até 90% de economia gerada pelo Gemini Context Caching.
- **🔍 Modal Completo de Inspeção**: 6 abas analíticas (Visão Geral, Custos & Créditos, Arquivos, Comandos, Subagentes e Boas Práticas).
- **🌐 Suporte a 7 Idiomas (i18n)**: Padrão em Inglês (`en`), com troca instantânea para Português (`pt`), Espanhol (`es`), Japonês (`ja`), Chinês (`zh`), Francês (`fr`) e Alemão (`de`).

---

## 🧪 Testes

```bash
# Testes unitários (simetria de chaves i18n e regras de preços)
npm test

# Testes de integração via CDP no Antigravity IDE ativo
npm run test:cdp

# Executar todos os testes
npm run test:all
```

---

## 💖 Apoio & Sponsor

Mantido pela **Vitalf Technologies** para fortalecer a engenharia autônoma de software. Se esta ferramenta gerou valor para seu time, considere apoiar nossas iniciativas open-source:

👉 **[Apoiar a Vitalf Technologies no GitHub Sponsors](https://github.com/sponsors/vitalfin)**

---

## 📄 Licença

Distribuído sob a licença **MIT**.

Você tem permissão para usar, copiar, modificar, distribuir e sublicenciar este software livremente, desde que o aviso de direitos autorais e atribuição à **Vitalf Technologies** sejam mantidos em todas as cópias ou partes substanciais do Software. Consulte [LICENSE](LICENSE) para detalhes.
