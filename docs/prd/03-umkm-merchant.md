# PRD — Modul UMKM / Merchant Marketplace

## 1. Tujuan
Menyediakan model **marketplace**: entitas `Merchant` (UMKM/pelaku usaha) sebagai pemilik konten yang dapat memiliki banyak produk Mart, restoran Food, hotel penginapan, dan/atau open trip. Admin melakukan onboarding, verifikasi, mengatur komisi, dan memonitor performa merchant.

## 2. Aktor & Peran
- **OPERATOR** — daftarkan/edit data merchant.
- **ADMIN** — + verifikasi (PENDING→VERIFIED/REJECTED), atur `commissionRate`.
- **SUPER_ADMIN** — semua akses + hapus merchant.

## 3. Use Cases

### UC-01 — Onboarding Merchant
- **Aktor:** Operator
- **Alur Utama:**
  1. `Merchants → Tambah`.
  2. Isi `businessName, ownerName, phoneNumber, city, bankAccount?, commissionRate(%)`.
  3. Submit → tersimpan dengan `verificationStatus = PENDING`.

### UC-02 — Verifikasi Merchant
- **Aktor:** Admin
- **Prakondisi:** Merchant berstatus PENDING.
- **Alur Utama:** Buka detail merchant → review data → klik **Verifikasi** (VERIFIED) atau **Tolak** (REJECTED, beri alasan).
- **Pascakondisi:** Hanya merchant VERIFIED yang konten-nya boleh tayang di app (filter di API).

### UC-03 — Menautkan Konten ke Merchant
- **Aktor:** Operator
- **Alur:** Saat membuat Hotel/Trip/Product/Restaurant, pilih `merchantId` dari dropdown merchant VERIFIED. Detail merchant menampilkan tab konten miliknya (Produk / Restoran / Hotel / Trip).

### UC-04 — Monitoring Performa & Payout
- **Aktor:** Admin
- **Alur:** Di detail merchant lihat ringkasan: jumlah konten aktif, total order, GMV, estimasi komisi platform (= GMV × `commissionRate`). Payout aktual diproses manual di v1.

## 4. Functional Requirements
- **FR-01** CRUD Merchant dengan `verificationStatus` & `commissionRate`.
- **FR-02** Aksi verifikasi/tolak dengan catatan alasan (audit trail sederhana).
- **FR-03** Dropdown merchant (VERIFIED) tersedia di form Hotel/Trip/Product/Restaurant.
- **FR-04** Detail merchant: tab konten + ringkasan transaksi & estimasi komisi.
- **FR-05** API publik (`/api/v1/*`) hanya menampilkan konten milik merchant VERIFIED (atau tanpa merchant/internal).

## 5. Data Model (ringkas)
`Merchant(id,businessName,ownerName,phoneNumber,city,bankAccount?,commissionRate,verificationStatus(PENDING|VERIFIED|REJECTED),createdAt)` dengan relasi 1-N `merchantId?` pada `Product`, `Restaurant`, `Hotel`, `Trip`.

## 6. API
| Method | Path | Untuk |
|--------|------|-------|
| (admin) | Server Actions | CRUD merchant, verifikasi, ringkasan |
| (filter) | semua `/api/v1/*` katalog | Hanya tampilkan konten merchant VERIFIED |

## 7. Acceptance Criteria
- [ ] Merchant baru tersimpan dengan status PENDING.
- [ ] Setelah diverifikasi, merchant dapat dipilih di form konten.
- [ ] Konten milik merchant non-VERIFIED tidak tampil di endpoint `/api/v1`.
- [ ] Detail merchant menampilkan daftar konten & estimasi komisi.
