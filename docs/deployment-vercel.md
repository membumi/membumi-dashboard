# Deploy ke Production (Vercel)

Dashboard ini **UI murni** di atas backend NestJS (`ojol-super-app-backend`) — tidak
punya database sendiri. "Deploy" = build Next.js 16 lalu jalankan; seluruh data tetap
lewat API NestJS. Panduan ini untuk deploy ke **Vercel** (region `sin1` / Singapura,
terdekat ke Indonesia — lihat [`vercel.json`](../vercel.json)).

## Prasyarat

1. **Backend NestJS prod sudah live** dan reachable dari internet (bukan `localhost`).
   - CORS + Socket.IO mengizinkan origin dashboard prod.
   - Ada minimal satu akun di `admin_users` untuk login (`POST /v1/auth/admin/login`).
2. Akun Vercel dengan akses ke repo ini.

## Environment variables (set di Vercel → Project → Settings → Environment Variables)

| Variable              | Contoh nilai prod                | Catatan |
|-----------------------|----------------------------------|---------|
| `API_URL`             | `https://api.superapp.id/v1`     | Server-to-server (RSC / Server Actions). |
| `NEXT_PUBLIC_API_URL` | `https://api.superapp.id/v1`     | Terlihat browser (Socket.IO + client fetch). **Di-inline saat build** — harus ada saat build, bukan hanya runtime. |
| `AUTH_SECRET`         | hasil `openssl rand -base64 32`  | **Generate baru** untuk prod. Jangan pakai nilai dev/`change-me`. |
| `AUTH_TRUST_HOST`     | `true`                           | Vercel menaruh app di belakang proxy HTTPS. |

> Set ketiga var untuk environment **Production** (dan Preview bila ingin PR preview
> menunjuk ke backend staging). Jangan commit `.env` — sudah di-ignore.

## Langkah deploy

### Opsi A — Git integration (disarankan)

1. Import repo di Vercel; framework otomatis terdeteksi **Next.js**.
2. Isi environment variables di atas.
3. Setiap push ke `main` → deploy Production; setiap PR → Preview deployment.
   Build command default `next build`, output default (jangan diubah).

### Opsi B — Vercel CLI (manual)

```bash
npm i -g vercel
vercel link            # tautkan ke project
vercel env pull        # (opsional) tarik env ke .env lokal untuk cek
vercel --prod          # build + deploy ke production
```

## Gate sebelum deploy

CI (`.github/workflows/test.yml`) sudah menjalankan ini di setiap push/PR — pastikan hijau:

```bash
npm run lint
npx tsc --noEmit
npm run test:coverage
npm run build
```

## Setelah deploy — smoke test

1. Buka domain prod → halaman login tampil.
2. Login dengan akun `admin_users` prod → masuk dashboard.
3. Cek satu halaman list (data ter-fetch dari backend) & fitur realtime (Socket.IO connect
   ke `NEXT_PUBLIC_API_URL`).
