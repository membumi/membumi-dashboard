// Shared read helpers used by multiple pages (selectors, lookups).
import { apiGet, apiGetPaged, ApiError } from "@/lib/api-client";
import type {
  Merchant,
  MartCategory,
  Guide,
  FoodOrder,
  MartOrder,
  Ride,
  Delivery,
} from "@/lib/types";

/** Verified merchants as {id, businessName} options for catalog selectors. */
export async function merchantOptions(): Promise<{ id: string; businessName: string }[]> {
  try {
    const { items } = await apiGetPaged<Merchant>("/admin/merchants", {
      status: "VERIFIED",
      limit: 100,
    });
    return items.map((m) => ({ id: m.id, businessName: m.businessName }));
  } catch {
    return [];
  }
}

/** All mart categories. */
export async function categoryOptions(): Promise<MartCategory[]> {
  const { items } = await apiGetPaged<MartCategory>("/mart/categories", { limit: 100 });
  return items;
}

/** All guides (backend gap 1 — returns [] until the module ships). */
export async function guideOptions(): Promise<Guide[]> {
  try {
    const { items } = await apiGetPaged<Guide>("/admin/guides", { limit: 100 });
    return items;
  } catch {
    return [];
  }
}

/**
 * Fetch one record for an order-detail page. Prefers the dedicated
 * `${listPath}/:id` endpoint, but falls back to scanning the list so the detail
 * link keeps working even if the backend hasn't shipped a single-record GET yet
 * (returns 404). Non-404 errors (auth/network) are propagated.
 */
async function orderById<T extends { id: string }>(
  listPath: string,
  id: string,
): Promise<T | null> {
  try {
    return await apiGet<T>(`${listPath}/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status !== 404) throw e;
  }
  const { items } = await apiGetPaged<T>(listPath, { limit: 100 });
  return items.find((o) => o.id === id) ?? null;
}

/** One food order (MiFood) for the order-detail page. */
export function foodOrderById(id: string): Promise<FoodOrder | null> {
  return orderById<FoodOrder>("/admin/food-orders", id);
}

/** One mart order (MiMart / MiLokal) for the order-detail page. */
export function martOrderById(id: string): Promise<MartOrder | null> {
  return orderById<MartOrder>("/admin/mart/orders", id);
}

/** One ride (MiRide / MiCar) for the order-detail page. */
export function rideById(id: string): Promise<Ride | null> {
  return orderById<Ride>("/admin/rides", id);
}

/** One delivery (MiSend) for the order-detail page. */
export function deliveryById(id: string): Promise<Delivery | null> {
  return orderById<Delivery>("/admin/deliveries", id);
}
