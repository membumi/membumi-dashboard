# SuperApp.id — Admin Dashboard (membumi-dashboard)

Back-office (CMS + monitoring) untuk ekosistem **SuperApp.id**. Dashboard ini adalah
**UI murni** di atas backend **NestJS** (`ojol-super-app-backend`) — tidak punya database
sendiri. Setiap halaman membaca/menulis lewat API NestJS `/v1` (publik) dan `/v1/admin/*`
(admin), terautentikasi dengan JWT dari `POST /v1/auth/admin/login`.

> Migrasi dari arsitektur lama (Prisma + Postgres + route handler `/api/v1`) didokumentasikan
> di [`docs/migration-to-nestjs.md`](./docs/migration-to-nestjs.md). Endpoint admin yang belum
> ada di backend dilacak di `ojol-super-app-backend/docs/dashboard-admin-gaps.md`.

Dokumentasi lengkap (arsitektur + PRD per fitur) ada di [`docs/`](./docs/README.md).

## Tech Stack
Next.js 16 (App Router, TS) · Tailwind CSS 4 · Auth.js v5 (Credentials → NestJS, role-based)
· TanStack Table · React Hook Form + Zod · Recharts. **Tanpa database / ORM** — sumber data
tunggal adalah NestJS.

## Menjalankan

```bash
npm install
# Jalankan backend NestJS lebih dulu (ojol-super-app-backend) di http://localhost:3000
cp .env.example .env         # set API_URL + AUTH_SECRET
PORT=3100 npm run dev        # dashboard di http://localhost:3100
```

> `API_URL` / `NEXT_PUBLIC_API_URL` menunjuk ke NestJS (`http://localhost:3000/v1` saat dev).
> Karena NestJS sudah memakai port 3000, jalankan dashboard di port lain (`PORT=3100`).

**Login** memakai akun back-office NestJS (tabel `admin_users`). Bootstrap super admin di
backend: `npm run seed:admin` (lihat repo backend).

## Modul
- **Overview** — metrik lintas layanan + grafik pendapatan (`GET /v1/admin/stats/overview`).
- **Penginapan** — CRUD hotel & kamar (Mongo lewat `/v1/admin/hotels*`).
- **Open Trip** — CRUD trip + editor itinerary, guide, registrasi.
- **Merchant (UMKM)** — onboarding & verifikasi.
- **Mart** — produk, kategori, stok, diskon.
- **Food** — restoran & menu.
- **Ride** — driver (verifikasi), konfigurasi tarif, monitoring perjalanan.
- **Promo** — voucher & banner.
- **Pesanan & Transaksi** — monitoring booking, registrasi, order Mart/Food (+update status).
- **Pembayaran** — wallet ledger & ringkasan (ADMIN+).
- **Pengguna** — user app + kelola admin (SUPER_ADMIN).

## Auth & API client
- `src/auth.ts` — `Credentials.authorize` memanggil `POST /v1/auth/admin/login`, menyimpan
  `accessToken` + `role` (dinormalkan ke `SUPER_ADMIN|ADMIN|OPERATOR`) di sesi NextAuth.
- `src/lib/api-client.ts` — wrapper `fetch` yang menyuntikkan `Authorization: Bearer …` dan
  membuka envelope `{ success, data, message, meta }`.
- `requireRole()` / `getCurrentAdmin()` (`src/lib/session.ts`) tetap dipakai untuk gating.

## Testing

Unit test memakai **Vitest** (tanpa DB):

```bash
npm test            # jalankan semua test sekali
npm run test:watch  # mode watch
npm run test:coverage
```

Cakupan: validasi Zod per fitur (form → DTO), util format, dan pemetaan role
(NestJS lowercase ↔ dashboard uppercase).
