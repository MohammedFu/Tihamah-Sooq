# Listing moderation

T18 connects `/listings` to the registered Refine provider in both fixture and remote modes. The page no longer reads or mutates `src/data/adminFixtures.ts`.

## Confirmed backend contract

The executable backend takes precedence over the older dashboard proposal:

- `GET /api/v1/admin/ads` returns paginated `models.Ad` rows and preloads seller, category, region, village, and media. The selected list row therefore supplies the detail drawer; no admin GET-by-ID route is invented.
- The page sends `page`, `limit`, one required `status`, optional `q`, and the confirmed `price_asc`/`price_desc` sort. The backend search covers title and description only.
- `PATCH /api/v1/admin/ads/{id}/status` receives exactly `{ "status": "active" }` or `{ "status": "rejected" }`.
- `DELETE /api/v1/admin/ads/{id}` uses GORM soft deletion. The UI calls this “hide,” confirms the consequence, and does not claim that a hard delete occurred.

All mutations are pessimistic, locked against duplicate submission, reported through the shared notification queue, and followed by Refine invalidation of listings, dashboard metrics, and audit-query caches. Image, video, absent-media, missing-relation, loading, empty, read-error/retry, action-error, success, and permission-disabled states are represented.

## Unresolved backend gaps

The current repository defaults an omitted `status` query to `active`; it cannot reliably return all statuses in one request. The page therefore starts with `pending_review` and exposes one status at a time instead of mislabelling active-only data as “all.”

`dto.UpdateAdStatusRequest` contains only `status`. It has no rejection reason, moderator identity, moderation timestamp, version, ETag, or conditional-write field. The dashboard requires a reason before a rejection or active-to-rejected transition, warns the administrator that the reason cannot be persisted, and deliberately omits it from the request rather than adding an undocumented field. The backend currently sends a generic status notification only. These gaps keep T18 `PARTIAL` until the server contract can persist the decision context and reject stale/repeated moderation safely.

The live Swagger document at `http://localhost:8080/swagger/doc.json` does not currently publish the registered admin-ad routes, although the executable router and handler confirm them. Swagger should be regenerated from the backend annotations.

## Verification

- Service/provider tests assert query serialization, mapped relations/media, required status scope, exact status-only bodies, and soft-delete routing.
- Schema/component tests cover rejection validation, loading, empty, read-error/retry, media detail, confirmed transitions, and deletion confirmation.
- `e2e/listing-moderation.spec.ts` covers approve, validation failure, reject/deactivate, reactivate, and soft delete at 390 CSS pixels.

Verification passed with 134 Vitest tests, type checking, and the production build. The new moderation workflow plus the responsive table cases passed at 390, 768, and 1440 CSS pixels. On Windows, Playwright again remained alive after printing every focused case as passed; it was stopped during teardown, matching the pre-existing runner behavior recorded in the implementation plan.
