# Migration: Dashboard → NestJS backend

**Repo:** `membumi-dashboard` · **Status:** Planned · **Date:** 2026-06-13

> This is the **dashboard-specific slice** of a cross-repo migration. The full master plan
> (architecture, all backend endpoints, phases, decisions) lives in the backend repo:
>
> **`/Users/arisupriatna/Documents/ojol-super-app-backend/docs/dashboard-unification-plan.md`** (§6.2)
>
> Read the master plan first; this file only tracks what changes **in this repo**.

---

## Goal

Today this dashboard is a full-stack app with **its own Prisma/Postgres DB** and its own
`/api/v1` route handlers. The decision (see master plan) is to make the **NestJS backend**
(`ojol-super-app-backend`) the single source of truth. This dashboard becomes a **pure admin UI**
that calls the NestJS API — so dashboard, mobile app, and backend all share one database and stay
in sync automatically.

**End state:** no Prisma here; every page reads/writes via NestJS `/v1` (consumer) and
`/v1/admin/*` (admin) endpoints, authenticated with a JWT obtained from NestJS.

---

## Decisions that affect this repo (from master plan §9)

- **Admin login** moves to NestJS: `POST /v1/auth/admin/login` `{ email, password }` → returns a JWT.
  Dashboard's NextAuth `Credentials.authorize` calls this endpoint; the JWT is carried in the
  NextAuth session and sent as `Authorization: Bearer …` on every NestJS call.
- **Roles:** `super_admin | admin | operator` are carried in the JWT `role` claim. Keep using
  `requireRole(...)` in server actions, but the role now comes from the NestJS-issued token.
- **DB data is demo/seed only** → no data migration. Once pages are migrated, drop the dashboard
  Postgres entirely.
- **Cutover style = proxy-through-dashboard:** during transition, turn `src/app/api/v1/*` route
  handlers into **thin proxies** to NestJS so the Flutter app keeps its current URL while the
  backend is swapped underneath. Migrate page-by-page, no big-bang.

---

## Checklist (this repo)

- [x] Add `NEXT_PUBLIC_API_URL` (client) + a server-side base URL env var (`API_URL`) pointing
      at NestJS (dev: `http://localhost:3000/v1`). *(`.env` / `.env.example` updated; `DATABASE_URL` removed.)*
- [x] Build an API client (`src/lib/api-client.ts`, fetch wrapper) that injects the JWT and unwraps
      the `{ success, message, data, meta }` envelope (`apiGet`/`apiGetPaged`/`apiPost`/`apiPut`/`apiPatch`/`apiDelete`).
- [x] Rewire auth: `src/auth.ts` `Credentials.authorize` → calls `POST /v1/auth/admin/login`;
      JWT + role stored in the NextAuth jwt/session callbacks (role normalized to uppercase via
      `toAdminRole`). `requireRole()` / `getCurrentAdmin()` kept.
- [x] **Phase B (read path):** all read-only pages migrated from Prisma → NestJS API
      (overview, merchants, hotels, food, trips, mart, orders, promos, ride, users, payments).
- [x] **Phase C (write path):** all server actions (`createX/updateX/deleteX`, status toggles,
      verify actions) point at `/v1` + `/v1/admin/*` endpoints. Request bodies mapped to NestJS DTOs.
- [x] **Phase D (decommission):** deleted `prisma/`, `src/lib/{prisma,serializers,visibility}.ts`,
      `src/lib/api.ts`, and all `src/app/api/v1/*` route handlers. Removed Prisma/bcrypt deps + db
      scripts from `package.json`; deleted `docker-compose.yml`. Obsolete tests removed; `npm test`
      (30) + `npm run lint` + `npm run build` green.
- [ ] **(Optional)** Socket.IO client to NestJS `/tracking` namespace for live order/ride monitoring
      (replaces polling on the orders/ride pages).

> **Backend dependency:** several admin endpoints the dashboard now calls do not exist in NestJS
> yet. The dashboard is coded **contract-first** against them and degrades to empty/disabled UI
> until they ship. The execution plan + exact contracts are in
> `ojol-super-app-backend/docs/dashboard-admin-gaps.md` (Guides module, merchant↔content links &
> counts, `GET /v1/admin/stats/overview`, `POST /v1/admin/drivers/standalone`, wallet-transaction
> `user` join + `/summary`, global trip-registrations list, mart category counts, hotel amenities).
> A few features were adapted to the existing contract (fare config `minFare`/`avgSpeedKmh` instead
> of `perMinute`; hotel/restaurant create needs `lat`/`lng`; product price↔discountPrice mapping;
> menu item `isAvailable`).

## Page → endpoint mapping

Each dashboard page area maps to NestJS endpoints listed in master plan §4.2. Migrate in this order
(read first, then the matching write actions):

| Dashboard area | NestJS consumer/admin endpoints |
|---|---|
| Merchants | `/v1/admin/merchants*` |
| Penginapan (hotels) | `GET /v1/hotels*`, `/v1/admin/hotels*`, `/v1/admin/hotels/:id/rooms*`, `/v1/admin/bookings*` |
| Food (restaurants/menu) | `GET /v1/restaurants*`, `/v1/admin/restaurants*`, `.../menu-items*`, `/v1/admin/food-orders*` |
| Open-trip + guides | `GET /v1/trips*`, `/v1/admin/trips*`, `/v1/admin/guides*` |
| Mart (products/categories) | `GET /v1/mart/*`, `/v1/admin/mart/*` |
| Orders (cross-service tab) | `/v1/admin/bookings`, `/v1/admin/food-orders`, `/v1/admin/mart/orders` |
| Promos | `GET /v1/promos`, `/v1/admin/promos*` |
| Ride (fare/drivers/monitor) | `/v1/admin/rides`, `/v1/admin/drivers*`, `/v1/admin/fare-config/:type` |
| Payments | `GET /v1/admin/wallet-transactions` |
| Users / Admin accounts | `/v1/admin/users*`, `/v1/admin/admins*` |

> **Blocked on backend:** these `/v1/admin/*` endpoints mostly don't exist yet — they're built in the
> backend repo (master plan §6.1, Phases A–C). Start this repo's work **after** the corresponding
> backend endpoints land, or use the proxy approach to migrate incrementally.

## Done when

- No Prisma dependency remains; all pages use NestJS.
- Admin login goes through NestJS; role-gating still works.
- A change here is immediately visible in the mobile app (shared DB).
