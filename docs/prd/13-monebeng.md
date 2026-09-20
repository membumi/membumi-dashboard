# PRD 13 — MoNebeng (Dashboard Admin)

## 1. Ringkasan
MoNebeng adalah tumpangan antar-siswa: **Mona Mate** (penumpang) menumpang pada **Ride Mate**
(siswa yang membawa kendaraan) yang perjalanannya searah.

**Dashboard ada di jalur kritis MVP.** Tidak ada satu pun perjalanan yang bisa terjadi sebelum
seorang admin menyetujui tiga hal: identitas siswa, izin orang tua, dan — untuk Ride Mate —
kendaraan. Tanpa halaman ini, fitur tidak jalan sama sekali.

## 2. Kenapa seksi sendiri, bukan tab di `/orders`
`ORDER_TABS` di `src/lib/orders.ts` adalah union `as const` tertutup yang terhubung ke
`resolveTabStatus`, `TAB_SUPPORTS_SEARCH`, dan diassert kunci per kunci oleh
`tests/orders-tabs.test.ts`. Satu baris nebeng harus memuat Mona Mate, Ride Mate, sekolah,
tarif **dan** insentif — tidak muat di bentuk kolom bersama, dan menambahkannya akan
membocorkan enum status nebeng ke helper order generik.

## 3. Tiga antrean, satu halaman
`/nebeng/verifikasi?tab=pelajar|ortu|kendaraan`. Loop harian admin adalah menyapu ketiganya,
dan seorang Ride Mate baru bisa jalan setelah ketiganya lolos. Halaman detail tetap terpisah
per entitas.

**Menyetujui satu klik dari daftar; menolak hanya dari halaman detail.** Penolakan butuh
daftar alasan, dan fieldset lima checkbox tidak layak dijejalkan ke sel tabel. Menyetujui
adalah keputusan sekali lihat — karena itu pratinjau kartu pelajar ada langsung di barisnya.

## 4. Alasan penolakan: checkbox terkurasi, bukan teks bebas
Aplikasi siswa menampilkan alasan sebagai **bullet list**, yang berarti field multi-nilai —
satu string teks bebas tidak bisa dipecah kembali dengan andal. Kode terkurasi juga mencegah
dua operator menulis "STNK burem" dan "Foto STNK tidak jelas" untuk cacat yang sama.

`list(fd, "reasons")` membaca checkbox berulang secara native, jadi formulirnya tetap Server
Action murni: tanpa client JS, tanpa sistem toast.

**Kode yang tidak dikenal ditampilkan apa adanya.** Menyembunyikannya akan membuat siswa
melihat penolakan tanpa alasan hanya karena backend menambah kode lebih dulu — kegagalan yang
jauh lebih buruk daripada label jelek.

## 5. Dua casing yang hidup berdampingan
Keduanya diwarisi, bukan diciptakan:
- status **perjalanan** lowercase snake (`driver_arriving`), seperti rides/titip;
- status **verifikasi** UPPER_SNAKE (`VERIFIED`), seperti `drivers.verification_status`.

`StatusBadge.normalize()` menangani keduanya. `resolveNebengStatus` menolak UPPER_SNAKE, dan
`resolveNebengQueueStatus` memvalidasi **per antrean** — `SUSPENDED` sah untuk pelajar dan
tidak untuk kendaraan; `EXPIRED` hanya untuk izin ortu.

## 6. `effectiveStatus` vs `verificationStatus`
Backend mengirim keduanya. Dashboard **memfilter dan menampilkan `effectiveStatus`** (4 nilai:
PENDING/VERIFIED/REJECTED/SUSPENDED) karena admin mentriase empat keadaan, bukan tujuh.
`verificationStatus` mentah muncul di halaman detail saja.

Penangguhan tidak pernah menimpa status dokumen: mencabutnya mengembalikan siswa ke VERIFIED
seketika, tanpa review ulang.

## 7. Tarif dan insentif: DUA kartu, bukan satu
`PaymentBreakdown` merender satu total besar berlabel "Total Dibayar". Memasukkan insentif
sebagai baris di rincian penumpang akan menjumlahkan payout yang **didanai platform** ke dalam
apa yang **dibayar siswa** — sekadar tidak benar. Dua kartu memisahkan dua aliran uang, dan
prop `title`/`totalLabel` memang ada untuk ini. Tanpa perubahan komponen.

`platformMargin` boleh negatif dan ditandai kuning, bukan merah: subsidi peluncuran adalah
pilihan bisnis yang sah.

## 8. Lini masa
`src/components/ui/status-timeline.tsx` — generik, tanpa import MoNebeng, supaya alur 12-status
MiTitip bisa memakainya nanti. Seluruh logikanya di `nebengTimeline()` yang murni dan teruji;
komponennya hanya melukis.

Ada karena satu badge tidak bisa menjawab pertanyaan yang sebenarnya diajukan peninjau
keselamatan: **berhenti di mana, dan kapan.** Turun anggun tanpa riwayat: tangga tetap
dibangun dari status sekarang, hanya tanpa cap waktu.

## 9. Keselamatan
- **Laporan** punya antrean sendiri, bukan tiket support: laporan tentang anak di bawah umur
  butuh triase dan SLA sendiri; tiket support adalah percakapan, bukan catatan insiden.
- **Satu panggilan menutup laporan DAN menerapkan sanksi.** Dashboard tidak akan pernah
  mengorkestrasi dua mutasi — laporan yang selesai sementara siswa tidak tersuspensi adalah
  keadaan setengah jadi yang tidak boleh ada di antrean keselamatan. Diverifikasi end-to-end.
- **`/nebeng/darurat`** default menampilkan yang belum ditangani. SOS dari anak yang belum
  diakui adalah baris berprioritas tertinggi di dashboard ini. Catat: server tidak menelepon
  atau mengirim pesan apa pun — tindak lanjut ke orang tua dilakukan manusia, dari halaman ini.

## 10. Privasi
Dokumen verifikasi (kartu pelajar, foto wajah, surat izin, STNK) berada di prefix privat.
Backend mengembalikan **signed GET URL berumur pendek**, dibuat ulang tiap halaman dibuka dan
tidak pernah disimpan. Dashboard tidak pernah menyisipkan PDF sebagai `<img>` — itu
menghasilkan kotak rusak dan admin akan mengira suratnya tidak terunggah.

## 11. Peran
Semua aksi `requireRole("ADMIN")`; penonaktifan sekolah `SUPER_ADMIN`. OPERATOR boleh
**membaca** antrean, perjalanan, laporan, dan darurat, tetapi tidak boleh memutuskan — setiap
keputusan di sini menyangkut keselamatan anak di bawah umur. Aturan dan data sekolah
disembunyikan dari nav DAN dijaga `redirect("/")` di halamannya.

## 12. Halaman
| Rute | Isi |
|---|---|
| `/nebeng` | Aturan operasional + tarif/insentif per kendaraan + 4 kartu ringkasan antrean |
| `/nebeng/verifikasi` | 3 antrean bertab + chip status + cari + paginasi |
| `/nebeng/verifikasi/{pelajar,ortu,kendaraan}/[id]` | Detail + grid dokumen + setujui/tolak |
| `/nebeng/perjalanan` (+ `[id]`) | Daftar perjalanan; detail + lini masa + dua rincian uang + alasan/diagnosis pencocokan |
| `/nebeng/laporan` (+ `[id]`) | Antrean keselamatan + formulir keputusan |
| `/nebeng/darurat` | Antrean SOS |
| `/nebeng/sekolah` (+ `new`, `[id]`) | Data referensi sekolah |

## 13. Utang teknis yang diketahui
Detail izin ortu, kendaraan, laporan, dan sekolah **memindai endpoint daftar** untuk menemukan
satu baris (pola `orderById` di `src/server/queries.ts`), karena backend belum punya
`GET /admin/nebeng/{consents,vehicles,reports,schools}/:id`. Murah pada skala pilot, tetapi
jalan pintas nyata — endpoint detail layak dibuat sebelum volumenya naik.

## 14. Status
- ✅ Fondasi (tipe, konstanta, helper murni, skema zod, server action) + 72 test
- ✅ Antrean verifikasi + 3 halaman detail + formulir penolakan + penangguhan
- ✅ Perjalanan + detail (lini masa, dua rincian uang, diagnosis pencocokan)
- ✅ Laporan + keputusan, antrean darurat
- ✅ Sekolah CRUD, halaman aturan & tarif
- ✅ Diverifikasi end-to-end terhadap backend nyata
- ⏳ Aplikasi Flutter
