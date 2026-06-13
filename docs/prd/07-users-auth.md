# PRD — Modul User Management & Admin Auth

## 1. Tujuan
Mengelola autentikasi admin dashboard (role-based) dan memonitor/mengelola akun end-user aplikasi.

## 2. Aktor & Peran
- **SUPER_ADMIN** — kelola akun admin (buat/nonaktif/ubah role).
- **ADMIN** — kelola user app (lihat, set verified, blokir).
- **OPERATOR** — hanya lihat user (read-only).

## 3. Use Cases

### UC-01 — Login Admin
- **Aktor:** Semua admin
- **Alur Utama:**
  1. Buka `/login`, isi email + password.
  2. Auth.js Credentials memverifikasi `passwordHash` (bcrypt) → buat session JWT berisi `role`.
  3. Redirect ke dashboard sesuai akses role.
- **Alur Alternatif:** Kredensial salah → pesan error; rate-limit percobaan.

### UC-02 — Kelola Akun Admin
- **Aktor:** Super Admin
- **Alur:** `Users → Admins` → buat admin baru (`email, name, role`, set password awal), ubah role, nonaktifkan.

### UC-03 — Kelola End-User App
- **Aktor:** Admin
- **Alur Utama:** `Users → App Users` → tabel (`name, phoneNumber, email, isVerified, createdAt`). Detail user: set `isVerified`, lihat ringkasan transaksi (ride/food/mart/hotel/trip), blokir akun bila perlu.

### UC-04 — Proteksi Route
- **Aktor:** Sistem
- **Alur:** `middleware.ts` mengecek session untuk semua route `(dashboard)` & `/api/admin`; redirect ke `/login` bila tidak ada session. Gating aksi sesuai role.

## 4. Functional Requirements
- **FR-01** Login Credentials (email+password, bcrypt) via Auth.js v5.
- **FR-02** Session JWT menyimpan `role`; helper `requireRole()` di server actions.
- **FR-03** CRUD AdminUser (khusus SUPER_ADMIN).
- **FR-04** List & detail User app; toggle `isVerified`.
- **FR-05** Middleware proteksi semua halaman dashboard.
- **FR-06** Seed 1 SUPER_ADMIN awal via `prisma/seed.ts`.

## 5. Data Model (ringkas)
`AdminUser(id,email,name,passwordHash,role(SUPER_ADMIN|ADMIN|OPERATOR),active,createdAt)` · `User(id,name,phoneNumber,email?,avatarUrl?,isVerified,createdAt)`.

## 6. API
| Method | Path | Untuk |
|--------|------|-------|
| POST | `/api/auth/[...nextauth]` | Login/logout admin |
| (admin) | Server Actions | CRUD admin, kelola user |

## 7. Acceptance Criteria
- [ ] Hanya admin dengan kredensial valid yang bisa masuk dashboard.
- [ ] OPERATOR tidak melihat menu/aksi khusus ADMIN/SUPER_ADMIN.
- [ ] Akses langsung ke route dashboard tanpa login → redirect ke `/login`.
- [ ] SUPER_ADMIN dapat membuat admin baru yang langsung bisa login.
