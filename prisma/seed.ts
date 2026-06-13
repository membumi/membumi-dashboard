import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding…");

  // --- Admins -------------------------------------------------------------
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@superapp.id" },
    update: {},
    create: {
      email: "admin@superapp.id",
      name: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });
  await prisma.adminUser.upsert({
    where: { email: "operator@superapp.id" },
    update: {},
    create: {
      email: "operator@superapp.id",
      name: "Operator",
      passwordHash: await bcrypt.hash("operator123", 10),
      role: "OPERATOR",
    },
  });

  // --- App users ----------------------------------------------------------
  const user = await prisma.user.upsert({
    where: { phoneNumber: "+628123456789" },
    update: {},
    create: {
      name: "Pengguna SuperApp",
      phoneNumber: "+628123456789",
      email: "user@example.com",
      isVerified: true,
    },
  });
  await prisma.user.upsert({
    where: { phoneNumber: "+628987654321" },
    update: {},
    create: { name: "Budi Santoso", phoneNumber: "+628987654321", isVerified: false },
  });

  // --- Merchants ----------------------------------------------------------
  const merchant = await prisma.merchant.create({
    data: {
      businessName: "Nusantara Hospitality",
      ownerName: "Siti Rahma",
      phoneNumber: "+628111222333",
      city: "Jakarta",
      bankAccount: "BCA 1234567890",
      commissionRate: 12,
      verificationStatus: "VERIFIED",
    },
  });
  await prisma.merchant.create({
    data: {
      businessName: "Warung Berkah",
      ownerName: "Agus Pratama",
      phoneNumber: "+628444555666",
      city: "Bandung",
      commissionRate: 10,
      verificationStatus: "PENDING",
    },
  });

  // --- Amenities ----------------------------------------------------------
  const amenityNames = ["WiFi", "Kolam Renang", "Sarapan", "AC", "Parkir", "Gym"];
  const amenities = await Promise.all(
    amenityNames.map((name) =>
      prisma.amenity.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  // --- Hotels (ported from penginapan demo data) --------------------------
  const hotels = [
    { name: "Grand Jakarta Hotel", city: "Jakarta", address: "Jl. Sudirman No. 1", starRating: 5, pricePerNight: 850000, rating: 4.7, reviewCount: 320 },
    { name: "Bali Beach Resort", city: "Bali", address: "Jl. Pantai Kuta No. 88", starRating: 4, pricePerNight: 650000, rating: 4.5, reviewCount: 210 },
    { name: "Bandung Highland Inn", city: "Bandung", address: "Jl. Dago Atas No. 12", starRating: 3, pricePerNight: 420000, rating: 4.3, reviewCount: 150 },
    { name: "Yogya Heritage Hotel", city: "Yogyakarta", address: "Jl. Malioboro No. 7", starRating: 4, pricePerNight: 500000, rating: 4.6, reviewCount: 180 },
  ];
  for (const h of hotels) {
    const hotel = await prisma.hotel.create({
      data: {
        ...h,
        merchantId: merchant.id,
        amenities: { connect: amenities.slice(0, 4).map((a) => ({ id: a.id })) },
        rooms: {
          create: [
            { name: "Deluxe Room", pricePerNight: h.pricePerNight, capacity: 2, facilities: ["AC", "TV", "WiFi"], available: true },
            { name: "Suite Room", pricePerNight: h.pricePerNight + 350000, capacity: 4, facilities: ["AC", "TV", "WiFi", "Bathtub"], available: true },
          ],
        },
        reviews: {
          create: [
            { authorName: "Andi", rating: 5, comment: "Pelayanan sangat baik!" },
            { authorName: "Maya", rating: 4, comment: "Kamar bersih dan nyaman." },
          ],
        },
      },
      include: { rooms: true },
    });

    // one sample booking for monitoring
    await prisma.booking.create({
      data: {
        voucherCode: `VCR-${hotel.city.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        hotelId: hotel.id,
        roomId: hotel.rooms[0].id,
        guestName: "Pengguna SuperApp",
        city: hotel.city,
        checkIn: new Date(Date.now() + 3 * 864e5),
        checkOut: new Date(Date.now() + 5 * 864e5),
        guests: 2,
        total: hotel.rooms[0].pricePerNight * 2,
        status: "CONFIRMED",
      },
    });
  }

  // --- Open Trips ---------------------------------------------------------
  const guide = await prisma.guide.create({
    data: { name: "Pak Joko", rating: 4.8, tripCount: 24 },
  });
  const trips = [
    { title: "Pendakian Gunung Bromo", destination: "Bromo, Jawa Timur", price: 1250000, durationDays: 3, totalSlots: 15, rating: 4.8 },
    { title: "Sailing Trip Komodo", destination: "Labuan Bajo, NTT", price: 3500000, durationDays: 4, totalSlots: 12, rating: 4.9 },
    { title: "Golden Sunrise Dieng", destination: "Dieng, Jawa Tengah", price: 850000, durationDays: 2, totalSlots: 20, rating: 4.6 },
  ];
  for (const t of trips) {
    const trip = await prisma.trip.create({
      data: {
        ...t,
        startDate: new Date(Date.now() + 14 * 864e5),
        description: `Nikmati pengalaman tak terlupakan di ${t.destination}.`,
        includes: ["Transport", "Makan", "Guide", "Tiket Masuk"],
        guideId: guide.id,
        merchantId: merchant.id,
        bookedSlots: 2,
        itinerary: {
          create: Array.from({ length: t.durationDays }, (_, i) => ({
            day: i + 1,
            title: `Hari ${i + 1}`,
            activities: ["Berkumpul & briefing", "Perjalanan", "Eksplorasi destinasi"],
          })),
        },
        registrations: {
          create: [{ participants: 2, contactName: "Pengguna SuperApp", total: t.price * 2 }],
        },
      },
    });
    void trip;
  }

  // --- Mart ---------------------------------------------------------------
  const catNames = ["Sayur & Buah", "Daging & Ikan", "Minuman", "Snack", "Kebutuhan Rumah"];
  const cats: Record<string, string> = {};
  for (const name of catNames) {
    const c = await prisma.martCategory.upsert({ where: { name }, update: {}, create: { name } });
    cats[name] = c.id;
  }
  const products = [
    { name: "Apel Fuji 1kg", price: 35000, originalPrice: 42000, unit: "kg", stock: 50, cat: "Sayur & Buah" },
    { name: "Daging Sapi 500g", price: 75000, unit: "pack", stock: 20, cat: "Daging & Ikan" },
    { name: "Air Mineral 600ml", price: 4000, unit: "botol", stock: 200, cat: "Minuman" },
    { name: "Keripik Kentang", price: 12000, originalPrice: 15000, unit: "pcs", stock: 3, cat: "Snack" },
    { name: "Sabun Cuci Piring", price: 18000, unit: "pcs", stock: 80, cat: "Kebutuhan Rumah" },
  ];
  let firstProductId = "";
  for (const p of products) {
    const prod = await prisma.product.create({
      data: {
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice ?? null,
        unit: p.unit,
        stock: p.stock,
        rating: 4.5,
        categoryId: cats[p.cat],
        merchantId: merchant.id,
      },
    });
    if (!firstProductId) firstProductId = prod.id;
  }
  await prisma.martOrder.create({
    data: {
      paymentMethod: "wallet",
      address: "Jl. Mawar No. 5, Jakarta",
      total: 35000,
      shipmentStatus: "PACKING",
      items: { create: [{ productId: firstProductId, quantity: 1, price: 35000 }] },
    },
  });

  // --- Food ---------------------------------------------------------------
  const restaurants = [
    { name: "Sate Khas Senayan", categories: ["Indonesia", "Sate"], priceLevel: 2 },
    { name: "Bakmi GM", categories: ["Mie", "Indonesia"], priceLevel: 2 },
    { name: "Burger Bangor", categories: ["Burger", "Fast Food"], priceLevel: 1 },
    { name: "Kopi Kenangan", categories: ["Kopi", "Minuman"], priceLevel: 1 },
  ];
  let firstMenuId = "";
  let firstRestoId = "";
  for (const r of restaurants) {
    const resto = await prisma.restaurant.create({
      data: {
        name: r.name,
        categories: r.categories,
        priceLevel: r.priceLevel,
        distanceMeters: 800 + Math.floor(Math.random() * 2000),
        etaMinutes: 15 + Math.floor(Math.random() * 20),
        rating: 4.5,
        ratingCount: 120,
        merchantId: merchant.id,
        menuItems: {
          create: [
            { name: "Menu Andalan", description: "Favorit pelanggan", price: 35000, category: "Utama", available: true },
            { name: "Minuman Segar", description: "Pelepas dahaga", price: 15000, category: "Minuman", available: true },
          ],
        },
      },
      include: { menuItems: true },
    });
    if (!firstMenuId) {
      firstMenuId = resto.menuItems[0].id;
      firstRestoId = resto.id;
    }
  }
  await prisma.foodOrder.create({
    data: {
      restaurantId: firstRestoId,
      status: "PREPARING",
      paymentMethod: "wallet",
      total: 35000,
      items: { create: [{ menuItemId: firstMenuId, quantity: 1, notes: "Tidak pedas" }] },
    },
  });

  // --- Ride ---------------------------------------------------------------
  await prisma.fareConfig.upsert({
    where: { type: "MOTOR" },
    update: {},
    create: { type: "MOTOR", baseFare: 5000, perKm: 2500, perMinute: 200 },
  });
  await prisma.fareConfig.upsert({
    where: { type: "MOBIL" },
    update: {},
    create: { type: "MOBIL", baseFare: 10000, perKm: 4000, perMinute: 400 },
  });
  const driver = await prisma.driver.create({
    data: {
      name: "Joko Susilo",
      vehiclePlate: "B 1234 ABC",
      vehicleName: "Honda Vario",
      rating: 4.9,
      phoneNumber: "+628777888999",
      verificationStatus: "VERIFIED",
    },
  });
  await prisma.driver.create({
    data: { name: "Rudi Hartono", vehiclePlate: "B 5678 DEF", vehicleName: "Toyota Avanza", verificationStatus: "PENDING" },
  });
  await prisma.ride.create({
    data: {
      type: "MOTOR",
      status: "COMPLETED",
      pickupAddress: "Stasiun Gambir",
      destAddress: "Grand Indonesia",
      fareAmount: 18000,
      driverId: driver.id,
    },
  });

  // --- Promos -------------------------------------------------------------
  await prisma.promo.createMany({
    data: [
      { title: "Gratis Ongkir Food", description: "Gratis ongkir min. 50rb", code: "FOODGRATIS", discountType: "FREE_SHIPPING", value: 0, service: "FOOD", expiresAt: new Date(Date.now() + 30 * 864e5) },
      { title: "Cashback 20% Mart", description: "Cashback hingga 20rb", code: "MART20", discountType: "PERCENT", value: 20, service: "MART", expiresAt: new Date(Date.now() + 30 * 864e5) },
      { title: "Diskon Ojek 50%", description: "Potongan 50% maks 10rb", code: "OJEK50", discountType: "PERCENT", value: 50, service: "RIDE", expiresAt: new Date(Date.now() + 7 * 864e5) },
    ],
  });

  // --- Wallet -------------------------------------------------------------
  await prisma.walletTransaction.createMany({
    data: [
      { userId: user.id, type: "TOP_UP", description: "Top up saldo", amount: 200000, isCredit: true },
      { userId: user.id, type: "RIDE", description: "Ojek motor", amount: 18000, isCredit: false },
      { userId: user.id, type: "FOOD", description: "Order makanan", amount: 50000, isCredit: false },
    ],
  });

  console.log("Seed complete. Login: admin@superapp.id / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
