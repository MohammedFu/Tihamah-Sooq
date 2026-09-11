# Concurrency and stale-record handling

## Contract decision

The executable contract exposes `updated_at` on marketplace entities, but it does not define a record version, ETag, `If-Match`, `If-Unmodified-Since`, or another conditional-write field for administrator mutations. The Swagger and Postman contracts also do not describe a stale-write response body. An update timestamp is therefore treated as display metadata, not as a safe concurrency token.

The dashboard must not invent a conditional header or request field. Server-enforced prevention of silent overwrites remains a backend contract gap.

## Current client behavior

- `409 Conflict`, `412 Precondition Failed`, and the explicit `CONFLICT`, `PRECONDITION_FAILED`, `STALE_RECORD`, and `VERSION_CONFLICT` codes are normalized as stale-write conflicts.
- Listing moderation/deletion, user ban decisions, commission verification, and report resolution use pessimistic Refine mutations with mutation retries disabled.
- A rejected action is never applied to local drawer state and is never automatically submitted again.
- Conflict responses start a background refresh only for resources affected by the high-risk action. Ordinary validation, network, and authorization failures do not trigger this path. Catalog dependency conflicts keep their existing feature-specific handling.
- The action overlay closes so that a conflict notice is visible in the record drawer. The notice includes the server message and request ID when available.
- “تحديث ومراجعة السجل” reloads the current scoped list and closes the stale drawer. Search, status, page size, and other URL-backed filters remain unchanged, so the operator reviews a fresh row before opening another decision flow.
- If the refresh fails, the conflict remains visible and no decision is implied.

## Remaining backend work

To complete T30, mutation responses and list/detail resources need one confirmed concurrency mechanism, preferably an opaque version/ETag with conditional writes. The backend must reject mismatched versions before changing data and return `409` or `412` with a stable error code and the current record/version. The multi-step report actions also need a server transaction or a single atomic administrative endpoint; the client cannot make a listing deletion plus report resolution atomic.

After that contract is available, the service adapter can send the confirmed precondition, map the current record into the review state, and add live two-administrator integration tests.

## Verification

Coverage includes HTTP conflict classification, affected-cache invalidation, non-retry behavior, the accessible conflict notice, a listing page integration scenario, and a Playwright workflow that verifies at 390 and 1440 px that a simulated `412` does not change local state, cause page-level overflow, or lose Arabic URL filters.
