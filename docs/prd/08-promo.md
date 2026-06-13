# PRD — Modul Promo & Banner

## 1. Tujuan
Mengelola promo/voucher dan banner promosi yang tampil di home app, beserta aturan diskon per layanan.

## 2. Aktor & Peran
- **OPERATOR** — buat/edit promo.
- **ADMIN** — + aktif/nonaktifkan, hapus.
- **SUPER_ADMIN** — semua akses.

## 3. Use Cases

### UC-01 — Membuat Promo
- **Aktor:** Operator
- **Alur Utama:**
  1. `Promos → Tambah`.
  2. Isi `title, description, code (unik), discountType (PERCENT|FIXED|FREE_SHIPPING), value, service (RIDE|FOOD|MART|HOTEL|TRIP|ALL), imageUrl? (banner), expiresAt`.
  3. Submit → validasi kode unik & `value` sesuai tipe (PERCENT 1–100).
- **Alur Alternatif:** Kode duplikat → error.

### UC-02 — Aktif/Nonaktif & Kedaluwarsa
- **Aktor:** Admin
- **Alur:** Toggle `active`. Promo dengan `expiresAt < sekarang` otomatis tidak tampil di app.

### UC-03 — Preview Banner
- **Aktor:** Operator
- **Alur:** Pratinjau tampilan banner (gambar + judul) sebelum publish.

## 4. Functional Requirements
- **FR-01** CRUD Promo dengan kode unik.
- **FR-02** Validasi `value` sesuai `discountType`.
- **FR-03** Filter promo aktif & belum kedaluwarsa untuk endpoint app.
- **FR-04** List promo: filter service & status aktif.

## 5. Data Model (ringkas)
`Promo(id,title,description,code,discountType(PERCENT|FIXED|FREE_SHIPPING),value,service(RIDE|FOOD|MART|HOTEL|TRIP|ALL),imageUrl?,expiresAt,active,createdAt)`.

## 6. API
| Method | Path | Untuk |
|--------|------|-------|
| GET | `/api/v1/promos` | App: promo aktif untuk home/checkout |
| (admin) | Server Actions | CRUD promo |

## 7. Acceptance Criteria
- [ ] Promo kode duplikat ditolak.
- [ ] Promo nonaktif/kedaluwarsa tidak muncul di `/api/v1/promos`.
- [ ] Banner dengan `imageUrl` tampil di pratinjau.
