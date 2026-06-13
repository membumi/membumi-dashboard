# PRD — Modul Ride (Driver, Fare, Monitoring)

## 1. Tujuan
Mengelola data driver (ojek motor/mobil) & konfigurasi tarif, serta memonitor perjalanan (ride) yang terjadi di aplikasi.

## 2. Aktor & Peran
- **OPERATOR** — input/edit data driver.
- **ADMIN** — + verifikasi driver, atur `FareConfig`, monitor ride.
- **SUPER_ADMIN** — semua akses.

## 3. Use Cases

### UC-01 — Onboarding & Verifikasi Driver
- **Aktor:** Operator → Admin
- **Alur Utama:**
  1. `Ride → Drivers → Tambah`: isi `name, phoneNumber, vehiclePlate, vehicleName, photoUrl?`.
  2. Tersimpan `verificationStatus = PENDING`.
  3. Admin verifikasi → VERIFIED (boleh menerima order) atau REJECTED.

### UC-02 — Konfigurasi Tarif (FareConfig)
- **Aktor:** Admin
- **Alur:** `Ride → Fare Config` → atur per `type` (MOTOR/MOBIL): `baseFare, perKm, perMinute`. Dipakai endpoint estimate.

### UC-03 — Monitoring Ride
- **Aktor:** Admin
- **Alur Utama:** Tab **Rides** → tabel (`id, type, status, pickupAddress, destAddress, fareAmount, driver, createdAt`, filter status & tanggal). Read-only; status lifecycle berasal dari app.
- **Status:** SEARCHING → DRIVER_ASSIGNED → DRIVER_ARRIVING → IN_PROGRESS → COMPLETED → CANCELLED.

## 4. Functional Requirements
- **FR-01** CRUD Driver sesuai `driver.dart` + `verificationStatus`.
- **FR-02** Aksi verifikasi driver (PENDING→VERIFIED/REJECTED).
- **FR-03** FareConfig per tipe kendaraan; estimate = `baseFare + perKm×km + perMinute×menit`.
- **FR-04** List driver: search, filter status, tampil rating.
- **FR-05** Ride monitoring read-only dengan filter status.

## 5. Data Model (ringkas)
`Driver(id,name,photoUrl?,vehiclePlate,vehicleName,rating,phoneNumber?,verificationStatus)` · `FareConfig(id,type(MOTOR|MOBIL),baseFare,perKm,perMinute)` · `Ride(id,type,status,pickupAddress,destAddress,fareAmount,driverId?,createdAt)`. Enum `RideStatus`, `RideType` di-mirror dari `ride.dart`.

## 6. API
| Method | Path | Untuk |
|--------|------|-------|
| GET | `/api/v1/rides/estimate` | App: estimasi tarif dari FareConfig |
| GET | `/api/v1/rides/nearby-drivers` | App: driver VERIFIED terdekat |
| POST | `/api/v1/rides/create` | App: buat ride |
| GET | `/api/v1/rides/[id]/track` | App: tracking driver |

## 7. Acceptance Criteria
- [ ] Driver baru berstatus PENDING dan hanya VERIFIED yang muncul di `nearby-drivers`.
- [ ] Mengubah FareConfig mengubah hasil endpoint estimate.
- [ ] Ride yang dibuat via app muncul di tab Rides dengan status terkini.
