# Dokumentasi — SuperApp.id Admin Dashboard (membumi-dashboard)

Dashboard back-office (CMS + monitoring) untuk ekosistem **SuperApp.id** (`ojol-super-app`).
Dibangun dengan **Next.js full-stack + PostgreSQL/Prisma**, sekaligus menjadi sumber data utama
yang REST API-nya (`/api/v1`) dikonsumsi oleh aplikasi Flutter.

## Daftar Dokumen

| Dokumen | Isi |
|---------|-----|
| [architecture.md](./architecture.md) | Konteks, tech stack, arsitektur, data model (Prisma), tahapan implementasi, verifikasi |
| [prd/01-penginapan.md](./prd/01-penginapan.md) | PRD Modul Penginapan (Hotel & Room & Booking) |
| [prd/02-open-trip.md](./prd/02-open-trip.md) | PRD Modul Open Trip (Trip, Itinerary, Guide, Registrasi) |
| [prd/03-umkm-merchant.md](./prd/03-umkm-merchant.md) | PRD Modul UMKM / Merchant Marketplace |
| [prd/04-mart.md](./prd/04-mart.md) | PRD Modul Belanja Mart (Produk, Kategori, Order) |
| [prd/05-food.md](./prd/05-food.md) | PRD Modul Food Delivery (Restoran, Menu, Order) |
| [prd/06-ride.md](./prd/06-ride.md) | PRD Modul Ride (Driver, Fare, Monitoring Ride) |
| [prd/07-users-auth.md](./prd/07-users-auth.md) | PRD Modul User Management & Admin Auth |
| [prd/08-promo.md](./prd/08-promo.md) | PRD Modul Promo & Banner |
| [prd/09-payment.md](./prd/09-payment.md) | PRD Modul Payment & Wallet |
| [prd/10-analytics.md](./prd/10-analytics.md) | PRD Modul Overview & Analytics |
| [testing.md](./testing.md) | Peta unit test (Vitest) → use case per fitur |

## Konvensi PRD

Setiap PRD memakai struktur: **Tujuan → Aktor & Peran → Use Cases (UC) → Functional Requirements (FR) → Data Model → API → Acceptance Criteria**.

- **UC-XX**: use case dengan alur utama & alternatif.
- **FR-XX**: kebutuhan fungsional yang dapat diuji.
- Semua nominal uang dalam **Rupiah (Integer)**.
- Status/enum di-mirror persis dari domain entities Flutter di `ojol-super-app/lib/features/*/domain/entities/`.
