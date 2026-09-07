# Administrative data services

T05 registers `adminDataProvider` with Refine in `src/app/App.tsx`. Runtime composition lives in `src/app/providers.tsx`; `VITE_API_MODE` selects fixture or remote services with the same `AdminServices` interface. Remote requests use the existing HTTP client and session repository. Both runtime modes reject operations without a valid administrator session. The backend remains responsible for authorization; the frontend permission matrix is T09–T10.

The dashboard statistics and listing-moderation page now read through the registered provider. The remaining operational pages still use their original review fixtures until their individual T19–T25 integrations. The provider fixture store is separate from those page fixtures, lives in memory, resets on reload, and makes no network requests. Each factory invocation creates independent state.

## Sources and contract decisions

Reviewed through 2026-09-07: the executable backend router/handler/DTO, `Notebook/swagger_docs_v2.go`, `Notebook/tihamah-haraj-postman-collection.json`, the unified API specification, and the relevant sections of the detailed API and dashboard guides.

Use an API base URL ending in `/api/v1`, for example `https://api.example.com/api/v1` or `/api/v1`. Services append `admin/...`; do not include `/admin` in the configured base URL.

| Resource | Confirmed operations | Read behavior |
| --- | --- | --- |
| `categories` | GET/POST collection, PUT/DELETE `{id}` | Complete collection; detail and `getMany` resolve from it |
| `regions` | GET/POST collection, PUT/DELETE `{id}` | Complete collection, optionally containing villages |
| `villages` | GET/POST collection, PUT/DELETE `{id}` | Complete collection; `regionId` equality also sends `region_id` |
| `banners` | GET/POST collection, PUT/DELETE `{id}` | Complete collection with basic image/order/active fields |
| `users` | GET collection | Server `page`, `limit`, `q`, `is_banned` |
| `commissions` | GET collection | Server `page`, `limit`, `status` |
| `reports` | GET collection | Server `page`, `limit`, `status` |
| `listings` | GET `/admin/ads` | Server `page`, `limit`, required `status`, optional `q`, and price sorting |
| `statistics` | GET `/admin/stats` | One aggregate object; no server timestamp is returned |

There are no confirmed GET-by-ID routes for the four editable catalogs. Catalog filtering, sorting and pagination therefore run over the returned collection; `total` is the filtered count before slicing. No undocumented pagination or sorting parameters are sent. `getMany` makes one collection read and returns requested IDs in order; missing IDs fail with 404. Server-paginated resources preserve `pagination.total_rows` instead of counting the current page.

`regions` and `villages` are registered as hidden Refine resources under the existing `locations` navigation entry. `locations` and `system` are screen groups, not CRUD API routes.

## Inputs and query semantics

Use domain `camelCase` names at the provider boundary. Runtime validators build documented `snake_case` request bodies and reject unknown input fields before I/O. Updates use PUT and require the fields marked required by the endpoint: category/region name, village name and region ID, or banner image URL. A partial active toggle alone is not a valid PUT; feature code must supply the required fields from the reviewed record. No fetch/merge/write is performed implicitly.

```ts
await adminDataProvider.getList({
  resource: "categories",
  pagination: { currentPage: 2, pageSize: 20 },
  filters: [{ field: "isActive", operator: "eq", value: true }],
  sorters: [{ field: "sortOrder", order: "asc" }],
});

await adminDataProvider.getList({
  resource: "users",
  filters: [
    { field: "q", operator: "contains", value: "أحمد" },
    { field: "isBanned", operator: "eq", value: false },
  ],
});
```

Catalog fields support `eq`; textual `name` also supports `contains`. Sortable/filterable fields are `id`, `name` where present, `isActive`, `sortOrder` on categories/banners, and `regionId` on villages. Sorting has an ID tie-breaker. All filter clauses are ANDed. Unsupported fields, operators, OR groups and invalid value types fail explicitly.

Refine `pagination.currentPage` is one-based. Default page size is 20. `mode: "off"` and `mode: "client"` return the complete filtered catalog, leaving client pagination to Refine. These modes and sorting are rejected for server-paginated resources, because fetching every server page or sorting only a partial page would produce misleading results. User region/village filters and report type filters require backend confirmation before their page tasks enable them.

Services accept `signal` in their request context; Refine callers can supply `meta: { signal }`. Request IDs must be positive safe integers; numeric Refine string IDs are normalized without permitting arbitrary path segments. Media inputs accept HTTP(S) URLs; configured-host/file validation and upload lifecycle remain T28.

## Business actions and incomplete contracts

Business actions use `adminServices` directly instead of generic CRUD or arbitrary `custom` URLs:

- `statistics.get()` maps `/admin/stats`, retaining nullable optional counters and numeric monetary amounts. T17 exposes this single read through Refine's restricted `custom` provider method; other custom URLs or verbs remain unsupported.
- `users.ban(id, { isBanned, reason })` uses PATCH `/admin/users/{id}/ban`. A ban requires a nonblank reason. Unban sends `is_banned: false` and clears the reason. The response is an action acknowledgement, not a user record or proof that active sessions were revoked.
- `reports.resolve(id, notes)` uses PATCH `/admin/reports/{id}/resolve` with `status: "resolved"` and required `resolution_notes`. Its acknowledgement does not claim a compound listing deletion or user ban occurred.
- `listings.list` uses GET `/admin/ads`; `listings.moderate` uses PATCH `/admin/ads/{id}/status`; and `listings.delete` uses DELETE `/admin/ads/{id}`. List rows contain the relations and media used by the detail drawer. Rejection requires a local reason, but only `status` is sent because the backend DTO has no reason field. Delete is presented as a soft-delete/hide operation. See [the listing moderation guide](./LISTING_MODERATION.md).
- `commissions.verify(id, { status: "verified" })` uses PATCH `/admin/commissions/{id}/verify`. Swagger references an absent `dto.VerifyCommissionRequest` definition and Postman contains `{}`. The detailed API guide confirms only `{ "status": "verified" }`. Remote rejection and notes fail with `UNCONFIRMED_ADMIN_CONTRACT`, rather than dropping financial decision data. Fixture mode supports rejection with notes for local review. T20 must confirm the full financial contract before connecting that workflow.
- `broadcasts.send({ title, body, audience: "all" })` sends POST `/admin/notifications/broadcast`. Region/village targets are rejected in both modes; they must never silently become a broadcast to everyone. Success acknowledges acceptance, not a recipient count or delivery guarantee.
- `settings.list/update/updateBatch/setOtpEnabled` use the documented settings paths and verbs. Single/batch/OTP mutations can return top-level acknowledgement fields rather than a `data` envelope. Setting keys cannot select nested routes. SMS gateway controls and the missing `TestSMSRequest` DTO remain part of T25.
- `audit.list` retains an explicit local-review adapter in fixture mode because no remote audit-list route is confirmed. Fixture audit rows are read-only seed data; mutations never fabricate server-confirmed audit entries.

Catalog deletes return only `{ id }` after a confirmed success or empty 204/205 response. Neither a fabricated deleted record nor a hard/soft-delete guarantee is returned. Fixture mode simulates dependency conflicts; actual backend constraints remain authoritative.

## Cache and presentation responsibilities

Use Refine `useCreate`, `useUpdate` and `useDelete` for standard catalog operations. Their default invalidation scopes refresh that resource's relevant list/many/detail queries. Services do not own a global cache or invalidate all queries.

`useAdminAction` wraps successful domain actions and related hierarchy changes with explicit resource invalidation. For example:

```ts
const runAction = useAdminAction();
await runAction("village", () => adminServices.villages.update(id, values));
// Refreshes villages and regions, including a region's embedded village tree.
```

Other action scopes cover affected user/listing/commission/report metrics and audit resources. `report` resolution refreshes reports, dashboard and audit; compound actions must invoke their own user/listing scopes. Failed actions invalidate nothing and are not retried automatically. T10 now enforces those compound permissions in the fixture UI; feature hooks must retain pending/error/form state, prevent duplicate submissions, provide confirmations, and refetch after acknowledged mutations as pages move to the provider in their scheduled tasks.

Dashboard statistics remain fresh in Refine's client cache for five minutes and support explicit refresh. The shown update time is the time of the last successful client fetch because the backend response has no timestamp. A failed background refresh preserves the last successful data and marks the failure; missing new-user/new-listing/verified-commission/OTP extensions are displayed as unavailable. See [the dashboard metrics guide](./DASHBOARD_METRICS.md).

Errors retain `ApiError.kind`, `status`, Refine-compatible `statusCode`, and safe Arabic messages. Invalid mapped responses produce `INVALID_ADMIN_RESPONSE` rather than an empty success. 401 clears the remote session through the HTTP client; 403 and conflicts propagate without changing local records. Loading/success/empty/error states are exposed through Refine query and mutation state without adding temporary product UI.

## Verification

`npm test` includes catalog contract tests for fixture and mocked remote transports, strict queries/payloads, action acknowledgements, unsupported contracts, cancellation, session guards, fixture conflicts/isolation, and a real Refine cache integration test. `npm run test:e2e` includes the existing authentication flow plus fixture provider CRUD and session checks inside the running app at 390 and 1440 px. Browser checks require no external images. No test performs a live financial, destructive or broadcast request.
