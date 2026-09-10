# PRD — Modul MiTitip (Titip Belanja)

## 1. Tujuan
Mengawasi dan menengahi layanan **MiTitip**: customer menitip belanja di toko
mana pun (POI Mapbox, **bukan** merchant terdaftar), driver membeli barangnya,
lalu mengantar. MiTitip adalah satu-satunya layanan yang **totalnya belum pasti
saat checkout**, sehingga dashboard punya dua tugas yang tidak ada di layanan
lain:

1. **Menjelaskan** kenapa sebuah order berakhir pada angka tertentu — lewat
   tabel item estimasi vs aktual, foto struk, dan audit revisi harga.
2. **Menengahi** ketika total di kasir melewati batas yang boleh ditelan
   platform (sengketa selisih), karena tanpa halaman ini kasus tersebut tidak
   punya tempat penyelesaian sama sekali.

Angka bisnisnya juga diatur dari sini: 17 knob `titip_fee_config` + biaya
layanan `titip`, semuanya admin-editable, tanpa hardcode di aplikasi.

Kontrak backend: `ojol-super-app-backend/docs/api-contract.md` §10A dan
`ojol-super-app-backend/docs/prd/16-mititip.md` (state machine + diagram).

## 2. Aktor & Peran
- **OPERATOR** — melihat daftar & detail order MiTitip (read-only).
- **ADMIN** — + ubah tarif/konfigurasi, batalkan & paksa status order,
  putuskan sengketa selisih harga.
- **SUPER_ADMIN** — semua akses.

Halaman `/titip`, `/titip/sengketa`, dan form intervensi di detail order
melakukan gating sendiri (`requireRole("ADMIN")` di Server Action; `proxy.ts`
tidak menggerbangi route berdasarkan role).

## 3. Use Cases

### UC-01 — Monitoring order MiTitip
- **Aktor:** Operator / Admin
- **Alur:** `Pesanan & Transaksi → tab MiTitip` (posisi ketiga, sebelum MiSend)
  → tabel `Toko, Barang, Estimasi, Aktual, Batas maks, Total, Struk, Status`
  dengan filter status.
- **Aturan:** filter status divalidasi terhadap `TITIP_STATUSES` — status
  layanan lain yang dipaksakan lewat `?status=` harus diabaikan. Kotak
  pencarian **dimatikan** (`TAB_SUPPORTS_SEARCH.titip = false`) karena
  `GET /admin/titip-orders` tidak punya param `search`, dan pencarian yang tidak
  berfungsi membuat admin menyangka fiturnya rusak.
- **Status:** `searching → driver_assigned → heading_to_store → shopping →
  awaiting_customer_approval → approved_for_purchase → purchased →
  heading_to_customer → completed`; terminal lain: `cancelled`,
  `cancelled_with_goods`, `expired`. Label Bahasa wajib dari
  `TITIP_STATUS_LABEL` — `awaiting_customer_approval` tidak terbaca kalau hanya
  di-`replace(/_/g," ")` seperti MiSend/MiRide.

### UC-02 — Detail order + audit revisi harga
- **Aktor:** Operator / Admin
- **Alur:** klik baris → `/orders/titip/[id]`. Menampilkan kartu toko
  (nama, alamat, `storeSource`, tautan peta), **tabel item estimasi vs aktual**
  (status per baris: `bought` / `unavailable` / `substituted` / dihapus oleh
  siapa, dengan baris pengganti bersarang di bawah baris asalnya), rincian
  biaya, **bagi hasil** (pendapatan Membumi vs pendapatan driver vs penggantian
  belanja), **foto struk**, dan **tabel audit revisi**
  (`seq`, pengusul `driver`/`customer`/`system`, total usulan, `over_max`, hasil,
  waktu).
- **Aturan:** semua angka dibaca dari `breakdown` respons backend — dashboard
  **tidak pernah** menghitung uang sendiri.

### UC-03 — Intervensi order
- **Aktor:** Admin
- **Alur:** di halaman detail → `Batalkan order` (wajib alasan) atau
  `Paksa status`.
- **Aturan:** alat tumpul yang disengaja untuk order tersangkut. Status MiTitip
  membawa konsekuensi uang (`completed` memicu settlement), jadi paksa-status
  tidak menjalankan settlement dan hanya boleh dipakai admin.

### UC-04 — Tarif & konfigurasi MiTitip
- **Aktor:** Admin
- **Alur:** `Konten → MiTitip` (`/titip`) → 17 knob dalam 6 grup:
  **Jasa** (persen, min, maks, bagi driver) · **Ongkir** (bagi driver) ·
  **Batas belanja** (plafon, pengali prefill, eksposur kas driver) ·
  **Persetujuan** (T1, T2, maks putaran revisi) · **Toleransi kasir** (nominal,
  persen, absorpsi platform) · **Pembatalan** (biaya saat assigned, persen jasa
  saat di toko) · **Kebijakan** (`recomputeJasaOnCustomerRemoval`).
- **Aturan:**
  - Di atas form ada **contoh hitungan hidup** memakai nilai yang sedang diedit,
    supaya akibat perubahan persentase terlihat sebelum disimpan.
  - PATCH bersifat **partial** — hanya field yang benar-benar dikirim yang
    ditulis, sehingga form yang mendahului sebuah knob tidak mengosongkannya.
  - **Ongkir MiTitip tidak punya form sendiri** — ia memakai
    `delivery_fare_config` yang diedit di `/kirim-barang`; halaman MiTitip
    menautkannya agar tidak ada yang mencari form yang sengaja tidak dibuat.
  - **Biaya layanan MiTitip ada di `/biaya-layanan`**, bukan di sini. Satu angka
    satu pemilik; dua pemilik adalah cara angka itu melenceng.
  - MiTitip **tidak** memakai komisi driver standar (`finance_settings`) —
    pembagian 50/90 sudah diterapkan per order.

### UC-05 — Sengketa selisih harga
- **Aktor:** Admin
- **Alur:** `Monitoring → Sengketa MiTitip` (`/titip/sengketa`) → antrean order
  yang total strukmya melewati plafon absorpsi platform
  (`TITIP_VARIANCE_EXCEEDED`) → tampil order, driver, jumlah yang diotorisasi,
  total struk, selisih, foto struk, umur sengketa → putuskan: **tanggung penuh**,
  **sebagian dengan nominal**, atau **tolak dengan alasan**.
- **Aturan:** driver **sudah** diganti sampai `min(receiptTotal, otorisasi +
  toleransi)` sebelum sengketa dibuka. Keputusan di sini hanya menentukan siapa
  menanggung **residunya** (customer atau platform) — ia tidak pernah
  menentukan apakah driver dibayar. Setiap keputusan menulis `finance_records`
  di backend, bukan di dashboard.

### UC-06 — Laporan pendapatan MiTitip
- **Aktor:** Admin
- **Alur:** `/keuangan` dan `/laporan` menampilkan pendapatan MiTitip
  **terpecah tiga** (jasa / ongkir / biaya layanan).
- **Aturan (kritis):** **nilai barang wajib berada di baris terpisah berlabel
  tegas "bukan pendapatan"**. Kalau nilai barang ikut masuk kolom pendapatan,
  angka laporan menggelembung ~10× per order dan angka itu akan dipercaya.

## 4. Functional Requirements
- **FR-01** Tab `titip` ada di `ORDER_TABS` pada posisi ketiga (sebelum `send`),
  dengan filter status yang tidak bisa dibocorkan lintas layanan.
- **FR-02** Kolom tabel MiTitip memuat Toko, Estimasi, Aktual, Batas maks, dan
  Struk — kolom yang membedakannya dari MiSend. Setiap `<TD>` punya
  `data-label` (layout kartu di mobile bergantung padanya).
- **FR-03** Detail order menampilkan item estimasi vs aktual dengan baris
  pengganti bersarang, bagi hasil, foto struk, dan audit revisi.
- **FR-04** Intervensi (batal + paksa status) hanya untuk role ADMIN dan wajib
  alasan pada pembatalan.
- **FR-05** 17 knob `titip_fee_config` dapat diubah admin; PATCH partial;
  contoh hitungan hidup mengikuti nilai form.
- **FR-06** Antrean sengketa dengan tiga keputusan dan pencatatan alasan.
- **FR-07** Biaya layanan `titip` ada di `/biaya-layanan` dan **tidak** ter-reset
  ketika admin menyimpan biaya layanan lain.
- **FR-08** Semua status MiTitip punya label Bahasa dan tone badge
  (`STATUS_TONE`) — status tak terdaftar merender abu-abu `default` secara
  senyap.
- **FR-09** Topik monitoring `mititip` (order `searching`) muncul di kartu
  monitoring dan bisa dikirimi push admin.

## 5. Data Model (ringkas)
`TitipOrder(id, status, store{name,address,lat,lng,source,externalId,category},
storeSource, maxShoppingAmount, authorizedPurchaseAmount, estimatedSubtotal,
actualSubtotal, shoppingFee, deliveryFee, serviceFee, total, receiptUrl,
receiptTotal, revisionCount, paymentMethod, driver?, cancelledBy?, cancelReason?,
cancelledAt?, breakdown)` ·
`TitipItem(id, position, priority, createdBy, name, note?, unit, requestedQty,
estimatedUnitPrice, estimatedLineTotal, status, actualQty?, actualUnitPrice?,
actualLineTotal?, substituteForItemId?, substituteNote?, photoUrl?)` ·
`TitipRevision(id, seq, proposedBy, proposedGoodsAmount, requiresApproval,
overMax, postPurchase, status, expiresAt?, respondedAt?)` ·
`TitipBreakdown(goodsAmount, deliveryFee, jasaTitip, serviceFee, customerTotal,
platformRevenue{jasa,ongkir,serviceFee,total}, driverIncome{jasa,ongkir,total})` ·
`TitipFeeConfig(17 knob + updatedBy, updatedAt/configVersion)`.

## 6. API
| Method | Path | Untuk |
|--------|------|-------|
| GET | `/admin/titip-orders` | Daftar order (filter status, tanggal, paginasi) |
| GET | `/admin/titip-orders/:id` | Detail + item + revisi + breakdown |
| POST | `/admin/titip-orders/:id/cancel` | Batalkan order tersangkut (alasan wajib) |
| PATCH | `/admin/titip-orders/:id/status` | Paksa status (tanpa settlement) |
| GET | `/admin/titip-orders/disputes` | Antrean sengketa selisih kasir |
| POST | `/admin/titip-orders/:id/dispute` | Putuskan sengketa (`decision`, `amount?`, `note`) |
| GET/PATCH | `/admin/titip-fee-config` | Baca / ubah 17 knob konfigurasi |
| GET/PATCH | `/admin/service-fee-config` | Biaya layanan, termasuk key `titip` |

## 7. Acceptance Criteria
- [ ] `/orders` menampilkan MiTitip di posisi ketiga; status MiSend tidak bisa
      dipaksakan lewat `?status=`.
- [ ] Detail order menampilkan estimasi vs aktual per item, foto struk, bagi
      hasil, dan audit revisi yang cocok dengan riwayat di aplikasi.
- [ ] Mengubah `jasaRatePercent` mengubah contoh hitungan hidup, dan order baru
      di aplikasi memakai nilai baru.
- [ ] Menyimpan biaya layanan lain di `/biaya-layanan` **tidak** mengubah biaya
      layanan MiTitip menjadi 0.
- [ ] Sengketa yang disetujui sebagian menghasilkan penggantian driver dan baris
      `finance_records` yang sesuai.
- [ ] `/keuangan` dan `/laporan` memisahkan nilai barang dengan label "bukan
      pendapatan".
- [ ] Semua status MiTitip berlabel Bahasa dan tidak ada badge abu-abu
      `default` yang tak disengaja.
