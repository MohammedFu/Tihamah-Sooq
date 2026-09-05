# Tihamah-Sooq Dashboard Implementation Plan

## 1. Purpose

This document is the persistent implementation handoff for the Tihamah-Sooq administrative dashboard. A new developer or AI chat should read this file before changing code, then read the relevant source documents in `D:\dashboard\Notebook` for the task being implemented.

The target is a production-ready Arabic RTL dashboard built with React, TypeScript, Vite, React Router, and Refine Core. The dashboard must support the nine operational workflows documented in the Notebook, enforce administrator authentication and permissions, integrate with the documented API, and remain usable on desktop, tablet, and mobile screens.

## 2. Non-Negotiable Project Rules

1. Work only inside `D:\dashboard\Tihamah-Sooq` unless the user explicitly requests otherwise.
2. Never modify `D:\dashboard\TailAdmin`. It is a read-only visual and component-pattern reference.
3. Never modify `D:\dashboard\Notebook`. It is the requirements and API source of truth.
4. Reuse TailAdmin design ideas without copying its project structure wholesale.
5. Preserve Arabic RTL behavior and Arabic operational terminology.
6. Use Refine Core for providers, authentication, access control, resource metadata, and server-state workflows where appropriate.
7. Keep domain-specific actions such as commission verification and user banning in feature services instead of forcing them into generic CRUD abstractions.
8. Do not recreate `src/features/resources/pages/ResourceListPage.tsx` or `src/features/settings/pages/SettingsPage.tsx`. They were obsolete generic placeholders and were intentionally removed.
9. Do not replace user changes or unrelated work in a dirty Git worktree.
10. A task is not complete until its loading, empty, error, unauthorized, success, and responsive states have been considered.

## 3. Source Documents

Read these files according to the task being implemented:

| Source | Primary use |
| --- | --- |
| `Notebook/هندسة وتحليل شاشات لوحة التحكم الإدارية للأعمال.md` | Nine dashboard screens, business actions, edge cases, KPIs, and moderation flows |
| `Notebook/مواصفات الهندسة التقنية لبروتوكول الـ APIs الموحد.md` | REST conventions, JWT behavior, response envelopes, and cross-client workflows |
| `Notebook/دليل واجهات برمجة تطبيقات منصة سوق القرى والأرياف.md` | Detailed endpoint descriptions and payload examples |
| `Notebook/swagger_docs_v2.go` | Executable Swagger contract and DTO/model definitions |
| `Notebook/tihamah-haraj-postman-collection.json` | Executable endpoint examples, request bodies, variables, and status expectations |
| `Notebook/marketplace_models-v2.go` | Current backend entity fields and relationships |
| `Notebook/marketplace_models.go` | Older model reference; use only to explain differences from v2 |
| `Notebook/هيكلة قاعدة بيانات منصة سوق القرى والأرياف البرمجية.md` | Database entities, constraints, indexing, and lifecycle rules |
| `Notebook/هندسة وقواعد بيانات منصة الوساطة التجارية المغربية.md` | Additional marketplace architecture and data-integrity context |
| `Notebook/التصميم المعماري الشامل لشاشات تطبيق الموبايل الهندسية.md` | Mobile behavior that must stay synchronized with admin actions |
| `Notebook/Rural_Marketplace_Engineering_Blueprint.pdf` | Supplemental overview; prefer searchable text and executable contracts for implementation details |

### Contract precedence

When sources disagree, use this order and document the decision:

1. Confirmed backend behavior or backend tests, if available.
2. `swagger_docs_v2.go` and the Postman collection.
3. The unified API specification.
4. The dashboard analysis document.
5. Older models and the PDF blueprint.

Do not silently guess when a destructive or financial endpoint is missing. Keep the UI in local-review mode, isolate the assumption in a service adapter, and record the unresolved contract in this document.

## 4. Known Contract Gaps

1. The dashboard analysis describes `GET /admin/listings` and a listing-status moderation endpoint, but the current Swagger/Postman contract does not clearly expose the full admin listing moderation surface. T18 must confirm the backend route before enabling live mutations.
2. One architecture document describes commission verification as `POST`; current Swagger/Postman uses `PATCH /api/v1/admin/commissions/{id}/verify`. Use `PATCH` unless the backend confirms otherwise.
3. Older documentation describes `/toggle-ban`; current Swagger/Postman uses `PATCH /api/v1/admin/users/{id}/ban`. Use the latter.
4. Access-token lifetime is documented as 15 minutes and refresh-token lifetime as 30 days, but an administrator refresh endpoint is not clearly specified. T07 must not invent a refresh route.
5. The dashboard requires append-only audit logs, but a complete admin audit-list endpoint is not visible in the current executable contract. T25 and T27 must retain an adapter boundary until this endpoint is confirmed.
6. Notification targeting by region/village appears in the dashboard requirements, while some API examples contain only `title` and `body`. Confirm audience fields before live targeted broadcasts.
7. Banner targeting, administrative title, and start/end scheduling are required by the dashboard analysis, but the current Swagger banner model contains only image URL, sort order, and active state. The domain model preserves nullable extension fields while remote mutations remain limited to the confirmed contract.
8. T05 confirmed that category/region/village/banner collections are unpaginated and expose no GET-by-ID operation. The provider derives detail reads, filters, sorting, and pagination from complete collections; only the documented village `region_id` filter is sent remotely. Do not invent detail or server-sort routes in T22–T24.
9. T05 found that Swagger references `dto.VerifyCommissionRequest` without defining it and Postman supplies `{}`. The detailed API guide confirms `{ "status": "verified" }` only. Remote verification therefore permits that payload; rejection and notes remain in local-review mode pending T20 contract confirmation. The shared request type retains them for fixture use.
10. The executable user-list contract supports `q` and `is_banned`; commission/report lists support `status`, and all three support `page`/`limit`. User geographic filters, report-type filters, and server sorting are not confirmed. T19–T21 must confirm them before enabling remote controls.
11. Swagger references an absent `dto.TestSMSRequest` and Postman supplies `{}`. T25 must confirm the SMS test body. T05 implements settings list/single/batch/OTP operations; SMS gateway UI integration remains in T25.

## 5. Current Baseline

As of 2026-09-05:

- The React/TypeScript/Vite/Refine project exists independently in `D:\dashboard\Tihamah-Sooq`.
- The application has an Arabic RTL responsive shell, sidebar, header, badges, drawers, modals, toasts, and shared styling.
- All nine routes exist: `/`, `/listings`, `/users`, `/commissions`, `/reports`, `/locations`, `/categories`, `/banners`, and `/system`.
- Each route has an interactive fixture-backed workflow suitable for UI review.
- Desktop and 390 px mobile browser sweeps passed with no runtime exceptions or document-level horizontal overflow.
- `npm run build` passes.
- Administrator login, session-scoped persistence, expiry validation, logout, and protected route flow are implemented and covered by focused Vitest and Playwright tests. RBAC, broader production API integration, broader automated coverage, and deployment automation remain.
- `src/data/adminFixtures.ts` is temporary review data, not a production data layer.
- T05 registers a session-guarded Refine data provider and typed fixture/remote admin services. Catalog CRUD and confirmed operational services are available; the existing pages still require their T17–T25 integrations. Provider fixtures use a separate isolated in-memory store. Contracts and cache usage are documented in `docs/ADMIN_DATA.md`.
- Verification now includes 49 passing unit/component/provider tests and three passing Playwright workflows, including provider smoke checks at 390/1440 px. Fixture and remote production builds pass with a Vite chunk-size advisory; no live backend mutations were exercised.

## 6. Target Source Structure

The structure may be introduced incrementally. Do not create empty folders without a task that uses them.

```text
src/
  app/
    App.tsx
    resources.ts
    routes.tsx
    providers.tsx
  components/
    layout/
    ui/
  config/
    env.ts
  features/
    auth/
    dashboard/
    listings/
    users/
    commissions/
    reports/
    locations/
    categories/
    banners/
    system/
  providers/
    authProvider.ts
    accessControlProvider.ts
    dataProvider.ts
  services/
    http/
    admin/
  types/
    api/
    domain/
  test/
    fixtures/
    mocks/
    setup.ts
```

Each feature can add `api`, `components`, `hooks`, `pages`, and `schemas` only when those folders contain real code.

## 7. Task Status Legend

- `DONE`: Implemented and verified against its current scope.
- `PARTIAL`: A fixture-backed or structural implementation exists, but production requirements remain.
- `TODO`: Not implemented.
- `BLOCKED`: Requires a confirmed external contract or user decision.

Update the status in this document after completing each task. Do not mark a production integration task complete merely because a fixture demonstrates the UI.

## 8. Phase 1: Architecture And API Contracts

### T01 - Formalize project boundaries

- **Status:** DONE
- **Priority:** P0
- **Depends on:** None
- **Objective:** Make ownership clear between application setup, shared UI, feature code, providers, API services, and contracts.
- **Implementation:** Preserve the current domain-first feature folders. Add `config`, `providers`, `services`, and `types` only as T02-T05 introduce real modules. Move no page merely for cosmetic consistency.
- **Primary files:** `src/app/*`, `src/features/*`, new `src/config`, `src/providers`, `src/services`, and `src/types` modules.
- **Acceptance:** No circular feature imports; pages do not import fixtures after their API task is complete; shared UI does not depend on feature modules.
- **Verification:** Run `npm run lint`, `npm run build`, and inspect imports with `rg`.
- **Completion note (2026-09-04):** Route ownership was extracted to `src/app/routes.tsx`, leaving `App.tsx` responsible for top-level router and Refine composition. The domain-first feature structure was retained, shared UI has no feature dependencies, and future `config`, `providers`, `services`, and `types` folders remain deferred until T02-T05 add real modules.

### T02 - Add validated environment configuration

- **Status:** DONE
- **Priority:** P0
- **Depends on:** T01
- **Objective:** Centralize deployment-dependent values and fail clearly when production configuration is incomplete.
- **Implementation:** Add typed handling for `VITE_API_URL`, `VITE_API_MODE`, request timeout, media host, and application environment. Support `fixture` and `remote` API modes. Do not expose secrets through Vite variables.
- **Primary files:** `src/config/env.ts`, `.env.example`, `src/vite-env.d.ts`, `README.md`.
- **Acceptance:** Development defaults to fixture mode; remote mode requires a valid API URL; malformed values produce an actionable startup error.
- **Verification:** Unit-test configuration parsing and build once in each supported mode.
- **Completion note (2026-09-04):** Added a pure typed parser and cached runtime accessor in `src/config/env.ts`, typed Vite variables, `.env.example`, README documentation, and an Arabic startup error screen. Validation covers explicit staging/production modes, remote API requirements, HTTP(S)/root-relative URLs, credential/query/fragment rejection, application environments, and 1,000-120,000 ms timeout bounds. Parser assertions passed for valid and invalid cases, and production builds passed in both fixture and remote modes.

### T03 - Generate and normalize API contracts

- **Status:** DONE
- **Priority:** P0
- **Depends on:** T01
- **Objective:** Represent documented DTOs with strict TypeScript types while isolating backend `snake_case` from UI-friendly domain models.
- **Implementation:** Define success/error envelopes, pagination, admin identity, permissions, metrics, listings, users, commissions, reports, regions, villages, categories, banners, settings, notifications, and audit records. Add explicit mapper functions rather than widespread type assertions.
- **Primary sources:** `swagger_docs_v2.go`, Postman collection, `marketplace_models-v2.go`.
- **Primary files:** `src/types/api/*`, `src/types/domain/*`, `src/services/admin/mappers.ts`.
- **Acceptance:** Every consumed response is typed; nullable fields match Swagger/models; money is not formatted until the presentation layer; dates remain ISO strings in services.
- **Verification:** Unit-test representative payloads and malformed/partial responses.
- **Completion note (2026-09-04):** Added wire-level contracts under `src/types/api`, dashboard domain contracts under `src/types/domain`, and strict runtime mappers in `src/services/admin/mappers.ts`. Mappers validate required fields, IDs, finite non-negative monetary values, known statuses, pagination, and ISO date-times; preserve documented nullability; flatten role permissions; and omit FCM tokens from domain objects. Fixture-independent assertions passed for complete and partial Swagger payloads plus malformed dates, status values, money, pagination, and missing fields. Contract gaps for audit logs and enriched banners remain explicit and nullable rather than fabricated.

### T04 - Implement the HTTP client

- **Status:** DONE
- **Priority:** P0
- **Depends on:** T02, T03
- **Objective:** Provide one reliable transport layer for all admin services.
- **Implementation:** Add base URL handling, JSON bodies, query serialization, bearer headers, `AbortSignal`, timeout cancellation, response-envelope parsing, and a typed `ApiError`. Normalize `400`, `401`, `403`, `404`, `409`, `422`, `429`, and `5xx` errors into Arabic-ready error metadata.
- **Primary files:** `src/services/http/apiClient.ts`, `src/services/http/ApiError.ts`, `src/services/http/query.ts`.
- **Acceptance:** Components never call raw `fetch`; empty `204` responses work; network errors differ from validation errors; unauthorized responses notify the auth layer.
- **Verification:** Mock fetch tests for success, timeout, invalid JSON, envelope errors, and unauthorized responses.
- **Completion note (2026-09-04):** Added a dependency-injected HTTP client with validated base URLs, deterministic query serialization, JSON request bodies, bearer authentication, per-request cancellation/timeouts, unified-envelope validation, raw-response support for presigned operations, and safe handling of empty `204`/`205` responses. Added typed Arabic-ready `ApiError` normalization for API, validation, authorization, conflict, rate-limit, server, malformed-response, network, timeout, abort, and configuration failures. Mock-fetch assertions passed for successful JSON and empty responses, query/header/body behavior, API envelopes, all required HTTP classes, retry metadata, invalid JSON/envelopes, network failures, timeout versus caller abort, authentication notification, and unsafe URL rejection.

### T05 - Implement Refine and domain data providers

- **Status:** DONE
- **Priority:** P0
- **Depends on:** T03, T04
- **Objective:** Connect standard resource operations through Refine while retaining explicit services for business actions.
- **Implementation:** Map list/get/create/update/delete operations for categories, regions, villages, and banners. Add feature services for statistics, moderation, ban/unban, commission verification, report resolution, broadcasts, settings, and audit logs.
- **Primary files:** `src/providers/dataProvider.ts`, `src/services/admin/*.ts`, `src/app/providers.tsx`.
- **Acceptance:** Pagination totals and filters map correctly; mutations invalidate only relevant queries; fixture and remote providers expose the same interface.
- **Verification:** Provider contract tests plus a fixture-mode browser smoke test.
- **Completion note (2026-09-05):** Registered `src/providers/dataProvider.ts` through `src/app/providers.tsx` with session guards, catalog CRUD, list-based detail/many reads, strict camelCase-to-snake_case request validation, filtered catalog totals, and confirmed server pagination for users/commissions/reports. Added explicit statistics, moderation, ban/unban, commission, report, broadcast, settings, and audit service interfaces with isolated fixture state and fail-closed remote contract gaps. Standard Refine mutations retain resource-specific invalidation; `useAdminAction` refreshes only related resources after confirmed domain/hierarchy actions. Added request/parity/error/empty/cancellation/conflict tests, a real Refine invalidation integration test, and browser smoke checks at 390/1440 px. `npm run lint`, all 49 tests, all three Playwright workflows, and fixture/remote builds passed. One existing login test timed out while heavy checks ran concurrently; the complete isolated test rerun passed without changing its timeout. Vite reports a non-blocking chunk-size advisory. Updated README and `docs/ADMIN_DATA.md`; operational page migrations and RBAC remain in their own tasks.

## 9. Phase 2: Authentication And Authorization

### T06 - Build the administrator login screen

- **Status:** DONE
- **Priority:** P0
- **Depends on:** T02-T04
- **Objective:** Authenticate administrators using the documented email/phone and password contract.
- **Implementation:** Create a focused Arabic login form with email or phone, password visibility toggle, submit loading state, server error display, and safe redirect to the originally requested route. Fixture mode may use clearly documented development credentials.
- **Endpoint:** `POST /api/v1/admin/auth/login`.
- **Primary files:** `src/features/auth/pages/LoginPage.tsx`, `src/features/auth/components/*`, `src/features/auth/schemas/*`.
- **Acceptance:** Invalid credentials remain on the page; fields are not cleared after a network error; authenticated users are redirected away from `/login`.
- **Verification:** Component tests and one end-to-end success/failure flow.
- **Completion note (2026-09-05):** Added the Arabic RTL administrator login screen, normalized email/phone validation, password visibility control, loading and error states, fixture credentials, remote `POST /api/v1/admin/auth/login` integration, safe return paths, and a project-local market image. Vitest component/service tests and the Playwright auth flow cover invalid credentials, retained field values, duplicate-submit prevention, successful login, safe route restoration, and authenticated redirection away from `/login`.

### T07 - Implement session lifecycle

- **Status:** DONE
- **Priority:** P0
- **Depends on:** T04, T06
- **Objective:** Store and clear admin session data predictably without inventing undocumented backend behavior.
- **Implementation:** Store access token, optional refresh token, expiry, identity, and permissions through one session repository. Prefer session-scoped storage unless a deliberate remember-me option is approved. Decode JWT only for expiry hints, never as authorization proof.
- **Primary files:** `src/features/auth/session.ts`, `src/providers/authProvider.ts`.
- **Acceptance:** Logout clears all session data; expired access tokens fail closed; no token appears in logs or rendered HTML; refresh is implemented only after confirming an admin refresh endpoint.
- **Verification:** Unit-test storage, expiry boundaries, malformed sessions, and logout.
- **Completion note (2026-09-05):** Added one session repository backed only by `sessionStorage`, with versioned serialization, server-lifetime expiry, runtime shape validation, inactive-administrator rejection, fail-closed malformed storage handling, access-token delivery to the HTTP client, and complete logout cleanup. Unit and browser tests cover save/load, exact expiry, malformed data, inactive identities, refresh persistence, and clearing. No administrator refresh route was invented.

### T08 - Protect application routes

- **Status:** DONE
- **Priority:** P0
- **Depends on:** T06, T07
- **Objective:** Ensure the dashboard shell and feature pages cannot render for anonymous visitors.
- **Implementation:** Register the Refine auth provider, add `/login`, wrap protected routes with `Authenticated`, preserve return paths, and show a stable authentication-check loading state.
- **Primary files:** `src/app/App.tsx`, optional `src/app/routes.tsx`, `src/providers/authProvider.ts`.
- **Acceptance:** Opening any dashboard URL without a session redirects to login; a valid session restores the requested page; logout returns to login.
- **Verification:** Route tests for anonymous, valid, expired, and malformed sessions.
- **Completion note (2026-09-05):** Registered the Refine auth provider, wrapped the dashboard shell with `Authenticated`, added a stable session-check screen, preserved the requested location through login, redirected active sessions away from `/login`, and added an accessible header logout action. The committed Playwright test passes for anonymous deep links, failed login, successful route restoration, refresh persistence, logout, malformed sessions, expired sessions, token non-rendering, and 390 px overflow containment.

### T09 - Connect administrator identity

- **Status:** TODO
- **Priority:** P1
- **Depends on:** T07, T08
- **Objective:** Replace hard-coded header identity with the authenticated administrator.
- **Implementation:** Map the Swagger `models.Admin` and role object into a small identity model. Display name, role, initials, and a user menu containing profile/session information and logout.
- **Primary files:** `src/components/layout/Header.tsx`, `src/features/auth/components/AdminMenu.tsx`, `src/providers/authProvider.ts`.
- **Acceptance:** Long Arabic names do not overflow; unavailable avatar/name fields use deterministic fallbacks; logout is keyboard accessible.
- **Verification:** Component tests for full and partial identities at mobile and desktop widths.

### T10 - Implement role-based access control

- **Status:** TODO
- **Priority:** P0
- **Depends on:** T03, T07
- **Objective:** Enforce dynamic permissions returned for the administrator role.
- **Implementation:** Add a Refine access-control provider. Define normalized actions such as `list`, `show`, `create`, `edit`, `delete`, `approve`, `reject`, `ban`, `verify`, `broadcast`, and `manage_settings`. Hide unavailable navigation and disable unavailable actions, while treating backend authorization as final.
- **Primary files:** `src/providers/accessControlProvider.ts`, `src/app/resources.ts`, `src/components/layout/navigation.ts`, feature action components.
- **Acceptance:** Permissions are deny-by-default; hidden UI cannot be restored by changing the URL; a backend `403` produces a clear state without logging out.
- **Verification:** Permission-matrix unit tests and route/action component tests.

### T11 - Add authentication and authorization error states

- **Status:** TODO
- **Priority:** P1
- **Depends on:** T08-T10
- **Objective:** Give administrators clear recovery paths for expired sessions, forbidden actions, and unavailable services.
- **Implementation:** Add dedicated unauthorized, forbidden, session-expired, and service-unavailable views. Preserve unsaved data where possible and avoid redirect loops.
- **Primary files:** `src/features/auth/pages/*`, `src/components/ui/ErrorState.tsx`, route configuration.
- **Acceptance:** `401` logs out once and redirects safely; `403` stays authenticated; retry is available for temporary failures.
- **Verification:** Provider and route tests for each error class.

## 10. Phase 3: Shared Production UI

### T12 - Formalize design tokens and component states

- **Status:** PARTIAL
- **Priority:** P1
- **Depends on:** T01
- **Objective:** Turn the current stylesheet into a maintainable project-owned design system.
- **Implementation:** Extract color, spacing, typography, focus, border, elevation, and semantic-status tokens. Preserve the restrained TailAdmin-inspired visual language without changing TailAdmin files. Add dark mode only if explicitly requested.
- **Primary files:** `src/styles/index.css`, optional `src/styles/tokens.css` and component-specific styles.
- **Acceptance:** No one-off colors for common states; focus styles are visible; cards remain at 8 px radius or less; all tokens work in RTL.
- **Verification:** Visual comparison on all nine routes and CSS color scan.

### T13 - Build a reusable server data table

- **Status:** TODO
- **Priority:** P1
- **Depends on:** T05, T12
- **Objective:** Remove repeated table plumbing while keeping feature-specific columns and actions readable.
- **Implementation:** Support server pagination, sorting, filters, search, row actions, loading skeletons, empty/error states, retry, horizontal containment, and accessible column headers. Keep mobile behavior scan-friendly rather than compressing every column.
- **Primary files:** `src/components/ui/DataTable/*`, feature column definitions.
- **Acceptance:** URL query state can be restored; changing filters resets the page; table width never expands the document; actions have labels/tooltips.
- **Verification:** Component tests and 390/768/1440 px screenshots.

### T14 - Build reusable form infrastructure

- **Status:** PARTIAL
- **Priority:** P1
- **Depends on:** T12
- **Objective:** Standardize validation, dirty-state handling, and mutation submission.
- **Implementation:** Adopt React Hook Form and a schema validator if approved by the dependency policy. Create field error, select, textarea, date, toggle, upload, and confirmation patterns. Integrate Refine unsaved-change behavior.
- **Primary files:** `src/components/ui/forms/*`, feature schemas.
- **Acceptance:** Validation errors connect to fields; submit cannot double-fire; dialogs restore focus; closing a dirty form requires confirmation.
- **Verification:** Form component tests and keyboard-only checks.

### T15 - Complete the feedback and notification system

- **Status:** PARTIAL
- **Priority:** P1
- **Depends on:** T12
- **Objective:** Replace page-local timeout toasts with a consistent notification provider.
- **Implementation:** Support success, error, warning, informational, and persistent progress notifications. Ensure messages are specific to the completed action and include retry only when safe.
- **Primary files:** `src/components/ui/Toast.tsx`, new notification provider, `src/app/providers.tsx`.
- **Acceptance:** Notifications do not overlap controls; screen readers announce them; timers clean up on unmount; financial actions never report success before the server confirms.
- **Verification:** Unit tests for queueing, dismissal, and action callbacks.

### T16 - Complete accessibility and RTL review

- **Status:** PARTIAL
- **Priority:** P0
- **Depends on:** T12-T15
- **Objective:** Make all core workflows usable with keyboard and assistive technology.
- **Implementation:** Audit labels, landmarks, heading hierarchy, focus order, drawer/modal traps, escape handling, table captions, live regions, contrast, Arabic reading order, and intentional LTR fields such as phone, email, IBAN, and IDs.
- **Primary files:** Shared components and every page.
- **Acceptance:** No unlabeled icon buttons; focus never disappears behind overlays; reduced-motion preference is respected; 200% zoom remains usable.
- **Verification:** Automated accessibility scan plus manual keyboard walkthrough.

## 11. Phase 4: Operational Workflows

### T17 - Integrate dashboard metrics

- **Status:** PARTIAL
- **Priority:** P1
- **Depends on:** T03-T05, T13, T15
- **Objective:** Replace overview fixtures with live platform health and work queues.
- **Implementation:** Fetch user totals/new users, active/new/sold listings, due/paid/verified commissions, open reports, and OTP usage. Add last-updated time, manual refresh, stale-data state, and links to prefiltered queues.
- **Endpoint:** `GET /api/v1/admin/stats` plus any confirmed queue-summary endpoint.
- **Primary files:** `src/features/dashboard/api/*`, hooks, `OverviewPage.tsx`.
- **Acceptance:** Missing optional metrics do not crash the page; values and currency are localized; queue links set the correct destination filters.
- **Verification:** Mapper tests, loading/error/empty states, and browser screenshots.

### T18 - Complete listing moderation

- **Status:** PARTIAL; live API portion may become BLOCKED by contract gap 1.
- **Priority:** P0
- **Depends on:** T03-T05, T10, T13-T15
- **Objective:** Provide safe end-to-end review of pending, active, sold, rejected, and removed listings.
- **Implementation:** Add server search and filters, pagination, complete listing/media detail, approve, reject with required reason, deactivate/reactivate, and soft delete. Record moderator and timestamps and update only after confirmed responses.
- **Endpoint:** Confirm admin list/detail/status/delete routes before remote mutations.
- **Primary files:** `src/features/listings/api/*`, components, schemas, `ListingsPage.tsx`.
- **Acceptance:** Video/image failures have fallbacks; reject reason is mandatory; destructive actions require confirmation; stale moderation decisions return a conflict state.
- **Verification:** State-transition tests and end-to-end approve/reject/deactivate flows.

### T19 - Complete user management

- **Status:** PARTIAL
- **Priority:** P0
- **Depends on:** T03-T05, T10, T13-T15
- **Objective:** Search and inspect users and safely ban or restore accounts.
- **Implementation:** Add server pagination/search, region/village/status filters, listing and commission history, ban reason validation, unban confirmation, and feedback that active sessions were revoked.
- **Endpoints:** `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/{id}/ban`.
- **Primary files:** `src/features/users/api/*`, components, schemas, `UsersPage.tsx`.
- **Acceptance:** Ban reason is persisted; current administrator cannot accidentally ban themselves if the backend identifies that case; phone data follows masking permissions.
- **Verification:** Service tests plus ban/unban end-to-end tests.

### T20 - Complete commission auditing

- **Status:** PARTIAL
- **Priority:** P0
- **Depends on:** T03-T05, T10, T13-T15
- **Objective:** Protect the 1% financial verification workflow from incorrect or duplicate decisions.
- **Implementation:** Fetch commission records by status, display seller/listing/sold price/due amount/receipt/reference, calculate a non-authoritative client-side 1% cross-check, and support verified/rejected decisions with notes.
- **Endpoints:** `GET /api/v1/admin/commissions`, `PATCH /api/v1/admin/commissions/{id}/verify`.
- **Primary files:** `src/features/commissions/api/*`, components, schemas, `CommissionsPage.tsx`.
- **Acceptance:** Server amount remains authoritative; mismatches are visibly flagged; approval is idempotent; rejected receipts retain reason and history.
- **Verification:** Decimal calculation tests, concurrency tests, and approve/reject end-to-end flows.

### T21 - Complete reports and fraud moderation

- **Status:** PARTIAL
- **Priority:** P0
- **Depends on:** T03-T05, T10, T13-T15
- **Objective:** Resolve fraud, misleading-content, already-sold, prohibited-item, and abuse reports with traceable outcomes.
- **Implementation:** Add status/type filters, reporter/listing/accused context, related-report counts, evidence notes, dismissal, listing removal, advertiser ban, and required resolution notes.
- **Endpoints:** `GET /api/v1/admin/reports`, `PATCH /api/v1/admin/reports/{id}/resolve`; reuse confirmed user/listing actions when selected.
- **Primary files:** `src/features/reports/api/*`, components, schemas, `ReportsPage.tsx`.
- **Acceptance:** Compound actions show partial-failure handling; a report cannot be resolved twice silently; malicious-report dismissal does not delete evidence.
- **Verification:** Service tests and end-to-end tests for each resolution path.

### T22 - Complete regions and villages management

- **Status:** PARTIAL
- **Priority:** P1
- **Depends on:** T03-T05, T10, T14-T15
- **Objective:** Manage the geographic hierarchy without orphaning listings or users.
- **Implementation:** Fetch regions and villages, create/edit/reorder/activate them, and handle deletion constraints. Keep expanded-tree state stable after mutations.
- **Endpoints:** CRUD under `/api/v1/admin/regions` and `/api/v1/admin/villages`.
- **Primary files:** `src/features/locations/api/*`, components, schemas, `LocationsPage.tsx`.
- **Acceptance:** Region selection is required for villages; duplicate names are reported; active dependencies block deletion with useful counts; soft delete is preferred where supported.
- **Verification:** Tree mutation tests and dependency-conflict integration tests.

### T23 - Complete categories management

- **Status:** PARTIAL
- **Priority:** P1
- **Depends on:** T03-T05, T10, T14-T15, T28
- **Objective:** Manage Arabic category names, icons, ordering, and availability.
- **Implementation:** Connect CRUD, validate names/icons, support deterministic reordering, activation, and optional custom icon upload. Clarify whether delete means hard delete, soft delete, or disable.
- **Endpoints:** CRUD under `/api/v1/admin/categories`.
- **Primary files:** `src/features/categories/api/*`, components, schemas, `CategoriesPage.tsx`.
- **Acceptance:** Reordering persists atomically or rolls back visually; duplicate Arabic names are prevented; inactive categories are clearly distinguished.
- **Verification:** Ordering tests, validation tests, and create/edit/deactivate flows.

### T24 - Complete banner management

- **Status:** PARTIAL
- **Priority:** P1
- **Depends on:** T03-T05, T10, T14-T15, T28
- **Objective:** Schedule and target promotional banners while showing an accurate mobile-oriented preview.
- **Implementation:** Connect CRUD, media upload, target type (`none`, category, listing), target validation, sort order, active toggle, start/end dates, and expired/scheduled/active states.
- **Endpoints:** CRUD under `/api/v1/admin/banners`.
- **Primary files:** `src/features/banners/api/*`, components, schemas, `BannersPage.tsx`.
- **Acceptance:** End date cannot precede start date; target IDs are validated; failed saves retain selected media and form values; expired banners cannot appear active.
- **Verification:** Date/target validation tests and create/edit/reorder flows.

### T25 - Complete notifications, settings, and audit logs

- **Status:** PARTIAL
- **Priority:** P1
- **Depends on:** T03-T05, T10, T13-T15
- **Objective:** Finish the system screen around broadcasts, OTP/SMS operational controls, and immutable audit visibility.
- **Implementation:** Connect notification broadcast, require a confirmation summary and recipient estimate, add all/region/village targeting only when confirmed by the backend, expose OTP quota and SMS test/settings to authorized roles, and fetch paginated audit records when an endpoint exists.
- **Endpoints:** `/api/v1/admin/notifications/broadcast`, `/api/v1/admin/settings*`; audit endpoint requires confirmation.
- **Primary files:** `src/features/system/api/*`, components, schemas, `SystemPage.tsx`.
- **Acceptance:** Broadcast cannot double-submit; destructive settings changes are permission-gated; secrets are never returned or rendered in full; audit records are read-only.
- **Verification:** Broadcast/settings service tests and audit filtering tests.

## 12. Phase 5: Security And Data Integrity

### T26 - Standardize high-risk confirmations

- **Status:** PARTIAL
- **Priority:** P0
- **Depends on:** T14-T15
- **Objective:** Prevent accidental destructive, financial, and access-control actions.
- **Implementation:** Introduce reusable confirmation flows for delete, reject, ban, verify, broadcast, and settings changes. Show the affected entity and exact consequence; require typed reasons where mandated.
- **Primary files:** `src/components/ui/ConfirmDialog.tsx`, affected feature actions.
- **Acceptance:** Escape/cancel never submits; repeated clicks do not duplicate requests; irreversible actions are visually distinct but not sensationalized.
- **Verification:** Component tests and rapid-click mutation tests.

### T27 - Attach audit metadata to mutations

- **Status:** PARTIAL
- **Priority:** P0
- **Depends on:** T03-T05, T09
- **Objective:** Make every sensitive decision attributable and searchable.
- **Implementation:** Send required reason/notes and correlation ID, preserve the acting admin identity returned by the backend, and display action/entity/time/IP metadata in audit views. Never let the frontend claim an audit record exists before server confirmation.
- **Primary files:** HTTP client, feature mutation services, system audit view.
- **Acceptance:** Every reject/ban/verify/resolve/delete action has a reason where required; correlation IDs appear in error diagnostics; audit records cannot be edited.
- **Verification:** Request-payload tests and backend integration tests when available.

### T28 - Secure media uploads

- **Status:** TODO
- **Priority:** P0
- **Depends on:** T02-T04
- **Objective:** Validate and upload banner/category/receipt media without routing large files through unsuitable endpoints.
- **Implementation:** Confirm presigned-upload support for admin media, validate MIME type, extension, file size, image dimensions, and video constraints, show progress/cancel/retry, and submit only the final public media URL.
- **Primary files:** `src/services/admin/media.ts`, `src/components/ui/forms/MediaUpload.tsx`.
- **Acceptance:** Invalid files are rejected before upload; URLs are accepted only from configured media hosts; cancelled uploads do not submit stale URLs.
- **Verification:** File-validation unit tests and mocked upload lifecycle tests.

### T29 - Mask sensitive operational data

- **Status:** TODO
- **Priority:** P0
- **Depends on:** T09-T10
- **Objective:** Limit exposure of phone numbers, bank references, IBANs, email addresses, and credentials.
- **Implementation:** Create permission-aware formatters and reveal controls. Keep sensitive settings write-only where the API supports it. Prevent values from leaking into query strings, notifications, or client logs.
- **Primary files:** `src/components/ui/SensitiveValue.tsx`, formatting utilities, affected pages.
- **Acceptance:** Default views show the minimum needed data; reveal actions are permission-gated and auditable where required; secrets never appear in error messages.
- **Verification:** Permission and snapshot tests.

### T30 - Handle concurrency and stale records

- **Status:** TODO
- **Priority:** P0
- **Depends on:** T04-T05
- **Objective:** Prevent two administrators from silently applying conflicting moderation or financial decisions.
- **Implementation:** Use backend version/timestamp fields or conditional requests when supported. Map `409`/`412` responses to a refresh-and-review flow. Disable actions while a mutation is pending and reconcile optimistic state only for reversible low-risk changes.
- **Primary files:** HTTP client, mutation hooks, confirmation dialogs.
- **Acceptance:** Financial and ban decisions are pessimistic; stale data never overwrites newer server state; administrators can reload the affected record without losing unrelated filters.
- **Verification:** Concurrent-mutation service and end-to-end tests.

## 13. Phase 6: Testing, CI, And Delivery

### T31 - Add unit testing infrastructure

- **Status:** PARTIAL; Vitest, jsdom, shared setup, auth fixtures, and auth unit tests are configured. Coverage configuration and tests for the remaining domains are still TODO.
- **Priority:** P0
- **Depends on:** T02-T05
- **Objective:** Cover pure logic and contracts quickly.
- **Implementation:** Add Vitest, DOM test environment, shared setup, fixture builders, and coverage configuration. Test mappers, environment parsing, query serialization, permission rules, status transitions, date logic, and commission calculations.
- **Primary files:** `vitest.config.ts`, `src/test/setup.ts`, colocated `*.test.ts` files.
- **Acceptance:** Tests are deterministic, avoid production network calls, and cover critical branches rather than chasing a superficial percentage.
- **Verification:** Add `npm run test` and `npm run test:coverage` scripts and run both.

### T32 - Add component tests

- **Status:** PARTIAL; React Testing Library and user-event cover the login form. Shared controls and remaining feature interactions are still TODO.
- **Priority:** P1
- **Depends on:** T13-T16, T31
- **Objective:** Verify shared controls and high-risk feature interactions from the user’s perspective.
- **Implementation:** Add React Testing Library and user-event tests for login, tables, filters, drawers, dialogs, validation, uploads, toasts, navigation, and permission-hidden actions.
- **Primary files:** Colocated `*.test.tsx` files and test render helpers.
- **Acceptance:** Tests query accessible names instead of implementation classes; focus restoration and keyboard interaction are covered.
- **Verification:** Run component suite in CI-compatible headless mode.

### T33 - Add end-to-end workflow tests

- **Status:** PARTIAL; Playwright and a deterministic fixture-mode authentication workflow are configured. The remaining administrator workflows are still TODO.
- **Priority:** P0
- **Depends on:** T06-T30, T31
- **Objective:** Protect the nine administrator journeys across routing, providers, and mutation feedback.
- **Implementation:** Add Playwright with a deterministic fixture/mock API. Cover login/logout, dashboard refresh, listing decisions, user ban/unban, commission verification, report resolution, hierarchy/category/banner edits, broadcast confirmation, permissions, and session expiry.
- **Primary files:** `playwright.config.ts`, `e2e/*.spec.ts`, mock API support.
- **Acceptance:** Critical tests run independently and produce traces/screenshots only on failure; no test depends on external image hosts.
- **Verification:** Add and run `npm run test:e2e`.

### T34 - Add responsive visual verification

- **Status:** TODO; an initial manual sweep has passed.
- **Priority:** P1
- **Depends on:** T12-T25, T33
- **Objective:** Detect clipping, overlap, blank media, and RTL regressions automatically.
- **Implementation:** Capture stable screenshots at approximately 390, 768, 1024, and 1440 px. Check document scroll width, sidebar open/close behavior, table containment, dialog sizing, long Arabic strings, and 200% zoom.
- **Primary files:** Playwright visual specs and committed baseline images if the team approves snapshot storage.
- **Acceptance:** No incoherent overlap or page-level horizontal overflow; wide tables scroll inside their surfaces; controls retain stable dimensions.
- **Verification:** Run visual suite locally and in a consistent CI browser image.

### T35 - Add continuous integration

- **Status:** TODO
- **Priority:** P1
- **Depends on:** T31-T34
- **Objective:** Prevent unverified changes from entering the main branch.
- **Implementation:** Add GitHub Actions for dependency installation, type checking, unit/component tests, production build, end-to-end tests, and dependency audit. Cache safely using lockfile keys.
- **Primary files:** `.github/workflows/ci.yml`, `package.json`, lockfile.
- **Acceptance:** CI fails on TypeScript errors, failed tests, or build errors; artifacts are retained for failed browser tests; no secrets are needed for fixture-mode checks.
- **Verification:** Open a test pull request and confirm all jobs and branch protections.

### T36 - Prepare deployment and operational handoff

- **Status:** TODO
- **Priority:** P1
- **Depends on:** T02, T06-T35
- **Objective:** Make the dashboard deployable, observable, and maintainable.
- **Implementation:** Document environment variables, backend CORS/origin expectations, SPA fallback routing, cache headers, release/version process, rollback, monitoring, error reporting, and production smoke checks. Add container or platform configuration only after the hosting target is known.
- **Primary files:** `README.md`, `docs/DEPLOYMENT.md`, hosting configuration, release workflow.
- **Acceptance:** A new environment can be deployed from documented steps; health and client errors are observable without exposing tokens or personal data; rollback is tested.
- **Verification:** Perform a clean install/build and staging smoke test from the documented process.

## 14. Recommended Execution Order

Use this order unless a confirmed backend dependency changes it:

1. **Foundation:** T01, T02, T03, T04, T31.
2. **Providers:** T05, then fixture/remote parity tests.
3. **Security boundary:** T06, T07, T08, T09, T10, T11.
4. **Shared UI:** T12, T13, T14, T15, T16, T26.
5. **Core operations:** T17, T18, T19, T20, T21.
6. **Content operations:** T22, T23, T24, T25.
7. **Integrity:** T27, T28, T29, T30.
8. **Quality and delivery:** T32, T33, T34, T35, T36.

Parallel work is safe only when modules do not overlap. T18-T25 can be distributed after T03-T05 and shared UI contracts are stable.

## 15. Task Completion Checklist

For every task:

- [ ] Read the relevant Notebook source and record any discrepancy.
- [ ] Inspect existing code and Git status before editing.
- [ ] Keep changes inside the intended feature/provider boundary.
- [ ] Add strict request, response, and domain types.
- [ ] Implement loading, empty, error, retry, and success states.
- [ ] Enforce authentication and permissions where applicable.
- [ ] Preserve Arabic RTL and intentional LTR data fields.
- [ ] Add or update focused tests proportional to risk.
- [ ] Run `npm run lint`.
- [ ] Run relevant tests.
- [ ] Run `npm run build`.
- [ ] Check desktop and mobile behavior for UI changes.
- [ ] Update this plan’s task status and current-baseline notes.
- [ ] Update README/API/deployment documentation when behavior changes.

## 16. Definition Of Done For The Project

The project is production-ready only when:

1. All nine dashboard workflows use confirmed API contracts rather than local fixtures.
2. Administrator login, logout, token expiry, protected routing, identity, and dynamic RBAC work end to end.
3. Financial, destructive, access-control, and broadcast actions are confirmed, authorized, idempotent where required, and auditable.
4. Every primary screen has loading, empty, partial-data, error, retry, and permission-denied behavior.
5. Sensitive data and upload flows meet T28-T30 requirements.
6. Unit, component, end-to-end, accessibility, and responsive checks pass.
7. `npm run lint`, all tests, and `npm run build` pass in CI.
8. Deployment, monitoring, rollback, environment configuration, and backend contract gaps are documented.
9. No implementation has modified the TailAdmin or Notebook reference folders.

## 17. New Chat Startup Protocol

When continuing in a new chat, provide this instruction:

> Work in `D:\dashboard\Tihamah-Sooq`. Read `IMPLEMENTATION_PLAN.md` first, then read only the relevant files in `D:\dashboard\Notebook` for the next incomplete task. Treat `D:\dashboard\TailAdmin` and `D:\dashboard\Notebook` as read-only. Inspect the current Git status and existing implementation before editing. Continue from the first incomplete dependency-safe task, update its tests and documentation, run the required verification, and update the task status in `IMPLEMENTATION_PLAN.md`.

Before starting work, the new chat should also check whether the backend contract gaps in section 4 have been resolved.
