# PRD — Modul Open Trip (Trip, Itinerary, Guide, Registrasi)

## 1. Tujuan
Memungkinkan admin/operator membuat & mengelola paket open trip lengkap dengan itinerary harian, guide, kuota slot, dan memonitor registrasi peserta. Diserve ke Flutter via `GET /api/v1/trips`.

## 2. Aktor & Peran
- **OPERATOR** — buat/edit trip, itinerary, guide.
- **ADMIN** — + hapus trip, kelola registrasi.
- **SUPER_ADMIN** — semua akses.

## 3. Use Cases

### UC-01 — Membuat Open Trip
- **Aktor:** Operator
- **Prakondisi:** Login; guide tersedia (opsional).
- **Alur Utama:**
  1. `Open Trip → Trips → Tambah`.
  2. Isi `title, destination, imageUrl, price (per orang), durationDays, startDate, totalSlots, description`, pilih guide & merchant (opsional), isi `includes[]` (mis. makan, transport, tiket).
  3. Submit → validasi → simpan (`bookedSlots=0`, `rating=0`).
- **Alur Alternatif:** `totalSlots ≤ 0` atau `startDate` di masa lalu → error.

### UC-02 — Editor Itinerary Harian
- **Aktor:** Operator
- **Alur Utama:** Di detail trip → tab **Itinerary** → tambah hari berurutan (`day, title, activities[]`). Reorder/hapus hari. Jumlah hari idealnya = `durationDays`.
- **Aturan:** `day` unik per trip; peringatkan bila jumlah hari ≠ `durationDays`.

### UC-03 — Mengelola Guide
- **Aktor:** Operator
- **Alur:** CRUD guide (`name, rating, tripCount`); assign guide ke trip.

### UC-04 — Monitoring Registrasi Peserta
- **Aktor:** Admin
- **Alur Utama:** Tab **Registrations** → tabel (`contactName, participants, total, createdAt`, filter per trip). `bookedSlots` trip otomatis = jumlah peserta terdaftar.
- **Pascakondisi:** Trip menampilkan fill rate `bookedSlots/totalSlots`; tandai SOLD OUT bila penuh.

## 4. Functional Requirements
- **FR-01** CRUD Trip sesuai `trip.dart`; `includes` & itinerary sebagai data terstruktur.
- **FR-02** Itinerary editor: repeatable day dengan list activities (ArrayInput nested).
- **FR-03** List trip: search destination, filter rentang tanggal/harga, indikator slot tersisa.
- **FR-04** `GET /api/v1/trips?destination` mengembalikan trip yang `startDate ≥ hari ini` & slot tersisa.
- **FR-05** Registrasi read-only; `bookedSlots` dihitung dari `TripRegistration`.

## 5. Data Model (ringkas)
`Trip(id,title,destination,imageUrl,price,durationDays,startDate,totalSlots,bookedSlots,rating,description,guideId?,includes[],merchantId?)` · `Guide(id,name,rating,tripCount)` · `ItineraryDay(id,tripId,day,title,activities[])` · `TripRegistration(id,tripId,participants,contactName,total,createdAt)`.

## 6. API
| Method | Path | Untuk |
|--------|------|-------|
| GET | `/api/v1/trips` | App: list/search trip |
| GET | `/api/v1/trips/[id]` | App: detail + itinerary + guide |
| POST | `/api/v1/trip-registrations` | App: join trip (`tripId, participants, paymentMethod`) |
| (admin) | Server Actions | CRUD trip/itinerary/guide |

## 7. Acceptance Criteria
- [ ] Admin dapat membuat trip dengan itinerary 3 hari dan melihatnya kembali utuh.
- [ ] `GET /api/v1/trips/[id]` mengembalikan trip + itinerary terurut + guide.
- [ ] Registrasi via API menaikkan `bookedSlots` dan muncul di tab Registrations.
- [ ] Trip dengan `bookedSlots = totalSlots` ditandai SOLD OUT dan tidak muncul di list app.
