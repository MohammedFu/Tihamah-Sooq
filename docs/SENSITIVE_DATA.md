# Sensitive operational data masking and reveal controls

This document specifies the masking rules, permission gates, write-only configurations, and leak prevention mechanisms implemented under task T29 to protect Personally Identifiable Information (PII) and credentials across the Tihamah Sooq administrator dashboard.

## Overview

The dashboard operations handle sensitive customer and platform data, including phone numbers, emails, bank accounts, IBANs, transaction references, and API credentials. To comply with privacy requirements and minimize risk, all sensitive fields follow a **masked by default** architecture with permission-controlled reveal mechanisms.

## Masking standards

All masking utilities are centralized in `src/utils/masking.ts` with pure deterministic transformations:

| Data Type | Raw Example | Masked Output | Rules |
| --- | --- | --- | --- |
| **Saudi Mobile (Intl)** | `+966500000001` | `+966 50 ••• 0001` | Preserves country code, mobile network prefix (`50`), and last 4 digits; replaces middle 3 digits with `•••`. |
| **Saudi Mobile (Local)** | `0501234567` | `050 ••• 4567` | Preserves local prefix (`050`) and last 4 digits; masks middle with `•••`. |
| **Other International** | `+967700000012` | `+9677 ••• 0012` | Preserves country/area prefix and last 4 digits. |
| **Email Address** | `majed@example.test` | `m••••d@example.test` | Preserves first char, last char of local part, and complete domain name. |
| **Saudi IBAN** | `SA0380000000608010167519` | `SA03 •••• •••• •••• •••• 7519` | Preserves country code + check digits (`SA03`) and final 4 digits across standard 4-character grouping. |
| **Bank Reference** | `TRX-982104` | `TRX-•••104` | Preserves transaction prefix and last 3 digits. |
| **Credentials & Secrets** | `api_key_secret_value` | `••••••••` | Completely masked; write-only on server and client. |
| **Empty / Falsy** | `null` / `""` / `undefined` | `—` | Renders a clean em-dash without reveal buttons. |

## Permission-gated reveal control

The reusable `SensitiveValue` component (`src/components/ui/SensitiveValue.tsx`) wraps sensitive data:

1. **Default State:** Renders the masked value in a `<bdi dir="ltr">` container to prevent RTL bidirectional text scrambling.
2. **Access Control Check:** 
   - Uses Refine's `usePermissions` and evaluates `canAccessWithPermissions(permissions, resource, action ?? "show")`.
   - Alternatively accepts an explicit `canReveal` boolean prop.
3. **Authorized Behavior:**
   - When the administrator possesses the required permission (e.g. `view_users`, `manage_users`, `show`), an accessible `<button>` displays Lucide `Eye`/`EyeOff` icons.
   - Screen-reader accessible: dynamically toggles `aria-label="إظهار {label}"` / `aria-label="إخفاء {label}"`.
   - Full keyboard navigation supported (`Tab`, `Space`, `Enter`).
   - Supports an optional `onReveal` callback to emit audit telemetry when an operator unmasks PII.
4. **Unauthorized Behavior:**
   - If the administrator lacks permission, the value remains permanently masked.
   - The toggle button is omitted and replaced by a locked indicator (`Lock` icon) with `title="يتطلب صلاحية لعرض القيمة الكاملة"`.

## Affected surfaces

`SensitiveValue` is integrated across all primary operational tables and inspection drawers:

- **Users (`/users`):**
  - Table: customer phone number in the primary user column.
  - Drawer: phone number in the customer profile card.
- **Listings (`/listings`):**
  - Table: seller phone number under advertiser name.
  - Drawer: advertiser phone number in listing metadata.
- **Commissions (`/commissions`):**
  - Table: seller phone number in the seller column.
  - Drawer: seller phone number in the financial inspection drawer.
- **Reports (`/reports`):**
  - Table: reporter phone and accused seller phone numbers.
  - Drawer: reporter and accused seller phone numbers.

## Write-only settings & secret protection

In the system settings interface (`/system`):
- Keys containing `api_key`, `secret`, `token`, `password`, or `private_key` are redacted on receipt from the API.
- The UI displays `"مُعيّنة ومحجوبة"` with a lock icon.
- Edit inputs are write-only: secret values are never prefilled into input fields. Leaving the field blank preserves the existing secret on the server.

## Leak prevention boundaries

- **Sanitization:** `sanitizeSensitiveString` redacts passwords, bearer tokens, and secrets from error strings, URL parameters, and logs (`password=••••`, `Bearer ••••`).
- **Error States:** Administrative error screens (`ErrorState`) and toast notifications never dump raw payload details, passwords, or credentials into the DOM.
- **Directional Isolation:** All masked and unmasked LTR data (phones, emails, IBANs) uses `<bdi dir="ltr">` so Arabic punctuation, parentheses, or plus signs never flip.
