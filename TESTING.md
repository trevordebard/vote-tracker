# Testing

This project uses Vitest for unit/integration tests and Playwright for end-to-end tests.

## Quick start

```bash
npm run test
npx playwright install
npm run test:e2e
```

## Test commands

- `npm run test` - Run unit + integration tests (Vitest, Node + JSDOM).
- `npm run test:watch` - Watch mode for Vitest.
- `npm run test:e2e` - Run Playwright end-to-end tests.
- `npm run lint` - Lint the project.

## Notes

- API tests use an isolated SQLite database per test via `VOTE_TRACKER_DATA_DIR`.
- End-to-end tests start the Next.js server automatically (dev locally, build+start in CI).
- Playwright browsers must be installed once with `npx playwright install`.
