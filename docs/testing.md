# Testing — Unit Test per Use Case

Framework: **Vitest**. Test bersifat unit (Prisma, session, cache, navigation di-mock),
jadi tidak memerlukan database/server. Jalankan: `npm test`.

```
tests/
├── utils.test.ts          # util murni + hierarki role
├── validations.test.ts    # aturan Zod per fitur (acceptance criteria UC)
├── serializers.test.ts    # bentuk JSON untuk app Flutter
├── api.test.ts            # business logic route handler /api/v1 (Prisma di-mock)
└── actions.test.ts        # Server Actions: role gating + transformasi data
```

## Peta Test → Use Case

| Fitur | Use case / aturan | Test |
|-------|-------------------|------|
| **Penginapan** | UC-01 tolak harga ≤ 0, bintang 1–5 | `validations` hotelSchema |
| | UC-02 kamar harga > 0, kapasitas ≥ 1 | `validations` roomSchema |
| | FR-06 filter kota + kamar tersedia & kapasitas | `api` GET /hotels |
| | Booking: total = harga × malam, voucher, status | `api` POST /hotel-bookings |
| | UC-01 create + connect amenities + role OPERATOR | `actions` createHotel |
| | UC-04 ubah status booking (role ADMIN) | `actions` updateBookingStatus |
| **Open Trip** | UC-01/02 validasi trip + itinerary | `validations` tripSchema |
| | FR-04 sembunyikan trip sold-out / lampau | `api` GET /trips |
| | UC-04 tolak slot kurang (409) + increment bookedSlots | `api` POST /trip-registrations |
| | UC-02 itinerary JSON → nested create | `actions` createTrip |
| | serializer: itinerary terurut + includes array | `serializers` tripDetail |
| **Merchant** | UC-01 onboarding, UC-02 verifikasi status | `validations` merchant + verify |
| | UC-02 REJECTED simpan alasan, VERIFIED hapus alasan | `actions` verifyMerchant |
| | FR-05 hanya konten VERIFIED/internal tampil | `serializers`/`api` merchantVisible |
| **Mart** | UC-02 tolak originalPrice < price | `validations` + `actions` createProduct |
| | hitung diskon (hasDiscount/discountPercent) | `utils` + `serializers` |
| | UC-04 tolak stok kurang (409) + decrement stok | `api` POST /mart/orders |
| | filter kategori | `api` GET /mart/products |
| **Food** | UC-01 priceLevel 1–3, UC-02 menu harga > 0 | `validations` |
| | FR-04 menu dikelompokkan per kategori | `api` GET menu |
| | tolak item tidak tersedia (409) + hitung total | `api` POST /food-orders |
| **Ride** | UC-01 driver wajib plat/kendaraan | `validations` driverSchema |
| | UC-02 tarif type MOTOR/MOBIL | `validations` fareConfigSchema |
| | UC-02 estimasi = base + perKm×km + perMenit×menit | `api` + `serializers` fareJson |
| | tolak tipe ride tidak valid | `api` GET /rides/estimate |
| | UC-01 verifikasi driver (role ADMIN, validasi status) | `actions` verifyDriver |
| **Promo** | UC-01 kode di-uppercase, validasi service/tipe | `validations` promoSchema |
| | UC-02 hanya promo aktif & belum kedaluwarsa | `api` GET /promos |
| | toggle aktif (role ADMIN) | `actions` togglePromo |
| **Users/Auth** | UC-02 email & role valid, password ≥ 6 | `validations` adminUserSchema |
| | UC-04 hierarki role (OPERATOR<ADMIN<SUPER_ADMIN) | `utils` hasRole |
| | UC-02 createAdmin role SUPER_ADMIN + hash password | `actions` createAdmin |
| **Payment/Util** | format Rupiah, normalisasi array, kode voucher | `utils` |
| **Keuangan** | Penarikan: approve dgn bukti transfer (proofUrl opsional), validasi URL/kind | `validations` withdrawalApproveSchema |
| | Penarikan: approve/reject role ADMIN, route driver vs merchant, body proofUrl | `actions` withdrawals-actions |
| | Topup: bukti transfer diunggah user (app) & ditampilkan di dashboard | UI (di luar unit test) |
