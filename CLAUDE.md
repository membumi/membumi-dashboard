@AGENTS.md

# membumi-dashboard — Panduan untuk Claude

Back-office (CMS + monitoring) **SuperApp.id**. Dashboard ini **UI murni** di atas
backend **NestJS** (`ojol-super-app-backend`) — **tidak punya database/ORM sendiri**.
Setiap halaman baca/tulis lewat API NestJS `/v1` (publik) & `/v1/admin/*` (admin),
terautentikasi JWT dari `POST /v1/auth/admin/login`.

Sumber kebenaran detail: [`README.md`](./README.md), [`docs/architecture.md`](./docs/architecture.md)
(⚠️ historis/Prisma — abaikan untuk kode baru), [`docs/migration-to-nestjs.md`](./docs/migration-to-nestjs.md),
[`docs/testing.md`](./docs/testing.md), dan PRD per fitur di [`docs/prd/`](./docs/prd).

## Tech stack

Next.js 16 (App Router, RSC) · TypeScript strict · Tailwind CSS 4 · Auth.js v5
(Credentials → NestJS) · TanStack Table · React Hook Form + Zod · Recharts · Vitest.
**Tanpa database/ORM** — jangan pernah menambahkan Prisma atau query DB langsung.

## Aturan penting

- **Next.js ini BUKAN versi yang kamu hafal** (lihat `@AGENTS.md`). Baca panduan di
  `node_modules/next/dist/docs/` sebelum menulis kode yang menyentuh API Next.js.
- **Tidak ada akses DB.** Semua data lewat helper di `src/lib/api-client.ts`. Jangan
  mem-`fetch` NestJS langsung — gunakan `apiGet` / `apiGetPaged` / `apiPost` / `apiPut`
  / `apiPatch` / `apiDelete` yang sudah menyuntikkan JWT & membuka envelope
  `{ success, message, data, meta }`.
- **Server Action** untuk semua mutasi: `"use server"`, baca `FormData` dengan helper
  `src/lib/form.ts` (`str`, `strOrUndef`, `bool`, `list`), validasi Zod dari
  `src/lib/validations.ts`, panggil `requireRole(...)`, lalu `revalidatePath(...)`.
- **Role gating** wajib di setiap action yang mengubah data: `requireRole("OPERATOR"|"ADMIN"|"SUPER_ADMIN")`
  dari `src/lib/session.ts`. Hierarki: `OPERATOR < ADMIN < SUPER_ADMIN`. Role NestJS
  lowercase dinormalkan ke uppercase di sesi.
- Bahasa UI & copy: **Indonesia**. Mata uang: `formatRupiah` (`src/lib/utils.ts`),
  tanggal: `date-fns` locale `id`.

## Struktur

- `src/app/(auth)/` — login. `src/app/(dashboard)/<modul>/` — halaman per fitur (RSC
  `page.tsx` + `*-form.tsx` Client Component). `src/app/api/auth/[...nextauth]/` — Auth.js.
- `src/server/actions/<modul>.ts` — Server Actions per modul.
- `src/lib/` — `api-client`, `session`, `validations` (Zod), `form`, `utils`, `constants`, `types`.
- `src/components/{ui,forms,layout}/` — komponen reusable (Table, Button, Card, StatusBadge,
  PageHeader, ConfirmDelete, ImageUpload, dll). **Gunakan ulang** komponen ini, jangan bikin baru.

## Code style

- TypeScript `strict`. Hindari `any`; pakai tipe dari `src/lib/types.ts` atau generic
  pada helper `api-client`. Komentar singkat menjelaskan **kenapa**, bukan apa.
- Import pakai alias `@/*`. Indentasi 2 spasi, string `"double quotes"`, koma trailing.
- Page = async Server Component yang fetch lalu render; form = Client Component (`"use client"`)
  yang submit ke Server Action. Ikuti pola file tetangga di modul yang sama.
- Skema Zod adalah satu sumber validasi (form ↔ action). Tambah field → ubah skema dulu.
- `npm run lint` & `tsc` harus bersih sebelum dianggap selesai.

## Testing — WAJIB saat menambah/refactor fitur

Setiap kali **menambah atau me-refactor fitur, jangan dianggap selesai tanpa test**.
Tulis test di commit/PR yang sama:

- **Unit test (default, Vitest)** untuk logika murni: skema Zod (`tests/validations.test.ts`),
  util & hierarki role (`tests/utils.test.ts`), transformasi data, dan role-gating Server Action.
  Test bersifat unit — mock session/`api-client`, **tanpa DB/server**. Lihat `docs/testing.md`
  untuk peta test → use case (acceptance criteria tiap UC dari `docs/prd/`).
- Setiap aturan baru di skema Zod / util / action ⇒ minimal satu kasus **valid** dan satu
  **invalid/edge** (lihat pola `safeParse(...).success` di `tests/validations.test.ts`).
- **E2E** dipakai bila perubahan menyentuh alur lintas halaman atau interaksi browser yang
  tak terjangkau unit test; jika belum ada harness E2E, konfirmasi dulu sebelum menambah tooling.

```bash
npm test            # jalankan semua test sekali (Vitest)
npm run test:watch  # mode watch saat mengembangkan
npm run test:coverage
```

## Menjalankan

```bash
# Jalankan backend NestJS dulu (ojol-super-app-backend) di http://localhost:3000
cp .env.example .env      # set API_URL + AUTH_SECRET
PORT=3100 npm run dev     # dashboard di http://localhost:3100 (3000 dipakai NestJS)
```

`API_URL` / `NEXT_PUBLIC_API_URL` → NestJS `/v1`. Login pakai akun `admin_users` di backend.
