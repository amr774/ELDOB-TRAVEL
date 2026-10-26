# AGENTS.md

NestJS 11 + Prisma (PostgreSQL) API. All code lives in `backend/`; run commands from `backend/`.

## Commands
- `npm run start:dev` — dev server (watch) on http://localhost:3000
- `npm run lint` — eslint with `--fix` (auto-fixes; run after editing)
- `npm run build` / `npm run start:prod` — production build/run
- `npm test` — jest unit tests (all specs pass)
- `npm run test:e2e` — e2e (passes)

## Tests
- Unit tests run from `src/` (`testRegex: .*\.spec\.ts$`); e2e from `test/`.
- Every service spec must mock constructor deps, e.g. `{ provide: PrismaService, useValue: {...} }` and `{ provide: JwtService, useValue: {} }`.
- e2e needs `import * as request from 'supertest'` (default import breaks under ts-jest/ESM).

## Prisma / DB
- PostgreSQL. `DATABASE_URL` lives in `backend/.env` (requires a local Postgres instance; the file is gitignored).
- No Prisma npm scripts exist. After schema changes: `npx prisma migrate dev`, then `npx prisma generate`. `npx prisma validate` checks the schema.
- The running dev server locks `node_modules/.prisma/client/query_engine-windows.dll.node`, so `prisma generate` fails with EPERM until the server is stopped.
- `PrismaModule` is `@Global()` — feature modules use `PrismaService` without importing it.

## Environment
- `.env` IS loaded by the app: `import 'dotenv/config'` at the top of `src/main.ts`. Holds `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN` (15m), `JWT_REFRESH_EXPIRES_IN` (7d).
- `main.ts` registers a global `ValidationPipe({ whitelist: true, transform: true })`, defaults to port 3000, serves `./uploads` statically at `/uploads/`, and mounts Swagger at `/api` (`@nestjs/swagger` plugin is enabled in `nest-cli.json`).
- Roles: `USER`, `EMPLOYEE` (default on register), `OWNER`. Guards: `JwtAuthGuard` then `RolesGuard` via `@Roles(Role.X)`. Mutations are OWNER-only unless noted otherwise; customers access their own data.

## Auth
- `src/auth/`: register, login (JWT), `/auth/me` (JWT guard), `/auth/refresh` + `/auth/logout` (rotating, revocable refresh tokens, stored SHA-256-hashed in `RefreshToken` table).
- Passwords hashed with bcrypt (salt 10); `password` is always stripped before returning user objects. Duplicate email on register → 400 `BadRequestException`.
- `JwtStrategy` reads the access secret from env; refresh tokens carry a unique `jti` claim (required — same-payload JWTs signed within one second are byte-identical and collide on the unique token column).
- Role-based access: `@Roles(Role.X)` + `RolesGuard` (see `users.controller.ts`, which is OWNER-only). Guard types the request via `RequestWithUser`.

## Cars
- `src/cars/`: full CRUD on `Car` model (`prisma/schema.prisma`). GET endpoints are public; POST/PATCH/DELETE are OWNER-only (`JwtAuthGuard` + `RolesGuard` + `@Roles(Role.OWNER)`).
- DTOs use class-validator (`CreateCarDto`), `UpdateCarDto` via `PartialType` from `@nestjs/mapped-types`. `pricePerDay` and `year` are `Int` (whole EGP, no decimals).
- Service throws `NotFoundException('Car not found')` for missing records (Prisma's P2025 would otherwise surface as 500).

## Bookings
- `src/bookings/`: `Booking` model links `User` → `Car` (Cascade on user delete). Status enum `BookingStatus` (PENDING/CONFIRMED/CANCELLED/COMPLETED).
- Customer routes (JWT only): `POST /bookings`, `GET /bookings/me`, `GET /bookings/:id`, `PATCH /bookings/:id/cancel`. OWNER routes (RolesGuard): `GET /bookings`, `PATCH /bookings/:id/confirm`, `PATCH /bookings/:id/complete`, `DELETE /bookings/:id`.
- `create` enforces: startDate >= tomorrow, endDate > startDate, car must exist + be `available`, no overlap with PENDING/CONFIRMED bookings (Prisma range query `startDate: { lt: endDate }, endDate: { gt: startDate }`), `totalPrice = ceil(days) * car.pricePerDay` (days from ms diff, `DAY_MS` constant).
- Ownership checks: non-OWNER users get `ForbiddenException` unless `booking.userId === req.user.id`. Status transitions are strict (confirm only from PENDING, complete only from CONFIRMED, cancel blocked on CANCELLED/COMPLETED).
- `available` stays a manual listing flag — availability over time is enforced by the overlap check, not by flipping `available`.
- Payment is simulated: `PATCH /bookings/:id/pay` (customer, own booking) sets `paidAt`; only CONFIRMED bookings can be paid; paying twice returns a message. Revenue = sum of `totalPrice` where `paidAt` is set.

## Users
- `src/users/`: OWNER-only CRUD (`GET /users`, `PATCH /users/:id`, `DELETE /users/:id`) + `PATCH /users/me` (self, JWT only) via `UpdateProfileDto`. `password` in DTOs is ignored on update — role changes use `UpdateUserDto`.

## Reviews
- `src/reviews/`: `Review` links `User` → `Car` with `@@unique([userId, carId])` (one review per user per car). `POST /reviews` (JWT, own carId): duplicate → 400, rating 1-5 validated. `GET /reviews?carId=` public. `PATCH /reviews/:id` / `DELETE /reviews/:id`: author only (non-author gets 403), missing → 404.

## Favorites
- `src/favorites/`: `Favorite` unique per user+car. `POST /favorites/:carId` (JWT), `GET /favorites/me`, `DELETE /favorites/:carId`. `add` uses upsert so re-adding is idempotent.

## Search / Pagination
- `GET /cars?brand=&model=&year=&minPrice=&maxPrice=&available=&page=&limit=` (`QueryCarsDto`, filters are optional, page/limit default 1/10, limit capped at 100) returns `{ data, meta: { total, page, limit, totalPages } }`; `GET /cars/:id` includes `averageRating` + `reviewCount` (aggregated from reviews).

## Dashboard
- `src/dashboard/`: `GET /dashboard` (OWNER-only) returns `{ users, cars, availableCars, bookedCars, bookings, revenue, statusCounts, recentBookings }`.

## Uploads
- `src/uploads/`: `POST /upload` (JWT), multer diskStorage to `./uploads` — random UUID filename, images only (`image/png|jpeg|jpg|webp`), 5MB limit. Returns `{ url: "/uploads/<uuid>.<ext>" }` served statically. `uploads/` is gitignored.

## Conventions
- Prettier (enforced by eslint): single quotes, trailing commas. ESLint uses `recommendedTypeChecked` (no-unsafe-* rules on; `ignoreRestSiblings` is set for the omit-password destructure).
