# Tihamah-Sooq Admin Dashboard

Arabic RTL operations dashboard for the Tihamah-Sooq rural marketplace. The project is built with React, TypeScript, Vite, React Router, and Refine Core. Its UI follows the TailAdmin reference while remaining fully independent from the `TailAdmin` source folder.

The detailed production roadmap and new-chat handoff are maintained in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).

## Implemented Screens

| Route | Workflow |
| --- | --- |
| `/login` | Administrator sign-in and safe restoration of the requested dashboard route |
| `/` | Marketplace KPIs, moderation queues, listing growth, and OTP quota |
| `/listings` | Listing review, approval, rejection, deactivation, and deletion |
| `/users` | User search, activity history, banning, and session revocation |
| `/commissions` | One-percent commission receipt auditing |
| `/reports` | Fraud and content report resolution |
| `/locations` | Region and village hierarchy management |
| `/categories` | Category ordering, icons, and availability |
| `/banners` | Banner targeting, scheduling, and ordering |
| `/system` | Global notification broadcasts, OTP/SMS settings, and read-only audit visibility |

## Project Structure

- `src/app`: Refine setup, route registration, and resource definitions.
- `src/components/layout`: Responsive RTL application shell and navigation.
- `src/components/ui`: Shared drawers, modals, badges, headers, and toasts.
- `src/data`: Typed fixtures shaped around the documented marketplace models.
- `src/features`: One feature directory per administrative workflow.
- `src/providers`: Refine authentication/data providers and scoped action invalidation.
- `src/services/admin`: Typed fixture/remote services, request validation and API-to-domain mapping.
- `src/services/http`: Typed API transport, query serialization, cancellation, and normalized errors.
- `src/styles`: Project-owned TailAdmin-inspired design system.
- `src/test`: Shared test setup and deterministic fixture builders.
- `src/types/api`: Backend wire contracts using documented `snake_case` fields.
- `src/types/domain`: Stable dashboard models using `camelCase` fields.
- `e2e`: Playwright browser workflows.

## Design system

The dashboard uses the mobile library in `Notebook/design-system.pdf` as its visual source of truth and extends it to desktop administrative surfaces. Its exact Rural palette is centralized in semantic CSS tokens, and Tajawal is self-hosted for consistent Arabic and Latin rendering without a runtime font CDN. Shared patterns cover buttons, fields, cards, navigation, tables, filters, badges, feedback, dialogs, drawers, authentication, and error states. See [the design-system guide](./docs/DESIGN_SYSTEM.md) before adding or changing UI styles.

All dashboard tables use a typed shared renderer with server pagination controls, optional confirmed sorting, URL-restorable search/filter state, accessible loading/error/empty states, and mobile record-card rendering. Feature modules retain their own column definitions and authorized actions. See [the data-table guide](./docs/DATA_TABLE.md).

Shared administrative forms use React Hook Form and Zod, accessible field/error primitives, mutation submission locking, focus-contained dialogs, and Refine-backed dirty navigation warnings. See [the form infrastructure guide](./docs/FORMS.md).

Feature feedback and Refine mutations share a typed notification queue with success, error, warning, information, and persistent progress states. The retry and high-risk mutation rules are documented in [the notification guide](./docs/NOTIFICATIONS.md).

Accessibility checks cover WCAG A/AA automation on login, every protected route, and interactive overlays at mobile and desktop widths. Shared navigation, dialogs, drawers, route headings, tabs, upload controls, reduced motion, contrast, RTL reading order, and LTR operational values follow the keyboard and verification rules in [the accessibility guide](./docs/ACCESSIBILITY.md).

## Development

```bash
npm install
npm run dev
npm test
npm run test:e2e
npm run build
```

`npm test` runs the unit, component and provider contract suite in jsdom. `npm run test:e2e` runs fixture-mode authentication, account-menu and data-provider checks at mobile/desktop widths in Microsoft Edge and starts or reuses the local Vite server on port `4173`.

Local development uses fixture mode when no environment file is present. Use [`.env.example`](./.env.example) as the documented configuration reference; never place server secrets in `VITE_*` variables because Vite exposes them to the browser bundle.

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_MODE` | Staging/production | `fixture` for local review or `remote` for the live admin API |
| `VITE_API_URL` | Remote mode | Absolute HTTP(S) URL or root-relative API base path ending in `/api/v1` |
| `VITE_REQUEST_TIMEOUT_MS` | No | Request timeout from 1,000 to 120,000 ms; defaults to 15,000 |
| `VITE_MEDIA_HOST` | No | Trusted absolute HTTP(S) origin/base path for public media |
| `VITE_APP_ENV` | No | `development`, `staging`, `production`, or `test`; defaults from the Vite mode |

Deployed staging and production environments must select an API mode explicitly. Invalid values render an actionable startup configuration screen rather than allowing a partially configured dashboard to run.

### Authentication flow

Every dashboard route is protected. Anonymous visitors are sent to `/login`, and a successful login restores the originally requested route. The session is stored in browser `sessionStorage`, expires according to the server-provided lifetime, and is removed on logout or when malformed, expired, or assigned to an inactive administrator. No refresh request is attempted because the current administrator API does not document a refresh endpoint.

The header displays the signed-in administrator's name, returned role and initials. Open the account button to view contact details, the stored session expiry in your browser's local time, and sign out. Enter/Space opens the disclosure, Tab moves through its controls, and Escape closes it and returns focus. Long names are abbreviated only in the header; the account panel shows their full text on mobile and desktop. Missing role details show “الدور غير متاح”; blank names and contacts have neutral fallbacks. No avatar or profile endpoint is assumed. See [the identity implementation notes](./docs/ADMIN_IDENTITY.md).

### Authorization

Navigation, direct routes, and record actions are controlled by the permissions returned in the validated administrator session. Unknown or missing permissions deny access. Unavailable destinations are removed, unavailable action buttons are disabled, and a forbidden direct URL shows a clear state with a link to an available section. Backend authorization remains final: `403` errors keep the administrator signed in, while `401` errors end the invalid session. The normalized action and module mapping is documented in [the access-control guide](./docs/ACCESS_CONTROL.md).

Expired sessions and backend `401` responses open a dedicated recovery page before returning to login. Malformed or inactive stored sessions use a separate unauthorized state, while `403` responses keep the current session and temporary network, timeout, rate-limit, or server failures support in-place retry. These states and their integration rules are documented in [the authentication error-state guide](./docs/AUTH_ERROR_STATES.md).

Fixture mode accepts either documented identifier with the development-only password:

| Field | Value |
| --- | --- |
| Email | `admin@tihamah.com` |
| Phone | `+966500000000` |
| Password | `Admin@123456` |

The dashboard metrics, listing moderation, and confirmed system operations read their backend contracts through Refine in fixture or remote mode. The system route supports global broadcast review, general and SMS settings, OTP confirmation, secret redaction, and a local read-only audit adapter; targeted broadcasts, live SMS tests, and remote audit listing remain visibly blocked by incomplete backend contracts. See [the system operations guide](./docs/SYSTEM_OPERATIONS.md), [listing moderation guide](./docs/LISTING_MODERATION.md), [dashboard metrics guide](./docs/DASHBOARD_METRICS.md), and [administrative data contract](./docs/ADMIN_DATA.md). Task status and the next dependency-safe step are tracked in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).
