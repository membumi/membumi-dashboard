import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import type { QuickReply } from "@/lib/types";
import { TICKET_CATEGORY_LABEL, type TicketCategory } from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { ConfirmDelete } from "@/components/forms/form-controls";
import { deleteQuickReply } from "@/server/actions/support";

export const dynamic = "force-dynamic";

export default async function QuickRepliesPage() {
  const quickReplies = await apiGet<QuickReply[]>("/admin/support/quick-replies");

  return (
    <div>
      <PageHeader
        title="Quick Replies"
        description="Template balasan cepat untuk agen Customer Support."
        actionLabel="Tambah Template"
        actionHref="/support/quick-replies/new"
      />
      <Table>
        <THead>
          <TR>
            <TH>Judul</TH>
            <TH>Kategori</TH>
            <TH>Isi</TH>
            <TH className="w-24" />
          </TR>
        </THead>
        <TBody>
          {quickReplies.length === 0 && <EmptyRow colSpan={4} label="Belum ada template" />}
          {quickReplies.map((q) => (
            <TR key={q.id}>
              <TD>
                <Link
                  href={`/support/quick-replies/${q.id}`}
                  className="font-medium text-emerald-700"
                >
                  {q.title}
                </Link>
              </TD>
              <TD>
                {q.category ? (
                  <Badge tone="blue">{TICKET_CATEGORY_LABEL[q.category as TicketCategory]}</Badge>
                ) : (
                  "-"
                )}
              </TD>
              <TD className="max-w-md truncate text-slate-500">{q.body}</TD>
              <TD>
                <ConfirmDelete
                  action={deleteQuickReply}
                  id={q.id}
                  label={`Hapus template "${q.title}"?`}
                />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
