# ELDOB TRAVEL · شركة الدب للسياحة

Local full-stack platform for chauffeur-driven rentals, private trip quotations, hotel reservation requests and customer inquiries within Egypt. React/Vite frontend and the existing NestJS/Prisma/PostgreSQL backend.

The latest company-management audit and phase-by-phase implementation/test report is in `PHASE-REPORT.md`. Customer, employee and owner workspaces now have role-aware navigation; operations includes searchable service/status queues; owner reporting covers all reservation services and six months of actual receipt revenue.

## Run locally

Run commands from `backend/`, as required by the project instructions. Node 22.12+ or Node 24 and PostgreSQL are required.

```powershell
npm ci
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

In another terminal, still from `backend/`:

```powershell
npm --prefix ../frontend ci
npm --prefix ../frontend run dev
```

- Website: http://127.0.0.1:5173
- API: http://localhost:3000
- Swagger: http://localhost:3000/api
- Database readiness: http://localhost:3000/health

Use `backend/.env.example` and `frontend/.env.example` as configuration references. Existing local secrets have been preserved. The frontend defaults to `/api`; Vite proxies this to Nest and proxies `/uploads` as well. Restart Vite after changing frontend environment values.

## Features

- English/Arabic public pages, RTL layouts, mobile navigation, Egypt-themed illustration, fleet filtering/sorting/pagination and vehicle galleries.
- Registration/login/logout, memory-only access tokens, HttpOnly rotating refresh cookies, route guards and authoritative API role checks. Existing JSON token routes remain for future mobile clients.
- Daily rental requests, price estimates, pickup details and notes, PostgreSQL row locks for overlapping bookings, strict transitions, favorites and completed-rental reviews.
- Private trip quotations, hotel requests and inquiries; team replies and customer tracking. These are requests, not live hotel inventory or automated hotel bookings.
- Customer account with rentals, service requests, cancellations, favorites and profile editing.
- Employee operations: requests/replies/quotes, rental confirmation/completion/cancellation, pickup/notes updates, creating rentals for customers and customer contact management.
- Owner dashboard: counts, status chart, recent rentals, vehicles/images/prices, user roles and staff approval, actual manual receipts, revenue and payment records.
- Image signature validation, generated filenames, 5 MB limit; configurable persistent upload directory.

## Role and payment migration

Public registrations now explicitly create `CUSTOMER`. Existing roles and records are retained. Existing `EMPLOYEE` accounts are not automatically trusted: an owner must enable **Verified employee: enable operations** in the owner dashboard. This avoids turning historical public registrations into staff accounts.

No owner account was created or promoted by this implementation. Use an existing owner account. If there is no legitimate owner, a database administrator must establish one through a controlled, separately reviewed process; there is no public owner-registration endpoint.

Historical `paidAt` flags came from a simulated customer-payment endpoint. They remain in the database, but revenue now sums the new explicit `Payment.amount` records. The legacy `/bookings/:id/pay` endpoint is restricted to owners and remains a legacy simulation; use `/payments` for actual manual receipts. Do not silently convert old simulation flags to financial records. Reservations with receipts cannot be deleted. Duplicate receipt references and overpayments are rejected.

Staff-created customer contacts have a random, undisclosed password and do not receive login credentials. An invitation/account-recovery flow needs a configured delivery provider before these contacts can independently sign in. Customers who register themselves can sign in immediately.

## Verification

```powershell
npm run lint
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm --prefix ../frontend run lint
npm --prefix ../frontend run build
npm --prefix ../frontend test
```

Integration tests require the configured **local development database** with migrations applied. They create unique `qa-…@example.invalid` accounts, one test car and related records, and delete only their own records in cleanup. Never point this suite at production. Tests include parallel booking conflicts, roles/employee approval, ownership, review eligibility, manual receipts, overpayment, history protection, hotel/trip requests, browser CSRF/rotation/logout, and image-content rejection.

Browser visual and interaction verification was not performed because browser permission for the local preview was declined. Component tests are not a substitute for a full desktop/mobile acceptance pass. See `DEPLOYMENT.md` for remaining launch configuration.

## Repository structure

The existing Git repository is rooted at `backend/`, not this parent folder, and its pre-existing source files were untracked when work began. `frontend/` and these root documents therefore are not included in backend Git operations. No Git history was moved, committed or published. Before source publication, explicitly choose a parent monorepo or a separate frontend repository and include the lockfiles.

Read `IMPLEMENTATION.md` for the initial audit and architectural decisions. No deployment, source publication, service purchase or production-infrastructure change has been performed.
