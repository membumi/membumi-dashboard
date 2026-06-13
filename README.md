# SuperApp.id — Admin Dashboard (membumi-dashboard)

Back-office (CMS + monitoring) untuk ekosistem **SuperApp.id** (`ojol-super-app`).
Next.js full-stack + Prisma + PostgreSQL. Dashboard ini sekaligus menjadi sumber data
yang REST API-nya (`/api/v1`) dapat dikonsumsi oleh aplikasi Flutter.

Dokumentasi lengkap (arsitektur + PRD per fitur) ada di [`docs/`](./docs/README.md).

## Tech Stack
Next.js 16 (App Router, TS) · Tailwind CSS 4 · Prisma 6 + **PostgreSQL** (enum native +
`String[]`) · Auth.js v5 (Credentials, role-based) · TanStack Table · React Hook Form +
Zod · Recharts.

## Menjalankan

```bash
npm install
docker compose up -d        # PostgreSQL di host port 5433 (lihat docker-compose.yml)
npx prisma migrate dev      # buat schema (sudah ada migrasi init)
npm run db:seed             # isi data demo (porting dari app Flutter)
npm run dev                 # http://localhost:3000
```

> `DATABASE_URL` default menunjuk ke Postgres docker di `localhost:5433`. Ubah di `.env`
> bila memakai Postgres lain. Port app bisa diubah dengan `PORT=3100 npm run dev`.

**Login awal (hasil seed):**
- Super Admin — `admin@superapp.id` / `admin123`
- Operator — `operator@superapp.id` / `operator123`

Reset database kapan saja: `npm run db:reset` (drop + migrate + seed).

## Modul
- **Overview** — metrik lintas layanan, grafik pendapatan, item "perlu tindakan".
- **Penginapan** — CRUD hotel, kamar, amenities, ulasan.
- **Open Trip** — CRUD trip + editor itinerary harian, guide, registrasi.
- **Merchant (UMKM)** — onboarding & verifikasi, lihat konten & estimasi komisi.
- **Mart** — produk, kategori, stok, diskon.
- **Food** — restoran & menu.
- **Ride** — driver (verifikasi), konfigurasi tarif, monitoring perjalanan.
- **Promo** — voucher & banner.
- **Pesanan & Transaksi** — monitoring booking, registrasi, order Mart/Food (+update status).
- **Pembayaran** — wallet ledger & ringkasan (ADMIN+).
- **Pengguna** — user app + kelola admin (SUPER_ADMIN).

## REST API untuk Flutter (`/api/v1`)
Response envelope `{ success, data, message, meta }` (sesuai `dio_client` Flutter).
Endpoint utama: `GET /hotels`, `GET /hotels/[id]`, `POST /hotel-bookings`,
`GET /trips`, `GET /trips/[id]`, `POST /trip-registrations`, `GET /restaurants`,
`GET /restaurants/[id]/menu`, `POST /food-orders`, `GET /mart/categories`,
`GET /mart/products`, `POST /mart/orders`, `GET /promos`, `GET /rides/estimate`.

Hanya konten internal atau milik **merchant VERIFIED** yang tampil di API publik.

### Integrasi dengan app Flutter
Di `ojol-super-app/lib/core/constants/`: set `AppConstants.demoMode = false` dan
`ApiConstants.baseUrl = "http://<host>:3000/api/v1"`.

## Testing

Unit test memakai **Vitest** (tanpa perlu DB — Prisma di-mock):

```bash
npm test            # jalankan semua test sekali
npm run test:watch  # mode watch
npm run test:coverage
```

Cakupan (lihat [`docs/testing.md`](./docs/testing.md)): validasi Zod per fitur,
util & serializer, business logic API (total booking, cek slot trip, decrement
stok, item tak tersedia, hitung tarif, filter visibility), dan server action
(role gating + transformasi data). **69 test** di 5 berkas.

## Catatan database
Schema memakai **enum native** (`Role`, `BookingStatus`, `ShipmentStatus`,
`FoodOrderStatus`, `RideStatus`, `RideType`, `VerificationStatus`, `DiscountType`,
`PromoService`, `TransactionType`) dan kolom **`String[]`** (`Room.facilities`,
`Trip.includes`, `ItineraryDay.activities`, `Restaurant.categories`). Untuk produksi,
arahkan `DATABASE_URL` ke instance Postgres terkelola dan jalankan
`npx prisma migrate deploy`.
