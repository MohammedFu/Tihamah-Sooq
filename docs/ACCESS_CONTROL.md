# Administrator access control

The dashboard registers `adminAccessControlProvider` with Refine. It reads permissions only from the current validated administrator session. A missing, expired, malformed, or inactive session grants no access. Displayed role names and numeric role IDs never imply privileges.

## Permission normalization

The Swagger models expose free-form `Permission.name` and `Permission.module` strings, with examples such as `view_users` in `Users` and `delete_ads`. Because the backend does not publish a complete permission enum, the client applies a small documented normalization layer and denies values it does not recognize.

| Dashboard action | Accepted verb prefixes |
| --- | --- |
| `list`, `show` | `list`, `show`, `view`, `read` |
| `create` | `create`, `add` |
| `edit` | `edit`, `update` |
| `delete` | `delete`, `remove` |
| `approve`, `reject`, `ban`, `verify`, `resolve` | Matching verb |
| `broadcast` | `broadcast`, `send_notification`, `send_notifications` |
| `manage_settings` | `manage_settings`, `update_settings` |

Names and modules are trimmed, lowercased, and normalize spaces or hyphens to underscores. Resource families recognize the documented UI/API vocabulary, including `ads` for listings, `finance` for commissions, and `regions`/`villages` for locations. A `manage` or `manage_all[_...]` permission grants the actions in its matching module family. It does not grant access across unrelated modules.

## UI behavior and trust boundary

- The sidebar and dashboard queue links omit destinations without `list` access.
- Every operational route has a Refine permission guard. Typing a hidden URL renders a forbidden state and links to the first available section.
- Record controls remain visible but disabled when the administrator lacks the required action. Report decisions that delete a listing or ban a user require both `reports/resolve` and the affected resource permission.
- The system page exposes broadcast and audit sections independently. Notification sending requires `notifications/broadcast`; audit records require `audit/list` and remain read-only.
- Loading and permission-query failures fail closed. Unknown resources and actions also fail closed.

These checks improve navigation and prevent accidental actions; they are not the authorization boundary. Every API request still carries the administrator token and the backend must enforce its current policy. A backend `403` is preserved as a forbidden error and does not clear the valid session. A `401` still clears the session and returns the administrator to login.

When the backend publishes a canonical permission catalogue, update the alias matrix and its table-driven tests together rather than inferring permissions from role labels.
