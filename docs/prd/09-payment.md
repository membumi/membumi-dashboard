# PRD — Modul Payment & Wallet

## 1. Tujuan
Memonitor transaksi keuangan lintas layanan (wallet ledger) dan menyediakan ringkasan settlement. Bersifat read-only + filter di v1 (gateway pembayaran nyata menyusul Phase 5 app).

## 2. Aktor & Peran
- **ADMIN** — lihat & filter transaksi, ekspor.
- **SUPER_ADMIN** — + lihat ringkasan settlement & konfigurasi.
- **OPERATOR** — tidak punya akses (data finansial).

## 3. Use Cases

### UC-01 — Monitoring Wallet Transactions
- **Aktor:** Admin
- **Alur Utama:** `Payments → Transactions` → tabel (`type, description, amount, isCredit, user, createdAt`). Filter: tipe (TOP_UP/RIDE/FOOD/MART/HOTEL/TRIP/REFUND), rentang tanggal, user. Total kredit vs debit ditampilkan.

### UC-02 — Ringkasan Settlement
- **Aktor:** Super Admin
- **Alur:** Lihat agregasi pendapatan per layanan & estimasi komisi merchant (link ke modul Merchant). Ekspor CSV untuk rekonsiliasi manual.

### UC-03 — Refund (manual)
- **Aktor:** Admin
- **Alur:** Tandai transaksi sebagai REFUND (membuat entry kredit), catat alasan. Pemrosesan dana aktual di luar sistem (v1).

## 4. Functional Requirements
- **FR-01** List WalletTransaction sesuai `wallet_transaction.dart` (read-only).
- **FR-02** Filter & agregasi (total per tipe, kredit/debit).
- **FR-03** Ekspor CSV transaksi terfilter.
- **FR-04** Catat entry REFUND manual dengan alasan.
- **FR-05** Akses dibatasi ADMIN/SUPER_ADMIN.

## 5. Data Model (ringkas)
`WalletTransaction(id,userId,type(TOP_UP|RIDE|FOOD|MART|HOTEL|TRIP|REFUND),description,amount,isCredit,createdAt)`.

## 6. API
| Method | Path | Untuk |
|--------|------|-------|
| GET | `/api/v1/wallet/transactions` | App: riwayat transaksi user |
| (admin) | Server Actions | Filter, agregasi, ekspor, refund manual |

## 7. Acceptance Criteria
- [ ] Daftar transaksi dapat difilter per tipe & tanggal.
- [ ] Total kredit/debit terhitung benar.
- [ ] OPERATOR tidak dapat membuka modul Payment.
- [ ] Ekspor CSV menghasilkan data sesuai filter.
