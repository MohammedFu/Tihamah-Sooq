# Administrator identity (T09)

`Header` renders the auth feature's `AdminMenu`, which reads `useGetIdentity<AdminAccountIdentity | null>()` from Refine. `authProvider.getIdentity()` projects the validated session through `toAdminAccountIdentity`. Its result contains only the account ID, display name, role name, initials, email, phone and stored expiry. Tokens, password fields and the raw role/permission graph are excluded from the identity cache and rendered UI. `getPermissions()` remains separate for T10.

## Contract and fallbacks

The relevant sources were reviewed on 2026-09-05: `Notebook/swagger_docs_v2.go` (`models.Admin`, `models.Role`, `models.Permission`, `dto.AdminAuthResponse`, and admin authentication routes) and the Admin/Role definitions in `Notebook/marketplace_models-v2.go`.

Swagger's Admin schema omits the nested role, while the backend model declares `role,omitempty`. The login mapper already supports an optional role. The menu displays a supplied role name and uses “الدور غير متاح” if absent or blank; it never infers privileges from `role_id`. Neither source documents an administrator avatar field or a profile-refresh endpoint. The UI uses deterministic initials and the existing login/session identity without an additional request.

A blank string name is a cosmetic omission: the session repository permits it and the display uses “حساب الإدارة”. Required field types, token validation, administrator activity and expiration checks remain enforced; missing/non-string required name values still invalidate the session. Empty contacts display “غير متاح”. Initials use the first letter/number of the first two name words, including Arabic names with diacritics; names without usable letters/numbers receive “إ”. All names and roles remain plain text.

## Session and interaction behavior

`AdminSessionRepository.getExpiresAt()` reads the same validated stored record as `load()`. Viewing identity does not extend the session lifetime. The menu formats that absolute timestamp in the browser's local time. It rechecks the local identity when the displayed expiry is reached, removing stale account details if the session is no longer valid. This is a local read, not token renewal. Anonymous, malformed or expired sessions return `null`; the existing protected routes and logout flow remain responsible for navigation.

The account popup is a disclosure region containing profile information and ordinary buttons. It is not an ARIA action menu or a modal: Enter/Space opens it, focus moves to the labelled region, Tab/Shift+Tab follow normal document order, and leaving the account with Tab or an outside click dismisses it. Escape and the close button return focus to the trigger. Logout remains available during identity loading, missing-session and error states, disables while pending, and shows retryable generic feedback on failure. Identity read errors have their own retry control; diagnostic text is not displayed.

Header text is bounded and ellipsized on desktop, and the compact mobile trigger retains the full account name in its accessible label. The popup wraps full Arabic names, roles and long contacts, constrains its width/height to the viewport, and isolates email/phone text in LTR elements. No profile-edit action is exposed without a documented endpoint.

## Verification

Unit/component tests cover the wire-to-display projection, optional role, Arabic/Latin initials, blank display values, stored expiry, credential-free identity results, loading/error/retry states, keyboard dismissal/logout and repeated pending clicks. Browser tests exercise full and partial identities at 390 and 1440 px, check panel/document bounds and LTR contacts, verify session cleanup after keyboard logout, and advance the browser clock across expiry. Review screenshots are written under ignored `test-results` directories; no snapshot baseline is added.
