# PRD — Modul Penginapan (Hotel, Room, Booking)

## 1. Tujuan
Memungkinkan admin/merchant mengelola katalog penginapan (hotel, kamar, amenities, harga) dan memonitor booking yang masuk dari aplikasi. Data ini diserve ke Flutter via `GET /api/v1/hotels`.

## 2. Aktor & Peran
- **OPERATOR** — input/edit hotel, kamar, amenities.
- **ADMIN** — semua di atas + hapus hotel/kamar, ubah/cancel booking.
- **SUPER_ADMIN** — semua akses.
- **Merchant** (tidak login dashboard di v1) — pemilik hotel; dikaitkan via `Hotel.merchantId`.

## 3. Use Cases

### UC-01 — Membuat Hotel Baru
- **Aktor:** Operator
- **Prakondisi:** Sudah login; (opsional) merchant tersedia.
- **Alur Utama:**
  1. Buka `Penginapan → Hotels → Tambah`.
  2. Isi `name, city, address, starRating(1–5), pricePerNight, imageUrl (upload)`, pilih amenities, pilih merchant (opsional).
  3. Submit → validasi Zod → simpan → redirect ke detail hotel.
- **Alur Alternatif:** Validasi gagal (harga ≤ 0, nama kosong) → tampilkan error inline.
- **Pascakondisi:** Hotel tersimpan, `rating=0, reviewCount=0` default.

### UC-02 — Mengelola Kamar (Room) per Hotel
- **Aktor:** Operator
- **Alur Utama:** Di detail hotel → tab **Rooms** → Tambah kamar (`name, pricePerNight, capacity, facilities[], available`). Edit/hapus kamar dari tabel.
- **Aturan:** Hotel minimal punya 1 kamar agar bisa dibooking.

### UC-03 — Mengelola Amenities
- **Aktor:** Operator
- **Alur:** Pilih dari daftar amenity global (WiFi, Pool, AC, dst.) atau buat baru; relasi M-N ke hotel.

### UC-04 — Monitoring & Update Booking
- **Aktor:** Admin
- **Alur Utama:** Buka tab **Bookings** → tabel (filter: hotel, status, tanggal). Buka detail booking → lihat `voucherCode, guestName, room, checkIn/checkOut, guests, total`. Ubah `status` (CONFIRMED → CANCELLED).
- **Pascakondisi:** Status tersimpan; jika cancel, slot/refund dicatat (refund manual di v1).

### UC-05 — Moderasi Review
- **Aktor:** Admin
- **Alur:** Lihat review per hotel; hapus review tidak pantas. (Read + delete di v1.)

## 4. Functional Requirements
- **FR-01** CRUD Hotel dengan field sesuai `hotel.dart`.
- **FR-02** CRUD Room sebagai child hotel; `facilities` sebagai array (ArrayInput).
- **FR-03** Upload 1 gambar utama hotel (`imageUrl`), preview sebelum simpan.
- **FR-04** List hotel: search by name/city, filter starRating, paginate, sort by pricePerNight.
- **FR-05** Booking read-only kecuali field `status`.
- **FR-06** `GET /api/v1/hotels?city&checkIn&checkOut&guests` memfilter hotel yang punya kamar `available` & `capacity ≥ guests`.

## 5. Data Model (ringkas)
`Hotel(id,name,city,address,imageUrl,rating,reviewCount,starRating,pricePerNight,merchantId?)` · `Room(id,hotelId,name,pricePerNight,capacity,facilities[],available)` · `Amenity(id,name)` M-N Hotel · `HotelReview(id,hotelId,authorName,rating,comment,date)` · `Booking(id,voucherCode,hotelId,roomId,guestName,city,checkIn,checkOut,guests,total,status,createdAt)`.

## 6. API
| Method | Path | Untuk |
|--------|------|-------|
| GET | `/api/v1/hotels` | App: list/search hotel |
| GET | `/api/v1/hotels/[id]` | App: detail + rooms + reviews |
| POST | `/api/v1/hotel-bookings` | App: buat booking (`hotelId, roomId, paymentMethod`) |
| (admin) | Server Actions | CRUD hotel/room/amenity, update booking |

## 7. Acceptance Criteria
- [ ] Admin dapat membuat hotel + ≥1 kamar dan melihatnya di list.
- [ ] `GET /api/v1/hotels/[id]` mengembalikan hotel beserta rooms & reviews dalam envelope `{success,data}`.
- [ ] Booking yang dibuat via API muncul di tab Bookings dan statusnya dapat diubah.
- [ ] Validasi menolak harga ≤ 0 dan field wajib kosong.
