# Rencana: Bukti Transfer di Penarikan Dana & Topup Saldo

## Konteks

Saat ini verifikasi bukti transfer dilakukan **di luar sistem (via WhatsApp)** — tidak ada gambar
bukti yang tersimpan atau bisa dilihat di dashboard (lihat `topup/page.tsx` "Verifikasi bukti transfer
(WhatsApp)"). Permintaan:

1. **Penarikan Dana** (`merchants/withdrawals`): admin dapat **mengunggah bukti transfer** saat
   **menyetujui (approve)** penarikan — bukti bahwa dana sudah benar-benar ditransfer ke driver/merchant.
2. **Topup Saldo** (`topup`): admin dapat **melihat gambar bukti transfer** yang diunggah user saat
   memverifikasi permintaan topup.
3. **Aplikasi Flutter (user)**: pada alur topup di halaman **detail pembayaran**, user **mengunggah
   bukti transfer** langsung dari aplikasi. Alur kirim bukti via **WhatsApp dihapus** (tidak dipakai
   lagi). Bukti yang diunggah user inilah yang muncul di menu **Topup Saldo** dashboard (Fitur 2).

Hasil yang diinginkan: bukti transfer terekam & bisa ditinjau di dashboard, menggantikan verifikasi
manual WA di **seluruh alur** (upload dari app → tampil di dashboard). Ini **memperluas keputusan
produk lama** (PRD 09 & 11 memilih WA-only) — perlu update PRD/testing map.

> **Catatan penting:** Dashboard ini **UI murni** di atas backend NestJS (repo terpisah, tanpa DB
> sendiri). Kedua fitur **butuh dukungan backend** yang belum ada. Rencana ini mengerjakan sisi
> dashboard dan **mendokumentasikan kontrak backend** yang harus disediakan agar fitur berfungsi.
> Sampai backend siap: upload penarikan akan mengirim `proofUrl` yang diabaikan backend, dan
> `proofUrl` topup akan selalu kosong (UI menangani null dengan aman).

---

## Kontrak backend yang dibutuhkan (dikerjakan tim backend)

Cantumkan ini di deskripsi PR agar backend menyelaraskan:

1. **Upload folder:** `POST /uploads/presign` menerima `folder: "withdrawals"` (bucket/prefix baru).
2. **Approve penarikan:** `POST /admin/drivers/withdrawals/:id/approve` dan
   `POST /admin/merchants/withdrawals/:id/approve` menerima body `{ proofUrl?: string }` dan menyimpannya.
3. **List penarikan:** `GET /admin/finance/withdrawals` mengembalikan `proofUrl` pada tiap item.
4. **List topup:** `GET /admin/topup-requests` mengembalikan `proofUrl` (bukti yang diunggah user).
5. **Submit topup dari app:** `POST /payment/topup-requests` menerima & menyimpan `proofUrl` yang
   diunggah user; endpoint `POST /uploads/presign` menerima `folder: "topup-proofs"`.

---

## Perubahan aplikasi Flutter (repo `ojol-super-app` — SUDAH DIKERJAKAN)

Repo: `/Users/arisupriatna/Documents/ojol-super-app`. `flutter analyze` bersih.

1. **Detail pembayaran topup** (`lib/features/wallet/presentation/pages/payment_detail_screen.dart`):
   tombol "Kirim Bukti Transfer via WhatsApp" diganti komponen **`ImageUploadField`** (folder
   `UploadFolder.topupProofs`) + tombol **"Kirim Permintaan Top Up"** (aktif setelah bukti diunggah).
   Alur WhatsApp (`url_launcher`, `_buildMessage`, `wa.me`) dihapus; copy QRIS/terms diperbarui.
2. **Upload folder** (`lib/core/services/image_upload_service.dart`): `topupProofs` → wire `topup-proofs`.
   Memakai mekanisme presigned upload yang sudah ada (`POST /uploads/presign` → PUT ke storage).
3. **Submit request** membawa `proofUrl`: rantai `wallet_cubit → RequestManualTopUpUseCase
   (RequestManualTopUpParams{amount, proofUrl}) → repository → datasource` mengirim body
   `{ amount, proofUrl }` ke **`POST /payment/topup-requests`**.
4. **Cleanup**: field WhatsApp (`whatsappNumber/whatsappMessage/whatsappUri`) dihapus dari entity/model/
   datasource wallet. Alur WhatsApp penginapan & `url_launcher` (dipakai maps/telepon) tidak disentuh.

> **Catatan kontrak backend:** endpoint app memakai `POST /payment/topup-requests` dengan body
> `{ amount, proofUrl }` (bukan `/wallet/topup-requests` seperti contoh awal). Backend harus menerima
> & menyimpan `proofUrl` dan memasukkan folder `topup-proofs` ke whitelist presign.

---

## Perubahan sisi dashboard

### Komponen baru yang dipakai bersama

**`src/components/ui/modal.tsx`** (baru) — belum ada komponen modal di codebase; dipakai untuk (a)
form approve+upload penarikan dan (b) preview gambar topup. Client component sederhana: overlay
`fixed inset-0` + panel putih, tutup via tombol ✕ / klik overlay / Esc, props `open`/`onClose`.
Ikuti gaya Tailwind komponen `ui` yang ada (`card.tsx`, `button.tsx`). Tanpa dependency baru.

**`src/components/ui/image-preview.tsx`** (baru) — client component: thumbnail kecil (`<img>` dengan
`eslint-disable @next/next/no-img-element` sesuai konvensi) yang saat diklik membuka `Modal` berisi
gambar penuh. Props `{ url: string; label?: string }`. Jika `url` kosong, komponen tidak dirender
(pemanggil menampilkan "—"). Dipakai di halaman topup dan sebagai tampilan bukti pada penarikan yang
sudah disetujui.

### Fitur A — Penarikan Dana: upload bukti saat approve

- **`src/lib/types.ts`** — tambah `proofUrl?: string | null` ke interface `AdminWithdrawal` (~baris 418-431).
- **`src/server/actions/uploads.ts`** — tambah `"withdrawals"` ke union `UploadFolder`.
- **`src/lib/validations.ts`** — tambah `withdrawalApproveSchema` (model: `bookingReviewSchema` baris 57-60):
  ```ts
  export const withdrawalApproveSchema = z.object({
    id,
    kind: z.enum(["driver", "merchant"]),
    proofUrl: z.string().url().optional().or(z.literal("")),
  });
  ```
  (`z.string().url().optional().or(z.literal(""))` = pola imageUrl standar di file ini.)
- **`src/server/actions/withdrawals.ts`** — ubah `approveWithdrawal`: parse dgn `withdrawalApproveSchema`,
  kirim `proofUrl` di body:
  ```ts
  await apiPost(`${reviewBase(fd)}/${id}/approve`, { proofUrl: strOrUndef(fd, "proofUrl") });
  ```
- **`src/app/(dashboard)/merchants/withdrawals/review-actions.tsx`** — ganti tombol "Setujui" berbasis
  `confirm()` dengan tombol yang membuka `Modal` berisi `<form action={approveWithdrawal}>`:
  - hidden `id` + `kind` (sudah ada polanya),
  - `<ImageUploadInput name="proofUrl" folder="withdrawals" label="Bukti transfer" />`
    (`src/components/forms/image-upload.tsx`, submit URL hasil presigned PUT),
  - tombol submit "Setujui". Tetap `useTransition`. Tombol "Tolak" tidak berubah.
- **`src/app/(dashboard)/merchants/withdrawals/page.tsx`** — untuk baris non-PENDING, jika `r.proofUrl`
  ada tampilkan `<ImagePreview url={r.proofUrl} label="Bukti" />` di kolom Aksi (di samping `reviewedAt`).

### Fitur B — Topup Saldo: lihat bukti transfer user

- **`src/lib/types.ts`** — tambah `proofUrl?: string | null` ke interface `TopupRequest` (~baris 378-387).
- **`src/app/(dashboard)/topup/page.tsx`** — tambah kolom **"Bukti"** (tambah `<TH>Bukti</TH>` &
  naikkan `colSpan` `EmptyRow` dari 7 → 8). Sel: `r.proofUrl ? <ImagePreview url={r.proofUrl} /> : "—"`.
  Tidak perlu server action baru — URL datang dari payload list. Bukti ini diunggah user dari aplikasi
  Flutter (bukan lagi via WhatsApp).
- **`src/app/(dashboard)/topup/page.tsx`** — perbarui copy deskripsi halaman "Verifikasi bukti transfer
  (WhatsApp)" (~baris 52) menjadi mengacu ke bukti yang diunggah user di aplikasi (hapus referensi WhatsApp).

---

## Testing (WAJIB — commit/PR yang sama)

- **`tests/validations.test.ts`** — blok baru untuk `withdrawalApproveSchema` (pola `safeParse(...).success`):
  valid dengan `proofUrl` URL sah, valid tanpa `proofUrl` (dan dgn `""`), tolak `id` kosong, tolak
  `proofUrl` bukan URL, tolak `kind` di luar enum.
- **`tests/withdrawals-actions.test.ts`** (baru) — tiru `tests/hotels-actions.test.ts` (mock `@/auth`
  + `@/lib/api-client`, helper `fd()`): ADMIN approve driver → `POST /admin/drivers/withdrawals/:id/approve`
  dgn body `{ proofUrl }`; ADMIN approve merchant → route merchant; OPERATOR → `toThrow("FORBIDDEN")`
  & API tak dipanggil; sesi null → `toThrow("UNAUTHORIZED")`.
- **`docs/testing.md`** — tambah baris peta test → use-case untuk penarikan (upload bukti) & topup (lihat bukti).
- Tidak ada test untuk komponen `Modal`/`ImagePreview` (UI murni, di luar cakupan unit Vitest repo ini).

## Dokumentasi

- Update `docs/prd/09-payment.md` (atau tambah catatan) bahwa bukti transfer kini disimpan/ditampilkan,
  menggantikan alur WA-only untuk penarikan & topup.
- Cantumkan **Kontrak backend** di atas pada deskripsi PR.

## Verifikasi end-to-end

1. `npm run lint` & `npx tsc --noEmit` bersih.
2. `npm test` hijau (skema + action baru).
3. Manual (butuh backend NestJS jalan di `:3000`, dashboard `PORT=3100 npm run dev`):
   - **Penarikan:** login ADMIN → `/merchants/withdrawals` → baris PENDING → "Setujui" membuka modal →
     unggah gambar (JPG/PNG/WebP) → pratinjau muncul → submit → status jadi APPROVED, thumbnail bukti
     tampil di baris. OPERATOR tidak melihat aksi.
   - **Topup:** `/topup` → kolom "Bukti" menampilkan thumbnail; klik → modal preview gambar penuh;
     baris tanpa bukti tampil "—". Uji end-to-end dgn app: user upload bukti di detail pembayaran topup →
     bukti muncul di dashboard (butuh app Flutter + backend selesai).
   - Sebelum backend siap: pastikan halaman tidak error saat `proofUrl` undefined (topup tampil "—",
     approve penarikan tetap berhasil).
