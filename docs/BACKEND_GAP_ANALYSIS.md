# Backend readiness and gap analysis

**Assessment date:** 10 September 2026  
**Scope:** `Tihamah-Sooq` administrator dashboard, `Tihamah-Haraj` Go API, the local Docker topology, the checked-in SQLite development snapshot, and only the relevant API-contract references in `Notebook`.  
**Target market:** Arabic-first marketplace use in rural communities in Saudi Arabia.  
**Production data:** not modified.

## Executive conclusion

The dashboard can now be demonstrated against a realistic, entirely synthetic Arabic dataset through the real API. Authentication, dashboard metrics, listing review data, commissions, reports, and locally hosted media were exercised in a browser against the explicitly mounted SQLite snapshot.

That successful demonstration does **not** mean the backend is ready for a Saudi production launch. The largest remaining risks are:

1. **Data-store fail-open behavior:** a failed PostgreSQL connection silently switches the API to a relative SQLite file, including when the application is configured as production. This can split live writes across databases without operators noticing.
2. **Financial state integrity:** selling an ad and creating its commission are separate, partially ignored operations; an administrator can also set arbitrary ad and commission states. A successful response therefore does not prove that the related financial record exists or is valid.
3. **Incomplete administrative controls:** audit history, reason capture, optimistic concurrency, idempotency, session revocation, secure media upload, and real notification delivery are absent from the runtime API.
4. **Security and privacy weaknesses:** default secrets, unrestricted credentialed CORS, permissive CSP, plaintext configuration secrets, sensitive logging, and no dependency-aware health/readiness checks are launch blockers.
5. **Contract and test drift:** the generated API documentation omits most administrator routes, validation tags are not consistently executed, and no administrator handler test suite protects the dashboard contract.

The recommended decision is: **use the environment for demonstrations and acceptance discovery, but do not connect it to real customers, payments, messaging providers, or production data until the P0 controls in this report are complete.**

## What was investigated

The review followed data and state changes from the dashboard request mappers through routing, middleware, handlers, repositories, models, startup/migration behavior, Docker configuration, and persisted records. The most relevant sources include:

- Dashboard remote adapters and query mapping: [`mappers.ts`](../src/services/admin/mappers.ts), [`services.ts`](../src/services/admin/services.ts), and [`listQuery.ts`](../src/services/admin/listQuery.ts).
- API composition and persistence startup: [`main.go`](../../Tihamah-Backend/Tihamah-Haraj/cmd/api/main.go) and [`database.go`](../../Tihamah-Backend/Tihamah-Haraj/internal/database/database.go).
- Runtime domain behavior: the backend [`handlers`](../../Tihamah-Backend/Tihamah-Haraj/internal/handler), [`services`](../../Tihamah-Backend/Tihamah-Haraj/internal/service), [`repositories`](../../Tihamah-Backend/Tihamah-Haraj/internal/repository), and [`models`](../../Tihamah-Backend/Tihamah-Haraj/internal/models).
- Deployed configuration surface: [`config.go`](../../Tihamah-Backend/Tihamah-Haraj/internal/config/config.go), [`docker-compose.yml`](../../Tihamah-Backend/Tihamah-Haraj/docker-compose.yml), and backend middleware.
- Intended-but-not-runtime contracts: [`swagger_docs_v2.go`](../../Notebook/swagger_docs_v2.go), [`marketplace_models-v2.go`](../../Notebook/marketplace_models-v2.go), and the Postman collection in `Notebook`.

The `Notebook` and `TailAdmin` trees were treated as read-only. The Notebook V2 models are useful design evidence, but they are not registered by the current API and must not be mistaken for implemented controls.

## Actual runtime architecture

The normal Compose configuration connects the API to PostgreSQL. The user-selected `tihamah_dev.db` file was **not** part of that normal container path. On any PostgreSQL initialization error, the backend currently falls back to a working-directory-relative `tihamah_dev.db`; that fallback is not restricted to development mode. Startup also performs GORM `AutoMigrate` and runs seed behavior rather than applying an explicit, versioned migration plan.

For this demonstration only, [`docker-compose.sqlite-demo.yml`](../../Tihamah-Backend/Tihamah-Haraj/docker-compose.sqlite-demo.yml) explicitly mounts the requested host database at `/app/tihamah_dev.db`, selects development mode, and deliberately makes the PostgreSQL probe fail. This makes the otherwise implicit fallback visible and reproducible. The main Compose file and its PostgreSQL volume were not seeded.

This local workaround is appropriate for a disposable demonstration; the fallback itself is a production defect. Production must select one configured driver and absolute data source, fail startup on an unavailable required database, and expose database/migration state through readiness checks.

## Dashboard workflow readiness

| Dashboard workflow | Current result | Backend finding |
| --- | --- | --- |
| Administrator login | **Working after fix** | Runtime tokens now include the documented `token_type` and `expires_in` fields, while retaining `expires_at`. Refresh tokens are still issued without an administrator refresh route. |
| Dashboard metrics | **Working, semantics need correction** | Counts load, but “paid commissions” only sums `paid`, excluding `verified`; query errors are not handled consistently. |
| Listings list/filter/moderate | **Partially working** | List and mutation endpoints exist. “All statuses”, detail retrieval, rejection evidence, valid transition rules, version checks, and not-found detection are incomplete. |
| Users list/ban | **Partially working** | Basic list and ban work. `is_banned` filtering and dashboard `ban_reason` are ignored; actor/time/reason and token revocation are missing. |
| Commissions | **High-risk partial** | List and verify exist, but state transitions and receipt/reference rules are not enforced. Sold-ad and commission creation are not atomic. |
| Reports | **Partially working** | List/resolve exist. Resolution notes and structured targets are discarded, and arbitrary status values can be stored. |
| Categories, locations, banners | **Basic CRUD only** | No normalized uniqueness or safe referenced-delete behavior; hard deletes and generic failures can damage administration workflows. |
| Media upload | **Blocked in remote dashboard mode** | The dashboard/Notebook contract expects presigning, while the runtime exposes only a protected user multipart upload route and no equivalent administrator endpoint. |
| Broadcast notifications | **Stub only** | The API logs a broadcast; it does not persist a campaign, resolve recipients, enqueue delivery, call FCM, or return delivery results. |
| SMS test/settings | **Stub and route-risk** | “Send” logs content but does not dispatch. The dynamic `PUT /settings/:key` is registered before the SMS route and may capture `/settings/sms`. |
| Audit log | **Not implemented** | No durable audit model or admin list endpoint exists; the dashboard correctly fails closed in remote mode. |

## Prioritized backend gap register

| Priority | Gap | Operational consequence | Required acceptance condition |
| --- | --- | --- | --- |
| **P0** | PostgreSQL silently falls back to SQLite | Split-brain or apparently “lost” production writes | Production startup fails closed; driver/DSN are explicit; readiness proves the selected database and migration version. |
| **P0** | Sold ad and commission creation are not one transaction | Sold inventory can exist without a collectible commission | One database transaction, locked/versioned transition, unique commission per qualifying sale, full rollback on failure. |
| **P0** | Arbitrary status transitions | Invalid ad/report/commission states and bypassed business rules | Server-side enums and state machines; invalid transitions return stable 422/409 errors. |
| **P0** | Missing immutable admin audit trail | No trustworthy accountability for bans, moderation, money, or settings | Append-only event with actor, action, target, reason, before/after, request ID, IP, timestamp, and outcome. |
| **P0** | Default/deployed secrets and plaintext secret reads | Credential compromise and unauthorized administration | External secret manager/environment injection, rotation, redaction, no secret values in list responses or images. |
| **P0** | Authentication does not re-check active administrator/role | Disabled staff may retain access until JWT expiry | Middleware checks current account state/auth version; revoke/rotate sessions; implement or stop issuing refresh tokens. |
| **P0** | Unrestricted credentialed CORS and permissive CSP | Browser attack surface is broader than intended | Environment allowlist, least-privilege methods/headers, tested preflights, nonce/hash CSP without `unsafe-eval`. |
| **P1** | No optimistic concurrency or idempotency | Double submits and stale tabs overwrite decisions | Version/ETag plus `If-Match`; idempotency keys for financial and notification actions; 409/412 contract. |
| **P1** | Dashboard fields silently ignored | Operators believe filters/reasons were saved when they were not | Contract tests cover every request/response field; reject unknown critical fields or persist them. |
| **P1** | Media contract mismatch | Remote administrators cannot add media safely | Authenticated admin presign/finalize flow, content/type/size scanning, ownership and expiry controls. |
| **P1** | Notification and SMS endpoints are simulations | UI can report dispatch without any delivery | Durable job/campaign, provider adapter, consent/targeting, retry, delivery/failure accounting, safe test mode. |
| **P1** | Runtime Swagger omits administrator surface | Integrations and tests cannot rely on one authoritative contract | Generate OpenAPI from runtime routes and validate it in CI against dashboard consumers. |
| **P1** | No administrator integration tests | Contract regressions reach the browser | Auth, permission, list/filter, mutation, failure, and audit integration suites using disposable databases. |
| **P1** | No versioned migrations | Startup can mutate production schemas unpredictably | Ordered forward migrations, recorded schema version, rehearsed backup/rollback, CI migration tests. |
| **P2** | Weak CRUD lifecycle and uniqueness | Duplicate taxonomy and unsafe hard deletion | Normalized unique keys, soft delete/restore where required, 409 for referenced entities. |
| **P2** | Sequential/unbudgeted list and stats queries | Slow dashboard as records grow | Query plans, composite indexes, bounded pagination, aggregation optimization, latency/load budgets. |
| **P2** | Static health endpoint | Orchestrator can route traffic to a broken API | Separate liveness/readiness; check DB, migration state, required queues/storage without leaking secrets. |

## Detailed findings

### 1. Authentication, authorization, and request identity

The dashboard relies on the published token contract. Before this work, runtime JSON returned access/refresh tokens and `expires_at`, while both the dashboard mapper and generated documentation required `token_type` and `expires_in`. [`jwt.go`](../../Tihamah-Backend/Tihamah-Haraj/internal/utils/jwt.go) now supplies both fields and focused tests protect the response contract.

The browser also sends `X-Correlation-Id` and `X-Request-Id`; preflight rejected them until they were added to [`security.go`](../../Tihamah-Backend/Tihamah-Haraj/internal/middleware/security.go). The backend still does not generate/echo a canonical request ID or attach it to logs and audit events.

More importantly, administrator middleware trusts claims until token expiry. It does not reload the administrator to confirm `is_active`, current role, or an authentication version. Role changes, bans, and password rotations therefore do not immediately invalidate access. Query-string WebSocket tokens and sensitive device/SMS log lines also create avoidable credential and personal-data exposure.

### 2. Listings and moderation

The list path defaults an omitted status to `active`, so the dashboard cannot request a true all-status collection. There is no administrator detail endpoint, durable rejection reason, moderator/timestamp record, restore flow, or resource version. Update/delete paths do not consistently check `RowsAffected`, which permits a success response for a missing record.

Moderation accepts any nonempty status. A privileged request can therefore bypass the normal sale workflow by writing `sold` directly, and the moderation path does not create a commission. Replace free-form strings with explicit transition commands (`approve`, `reject`, `mark_sold`, `restore`) and validate allowed current→next transitions in one service-layer transaction.

### 3. Commission and payment evidence

The current user sale path updates the ad and then separately attempts commission creation, with errors that can be ignored. GORM default transactions are disabled globally. This is the most serious correctness defect because the API can return success after producing incomplete financial state.

Commission verification also accepts loosely defined states and lacks a complete record of verifier, verification time, reference, notes, receipt validation, and rejection/reopen history. Define a commission ledger/state machine, prohibit destructive edits, make the sale operation atomic, and calculate metrics from documented settlement states. Add uniqueness at the database level so retries cannot create multiple commissions for one sale.

### 4. Users and administrative actions

The dashboard sends `is_banned` filters and a `ban_reason`, but the handler does not persist or apply them. There is no `banned_by`, `banned_at`, session invalidation, or searchable action history. Administrator login also creates a linked marketplace user as a hidden side effect and suppresses creation errors, which can inflate `total_users` and makes a read-like operation mutate core data.

Account linking should be an explicit, idempotent onboarding migration. Ban/unban must record actor, reason, timestamp, prior state, and authentication-version change in the same transaction as the audit event.

### 5. Reports, notifications, and messaging

Report resolution discards the dashboard's resolution notes and accepts arbitrary state. Targets are not modeled richly enough for reliable ad/user/chat investigation, and there is no resolved timestamp/history.

Broadcast and SMS “send” routes only log. They must not return language implying actual dispatch until a durable job exists. A production design needs recipient selection, consent and suppression rules, provider isolation, rate limits, retry/dead-letter handling, templates, delivery receipts, per-recipient outcomes, and an immutable operator record. Test tokens/phone numbers must never leave a no-send adapter.

### 6. Settings and secrets

The settings list exposes stored values directly, including values that can be secrets. Batch updates lack an allowlist, types, atomicity, and version checks. Empty values cannot reliably clear secrets. Public settings include banking data without a clear public-data policy. The SMS-specific update route may be shadowed by the earlier `/:key` route.

Split public presentation settings from encrypted secrets and operational configuration. Return only redacted secret metadata (`configured`, `last_rotated_at`), use typed schemas, and write changes atomically with an audit entry. Register literal routes before dynamic parameters and protect ordering with router tests.

### 7. Data model, migrations, and documentation

The selected SQLite snapshot was internally consistent but significantly behind runtime models: it lacked current user/ad columns and whole tables such as notifications, devices, OTP verification, category templates, and bank accounts. The local seed tool upgraded only the necessary development compatibility surface, after backing up the file; subsequent API `AutoMigrate` completed runtime compatibility.

This drift is evidence that schema lifecycle is not controlled. Replace startup `AutoMigrate` with versioned migrations and test both an empty database and upgrades from every supported version. Keep seed execution explicit and environment-gated; current startup seeds can run repeatedly and ignore errors.

The generated backend Swagger currently does not describe most administrator routes. The Notebook contract contains stronger V2 concepts—versions, idempotency, and richer authentication—but those models are not wired into current persistence or handlers. Adopt features deliberately through migrations and runtime tests rather than copying aspirational types into production.

### 8. Security and Saudi data governance

Names, phone numbers, device identifiers, bank details, chat content, location, and images handled by this marketplace are personal data under the broad categories described by Saudi Arabia's Personal Data Protection Law. The production design therefore needs a documented purpose/legal-basis review, minimization, retention/deletion rules, access/correction workflows, breach handling, processor controls, and a review of transfers and hosting. This engineering assessment is not legal advice; launch controls should be reviewed by qualified Saudi privacy counsel. See the official [PDPL text maintained by the Bureau of Experts](https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/b7cfae89-828e-4994-b167-adaa00e37188/1).

Security requirements and evidence should be mapped to the Saudi National Cybersecurity Authority's current [Essential Cybersecurity Controls (ECC 2-2024)](https://nca.gov.sa/en/regulatory-documents/controls-list/ecc/) and [Data Cybersecurity Controls](https://nca.gov.sa/en/regulatory-documents/controls-list/dcc/). At minimum, secrets, privileged access, auditability, backups, vulnerability management, log handling, and data lifecycle controls need owners and testable evidence before launch.

The current configuration includes development/default credentials, permissive CORS/CSP, plaintext administrative setting values, and logs that can contain FCM tokens, phone numbers, or message content. These are production blockers, not hardening suggestions.

## Synthetic Saudi countryside dataset

The requested SQLite database now contains a deterministic dataset designed around Arabic rural marketplace workflows. Full operating instructions and safety constraints are in the backend [`DEMO_DATA.md`](../../Tihamah-Backend/Tihamah-Haraj/docs/DEMO_DATA.md).

### Contents after seeding

| Entity/state | Count |
| --- | ---: |
| Marketplace users | 23 total (20 synthetic scenario users, 2 existing base clients, 1 local admin-linked client) |
| Ads | 32 total: 13 active, 7 pending, 7 sold, 5 rejected |
| Ad media | 32 local SVG assets |
| Commissions | 7 total: 2 unpaid, 3 paid, 2 verified |
| Reports | 10 total: 6 open, 4 resolved |
| Chats / messages | 6 / 12 |
| Favorites / notifications / devices | 20 / 24 / 14 |
| Regions / localities | 9 / 39, including pre-existing records |
| Categories / banners | 15 / 6, including pre-existing records |

The records cover livestock, crops, honey, rural equipment and transport, land/farms, feed, and household production. Names and descriptions are Arabic; scenario locations cover representative countryside groupings around Jazan, Asir, Al-Baha, Makkah, and Madinah. They are **testing labels, not an official administrative gazetteer**. GASTAT reports that its official services guide covers more than 16,000 populated localities; production location IDs/names should be sourced and reconciled against authoritative datasets rather than promoted from this sample. See the official [GASTAT rural/locality guide announcement](https://stats.gov.sa/ar/w/%D8%A7%D9%84%D9%87%D9%8A%D8%A6%D8%A9-%D8%A7%D9%84%D8%B9%D8%A7%D9%85%D8%A9-%D9%84%D9%84%D8%A5%D8%AD%D8%B5%D8%A7%D8%A1-%D8%AA%D8%B5%D8%AF%D8%B1-%D8%AF%D9%84%D9%8A%D9%84-%D8%A7%D9%84%D8%AE%D8%AF%D9%85%D8%A7%D8%AA-%D8%A7%D9%84%D8%B3%D8%A7%D8%AF%D8%B3-%D8%B9).

All new people, phones, content, coordinates, payments, and conversations are fictional. Emails use `.invalid`; IBAN-like values deliberately fail real validation; FCM values are visibly `DEMO-NO-SEND`; media is local. No dataset value should be contacted, paid, or sent to an external provider.

The original pre-change snapshot is preserved as:

```text
tihamah_dev.db.before-ksa-countryside-v1-2026-09-10-20260909T223409Z.bak
```

## Verification evidence

| Check | Result |
| --- | --- |
| SQLite `PRAGMA integrity_check` and foreign-key check | Passed |
| Seeder first apply plus repeat/idempotency tests | Passed: 2 Python tests |
| Focused JWT, CORS, and existing seed Go packages | Passed |
| Dashboard production build | Passed; existing bundle-size warning remains |
| Live API login/token fields | Passed |
| Live metrics, ads, commissions, reports, and SVG media | Passed |
| Browser remote-backend scenario | Passed: 1 test in 21.0 seconds; login, metrics, listings, commissions, reports, preflight requests, and local media used the real API. |
| Full backend `go test ./...` | Not fully green: pre-existing `internal/storage` `TestSafeObjectKey` failure accepts a Windows-style `C:\\secret` object key. All other observed packages passed. |

The failing storage path test should be treated as a security defect and fixed before accepting uploads. It was not introduced by the seed or token/CORS changes.

## Recommended implementation sequence

### Phase 0 — launch safety and correctness

1. Remove fail-open database fallback; introduce explicit database selection, versioned migrations, and dependency-aware readiness.
2. Make sell/moderate/commission transitions transactional and database-constrained; add idempotency and resource versions.
3. Implement durable admin auditing and reason capture for every privileged mutation.
4. Enforce current administrator status/role/auth version; resolve refresh-token behavior and revoke sessions.
5. Remove default secrets, restrict CORS/CSP, redact configuration/logs, and fix Windows/backslash object-key validation.

**Exit criterion:** destructive and financial flows cannot partially succeed; production cannot boot with fallback storage or default credentials; every privileged mutation is attributable and replay-safe.

### Phase 1 — complete the dashboard contract

1. Implement validated list filters, explicit transition commands, not-found behavior, detail routes, resolution/ban notes, and stable machine-readable error codes.
2. Build administrator media presign/finalize endpoints with content enforcement and scanning.
3. Implement notification/SMS jobs and honest delivery states, including a no-send development adapter.
4. Separate public settings from secrets and make typed updates transactional/versioned.
5. Generate one runtime OpenAPI contract and add dashboard/backend consumer-contract tests.

**Exit criterion:** every visible dashboard control either completes and persists its documented result or exposes a specific actionable failure; no request field is silently discarded.

### Phase 2 — operability, scale, and Saudi launch evidence

1. Add integration, migration, permission-matrix, failure-injection, and financial-invariant suites.
2. Establish query/index and pagination budgets using production-scale synthetic data; remove slow sequential/N+1 patterns.
3. Add structured logs, metrics, traces, alerts, backup/restore drills, and liveness/readiness separation.
4. Complete PDPL data mapping, retention/erasure/access procedures, incident response, provider reviews, and ECC/DCC control evidence.
5. Replace representative locality data with an approved canonical hierarchy and Arabic search/normalization rules.

**Exit criterion:** release evidence includes security/privacy sign-off, restore and incident drills, defined SLOs, passing load/security tests, and a complete trace from UI action to database/audit/provider outcome.

## Production-ready definition

The backend is ready for launch only when all P0 gaps are closed and independently tested, all dashboard workflows have an authoritative OpenAPI contract, real provider actions return durable outcomes, privileged actions are audited, production starts with one explicit database and rotated secrets, and the Saudi privacy/security operating controls have named owners and evidence. A successful demo or green UI test is necessary evidence, but it is not a substitute for those guarantees.

### Sources

- [Saudi Bureau of Experts — Personal Data Protection Law](https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/b7cfae89-828e-4994-b167-adaa00e37188/1)
- [Saudi National Cybersecurity Authority — Essential Cybersecurity Controls](https://nca.gov.sa/en/regulatory-documents/controls-list/ecc/)
- [Saudi National Cybersecurity Authority — Data Cybersecurity Controls](https://nca.gov.sa/en/regulatory-documents/controls-list/dcc/)
- [General Authority for Statistics — rural/locality services guide announcement](https://stats.gov.sa/ar/w/%D8%A7%D9%84%D9%87%D9%8A%D8%A6%D8%A9-%D8%A7%D9%84%D8%B9%D8%A7%D9%85%D8%A9-%D9%84%D9%84%D8%A5%D8%AD%D8%B5%D8%A7%D8%A1-%D8%AA%D8%B5%D8%AF%D8%B1-%D8%AF%D9%84%D9%8A%D9%84-%D8%A7%D9%84%D8%AE%D8%AF%D9%85%D8%A7%D8%AA-%D8%A7%D9%84%D8%B3%D8%A7%D8%AF%D8%B3-%D8%B9)
