# Authentication and authorization error states

T11 gives authentication and service failures a consistent Arabic recovery path. The executable Swagger contract describes bearer authentication and a shallow `{ success, message }` error response, while the unified API document also describes nested `{ error: { code, message, details } }` data. The HTTP layer accepts both shapes and exposes only normalized `ApiError` metadata to the UI.

The administrator contract still has no confirmed refresh endpoint. An expired or rejected access token therefore ends the local session and requires a new login; the dashboard does not call the mobile refresh route.

| Condition | State | Session behavior | Recovery |
| --- | --- | --- | --- |
| No stored session | Login | Remains signed out | Authenticate, then restore the requested safe dashboard route |
| Local expiry or authenticated API `401` | Session expired | Session data is removed | Open login and restore the requested route when it is known |
| Malformed stored session or inactive administrator | Unauthorized | Invalid data is removed | Open a clean login screen |
| Permission failure or API `403` | Forbidden | Valid session is retained | Navigate to the first permitted section |
| Network, timeout, `429`, or `5xx` failure | Service unavailable | Valid session and page state are retained | Retry the failed request in place |

`AdminSessionRepository` keeps only a short in-memory failure reason after removing invalid storage. Tokens and identity data are never copied into route state or error messages. `/session-expired` and `/unauthorized` are public routes so a signed-out administrator cannot enter a redirect loop. Their login links retain the sanitized original dashboard destination when routing supplied one.

`ErrorState` is the shared view for forbidden, session, service, and generic failures. Feature pages should render it inside their existing component tree and pass the query or mutation `refetch` callback as `onRetry`; this preserves filters and unsaved form state. A pending retry disables its button. Request IDs may be displayed for support diagnostics, while raw response bodies, tokens, and stack traces must remain hidden.

Refine receives the original normalized error. `authProvider.onError` returns one logout redirect for `401`, retains the session for `403` and temporary failures, and leaves retry decisions to the feature that owns the request.
