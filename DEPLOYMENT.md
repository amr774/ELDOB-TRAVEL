# Deployment preparation — not deployed

## Required launch configuration

1. Supply genuine company phone, email, WhatsApp number and address through the frontend variables. Unconfigured contact links are hidden; the authenticated inquiry form works without invented contact data.
2. Use approved real vehicle photos and complete the fleet's capacities, categories and prices in the owner interface. Missing photos are explicitly labelled; no demo cars or fabricated reviews are seeded.
3. Review existing employee accounts and grant operations access only to verified staff. Existing owner roles remain unchanged.
4. Configure HTTPS, distinct random JWT secrets (at least 32 characters each), managed PostgreSQL backups, and exact `FRONTEND_ORIGINS`. Production startup rejects missing/short/equal JWT secrets. Do not expose `.env` files.
5. Configure permanent image storage before launching. Current implementation supports a persistent disk through `UPLOAD_DIR`; an object-storage adapter is not implemented. Do not deploy uploads to ephemeral container storage.
6. Repeat acceptance tests on the deployed host. The 2026-10-27 local review exercised registration, reload/session restoration, inquiry review/submission and Arabic mobile public pages. Owner/staff API flows passed integration tests; not every role-specific browser screen was manually exercised.

## Frontend (Vercel or equivalent)

Build `frontend/` with `npm ci && npm run build`; publish `dist/` after configuring and testing the actual host. Set `VITE_API_URL=/api`. Copy `vercel.json.example` to `vercel.json`, replacing **REPLACE_WITH_API_HOST** with the actual approved API host. The example provides SPA fallback plus same-origin `/api/*` and `/uploads/*` reverse proxies. Ensure the proxy forwards `Set-Cookie`, cookies and the real Origin header. Do not cache authentication responses or authenticated API data.

The preferred browser deployment is a same-origin reverse proxy. This preserves `SameSite=Strict` refresh cookies with `Secure` in production. A direct Vercel-to-Render cross-site API setup will not work with these cookie settings; do not weaken them to work around a missing proxy. A same-site custom-domain arrangement also requires correct credentialed CORS and testing. `VITE_*` values are public build-time values and must never contain secrets.

## Backend (Render or equivalent)

The existing Dockerfile builds the Nest app and runs `prisma migrate deploy` before startup. Set `NODE_ENV=production`, `DATABASE_URL`, both secrets, exact `FRONTEND_ORIGINS`, `PORT`, and `UPLOAD_DIR`. Use `/health` as the readiness endpoint. The legacy `render.yaml` remains a development/free-tier example and is **not sufficient for persistent production image storage**. Configure an approved service with a mounted persistent disk (or implement object storage) before deployment; no paid resources were provisioned.

Apply additive migrations in order using `npx prisma migrate deploy`. Back up the database first. Do not use `migrate reset` or destructive `db push`. The CUSTOMER enum addition has its own migration so PostgreSQL commits the enum value before the default changes. Follow-up generated foreign-key migrations are retained as applied; the final state restricts deletion of paid reservations. The migration also adds positive-amount/exactly-one-reservation payment CHECK constraints.

Run migrations before starting the new backend. The backend reads freshly persisted roles on every authenticated request. Old versions that still publicly register employees must not run alongside the updated registration policy.

## Operational limits to resolve before broad release

- Authentication has a bounded per-process rate limiter. Add a distributed or edge limiter for multiple API replicas and configure trusted proxy IP handling carefully.
- Hotel/trip confirmation is manual. Free-text location requests must be reviewed by staff to ensure Egypt-only service; there is no geocoder or provider inventory integration.
- Account recovery, email verification, staff-contact invitations and outbound email/SMS are not integrated. Inquiries and staff replies are available within the customer's account. No external messages are sent automatically.
- Staff lists currently load all operational records; introduce server pagination/search as record volume grows.
- No refunds/receipt reversals, formal accounting ledger, audit-history UI, driver scheduling, maintenance or utilization analytics are implemented. The latter fleet features were deliberately excluded from scope.
- Contact and cancellation policies should be supplied by the business before launch; no invented legal terms are included.

## API extensions

| Route | Access / behavior |
| --- | --- |
| `POST /auth/browser/login`, `/refresh`, `/logout` | Browser-origin check and `X-ELDOB-Client: web`; HttpOnly refresh cookie, access token in JSON |
| `POST /requests`, `GET /requests/me`, `PATCH /requests/:id/cancel` | Authenticated customer, own records |
| `GET /operations/requests`, `PATCH /operations/requests/:id` | Owner or explicitly enabled employee; reply, quote and strict state updates |
| `GET/POST /operations/bookings`, `PATCH /operations/bookings/:id` | Operations; rental creation and pickup/notes updates |
| `PATCH /operations/bookings/:id/confirm`, `/complete`, `/cancel` | Operations; strict state transitions |
| `GET/POST /operations/customers`, `PATCH /operations/customers/:id` | Operations; customer-only contact data |
| `GET/POST /payments` | Owner only; whole-EGP receipts, unique references, no overpayment |
| `GET /health` | Public DB readiness without credentials or database details |

Existing owner-only car/user/booking/dashboard endpoints remain owner-only. Customer `/bookings/:id/pay` access was intentionally removed because simulated payment flags cannot establish receipt of money. New dashboard revenue excludes those legacy flags.

## Current status

On 2026-10-27 the GitHub homepage/Pages/deployments checks found no published demo. No compatible connected persistent Node/PostgreSQL host was available, and no paid resources were provisioned. Publishing needs access to an HTTPS host, a dedicated PostgreSQL database and a persistent upload volume. Configure genuine contact details only for a business launch; keep them blank in an isolated demo. Use synthetic example.test accounts and separate databases; do not copy customer data. See docs/PORTFOLIO_REVIEW.md for current local evidence.
