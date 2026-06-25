# Plan: Alur Booking Penginapan dengan Approval Admin & Mode Owner

## Context

Saat ini alur booking penginapan (MiStay) berjalan **bayar-di-depan**: di Flutter, user
checkout langsung memanggil `POST /hotel-bookings` lalu **langsung** `POST /payment/process`.
Pembayaran non-wallet dikonfirmasi otomatis oleh webhook Midtrans. Tidak ada gerbang manusia.

Kebutuhan baru (untuk mengantisipasi penginapan yang tidak rutin update data, dan kontrol
pembayaran transfer bank): menyisipkan **dua gerbang persetujuan**:

1. **Konfirmasi ketersediaan kamar** — setelah user submit booking *tanpa bayar*, admin
   (atau sistem, tergantung mode owner) memastikan kamar tersedia sebelum user diminta bayar.
2. **Approval pembayaran transfer bank** — user kirim bukti transfer via WhatsApp, admin
   approve di dashboard, baru booking diteruskan ke owner & e-ticket terbit.

Plus **mode per-properti**: `AUTO` (owner rajin update allotment → sistem auto-approve
ketersediaan) vs `MANUAL` (admin konfirmasi ke penginapan dulu). Dan menambah **halaman
History MiStay** di Flutter sebagai tempat e-ticket muncul.

**Keputusan yang sudah disepakati:**
- Cakupan: **keempat repo** (`ojol-super-app-backend`, `membumi-dashboard`, `ojol-super-app`, `hotel-owner-dashboard`).
- Mode owner: **toggle AUTO / MANUAL** per-properti (tanpa fallback kebasian data).
- Bukti transfer bank: **WhatsApp saja** (pola seperti topup — admin lihat di WA lalu klik Approve, tidak ada gambar tersimpan).
- Mode AUTO: **auto-skip konfirmasi admin** — jika allotment tersedia, booking langsung `AWAITING_PAYMENT`.

> Catatan stack per repo (hasil eksplorasi):
> - backend: **NestJS + TypeORM (Postgres)** untuk booking/payment/owner; katalog hotel di Mongo. (Bukan Prisma.)
> - membumi-dashboard: Next.js App Router, Server Actions, `apiPost/apiPatch`, `requireRole`.
> - Flutter: `flutter_bloc` + `go_router` + GetIt, `DioClient`/`ApiInterceptor`.
> - hotel-owner-dashboard: Next.js + React Query + Zustand, API via BFF proxy `/api/proxy/*`.

---

## Lifecycle booking baru (sumber kebenaran lintas-repo)

Status guest booking (`HotelBookingEntity.status`) diperluas menjadi:

```
AWAITING_CONFIRMATION   ← user submit via Flutter, BELUM bayar (state awal MANUAL)
        │
        ├─(MANUAL) admin/owner konfirmasi ketersediaan ─┐
        ├─(AUTO) allotment tersedia → otomatis ─────────┤
        │                                               ▼
        │                                        AWAITING_PAYMENT  → notif "silakan bayar"
        │                                               │
        └─ tidak tersedia ─────────► REJECTED           │ user bayar via Flutter:
                                     (terminal+notif)    │
                                                         ├─ wallet: debit → CONFIRMED
                                                         └─ transfer bank: PAYMENT_REVIEW
                                                                  │ (user kirim bukti via WA)
                                                                  │ admin approve di dashboard
                                                                  ▼
                                                            CONFIRMED  → mirror ke owner + e-ticket + notif
                                                                  │
                                                            CHECKED_IN → CHECKED_OUT   (alur front-desk owner, sudah ada)
CANCELLED  ← bisa dari state mana saja sebelum CHECKED_OUT
```

**Status baru:** `AWAITING_CONFIRMATION`, `AWAITING_PAYMENT`, `PAYMENT_REVIEW`, `REJECTED`.
**Dipertahankan:** `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`.

**Aturan allotment (`OCCUPYING_STATUSES`):**
- MANUAL: allotment **belum** dipotong di `AWAITING_CONFIRMATION`; dipotong (soft-hold) saat masuk `AWAITING_PAYMENT`.
- AUTO: allotment dipotong saat auto-approve ke `AWAITING_PAYMENT`.
- Jika `REJECTED`/`CANCELLED`/timeout pembayaran → allotment dilepas.
- Mirror `OwnerBookingEntity` **hanya dibuat saat `CONFIRMED`** (sebelumnya dibuat saat create) — penginapan baru lihat booking yang sudah lunas.

---

## 1. Backend — `ojol-super-app-backend` (fondasi, kerjakan pertama)

Modul: `src/modules/hotels/` (guest), `src/modules/hotel-owner/` (owner), `src/modules/payment/`, `src/modules/notifications/`.

### 1a. Status & entity
- `src/modules/hotels/entities/hotel-booking.entity.ts`: tambah status baru ke enum + perbarui `OCCUPYING_STATUSES` sesuai aturan di atas. Tambah kolom `payment_proof_note`/`rejection_reason` (opsional, untuk catatan admin) via migration baru `19xxxxx-HotelBookingApprovalFlow.ts`.
- `src/modules/hotel-owner/entities/property.entity.ts`: tambah kolom `confirmation_mode varchar default 'MANUAL'` (enum `AUTO|MANUAL`) di migration yang sama.

### 1b. Create booking → tanpa bayar, tanpa mirror
- `HotelBookingsService` (create): **hapus** pemanggilan payment & `reserveAndMirror` saat create. Tentukan state awal:
  - booking ter-link ke owner property `confirmationMode=AUTO` **dan** `Availability` menunjukkan kamar tersedia → set `AWAITING_PAYMENT` + soft-hold allotment.
  - selain itu → `AWAITING_CONFIRMATION`.
  - Kirim notif sesuai state (lihat 1e).
- `controllers/hotel-bookings.controller.ts` `POST /hotel-bookings`: payload sama, tapi response menyertakan `status` agar Flutter tahu harus tampilkan "menunggu konfirmasi" vs "silakan bayar".

### 1c. Endpoint bayar (dipisah dari create)
- Tambah `POST /hotel-bookings/:id/pay` (atau reuse `/payment/process` dengan guard): **hanya boleh saat `AWAITING_PAYMENT`**.
  - `method=wallet` → `WalletService.debit()` → sukses → `CONFIRMED` (lewat `PaymentSucceededEvent` yang sudah ada).
  - `method=transfer` (bank/WA manual) → buat `TransactionEntity` status `PENDING` (method `manual`), set booking `PAYMENT_REVIEW`. **Jangan** lewat Midtrans. Kirim notif berisi instruksi WA.
- Guard: tolak `pay` jika status ≠ `AWAITING_PAYMENT` (cegah bayar sebelum di-approve).

### 1d. Endpoint admin (dipakai membumi-dashboard)
Controller `AdminBookingsController` (atau baru `AdminHotelBookingsController`), prefix `/admin/bookings`:
- `GET /admin/bookings?status=...` — sudah ada; pastikan filter status baru jalan (untuk antrian konfirmasi & antrian pembayaran).
- `POST /admin/bookings/:id/confirm-availability` → `AWAITING_CONFIRMATION` → `AWAITING_PAYMENT` (+ soft-hold allotment, + notif "silakan bayar").
- `POST /admin/bookings/:id/reject` → `REJECTED` (+ lepas allotment, + notif). Body: `{ reason? }`.
- `POST /admin/bookings/:id/approve-payment` → `PAYMENT_REVIEW` → tandai transaksi `SUCCESS` → emit `PaymentSucceededEvent` → `CONFIRMED` → **baru di sini** `GuestBookingBridgeService.reserveAndMirror()` membuat `OwnerBookingEntity` (paymentStatus `PAID`) + terbitkan voucher/e-ticket + notif.
- `POST /admin/bookings/:id/reject-payment` → kembali ke `AWAITING_PAYMENT` (atau `CANCELLED`) + notif. Body: `{ reason? }`.
- Pertahankan `PATCH /admin/bookings/:id/status` untuk override manual (mis. CANCELLED).

### 1e. Notifications
`src/modules/notifications/services/notifications.listener.ts` — tambah `HOTEL_COPY` untuk:
- `AWAITING_PAYMENT`: "Booking disetujui — Kamar tersedia. Silakan lakukan pembayaran."
- `PAYMENT_REVIEW`: "Pembayaran diterima — Menunggu verifikasi bukti transfer."
- `REJECTED`: "Booking tidak tersedia — Mohon maaf, kamar tidak tersedia."
- `CONFIRMED`: sudah ada (e-voucher siap). Pastikan deep link `superapp://hotel-bookings/{id}` terkirim.

### 1f. Owner mode & confirm (dipakai hotel-owner-dashboard)
- `OwnerPropertyController` `PUT /owner/properties/:id`: terima & simpan `confirmationMode`.
- Tambah `POST /owner/bookings/:id/confirm` & `POST /owner/bookings/:id/reject` agar owner (mode MANUAL) bisa konfirmasi sendiri tanpa lewat admin — transisi sama dgn 1d confirm-availability/reject pada `source_booking_id` terkait.

### 1g. Test (Jest backend)
- Unit service: transisi state (create→AWAITING_*, confirm, approve-payment→CONFIRMED+mirror, reject lepas allotment), guard `pay` saat status salah, AUTO vs MANUAL routing. Minimal 1 kasus valid + 1 invalid per aturan.

---

## 2. membumi-dashboard (repo ini) — UI admin untuk dua gerbang

Ikuti pola approval yang sudah ada (topup/withdrawals): **inline confirm/prompt + Server Action + `apiPost` + `revalidatePath`**, dan `StatusBadge`.

### 2a. Konstanta & validasi & types
- `src/lib/constants.ts`: perluas `BOOKING_STATUSES` dgn `AWAITING_CONFIRMATION`, `AWAITING_PAYMENT`, `PAYMENT_REVIEW`, `REJECTED`. Tambah `BOOKING_STATUS_LABEL` (copy Indonesia) & tone untuk badge.
- `src/components/ui/badge.tsx`: tambah mapping tone untuk status baru (`AWAITING_*`→yellow/blue, `REJECTED`→red, `PAYMENT_REVIEW`→purple).
- `src/lib/validations.ts`: tambah skema `bookingReviewSchema` (`{ id, reason? }`). `bookingStatusSchema` tetap.
- `src/lib/types.ts`: perluas `Booking` (tambah field bila perlu: `rejectionReason?`).

### 2b. Server Actions
`src/server/actions/hotels.ts` — tambah, semua `requireRole("ADMIN")` + `revalidatePath`:
- `confirmBookingAvailability(fd)` → `POST /admin/bookings/{id}/confirm-availability`
- `rejectBooking(fd)` → `POST /admin/bookings/{id}/reject` (body `reason`)
- `approveBookingPayment(fd)` → `POST /admin/bookings/{id}/approve-payment`
- `rejectBookingPayment(fd)` → `POST /admin/bookings/{id}/reject-payment` (body `reason`)

### 2c. UI — dua antrian
Tempatkan di modul penginapan (lebih kontekstual daripada `/orders`). Buat halaman & tab baru:
- `src/app/(dashboard)/penginapan/booking/page.tsx` — daftar booking dgn filter status (RSC, `apiGetPaged<Booking>("/admin/bookings", { status })`). Dua section/tab:
  - **Menunggu Konfirmasi** (`status=AWAITING_CONFIRMATION`) → tombol *Setujui (kamar tersedia)* / *Tolak*.
  - **Menunggu Verifikasi Pembayaran** (`status=PAYMENT_REVIEW`) → tampilkan info "cek bukti di WhatsApp", tombol *Approve* / *Tolak*.
- `src/app/(dashboard)/penginapan/booking/review-actions.tsx` — Client Component meniru `topup/review-actions.tsx` (`useTransition`, `confirm()` untuk approve, `prompt()` untuk alasan tolak).
- Update `src/app/(dashboard)/orders/page.tsx` BookingsTab: pakai label & badge status baru (tetap read-only/override).
- Tambah entri nav bila modul penginapan punya sub-nav.

### 2d. Test (Vitest) — WAJIB
- `tests/validations.test.ts`: `bookingReviewSchema` valid/invalid.
- `tests/utils.test.ts` atau baru: mapping `BOOKING_STATUS_LABEL`/tone lengkap untuk tiap status.
- Role-gating Server Actions (mock `session` + `api-client`) — pastikan `requireRole("ADMIN")` dipanggil & endpoint benar.
- `npm run lint` & `tsc` bersih.

---

## 3. Flutter — `ojol-super-app` (submit-tanpa-bayar, bayar-setelah-approve, History MiStay)

Folder: `lib/features/penginapan/`. Stack: bloc + go_router + GetIt + DioClient.

### 3a. Submit tanpa bayar
- `data/repositories/hotel_repository_impl.dart` + `data/datasources/hotel_remote_datasource.dart`: `bookHotel()` **hanya** `POST /hotel-bookings`, **hapus** pemanggilan `PaymentRemoteDataSource.process()` di sini.
- `presentation/pages/booking_checkout_screen.dart`: hapus pemilihan metode bayar di checkout; ganti CTA jadi "Ajukan Booking". Setelah sukses → `booking_confirmation_screen.dart` menampilkan status "Menunggu konfirmasi ketersediaan".

### 3b. Bayar setelah approve
- Tambah `presentation/pages/booking_payment_screen.dart` (atau reuse `payment_screen.dart`) yang muncul saat booking `AWAITING_PAYMENT` (dari notif/History/detail).
  - Pilih metode: **Saldo** → `POST /hotel-bookings/:id/pay {method:'wallet'}` → sukses → e-ticket.
  - **Transfer bank** → `POST /hotel-bookings/:id/pay {method:'transfer'}` → tampilkan rekening + instruksi **"kirim bukti transfer via WhatsApp ke <nomor admin>"** (buka WA via `url_launcher`/`wa.me`), status jadi `PAYMENT_REVIEW`.
- `domain/usecases/hotel_usecases.dart`: tambah `PayBookingUseCase`; daftarkan di `lib/core/di/injection.dart`.
- `presentation/bloc/booking_cubit.dart`: state baru untuk submit vs pay.

### 3c. Halaman History MiStay + e-ticket
- Tambah `presentation/pages/mistay_history_screen.dart` — list dari `GET /hotel-bookings` (ganti `_history` in-memory jadi panggilan backend nyata; `GetBookingHistoryUseCase` sudah ada, sambungkan ke datasource).
- Tambah entry point dari hub MiStay: tombol/menu "Riwayat" di `hotel_search_screen.dart`.
- Tambah `presentation/pages/eticket_screen.dart` — tampilkan voucher code + QR + detail (struk/e-ticket) untuk booking `CONFIRMED`.
- Route di `lib/core/router/app_router.dart`: `/hotel/history`, `/hotel/bookings/:id` (e-ticket/detail).

### 3d. Deep link notif
- `lib/core/router/notification_deep_link.dart`: tambah case `hotel-bookings` → route ke detail/e-ticket atau payment screen sesuai status. (Saat ini fallback ke `/home`.)

### 3e. Test
- Cubit test (bloc_test): submit→AWAITING_CONFIRMATION; pay wallet→CONFIRMED; pay transfer→PAYMENT_REVIEW. Mock datasource.

---

## 4. hotel-owner-dashboard — toggle mode & konfirmasi booking owner

Stack: Next.js + React Query + Zustand, API via `src/lib/api.ts` (proxy). Copy Indonesia.

### 4a. Toggle confirmation mode (per-properti)
- `src/lib/types.ts`: tambah `confirmationMode?: 'AUTO' | 'MANUAL'` pada `Property`.
- `app/(dashboard)/property/page.tsx`: tambah `Select` mode (AUTO/MANUAL) di form properti; sertakan di body `PATCH owner/properties/{id}` lewat `usePropertyMutations().update` (sudah ada).
- Tambah keterangan: AUTO = booking auto-approve dari allotment realtime; MANUAL = perlu konfirmasi manual.

### 4b. Konfirmasi booking masuk (mode MANUAL)
- Tambah aksi di antrean booking pending: `app/(dashboard)/bookings/page.tsx` (filter `status=AWAITING_CONFIRMATION`) atau bagian baru di `front-desk/arrivals`. Tombol *Konfirmasi* / *Tolak* via `Dialog`.
- `src/lib/hooks.ts`: tambah `useBookingMutations()` → `confirm` (`POST owner/bookings/{id}/confirm`) & `reject` (`POST owner/bookings/{id}/reject`), `onSuccess` invalidate `qk.bookings`.

### 4c. Test
- Vitest: mock `api.patch` untuk update `confirmationMode`; mock confirm/reject mutation.

---

## Urutan eksekusi & dependensi

1. **Backend** (#1) lebih dulu — semua repo lain bergantung pada status & endpoint baru. Migrasi + status enum + pisah create/pay + endpoint admin/owner + notif.
2. **membumi-dashboard** (#2) — gerbang admin (paling sesuai permintaan inti).
3. **hotel-owner-dashboard** (#4) — toggle mode + confirm owner.
4. **Flutter** (#3) — submit-tanpa-bayar, bayar-setelah-approve, History/e-ticket, deep link.

Backward-compat: pertahankan `PATCH /admin/bookings/:id/status` & jalur Midtrans yang ada agar tidak merusak alur non-transfer-manual yang sudah jalan.

---

## Verifikasi end-to-end

**Per repo:**
- backend: `npm run test` (Jest) untuk service transisi; jalankan `npm run start:dev`, uji endpoint via REST client.
- membumi-dashboard: `npm test` (Vitest) + `npm run lint` + `tsc`; jalankan `PORT=3100 npm run dev`, buka `/penginapan/booking`.
- Flutter: `flutter test`; `flutter run` uji manual.
- owner-dashboard: `vitest`; `npm run dev`.

**Skenario manual lengkap (butuh backend NestJS jalan di :3000):**
1. Flutter: submit booking → cek status `AWAITING_CONFIRMATION` (MANUAL) atau `AWAITING_PAYMENT` (AUTO + allotment).
2. membumi-dashboard (MANUAL): buka antrean "Menunggu Konfirmasi" → *Setujui* → user dapat notif "silakan bayar".
3. Flutter: bayar **Saldo** → langsung `CONFIRMED`, e-ticket muncul di History MiStay; cek booking masuk owner-dashboard (mirror).
4. Flutter: bayar **Transfer bank** → status `PAYMENT_REVIEW`, instruksi WA tampil → user "kirim bukti" → admin di membumi-dashboard *Approve* → `CONFIRMED` → e-ticket + mirror ke owner.
5. owner-dashboard: set properti `AUTO`, ulangi langkah 1 → booking auto `AWAITING_PAYMENT` tanpa aksi admin.
6. Uji *Tolak* di kedua gerbang → status `REJECTED`/kembali, allotment dilepas, notif terkirim.

---

## Catatan & risiko

- **Katalog Mongo vs allotment Postgres:** mode AUTO hanya valid untuk booking yang ter-link ke owner property (`property_id`/`room_type_id`). Hotel katalog tanpa owner → paksa MANUAL (default).
- **WhatsApp manual:** sesuai keputusan, tidak ada bukti tersimpan; admin verifikasi di WA. Nomor admin WA jadikan config (`.env`).
- **Timeout pembayaran:** pertimbangkan job yang melepas allotment & `CANCELLED` jika `AWAITING_PAYMENT`/`PAYMENT_REVIEW` melewati batas (opsional, bisa fase 2).
- **Refund** sudah ada di owner-side namun pemrosesan dana belum otomatis — di luar cakupan plan ini.
