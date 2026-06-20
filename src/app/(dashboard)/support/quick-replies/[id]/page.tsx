import { notFound } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api-client";
import type { QuickReply } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { updateQuickReply } from "@/server/actions/support";
import { QuickReplyForm } from "../quick-reply-form";

export const dynamic = "force-dynamic";

export default async function EditQuickReplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // The backend has no single-item endpoint, so resolve from the list.
  let list: QuickReply[];
  try {
    list = await apiGet<QuickReply[]>("/admin/support/quick-replies");
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const quickReply = list.find((q) => q.id === id);
  if (!quickReply) notFound();

  return (
    <div>
      <PageHeader title="Ubah Template Balasan" />
      <QuickReplyForm action={updateQuickReply} quickReply={quickReply} />
    </div>
  );
}
