<div align="center">

# 🛸 Antigravity Context Window Monitor

**Autonomous real-time context gauge, subagent inspector, cost estimator & memory guard for Google Antigravity.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.5.0-emerald.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20PT%20%7C%20ES%20%7C%20JA%20%7C%20ZH%20%7C%20FR%20%7C%20DE-blueviolet.svg)](#internationalization-i18n)
[![Sponsor](https://img.shields.io/badge/Sponsor-Vitalf%20Technologies-ff69b4.svg)](https://github.com/sponsors/vitalfin)

[English](README.md) • [Português](README.pt-BR.md)

</div>

---

## 📖 Overview

When developing with state-of-the-art LLMs (such as **Gemini 3.8 Flash**, **Gemini 3.1 Pro**, and **Claude Sonnet 4.6**) inside **Google Antigravity**, context window bloat is the primary culprit behind model degradation, hallucinations, and sluggish responses.

While modern models boast physical limits of 1M+ tokens, benchmark studies demonstrate that cognitive retention degrades significantly above **250k tokens** (*"needle in a haystack"* failure).

**Antigravity Context Window Monitor** is an open-source, non-intrusive runtime utility that hooks into your Antigravity IDE session via Chrome DevTools Protocol (CDP). It provides instant visual observability, token distribution breakdown, automated compaction tracking, and true API cost estimations.

---

## 🎯 The Operating Zones

The monitor defines deterministic quality thresholds to keep your coding session sharp:

| Zone | Operational Usage | Status | Description |
| :--- | :---: | :---: | :--- |
| 🟢 **SMART ZONE** | `0% - 40%` (< 100k) | **Optimal ✓** | Peak reasoning accuracy, 0 hallucinations, ultra-fast response times. |
| 🟡 **WARNING ZONE** | `40% - 60%` (100k - 250k) | **Degrading ⚠️** | Noticeable attention decay. Consider delegating to Subagents or pruning. |
| 🔴 **DUMB ZONE** | `> 60%` (> 250k) | **Critical ✗** | High risk of hallucination and instruction loss. Start a new conversation. |

---

## ✨ Key Features

### 1. 🔄 Dynamic Dual Widget Ring
- **Input Bar Badge**: Minimalist SVG circular ring positioned right beside the model selector.
- **Breadcrumb Header Badge**: Synchronized status indicator in the top breadcrumb navigation.
- Smooth transitions with real-time token count tooltips.

### 2. 🛡️ Subagent Context Isolation & Hierarchy
- Subagents execute in dedicated, independent processes.
- **Strict Isolation Guarantee**: The monitor ensures tokens consumed by subagents are never conflated with the main conversation.
- Interactive **Subagent Badges** on task cards allow one-click inspection of subagent files, commands, and memory.

### 3. 🔄 Automatic Compaction Detection
- Antigravity automatically compacts earlier conversation history into checkpoints when approaching ~250k tokens.
- Displays visual **Compaction Tags** (`🔄 1x`, `🔄 2x`) explaining when compaction took place.
- Accurately tracks **active post-compaction context** while maintaining uncapped percentage metrics (> 100%).

### 4. 💳 Real-time API Cost & Cache Savings Estimation
- Calculates costs based on official provider pricing:
  - **Google AI Studio** (`Gemini 3.8 Flash`, `Gemini 3.1 Pro` with tiered pricing > 128k).
  - **Anthropic** (`Claude Sonnet 4.6`).
- Highlights **Gemini Context Caching ROI**: Tracks cached tokens (75% to 90% discount) and displays net dollar savings.
- Subscription Plan Disclaimer: Explains marginal costs for Google AI Pro users ($0.00 within quota).

### 5. 🔍 Full Context Inspector Modal
Includes 6 interactive tabs:
1. **Overview**: Stacked distribution bar (System Prompts, Injected Files, Terminal Commands, Dialogue Chains).
2. **💳 Costs & Credits**: Transparent pricing table and operational cost projections.
3. **Files**: Top context consumers with byte sizes, line estimates, and read frequencies.
4. **Commands**: Terminal outputs retained in memory with byte counts.
5. **Subagents**: Complete hierarchy with dedicated context scopes.
6. **Best Practices**: Actionable architectural rules to keep sessions lean.

### 6. 🌐 Native Internationalization (7 Languages)
Defaulting to **English (`en`)**, with instant UI switching and persistent storage across:
- 🇺🇸 **English** (`en`) — *Default*
- 🇧🇷 **Português** (`pt`)
- 🇪🇸 **Español** (`es`)
- 🇯🇵 **日本語** (`ja`)
- 🇨🇳 **中文** (`zh`)
- 🇫🇷 **Français** (`fr`)
- 🇩🇪 **Deutsch** (`de`)

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Google Antigravity IDE running on Linux, macOS, or Windows

### Running the Monitor

Clone the repository and launch the background injector:

```bash
git clone https://github.com/vitalfin/antigravity-context-monitor.git
cd antigravity-context-monitor
npm start
```

The daemon detects Antigravity's active CDP port (`~/.config/Antigravity/DevToolsActivePort`) and injects `widget.js` automatically.

---

## 🧪 Testing & Verification

The project includes unit test suites and live CDP integration tests:

```bash
# Run unit tests (i18n dictionary symmetry, pricing models)
npm test

# Run live CDP browser tests against Antigravity IDE
npm run test:cdp

# Run entire test suite
npm run test:all
```

---

## 💖 Sponsorship & Support

This project is built and maintained by **Vitalf Technologies** as part of our mission to deliver open financial infrastructure and state-of-the-art developer tools for autonomous AI engineering.

If you or your team find this utility valuable, please consider sponsoring our open-source initiatives:

👉 **[Sponsor Vitalf on GitHub](https://github.com/sponsors/vitalfin)**

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
