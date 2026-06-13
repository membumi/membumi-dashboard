// Shared read helpers used by multiple pages (selectors, lookups).
import { apiGetPaged } from "@/lib/api-client";
import type { Merchant, MartCategory, Guide } from "@/lib/types";

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
