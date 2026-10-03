# Contributing to Antigravity Context Monitor

Thank you for your interest in contributing to **Antigravity Context Monitor**! We welcome bug reports, feature requests, translation contributions, and pull requests.

---

## Code of Conduct

We are committed to providing a welcoming and inclusive community. Please be respectful and considerate in all interactions.

---

## How to Contribute

### 1. Adding or Updating Translations (i18n)

Antigravity Context Monitor natively supports 7 languages:
- English (`en`) - *Default*
- Portuguese (`pt`)
- Spanish (`es`)
- Japanese (`ja`)
- Chinese (`zh`)
- French (`fr`)
- German (`de`)

To add a new language or refine existing translations:
1. Update `translations.mjs` with your locale additions.
2. Ensure 100% key parity with `en`.
3. Run `npm test` to verify dictionary symmetry and integrity.
4. Run `node generate-widget.mjs` to compile into `widget.js`.

### 2. Running Tests

Before submitting a Pull Request, verify that all tests pass:

```bash
# Run unit tests (i18n dictionary parity + cost calculations)
npm test

# Run full CDP live integration tests against Antigravity
npm run test:cdp

# Run all test suites
npm run test:all
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat(...)`: New feature or capability
- `fix(...)`: Bug fix
- `docs(...)`: Documentation updates
- `test(...)`: Adding or updating test suites
- `chore(...)`: Maintenance or repository configs

---

## Sponsorship

If you or your company rely on Antigravity Context Monitor, consider supporting development via [GitHub Sponsors](https://github.com/sponsors/vitalfin).
