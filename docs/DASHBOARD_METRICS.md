# Dashboard metrics

T17 connects the overview route to the authenticated `GET /api/v1/admin/stats` contract through Refine's server-state cache. The page no longer renders fabricated growth charts, OTP totals, review records, or queue counts.

## Contract decision

The executable backend router, handler, DTO, Swagger source, and Postman collection agree on `/api/v1/admin/stats`. The older dashboard analysis describes `/api/v1/admin/dashboard/stats`, Redis caching, and additional counters, but those details are not present in the executable contract. The frontend therefore uses the executable route and does not claim a server-generated timestamp or server cache age.

The confirmed response fields are:

| API field | Dashboard use |
| --- | --- |
| `total_users` | Total users |
| `active_ads` | Active listings |
| `sold_ads` | Sold listings |
| `pending_review_ads` | Pending-review listing metric and queue link |
| `total_commissions` | Total commission value |
| `pending_commissions` | Unpaid/due commission value |
| `paid_commissions` | Paid value awaiting verification and its queue link |
| `open_reports` | Open-report metric and queue link |

The domain mapper also accepts nullable forward-compatible fields for new users, new listings, verified commission value, and OTP usage/quota. When the backend omits them, the interface says that they are unavailable; it never substitutes zero or a fixture value.

## Query and freshness behavior

`useDashboardMetrics` uses Refine `useCustom` and the restricted data-provider custom route. Only a GET for `admin/stats` is accepted; arbitrary custom URLs and methods fail closed. Requests inherit the authenticated service guard and cancellation signal.

The successful result is considered fresh for five minutes in the client cache. The displayed “last updated” value is Refine's local successful-fetch time, not a server timestamp. After five minutes the page marks the result as old. Administrators can refresh manually; duplicate refresh clicks are locked while a request is active. If a later refresh fails, the last successful metrics remain visible with an alert. An initial failure uses the shared retryable error state.

All counts use `Intl.NumberFormat("ar-SA")`; monetary values use the SAR currency formatter. A valid all-zero response is rendered as zero metrics with an explicit no-activity message, distinct from loading or failure.

## Queue navigation

Queue links are permission-aware and use filters already supported by their destination pages:

- Pending listing review: `/listings?status=pending_review`
- Paid commissions awaiting audit: `/commissions?status=paid`
- Open reports: `/reports?status=open`

`paid_commissions` is an amount, not a record count, so the commission queue link labels it as a value. No separate queue-summary endpoint is currently confirmed.

## Verification

Mapper tests cover the eight-field response, omitted optional fields, compatible optional extensions, and malformed payload rejection. Component tests cover loading, initial error/retry, all-zero data, optional-data presentation, manual refresh, preservation of the last successful result, localization, and filter destinations. Playwright verifies the fixture-backed result at 390 and 1440 pixels, checks overflow and queue URLs, and captures a full-page screenshot for each viewport in the ignored test-results directory.
