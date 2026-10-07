# Security Policy

## Supported Versions

We provide security updates for the latest minor releases:

| Version | Supported          |
| ------- | ------------------ |
| 1.6.x   | :white_check_mark: |
| < 1.6.0 | :x:                |

## Security Model

**Antigravity Context Monitor** operates strictly as a local runtime introspection utility:
- It connects exclusively to the local loopback interface (`127.0.0.1`) on the Chrome DevTools Protocol (CDP) port created by the local Google Antigravity process.
- It performs **zero** external telemetry, zero analytical tracking, and zero remote data transmission.
- Token data and conversation context remain strictly within your local machine.

## Reporting a Vulnerability

If you discover a security vulnerability in Antigravity Context Monitor, please do **NOT** open a public issue.

Instead, please report the vulnerability confidentially:
- Email: [contact@vitalf.ai](mailto:contact@vitalf.ai)
- Or use GitHub's [Private Vulnerability Reporting](https://github.com/vitalfin/antigravity-context-monitor/security/advisories/new) feature on the repository.

Please include:
1. Steps to reproduce the issue.
2. The affected version and operating system.
3. Potential impact or exploit scenarios.

We will acknowledge your report within 48 hours and work with you on a coordinated disclosure and patch.
