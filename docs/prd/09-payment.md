# PRD — Modul Payment & Wallet

> **Catatan pembaruan (bukti transfer):** Verifikasi topup & penarikan tidak lagi memakai bukti
> transfer via WhatsApp. Bukti transfer kini disimpan sebagai gambar (`proofUrl`) dan ditinjau di
> dashboard: (a) **Topup** — user mengunggah bukti dari aplikasi, admin melihatnya di menu Topup Saldo;
> (b) **Penarikan** — admin mengunggah bukti transfer saat menyetujui penarikan. Lihat
> `docs/BUKTI_TRANSFER_PLAN.md`.

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

### UC-04 — Pindah saldo antar dompet POV (backend PRD 14 UC-WALLET-08)
- **Aktor:** Admin (OPERATOR ditolak)
- **Prakondisi:** orang tersebut punya profil driver/merchant — jadi dompet tujuannya memang miliknya sendiri.
- **Alur Utama:** dari detail merchant (`/merchants/[id]`) atau driver (`/ride/drivers/[id]`), kartu **Saldo Dompet** menampilkan tombol **Pindah Saldo** → `/topup/transfer?userId=…&to=…&returnTo=…`. Halaman itu menampilkan saldo sumber & tujuan saat ini, meminta nominal, lalu mengonfirmasi dengan angka **sebelum → sesudah** sebelum memanggil `POST /admin/wallet/transfer`. Tanpa query `userId`, halaman yang sama (juga dapat dibuka dari tombol di `/topup`) menampilkan pemilih driver/merchant.
- **Aturan:** hanya satu arah `Saldo Pengguna → Saldo Driver/Merchant`; nominal 10.000–100.000.000; **tidak bisa dibatalkan** (penarikan kembali harus lewat proses pencairan). `clientRequestId` dibuat per kunjungan halaman sehingga submit ganda tidak memindahkan dua kali.
- **Acceptance:** *Given* admin membuka detail merchant ber-`userId`, *When* memindahkan Rp20.000, *Then* kartu saldo dan `/payments` menampilkan hasilnya (debit di USER, credit di MERCHANT) tanpa mengubah total kredit/debit ringkasan. *Given* OPERATOR, *When* memanggil action-nya, *Then* `FORBIDDEN` dan API tidak pernah dipanggil.

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
| POST | `/v1/admin/wallet/transfer` | Pindah saldo `USER → driver\|merchant` (UC-04) |
| (admin) | Server Actions | Filter, agregasi, ekspor, refund manual |

## 7. Acceptance Criteria
- [ ] Daftar transaksi dapat difilter per tipe & tanggal.
- [ ] Total kredit/debit terhitung benar.
- [ ] OPERATOR tidak dapat membuka modul Payment.
- [ ] Ekspor CSV menghasilkan data sesuai filter.
