# Tihamah-Sooq Admin Dashboard

Arabic RTL operations dashboard for the Tihamah-Sooq rural marketplace. The project is built with React, TypeScript, Vite, React Router, and Refine Core. Its UI follows the TailAdmin reference while remaining fully independent from the `TailAdmin` source folder.

The detailed production roadmap and new-chat handoff are maintained in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).

## Implemented Screens

| Route | Workflow |
| --- | --- |
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
- `src/styles`: Project-owned TailAdmin-inspired design system.

## Development

```bash
npm install
npm run dev
npm run build
```

The interactions currently update local typed fixtures so each workflow can be reviewed end to end. The next integration step is a Refine data provider for the documented `/api/v1/admin/*` endpoints, plus the admin authentication provider and permission matrix.
