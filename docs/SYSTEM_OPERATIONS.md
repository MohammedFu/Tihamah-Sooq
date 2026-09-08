# System operations

The `/system` route exposes three permission-scoped operator surfaces: notification broadcasts, operational settings, and a read-only audit view. T25 connects only behavior confirmed by the executable administrator contract and keeps incomplete contracts visibly unavailable.

## Confirmed endpoints

| Workflow | Request | Dashboard behavior |
| --- | --- | --- |
| Broadcast | `POST /api/v1/admin/notifications/broadcast` with `{ title, body }` | All users only; the review dialog shows the latest dashboard user count as an estimate, locks duplicate submissions, and reports success only after the server acknowledges the request. The estimate is not a delivery receipt. |
| Settings list | `GET /api/v1/admin/settings` | Renders key, description, and value. Keys that look secret (`api_key`, password, secret, token, or private key) are redacted before reaching the page. |
| Single setting | `PUT /api/v1/admin/settings/{key}` with `{ value }` | Uses a validated key path and a pessimistic save. |
| SMS configuration | `GET` and `PUT /api/v1/admin/settings/sms` | Maps the documented provider, sender, username, user-sender, API-key, and OTP fields. Existing API keys are represented only as “configured”; the raw value is never returned to the component or prefilled. A blank API-key editor value omits that field and preserves the current secret. |
| OTP mode | `PATCH /api/v1/admin/settings/otp` with `{ is_otp_enabled }` | Requires a confirmation because enabling external delivery may consume SMS quota. |

The settings response may use a `data` envelope or a documented top-level acknowledgement. Domain objects use camelCase while the wire payload remains snake_case.

## Deliberately unavailable operations

- Region and village broadcast targeting are not sent because the confirmed broadcast DTO contains only `title` and `body`. The UI cannot silently convert a targeted request into a global broadcast.
- SMS test is disabled because Swagger references `TestSMSRequest` without defining its request body, while the Postman example sends `{}`.
- OTP quota and usage are shown only when the statistics response includes those optional extensions; otherwise the page says they are unavailable.
- No remote audit-list endpoint is registered in the reviewed contract. Remote mode fails closed without issuing an invented request. Fixture mode supplies an explicitly local, read-only adapter for pagination and text search.

## Permissions and failure behavior

Tabs are derived from the administrator's confirmed permissions. Broadcast actions require the notification broadcast permission, setting mutations require settings management, and the audit tab requires audit viewing. Backend authorization remains authoritative.

All mutations are pessimistic: forms and confirmation actions remain locked while pending, failures preserve entered values for correction, and success feedback appears only after acknowledgement. Audit records have no edit or delete controls and local mutations do not fabricate audit evidence.

## Verification

Vitest covers strict broadcast/SMS/OTP payloads, secret redaction, duplicate-submit protection, permission states, and fixture audit pagination/filtering. Playwright covers the system tab keyboard order as part of the accessibility suite. No automated test contacts a live SMS gateway or sends a production broadcast.
