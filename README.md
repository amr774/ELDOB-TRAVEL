# ELDOB TRAVEL · شركة الدب للسياحة

A full-stack travel operations application for chauffeur-driven rentals, private-trip quotations, hotel requests and customer inquiries in Egypt. Customers submit and track requests; approved staff manage operations; owners manage fleet, roles and manual receipts.

![ELDOB TRAVEL running locally](docs/screenshots/desktop.png)

[Arabic mobile screenshot](docs/screenshots/mobile-ar.png) · [Current verification](docs/PORTFOLIO_REVIEW.md) · [Deployment](DEPLOYMENT.md)

Screenshots were captured from a fresh local database on 2026-10-27. Empty fleet/hotel states are intentional: no real inventory, reviews or bookings were copied. There is no verified public demo.

## Implemented features

- Arabic/English public pages and RTL/mobile navigation.
- Fleet filters, vehicle details/galleries, rental requests, favorites and eligible reviews.
- Hotel catalog and hotel/private-trip/inquiry requests with review-before-send and tracking references.
- Customer account; verified employee operations queues; owner fleet/user/reporting tools.
- JWT access tokens held in memory, rotating HttpOnly refresh cookies, ownership and role enforcement.
- Booking overlap checks, explicit status transitions and manual payment receipts with overpayment/history protection.
- Image upload signature checks, 5 MB limit and configurable persistent storage.

Hotel/trip requests require staff confirmation. There is no live hotel provider inventory, online payment gateway, automatic dispatch or email/SMS delivery. Legacy simulated payment flags are not actual revenue; reporting uses manual receipt records.

## Stack and structure

This repository is a monorepo rooted here: `frontend/` contains React, TypeScript, Vite, React Query and Tailwind; `backend/` contains NestJS, Prisma, PostgreSQL, Jest and the API migrations. Older phase reports describe earlier workspaces and are historical, not current test evidence.

## Run locally

Requirements: Node 22.12+ (reviewed with Node 24), npm and PostgreSQL. Create a dedicated database, copy backend/.env.example to backend/.env **only if absent**, and replace the database URL and both JWT secrets. Use two distinct random secrets of at least 32 characters. Copy frontend/.env.example only if absent.

From backend:

```sh
npm ci
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

In another terminal, from frontend:

```sh
npm ci
npm run dev
```

Web: http://localhost:5173 · API: http://localhost:3000 · Readiness: http://localhost:3000/health · Development Swagger: http://localhost:3000/api.

Vite forwards /api to Nest and /uploads to its image route. Use committed migrations; do not reset a database to run the demo.

| Variable | Purpose |
| --- | --- |
| Backend `DATABASE_URL` | Private PostgreSQL connection |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Distinct private random signing secrets |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Access/refresh lifetimes (15m / 7d defaults) |
| `FRONTEND_ORIGINS` | Exact comma-separated allowed UI origins |
| `PORT`, `UPLOAD_DIR` | API port and persistent upload directory |
| `NODE_ENV` | production for Secure cookies and production secret validation |
| Frontend `VITE_API_URL` | Public API base, normally /api |
| `VITE_CONTACT_PHONE`, `VITE_CONTACT_EMAIL`, `VITE_WHATSAPP_NUMBER`, `VITE_CONTACT_ADDRESS` | Genuine business details; leave blank for a demo |

Public signup creates a CUSTOMER. Existing employee records are not automatically approved for operations. For a first local owner, review [the guarded bootstrap instructions](backend/scripts/README.md); the helper is intentionally restricted to its documented local database and refuses existing owners/emails. Never promote a real account as a test shortcut.

## Verification

From backend:

```sh
npm run lint
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

From frontend: `npm run lint`, `npm run build`, `npm test`.

Current results: 38 backend unit tests, 10 API end-to-end tests and 40 frontend tests passed. Live database tests create isolated records and clean up only those records. Chromium signup, refresh-cookie session restoration, inquiry review/submission and English/Arabic mobile pages were checked. A clean frontend npm ci now succeeds after repairing its lockfile. Full results and limitations: [review](docs/PORTFOLIO_REVIEW.md).

## Deployment and remaining scope

Use a continuously running Node API, PostgreSQL and persistent upload disk behind HTTPS; publish frontend/dist with /api and /uploads proxies and SPA fallback. The existing Dockerfile and deployment examples are described in [DEPLOYMENT.md](DEPLOYMENT.md). Production hosting, real company inventory/contact details and infrastructure credentials still need an operator. No paid services were created, and no public URL is claimed.

## Portfolio / CV description

> Bilingual travel booking and operations application built with React, TypeScript, NestJS, Prisma and PostgreSQL, featuring chauffeur-rental requests, hotel and trip inquiries, role-based workspaces, fleet management and manual receipt tracking.
