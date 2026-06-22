# PRD — Alur Booking Penginapan dengan Approval Admin & Mode Owner

> Memperluas [`01-penginapan.md`](./01-penginapan.md). Fokus: alur **booking → konfirmasi
> ketersediaan → pembayaran → e-ticket**, lintas 4 repo (backend NestJS, membumi-dashboard,
> Flutter app, hotel-owner-dashboard).

## 1. Tujuan & Latar Belakang

Alur lama: di Flutter, checkout **langsung bayar** (`POST /hotel-bookings` lalu `POST /payment/process`),
pembayaran non-wallet auto-konfirmasi via webhook Midtrans. Tidak ada gerbang manusia.

Kebutuhan baru — menyisipkan **dua gerbang persetujuan** untuk mengantisipasi penginapan yang
tidak rutin update data, dan untuk kontrol pembayaran transfer bank manual:

1. **Konfirmasi ketersediaan kamar** — user submit booking *tanpa bayar*; admin (atau sistem,
   tergantung mode owner) memastikan kamar tersedia sebelum user diminta bayar.
2. **Approval pembayaran transfer bank** — user kirim bukti transfer via WhatsApp, admin
   approve di dashboard, baru booking diteruskan ke owner & e-ticket terbit.

Plus **mode per-properti** (`AUTO`/`MANUAL`) dan **halaman History MiStay** di Flutter sebagai
tempat e-ticket muncul.

### Keputusan desain (disepakati)
- Cakupan: **keempat repo**.
- Mode owner: **toggle AUTO / MANUAL** per-properti (tanpa fallback kebasian data).
- Bukti transfer bank: **WhatsApp saja** (pola seperti topup — admin verifikasi di WA lalu klik Approve; tidak menyimpan gambar bukti).
- Mode AUTO: **auto-skip konfirmasi admin** — jika allotment tersedia, booking langsung `AWAITING_PAYMENT`.

## 2. Aktor & Peran
- **User (Flutter)** — submit booking, bayar setelah disetujui, lihat e-ticket di History MiStay.
- **OPERATOR / ADMIN (membumi-dashboard)** — `ADMIN` mengonfirmasi ketersediaan & approve pembayaran transfer.
- **Owner/Staff (hotel-owner-dashboard)** — set mode AUTO/MANUAL; (MANUAL) konfirmasi booking sendiri; front-desk check-in/out.
- **Sistem (backend)** — mode AUTO: auto-approve ketersediaan dari allotment realtime.

## 3. Lifecycle Booking (sumber kebenaran lintas-repo)

Status `HotelBookingEntity.status` diperluas:

```
AWAITING_CONFIRMATION   ← user submit, BELUM bayar (state awal MANUAL)
        │
        ├─(MANUAL) admin/owner konfirmasi ketersediaan ─┐
        ├─(AUTO) allotment tersedia → otomatis ─────────┤
        │                                               ▼
        │                                        AWAITING_PAYMENT  → notif "silakan bayar"
        │                                               │
        └─ tidak tersedia ─► REJECTED (terminal+notif)  │ user bayar via Flutter:
                                                         ├─ wallet: debit → CONFIRMED
                                                         └─ transfer bank: PAYMENT_REVIEW
                                                                  │ (user kirim bukti via WA)
                                                                  │ admin approve di dashboard
                                                                  ▼
                                                            CONFIRMED → mirror ke owner + e-ticket + notif
                                                                  │
                                                            CHECKED_IN → CHECKED_OUT (front-desk owner, sudah ada)
CANCELLED  ← bisa dari state mana saja sebelum CHECKED_OUT
```

- **Status baru:** `AWAITING_CONFIRMATION`, `AWAITING_PAYMENT`, `PAYMENT_REVIEW`, `REJECTED`.
- **Dipertahankan:** `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`.
- **Allotment (`OCCUPYING_STATUSES`):** MANUAL tidak potong saat `AWAITING_CONFIRMATION`,
  potong (soft-hold) saat `AWAITING_PAYMENT`; AUTO potong saat auto-approve; `REJECTED`/`CANCELLED`/timeout → lepas.
- **Mirror `OwnerBookingEntity` hanya dibuat saat `CONFIRMED`** (sebelumnya saat create) — penginapan hanya melihat booking yang sudah lunas.

## 4. Use Cases

### UC-A — Submit booking tanpa bayar (Flutter)
User pilih hotel/kamar/tanggal → CTA **"Ajukan Booking"** → `POST /hotel-bookings` (tanpa payment).
Hasil: `AWAITING_CONFIRMATION` (MANUAL) atau `AWAITING_PAYMENT` (AUTO + allotment tersedia).

### UC-B — Konfirmasi ketersediaan (membumi-dashboard, MANUAL)
Admin buka antrean **Menunggu Konfirmasi** → hubungi penginapan → *Setujui (kamar tersedia)* →
`AWAITING_PAYMENT` + notif "silakan bayar"; atau *Tolak* → `REJECTED` + notif.

### UC-C — Pembayaran (Flutter)
Saat `AWAITING_PAYMENT`: **Saldo** → `POST /hotel-bookings/:id/pay {method:'wallet'}` → debit → `CONFIRMED`.
**Transfer bank** → `pay {method:'transfer'}` → `PAYMENT_REVIEW`, tampil rekening + instruksi kirim bukti via WhatsApp.

### UC-D — Approval pembayaran transfer (membumi-dashboard)
Admin buka antrean **Menunggu Verifikasi Pembayaran** (`PAYMENT_REVIEW`) → verifikasi bukti di WA →
*Approve* → `CONFIRMED` (transaksi `SUCCESS`, mirror ke owner, e-ticket terbit); atau *Tolak* → kembali `AWAITING_PAYMENT`/`CANCELLED`.

### UC-E — E-ticket & History MiStay (Flutter)
Pada `CONFIRMED`: notif + deep link `superapp://hotel-bookings/{id}`. E-ticket (voucher + QR + detail)
muncul di **halaman History MiStay** baru, diakses dari hub MiStay.

### UC-F — Mode owner (hotel-owner-dashboard)
Owner set `confirmationMode` per-properti (AUTO/MANUAL). MANUAL: owner bisa konfirmasi booking masuk sendiri.

## 5. Functional Requirements per Repo

### 5.1 Backend — `ojol-super-app-backend` (fondasi, kerjakan pertama)
Modul: `src/modules/hotels/`, `hotel-owner/`, `payment/`, `notifications/`.
- **FR-BE-01** Migration `19xxxxx-HotelBookingApprovalFlow.ts`: status baru + `OCCUPYING_STATUSES`; kolom `rejection_reason?` di `hotel-booking.entity.ts`; kolom `confirmation_mode varchar default 'MANUAL'` di `property.entity.ts`.
- **FR-BE-02** `HotelBookingsService.create`: **hapus** payment & `reserveAndMirror` saat create; tentukan state awal (AUTO+allotment→`AWAITING_PAYMENT`+soft-hold, selain itu→`AWAITING_CONFIRMATION`); kirim notif.
- **FR-BE-03** `POST /hotel-bookings/:id/pay` — hanya saat `AWAITING_PAYMENT`. wallet→`WalletService.debit()`→`CONFIRMED` (via `PaymentSucceededEvent`); transfer→transaksi `PENDING`(method `manual`)→`PAYMENT_REVIEW`, **tanpa** Midtrans.
- **FR-BE-04** Endpoint admin (`/admin/bookings`): `POST /:id/confirm-availability`, `POST /:id/reject {reason?}`, `POST /:id/approve-payment` (→`CONFIRMED` + `reserveAndMirror` + voucher/e-ticket), `POST /:id/reject-payment {reason?}`. Pertahankan `PATCH /:id/status`.
- **FR-BE-05** Notif (`notifications.listener.ts` `HOTEL_COPY`): copy untuk `AWAITING_PAYMENT`, `PAYMENT_REVIEW`, `REJECTED`; pastikan deep link pada `CONFIRMED`.
- **FR-BE-06** Owner: `PUT /owner/properties/:id` simpan `confirmationMode`; `POST /owner/bookings/:id/confirm` & `/reject` (MANUAL confirm oleh owner).

### 5.2 membumi-dashboard (repo ini)
Ikuti pola approval topup/withdrawals (`useTransition` + `confirm()`/`prompt()` + Server Action + `apiPost` + `revalidatePath`).
- **FR-DSH-01** `src/lib/constants.ts`: perluas `BOOKING_STATUSES` + `BOOKING_STATUS_LABEL` (copy Indonesia) + tone.
- **FR-DSH-02** `src/components/ui/badge.tsx`: tone status baru (`AWAITING_*`→yellow/blue, `PAYMENT_REVIEW`→purple, `REJECTED`→red).
- **FR-DSH-03** `src/lib/validations.ts`: `bookingReviewSchema {id, reason?}`. `src/lib/types.ts`: perluas `Booking`.
- **FR-DSH-04** `src/server/actions/hotels.ts`: `confirmBookingAvailability`, `rejectBooking`, `approveBookingPayment`, `rejectBookingPayment` — semua `requireRole("ADMIN")` + `revalidatePath`.
- **FR-DSH-05** Halaman `src/app/(dashboard)/penginapan/booking/page.tsx` dua section: **Menunggu Konfirmasi** (`AWAITING_CONFIRMATION`) & **Menunggu Verifikasi Pembayaran** (`PAYMENT_REVIEW`) + `review-actions.tsx`. Update `orders/page.tsx` BookingsTab pakai label/badge baru.

### 5.3 Flutter — `ojol-super-app`
`lib/features/penginapan/` (bloc + go_router + GetIt + DioClient).
- **FR-APP-01** `bookHotel()` hanya `POST /hotel-bookings` (hapus pemanggilan payment di checkout); CTA "Ajukan Booking".
- **FR-APP-02** `booking_payment_screen.dart` untuk `AWAITING_PAYMENT`: Saldo→`pay {wallet}`; Transfer→`pay {transfer}` + buka WhatsApp (`url_launcher`/`wa.me`). Tambah `PayBookingUseCase` + DI.
- **FR-APP-03** `mistay_history_screen.dart` dari `GET /hotel-bookings` (ganti `_history` in-memory); entry "Riwayat" di `hotel_search_screen.dart`; `eticket_screen.dart` (voucher+QR+detail). Route `/hotel/history`, `/hotel/bookings/:id`.
- **FR-APP-04** `notification_deep_link.dart`: handle `hotel-bookings` → detail/e-ticket/payment sesuai status.

### 5.4 hotel-owner-dashboard
Next.js + React Query + Zustand; API via `src/lib/api.ts`.
- **FR-OWN-01** `Property` type + form `app/(dashboard)/property/page.tsx`: `Select` `confirmationMode` (AUTO/MANUAL) di body `PATCH owner/properties/{id}`.
- **FR-OWN-02** Antrean booking pending (`AWAITING_CONFIRMATION`) + tombol Konfirmasi/Tolak via `Dialog`; `useBookingMutations()` → `POST owner/bookings/{id}/confirm|reject`, invalidate `qk.bookings`.

## 6. Data Model (perubahan)
- `HotelBookingEntity.status` enum +`AWAITING_CONFIRMATION|AWAITING_PAYMENT|PAYMENT_REVIEW|REJECTED`; +`rejection_reason?`.
- `PropertyEntity.confirmation_mode` `AUTO|MANUAL` (default `MANUAL`).
- `TransactionEntity` transfer manual: `method='manual'`, `status` `PENDING`→`SUCCESS` saat admin approve.

## 7. API (ringkas)
| Method | Path | Untuk |
|--------|------|-------|
| POST | `/hotel-bookings` | App: submit booking (tanpa bayar) |
| POST | `/hotel-bookings/:id/pay` | App: bayar (wallet/transfer) saat `AWAITING_PAYMENT` |
| GET | `/hotel-bookings` | App: History MiStay / e-ticket |
| GET | `/admin/bookings?status=` | Dashboard: antrean konfirmasi & pembayaran |
| POST | `/admin/bookings/:id/confirm-availability` | Dashboard: setujui ketersediaan |
| POST | `/admin/bookings/:id/reject` | Dashboard: tolak ketersediaan |
| POST | `/admin/bookings/:id/approve-payment` | Dashboard: approve bukti transfer |
| POST | `/admin/bookings/:id/reject-payment` | Dashboard: tolak pembayaran |
| PUT | `/owner/properties/:id` | Owner: set `confirmationMode` |
| POST | `/owner/bookings/:id/confirm`·`/reject` | Owner: konfirmasi booking (MANUAL) |

## 8. Urutan Eksekusi
1. **Backend** (#5.1) — fondasi status & endpoint.
2. **membumi-dashboard** (#5.2) — gerbang admin.
3. **hotel-owner-dashboard** (#5.4) — mode + confirm owner.
4. **Flutter** (#5.3) — submit/pay/history/e-ticket/deep link.

Backward-compat: pertahankan `PATCH /admin/bookings/:id/status` & jalur Midtrans yang ada.

## 9. Testing & Verifikasi
- **backend**: Jest unit transisi state (create→AWAITING_*, confirm, approve-payment→CONFIRMED+mirror, reject lepas allotment, guard `pay`), AUTO vs MANUAL; ≥1 valid + 1 invalid per aturan.
- **membumi-dashboard**: Vitest `bookingReviewSchema` valid/invalid, mapping label/tone tiap status, role-gating Server Actions (mock session+api-client); `npm run lint` & `tsc` bersih.
- **Flutter**: bloc_test cubit submit/pay; **owner-dashboard**: Vitest mutation mode & confirm/reject.
- **E2E manual** (backend NestJS di :3000): submit→konfirmasi→bayar Saldo→e-ticket+mirror; submit→bayar transfer→WA→approve→CONFIRMED; properti AUTO auto-`AWAITING_PAYMENT`; uji Tolak di kedua gerbang.

## 10. Catatan & Risiko
- **Katalog Mongo vs allotment Postgres:** AUTO hanya untuk booking ter-link owner property (`property_id`/`room_type_id`); katalog tanpa owner → paksa MANUAL.
- **WhatsApp manual:** tidak menyimpan bukti; nomor admin WA jadi config `.env`.
- **Timeout pembayaran:** job pelepas allotment + `CANCELLED` bila lewat batas (opsional, fase 2).
- **Refund** owner-side belum otomatis memproses dana — di luar cakupan.
