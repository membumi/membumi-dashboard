# PRD — Modul Food Delivery (Restoran, Menu, Order)

## 1. Tujuan
Mengelola restoran (UMKM kuliner) beserta menu, serta memonitor order makanan & status pengantaran. Diserve ke Flutter via `GET /api/v1/restaurants`.

## 2. Aktor & Peran
- **OPERATOR** — CRUD restoran & menu, toggle `isOpen`/`available`.
- **ADMIN** — + hapus restoran, update status order.
- **SUPER_ADMIN** — semua akses.

## 3. Use Cases

### UC-01 — Membuat / Edit Restoran
- **Aktor:** Operator
- **Alur Utama:**
  1. `Food → Restaurants → Tambah`.
  2. Isi `name, imageUrl, categories[] (mis. Nasi, Mie, Kopi), priceLevel(1–3), distanceMeters, etaMinutes, isOpen`, pilih `merchantId?`.
  3. Submit → simpan (`rating=0, ratingCount=0`).

### UC-02 — Mengelola Menu per Restoran
- **Aktor:** Operator
- **Alur Utama:** Detail restoran → tab **Menu** → tambah item (`name, description, price, imageUrl, category, available`). Toggle ketersediaan item, edit/hapus.
- **Aturan:** `category` item dipakai untuk pengelompokan di app.

### UC-03 — Buka/Tutup Restoran
- **Aktor:** Operator
- **Alur:** Toggle `isOpen`. Restoran `isOpen=false` tetap tampil namun ditandai tutup (atau difilter sesuai kebutuhan app).

### UC-04 — Monitoring Food Order
- **Aktor:** Admin
- **Alur Utama:** Tab **Food Orders** → tabel (`id, restaurant, items, total, paymentMethod, status, courierName`). Update `status`: CONFIRMED → PREPARING → PICKED_UP → DELIVERING → DELIVERED. Tetapkan `courierName`.

## 4. Functional Requirements
- **FR-01** CRUD Restaurant sesuai `restaurant.dart`; `categories` sebagai array.
- **FR-02** CRUD MenuItem sebagai child restoran dengan toggle `available`.
- **FR-03** List restoran: search, filter kategori/priceLevel/isOpen.
- **FR-04** `GET /api/v1/restaurants/[id]/menu` mengelompokkan item per `category`.
- **FR-05** Order read-only kecuali `status` & `courierName`.

## 5. Data Model (ringkas)
`Restaurant(id,name,imageUrl,rating,ratingCount,categories[],distanceMeters,etaMinutes,priceLevel,isOpen,merchantId?)` · `MenuItem(id,restaurantId,name,description,price,imageUrl,category,available)` · `FoodOrder(id,restaurantId,status,paymentMethod,courierName?,total,createdAt)` + `FoodOrderItem(orderId,menuItemId,quantity,notes)`. Enum `FoodOrderStatus = CONFIRMED|PREPARING|PICKED_UP|DELIVERING|DELIVERED`.

## 6. API
| Method | Path | Untuk |
|--------|------|-------|
| GET | `/api/v1/restaurants?q=` | App: list/search restoran |
| GET | `/api/v1/restaurants/[id]` | App: detail restoran |
| GET | `/api/v1/restaurants/[id]/menu` | App: menu per kategori |
| POST | `/api/v1/food-orders` | App: buat order (`restaurantId, items, paymentMethod, address`) |

## 7. Acceptance Criteria
- [ ] Admin dapat membuat restoran + ≥1 menu item dan melihatnya di app endpoint.
- [ ] Menu dikembalikan terkelompok per kategori.
- [ ] Order via API muncul di tab Food Orders, status dapat dimajukan bertahap.
- [ ] Item `available=false` tidak dapat dipesan dari app.
