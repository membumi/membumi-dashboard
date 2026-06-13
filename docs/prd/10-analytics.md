# PRD — Modul Overview & Analytics

## 1. Tujuan
Memberi admin gambaran kesehatan bisnis lintas layanan dalam satu halaman: metrik utama, tren pendapatan, dan aktivitas terbaru.

## 2. Aktor & Peran
- **ADMIN / SUPER_ADMIN** — akses penuh metrik.
- **OPERATOR** — versi ringkas (tanpa angka finansial sensitif).

## 3. Use Cases

### UC-01 — Dashboard Overview
- **Aktor:** Admin
- **Alur Utama:** Halaman `/` menampilkan kartu metrik: total user, total booking, total order (food+mart), total ride, GMV hari ini & bulan ini. Plus daftar order/booking terbaru.

### UC-02 — Tren Pendapatan
- **Aktor:** Admin
- **Alur:** Grafik (Recharts) pendapatan per layanan (Ride/Food/Mart/Hotel/Trip) dengan filter rentang waktu (7/30/90 hari).

### UC-03 — Peringkat & Insight
- **Aktor:** Admin
- **Alur:** Top merchant berdasarkan GMV, top produk/menu/trip terlaris, fill rate trip, occupancy hotel. Indikator stok rendah & merchant menunggu verifikasi (actionable links).

## 4. Functional Requirements
- **FR-01** Query agregasi (count & sum) per entitas dengan rentang waktu.
- **FR-02** Grafik tren pendapatan per layanan.
- **FR-03** Tabel "perlu tindakan": merchant PENDING, driver PENDING, produk low stock, trip hampir penuh.
- **FR-04** Caching ringan agar query agregasi tidak berat (revalidate berkala).
- **FR-05** OPERATOR melihat versi tanpa GMV/finansial.

## 5. Data Sumber
Agregasi lintas tabel: `Booking`, `TripRegistration`, `MartOrder`, `FoodOrder`, `Ride`, `WalletTransaction`, `Merchant`, `Product`, `Driver`, `Trip`, `Hotel`.

## 6. Acceptance Criteria
- [ ] Kartu metrik menampilkan angka yang konsisten dengan data DB.
- [ ] Grafik tren dapat difilter per rentang waktu & layanan.
- [ ] Item "perlu tindakan" tertaut ke halaman terkait (mis. verifikasi merchant).
- [ ] OPERATOR tidak melihat angka GMV.
