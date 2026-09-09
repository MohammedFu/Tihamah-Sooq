# Audit metadata and mutation attribution

This document details the client-side correlation tracking, mutation audit logging, diagnostic attribution, and fail-closed boundaries established under task T27.

## End-to-end correlation ID lifecycle

Every request issued through `ApiClient` is assigned a correlation identifier to support end-to-end tracing across network hops and service logs:

1. **Client generation & transmission:**
   - When an explicit `correlationId` is not provided in `ApiRequestOptions` or `RequestContext`, `ApiClient` automatically generates a cryptographically random UUID v4 (`crypto.randomUUID()` or fallback via `crypto.getRandomValues`).
   - The ID is passed in both `X-Correlation-Id` and `X-Request-Id` headers on all outgoing HTTP requests.
2. **Server acknowledgment & diagnostic retention:**
   - When a server response includes `X-Correlation-Id` or `X-Request-Id` headers, the server's ID takes precedence as the canonical operation reference.
   - If a request fails (HTTP 4xx/5xx, invalid envelope format, timeout, network error, client abort, or unparseable JSON), `ApiError` retains the request identifier (`requestId`).
3. **Operator error attribution:**
   - Notification toasts via `notificationStore.trackPromise` automatically extract `error.requestId` and append Arabic diagnostic text (`معرّف العملية: {requestId}`) to the notification description.
   - Surface error displays (e.g. `SystemPage`) display the request ID directly (`معرّف الطلب: {requestId}`) so operators can cross-reference failure reports with backend log aggregators.

## Mutation audit logging & attribution

Audit trails record administrative operations across domain entities (users, listings, commissions, reports, broadcasts, settings):

1. **Acting admin attribution:**
   - In fixture/mock mode, mutations resolve the acting administrator identity from session storage (`adminSessionRepository.load()?.admin ?? null`).
   - Recorded fields include `id`, `adminId`, `admin` identity object (`name`, `email`), `action`, `entityType`, `entityId`, `ipAddress` (`127.0.0.1`), `userAgent`, `metadata`, and ISO timestamp `createdAt`.
2. **Pessimistic confirmation guarantee:**
   - Audit entries are committed to the audit store **only after** the corresponding mutation succeeds. The frontend never renders or claims an audit record exists before server/mutation confirmation (no optimistic audit creation).
3. **Search & inspection:**
   - The audit view (`/system` -> سجل التدقيق) supports text search filtering across action names, entity types, administrator names, and mutation metadata (e.g. ban reasons, review notes, broadcast titles, modified setting keys).
4. **Append-only & read-only integrity:**
   - Audit logs are strictly immutable: no edit, delete, or clear endpoints exist in either the contract or the UI. Operators have read-only access.

## Contract gaps & fail-closed boundaries

As established in `IMPLEMENTATION_PLAN.md` Section 4:

- **Known Contract Gap 5 (Missing remote audit-list endpoint):**
  The remote backend does not register `GET /api/v1/admin/audit-logs`. The remote service adapter in `services.ts` deliberately fails closed with `UNCONFIRMED_ADMIN_CONTRACT`, preventing invented requests or fabricated mock data when pointing to production APIs. Fixture mode supplies a local, read-only adapter.
- **Known Contract Gap 14 (Listing rejection attribution):**
  The remote listing rejection endpoint (`POST /api/v1/admin/listings/{id}/reject`) accepts no body payload; rejection reasons and admin attribution cannot be delivered remotely and are documented as an open backend gap.
