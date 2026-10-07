## Description

Please include a summary of the change and the relevant motivation or issue context.

Fixes #(issue)

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 🌐 Internationalization / Translation (i18n update or new language)
- [ ] 📚 Documentation update
- [ ] 🧹 Refactoring or repository maintenance

## How Has This Been Tested?

Please describe the tests that you ran to verify your changes.

- [ ] `npm test` passes (unit tests & i18n parity check)
- [ ] `npm run build && git diff --exit-code widget.js` verified (widget artifact synchronized)
- [ ] `npm run test:cdp` verified against running Antigravity IDE (if applicable)

## Checklist

- [ ] My code follows the style guidelines of this project.
- [ ] I have performed a self-review of my own code.
- [ ] I have commented my code where necessary, particularly in hard-to-understand areas.
- [ ] I have updated the documentation accordingly.
- [ ] My changes generate no new warnings or errors.
- [ ] If changing `generate-widget.mjs` or `translations.mjs`, I regenerated `widget.js` via `npm run build`.
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
