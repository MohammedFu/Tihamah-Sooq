# Unit and component testing

## Commands

- `npm test` runs the deterministic Vitest suite once in jsdom.
- `npm run test:coverage` runs the same suite with V8 coverage and enforces the configured global thresholds.
- `npm run lint` performs the strict TypeScript build check used by the project.
- `npm run test:e2e` runs the fixture-mode Playwright workflows separately.
- `npx playwright test --config playwright.remote.config.ts` runs the opt-in local SQLite/backend smoke scenario documented in [`DEMO_DATA.md`](../../Tihamah-Backend/Tihamah-Haraj/docs/DEMO_DATA.md). It is intentionally excluded from the normal fixture suite.

Coverage reports are written to the ignored `coverage/` directory as a console summary, `coverage-summary.json`, and an HTML report. Test failures still fail the command before coverage can be accepted.

## Coverage policy

Coverage includes every executable `.ts` and `.tsx` module below `src`. Type declarations, test files, and shared test support are excluded. The global minimums are:

| Metric | Minimum |
| --- | ---: |
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

These floors are slightly below the measured T31 baseline and are intended to prevent regressions, not to reward low-value assertions. Security boundaries, request mapping, status transitions, permission denial, financial calculations, stale-write handling, and validation failures require direct behavioral tests even when the aggregate threshold already passes.

## Deterministic fixtures

- `src/test/authFixture.ts` builds isolated administrator sessions for authentication and permission tests.
- `src/services/admin/fixtureData.ts` creates a fresh marketplace data graph for each service/provider test.
- `createFixtureAdminServices()` wraps that fresh graph with the same typed service boundary used by Refine. Mutations are isolated between builder calls and never perform production network requests.
- Remote-contract tests inject a local `fetch` mock into `ApiClient`; tests must not call the deployed API or external media hosts.

Prefer a fresh builder call inside each test. Override only the field or service method relevant to the behavior being asserted, and keep dates, identifiers, and Arabic labels explicit when they affect output.

## Scope boundaries

Pure contract and domain behavior belongs in fast unit tests. User-visible controls, focus, dialogs, loading/error/empty states, and permission-hidden actions belong in React Testing Library coverage under T32. Cross-route browser workflows and runtime composition belong in Playwright under T33. A module being exercised by an end-to-end test does not remove the need for a focused unit test when it contains financial or security-sensitive branching.
