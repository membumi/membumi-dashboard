# PRD — Modul Belanja Mart (Produk, Kategori, Order)

## 1. Tujuan
Mengelola katalog produk Mart (harga, diskon, stok, kategori, merchant) dan memonitor order + pengiriman. Diserve ke Flutter via `GET /api/v1/mart/products` & `GET /api/v1/mart/categories`.

## 2. Aktor & Peran
- **OPERATOR** — CRUD produk & kategori, update stok.
- **ADMIN** — + hapus produk, update status pengiriman order.
- **SUPER_ADMIN** — semua akses.

## 3. Use Cases

### UC-01 — Mengelola Kategori
- **Aktor:** Operator
- **Alur:** `Mart → Categories` → CRUD kategori (`name`). Contoh: Sayur & Buah, Daging & Ikan, Minuman, Snack, Kebutuhan Rumah.

### UC-02 — Membuat / Edit Produk
- **Aktor:** Operator
- **Alur Utama:**
  1. `Mart → Products → Tambah`.
  2. Isi `name, imageUrl, price, originalPrice? (untuk diskon), unit (kg/pcs/bundle), stock, categoryId, merchantId?`.
  3. Submit → diskon% dihitung otomatis bila `originalPrice > price`.
- **Alur Alternatif:** `price > originalPrice` → tolak (diskon tidak valid).

### UC-03 — Manajemen Stok
- **Aktor:** Operator
- **Alur:** Edit `stock` langsung dari tabel (inline) atau detail. Indikator **low stock** bila `stock < ambang` (mis. 5).

### UC-04 — Monitoring Mart Order & Pengiriman
- **Aktor:** Admin
- **Alur Utama:** Tab **Mart Orders** → tabel (`id, items, total, paymentMethod, address, shipmentStatus`). Update `shipmentStatus`: PACKING → SHIPPED → ON_DELIVERY → ARRIVED, isi `trackingNumber` & `courierName`.

## 4. Functional Requirements
- **FR-01** CRUD Product sesuai `product.dart`; field `originalPrice` opsional.
- **FR-02** Hitung `hasDiscount` & `discountPercent` di server/serializer.
- **FR-03** CRUD Category; produk wajib punya kategori.
- **FR-04** List produk: search, filter kategori/merchant, indikator low stock, sort harga.
- **FR-05** Update stok mengurangi otomatis saat order dibuat via API (transaksional).
- **FR-06** Order read-only kecuali field pengiriman.

## 5. Data Model (ringkas)
`MartCategory(id,name)` · `Product(id,name,imageUrl,price,originalPrice?,unit,stock,categoryId,rating,merchantId?)` · `MartOrder(id,paymentMethod,address,total,trackingNumber,shipmentStatus,courierName,createdAt)` + `MartOrderItem(orderId,productId,quantity,price)`. Enum `ShipmentStatus = PACKING|SHIPPED|ON_DELIVERY|ARRIVED`.

## 6. API
| Method | Path | Untuk |
|--------|------|-------|
| GET | `/api/v1/mart/categories` | App: daftar kategori |
| GET | `/api/v1/mart/products?category=&q=` | App: list produk |
| GET | `/api/v1/mart/products/[id]` | App: detail produk |
| POST | `/api/v1/mart/orders` | App: buat order (`paymentMethod, address, items`) |

## 7. Acceptance Criteria
- [ ] Produk dengan diskon menampilkan `discountPercent` benar di API & UI.
- [ ] Membuat order via API mengurangi `stock` produk terkait.
- [ ] Admin dapat mengubah `shipmentStatus` dan mengisi tracking number.
- [ ] Produk low stock ditandai di list.
