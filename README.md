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
| `/system` | FCM notification broadcasts and append-only audit logs |

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

Fixture mode accepts either documented identifier with the development-only password:

| Field | Value |
| --- | --- |
| Email | `admin@tihamah.com` |
| Phone | `+966500000000` |
| Password | `Admin@123456` |

The operational pages currently update local typed fixtures for workflow review. A registered Refine data provider and explicit admin services support fixture/remote modes for confirmed contracts, and RBAC now protects the fixture workflows while page integration remains in T17–T25. The next dependency-safe task is authentication and authorization error states (T11). See [the administrative data contract and usage guide](./docs/ADMIN_DATA.md) for supported queries, mutation inputs, cache behavior and blocked contracts.
