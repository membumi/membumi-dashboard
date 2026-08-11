import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { supportTicketsByOrder } from "@/server/queries";
import { formatDateTime } from "@/lib/utils";
import {
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  type TicketStatus,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Chat support **untuk order ini** — tiket yang dibuka pemesan tentang order
 * bersangkutan (`Conversation.orderId`), bukan seluruh riwayat chat pemesan.
 * Dipakai MiFood & MiRide supaya admin bisa menelusuri satu order tanpa menyaring
 * keluhan order lain. Kosong = pemesan belum pernah chat CS soal order ini.
 */
export async function SupportTicketsCard({ orderId }: { orderId?: string | null }) {
  const tickets = orderId ? await supportTicketsByOrder(orderId) : [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Chat Support</CardTitle>
        <Link href="/support" className="text-xs font-medium text-emerald-700 hover:underline">
          Antrean CS
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {tickets.length === 0 && (
          <p className="text-slate-400">Belum ada chat support untuk order ini.</p>
        )}
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/support/${t.id}`}
            className="-mx-2 block rounded-md px-2 py-2 hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 items-start gap-2 font-medium text-slate-800">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{t.subject ?? "(tanpa subjek)"}</span>
              </span>
              <Badge
                tone={
                  TICKET_STATUS_TONE[t.status as TicketStatus] as
                    | "yellow"
                    | "blue"
                    | "green"
                    | "default"
                }
              >
                {TICKET_STATUS_LABEL[t.status as TicketStatus] ?? t.status}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">
              {t.lastMessage?.text ?? "Belum ada pesan"}
            </p>
            <p className="text-xs text-slate-400">{formatDateTime(t.updatedAt)}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
