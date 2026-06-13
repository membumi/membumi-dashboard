import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { categoryJson } from "@/lib/serializers";

export async function GET() {
  const cats = await prisma.martCategory.findMany({ orderBy: { name: "asc" } });
  return ok(cats.map(categoryJson));
}
