# Unit and component testing

## Commands

- `npm test` runs the deterministic Vitest suite once in jsdom.
- `npm run test:coverage` runs the same suite with V8 coverage and enforces the configured global thresholds.
- `npm run lint` performs the strict TypeScript build check used by the project.
- `npm run test:e2e` runs the fixture-mode Playwright workflows separately.
- `npx playwright test --config playwright.remote.config.ts` runs the opt-in local SQLite/backend smoke scenario documented in [`DEMO_DATA.md`](../../Tihamah-Backend/Tihamah-Haraj/docs/DEMO_DATA.md). It is intentionally excluded from the normal fixture suite.

Coverage reports are written to the ignored `coverage/` directory as a console summary, `coverage-summary.json`, and an HTML report. Test failures still fail the command before coverage can be accepted.

Vitest runs at most two isolated workers. The cap avoids fork-startup exhaustion on Windows and constrained CI hosts while retaining per-file isolation and deterministic fixture state.

## Coverage policy

Coverage includes every executable `.ts` and `.tsx` module below `src`. Type declarations, test files, and shared test support are excluded. The global minimums are:

| Metric | Minimum |
| --- | ---: |
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

These floors are slightly below the measured T31 baseline and are intended to prevent regressions, not to reward low-value assertions. Security boundaries, request mapping, status transitions, permission denial, financial calculations, stale-write handling, and validation failures require direct behavioral tests even when the aggregate threshold already passes.

The T32 completion run measured 82.84% statements, 78.64% branches, 87.01% functions, and 86.64% lines across 306 tests in 53 files.

## Deterministic fixtures

- `src/test/authFixture.ts` builds isolated administrator sessions for authentication and permission tests.
- `src/services/admin/fixtureData.ts` creates a fresh marketplace data graph for each service/provider test.
- `createFixtureAdminServices()` wraps that fresh graph with the same typed service boundary used by Refine. Mutations are isolated between builder calls and never perform production network requests.
- Remote-contract tests inject a local `fetch` mock into `ApiClient`; tests must not call the deployed API or external media hosts.

Prefer a fresh builder call inside each test. Override only the field or service method relevant to the behavior being asserted, and keep dates, identifiers, and Arabic labels explicit when they affect output.

## Browser workflow coverage

The fixture-mode Playwright suite runs each critical workflow in a fresh browser context. Existing scenarios cover login and logout, requested-route restoration, dashboard refresh and queue links, listing moderation and stale-decision recovery, permission denial, session expiry, responsive tables, accessibility, and design-system containment. `e2e/admin-workflows.spec.ts` adds the remaining administrator journeys:

- User ban and unban, including the required reason and server-confirmed feedback.
- One-percent commission review and pessimistic verification.
- Report resolution only after administrative notes are supplied.
- Region creation followed by child-village creation.
- Arabic category creation and editing.
- Banner creation and editing of backend-confirmed fields.
- All-user broadcast review and explicit confirmation.

`e2e/support/fixtureApp.ts` centralizes fixture login and browser-network isolation for these workflows. Requests to the local Vite origin continue normally, external non-image requests are aborted, and external images receive a tiny in-memory SVG response. Tests therefore do not depend on a backend, CDN, or public image host. Playwright retains traces and screenshots only when a test fails; the opt-in remote-backend smoke test remains skipped unless `RUN_REMOTE_BACKEND_SMOKE=1` is set explicitly.

## Scope boundaries

Pure contract and domain behavior belongs in fast unit tests. User-visible controls, focus, dialogs, loading/error/empty states, and permission-hidden actions belong in React Testing Library coverage under T32. Cross-route browser workflows and runtime composition belong in Playwright under T33. A module being exercised by an end-to-end test does not remove the need for a focused unit test when it contains financial or security-sensitive branching.

## Component coverage

T32 keeps user-visible behavior close to the component or feature that owns it. The current React Testing Library suite covers:

- Login validation, retained credentials after failure, pending submission locks, administrator identity, and logout recovery.
- Server tables, URL-backed filters, loading, empty, error, retry, and pagination states.
- Drawers, modals, confirmation dialogs, form validation, focus containment/restoration, and dirty-close protection.
- Media validation/upload lifecycle, notifications, sensitive-value reveal controls, and stale-mutation recovery.
- The nine feature pages, including their high-risk moderation, financial, access-control, catalog, broadcast, and settings interactions.
- Permission-filtered navigation and actions, mobile-menu dismissal, inert background content, and focus transfer to the destination heading.

Tests query roles, labels, headings, and visible Arabic copy instead of implementation classes. Page tests use fresh fixture services and injected failures, so they remain deterministic and do not contact a backend or external media host.
