# Arsitektur & Rencana Implementasi — SuperApp.id Admin Dashboard

## 1. Konteks

`ojol-super-app` adalah Flutter super app (Ojek Motor/Mobil, Food, Mart, Penginapan, Open Trip) yang saat ini **berjalan 100% dengan data mock/demo**. Endpoint API sudah didefinisikan di `lib/core/constants/api_constants.dart` (base `https://api.superapp.id/v1`) tetapi **belum ada backend** yang mengimplementasikannya (`AppConstants.demoMode = true`).

Dashboard ini dibangun sebagai **Next.js full-stack app + database**, sehingga sekaligus menjadi **sumber data utama (CMS/back-office)** untuk seluruh ekosistem. Admin dapat:
- Input & kelola konten: hotel, kamar, trip, itinerary, merchant/UMKM, produk, restoran, menu, promo, driver.
- Memonitor transaksi: booking, order food/mart, ride, registrasi trip, pembayaran.
- Menyediakan REST API (`/api/v1`) yang siap dikonsumsi Flutter dengan mengganti `demoMode = false`.

## 2. Tech Stack

| Area | Pilihan |
|------|---------|
| Framework | **Next.js 15** (App Router) + TypeScript |
| Styling/UI | **Tailwind CSS** + **shadcn/ui** (Radix) |
| Database | **PostgreSQL** + **Prisma ORM** (dev cepat bisa SQLite, ganti `provider`) |
| Auth | **Auth.js (NextAuth v5)** — Credentials, role-based (`SUPER_ADMIN`, `ADMIN`, `OPERATOR`) |
| Data fetching | **TanStack Query** + Server Actions / Route Handlers |
| Tabel | **TanStack Table** (sort, filter, paginate server-side) |
| Form & validasi | **React Hook Form** + **Zod** (skema dipakai ulang di API & form) |
| Charts | **Recharts** |
| Upload gambar | **UploadThing** (atau lokal `/public/uploads` untuk dev) |
| Util | `formatRupiah`, `date-fns` locale `id` |

## 3. Struktur Folder

```
membumi-dashboard/
├── prisma/
│   ├── schema.prisma            # semua model
│   └── seed.ts                  # seed dari data demo Flutter
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx       # sidebar + topbar (protected)
│   │   │   ├── page.tsx         # overview / analytics
│   │   │   ├── penginapan/  open-trip/  merchants/  mart/
│   │   │   ├── food/  ride/  users/  promos/  orders/  payments/
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       └── v1/              # REST API mirror api_constants.dart
│   ├── components/{ui,data-table,forms,layout}/
│   ├── lib/{prisma,auth,validations,utils}.ts
│   └── server/actions/          # Server Actions per modul
└── middleware.ts                # proteksi route
```

## 4. Data Model (Prisma) — diturunkan dari entities Flutter

Sumber: `ojol-super-app/lib/features/*/domain/entities/`. Semua harga `Int` (Rupiah).

**Auth/Admin & User**
- `AdminUser` — `id, email, name, passwordHash, role(SUPER_ADMIN|ADMIN|OPERATOR), createdAt`
- `User` — `id, name, phoneNumber, email?, avatarUrl?, isVerified, createdAt`

**Merchant (UMKM marketplace — baru)**
- `Merchant` — `id, businessName, ownerName, phoneNumber, city, bankAccount?, commissionRate, verificationStatus(PENDING|VERIFIED|REJECTED), createdAt` → 1-N ke `Product`, `Restaurant`, `Hotel`, `Trip`.

**Penginapan**
- `Hotel` — `id, name, city, address, imageUrl, rating, reviewCount, starRating, pricePerNight, merchantId?`
- `Amenity` — `id, name` (M-N ke Hotel); `Room` — `id, hotelId, name, pricePerNight, capacity, facilities[], available`
- `HotelReview` — `id, hotelId, authorName, rating, comment, date`
- `Booking` — `id, voucherCode, hotelId, roomId, guestName, city, checkIn, checkOut, guests, total, status(CONFIRMED|CANCELLED), createdAt`

**Open Trip**
- `Trip` — `id, title, destination, imageUrl, price, durationDays, startDate, totalSlots, bookedSlots, rating, description, guideId?, includes[], merchantId?`
- `Guide` — `id, name, rating, tripCount`; `ItineraryDay` — `id, tripId, day, title, activities[]`
- `TripRegistration` — `id, tripId, participants, contactName, total, createdAt`

**Mart**
- `MartCategory` — `id, name`; `Product` — `id, name, imageUrl, price, originalPrice?, unit, stock, categoryId, rating, merchantId?`
- `MartOrder` — `id, paymentMethod, address, total, trackingNumber, shipmentStatus(PACKING|SHIPPED|ON_DELIVERY|ARRIVED), courierName, createdAt` + `MartOrderItem(productId, quantity, price)`

**Food**
- `Restaurant` — `id, name, imageUrl, rating, ratingCount, categories[], distanceMeters, etaMinutes, priceLevel, isOpen, merchantId?`
- `MenuItem` — `id, restaurantId, name, description, price, imageUrl, category, available`
- `FoodOrder` — `id, restaurantId, status(CONFIRMED|PREPARING|PICKED_UP|DELIVERING|DELIVERED), paymentMethod, courierName?, total, createdAt` + `FoodOrderItem(menuItemId, quantity, notes)`

**Ride**
- `Driver` — `id, name, photoUrl?, vehiclePlate, vehicleName, rating, phoneNumber?, verificationStatus`
- `FareConfig` — `id, type(MOTOR|MOBIL), baseFare, perKm, perMinute`
- `Ride` — `id, type, status(SEARCHING|DRIVER_ASSIGNED|DRIVER_ARRIVING|IN_PROGRESS|COMPLETED|CANCELLED), pickupAddress, destAddress, fareAmount, driverId?, createdAt`

**Promo & Payment**
- `Promo` — `id, title, description, code, discountType(PERCENT|FIXED|FREE_SHIPPING), value, service(RIDE|FOOD|MART|HOTEL|TRIP|ALL), imageUrl?, expiresAt, active`
- `WalletTransaction` — `id, userId, type(TOP_UP|RIDE|FOOD|MART|HOTEL|TRIP|REFUND), description, amount, isCredit, createdAt`

## 5. REST API untuk Flutter (`/api/v1/...`)

Mirror persis `api_constants.dart`, response envelope `{ success, data, message, meta }` (sesuai `dio_client`):
- `GET /hotels`, `GET /hotels/[id]`, `POST /hotel-bookings`
- `GET /trips`, `GET /trips/[id]`, `POST /trip-registrations`
- `GET /restaurants`, `GET /restaurants/[id]/menu`, `POST /food-orders`
- `GET /mart/categories`, `GET /mart/products`, `POST /mart/orders`

## 6. Auth & Roles

- Auth.js Credentials → `AdminUser.passwordHash` (bcrypt), session JWT menyimpan `role`.
- `middleware.ts` melindungi route `(dashboard)` & `/api/admin`; `/api/v1/*` publik untuk app.
- Role gating: `OPERATOR` (input konten) < `ADMIN` (+verifikasi & hapus) < `SUPER_ADMIN` (+kelola admin).

## 7. Tahapan Implementasi

1. **Bootstrap** — create-next-app, shadcn/ui, Prisma, Auth.js, TanStack, RHF+Zod, layout shell.
2. **DB & Auth** — `schema.prisma`, migrate, `seed.ts` (port data demo Flutter), login + middleware.
3. **Core CRUD scaffolding** — generic `DataTable`, form fields (`ImageUpload`, `MoneyInput`, `ArrayInput`), Server Actions + Zod.
4. **Modul konten** — Penginapan → Open Trip → Merchants → Mart → Food → Ride → Users → Promos.
5. **Monitoring** — tab Orders/Bookings/Rides/Registrations + update status; Payments.
6. **REST API `/api/v1`** + serializer (uji `demoMode=false`).
7. **Analytics** — agregasi + Recharts di Overview.

## 8. Verifikasi End-to-End

1. `npm run dev` → login super admin (hasil seed) → masuk dashboard.
2. CRUD: buat Hotel+Room, Trip+itinerary, Merchant+verifikasi, Product, Restaurant+menu → cek `npx prisma studio`.
3. Monitoring: seed booking/order → muncul di tab, ubah status → tersimpan.
4. API: `curl /api/v1/hotels` & `/api/v1/trips` → envelope berisi data DB.
5. Integrasi Flutter (opsional): set `demoMode=false` + baseUrl ke dashboard → daftar hotel/trip tampil.
6. `npm run build` & `npm run lint` bersih.
