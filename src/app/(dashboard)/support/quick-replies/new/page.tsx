import { PageHeader } from "@/components/layout/page-header";
import { createQuickReply } from "@/server/actions/support";
import { QuickReplyForm } from "../quick-reply-form";

export default function NewQuickReplyPage() {
  return (
    <div>
      <PageHeader title="Tambah Template Balasan" />
      <QuickReplyForm action={createQuickReply} />
    </div>
  );
}
