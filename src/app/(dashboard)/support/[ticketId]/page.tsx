import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentAdmin } from "@/lib/session";
import { apiGet, ApiError } from "@/lib/api-client";
import type { QuickReply, TicketDetail } from "@/lib/types";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  type TicketCategory,
} from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { assignTicket, updateTicketStatus } from "@/server/actions/support";
import { ChatThread } from "../chat-thread";
import { ReplyBox } from "../reply-box";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;

  let detail: TicketDetail;
  try {
    detail = await apiGet<TicketDetail>(`/admin/support/tickets/${ticketId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const [quickReplies, session, admin] = await Promise.all([
    apiGet<QuickReply[]>("/admin/support/quick-replies").catch(() => [] as QuickReply[]),
    auth(),
    getCurrentAdmin(),
  ]);

  const { ticket, messages } = detail;
  const token = session?.accessToken ?? "";
  const agentId = admin?.id ?? "";
  const customer = ticket.participants.find((p) => p.role === "user");
  const closed = ticket.status === "closed";

  return (
    <div className="space-y-6">
      <PageHeader
        title={ticket.subject ?? "Tiket"}
        description={`Dibuat ${formatDateTime(ticket.createdAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Conversation */}
        <div className="space-y-4">
          <ChatThread
            conversationId={ticket.id}
            token={token}
            agentId={agentId}
            initialMessages={messages}
          />
          <Card>
            <CardContent className="pt-5">
              <ReplyBox ticketId={ticket.id} quickReplies={quickReplies} disabled={closed} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: status, assignment, customer */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Status</CardTitle>
              <Badge tone={TICKET_STATUS_TONE[ticket.status] as "yellow" | "blue" | "green" | "default"}>
                {TICKET_STATUS_LABEL[ticket.status]}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(["pending", "resolved", "closed"] as const).map((s) => (
                <form key={s} action={updateTicketStatus}>
                  <input type="hidden" name="id" value={ticket.id} />
                  <input type="hidden" name="status" value={s} />
                  <Button
                    type="submit"
                    variant={s === "closed" ? "destructive" : "outline"}
                    size="sm"
                    disabled={ticket.status === s || closed}
                  >
                    {TICKET_STATUS_LABEL[s]}
                  </Button>
                </form>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Penugasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-slate-500">
                {ticket.assignedAgentId
                  ? ticket.assignedAgentId === agentId
                    ? "Ditugaskan ke Anda"
                    : "Ditugaskan ke agen lain"
                  : "Belum ditugaskan"}
              </p>
              {ticket.assignedAgentId !== agentId && !closed && (
                <form action={assignTicket}>
                  <input type="hidden" name="id" value={ticket.id} />
                  <Button type="submit" size="sm">
                    Tugaskan ke saya
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Pelanggan" value={customer?.name ?? "-"} />
              <Row
                label="Kategori"
                value={
                  ticket.category
                    ? TICKET_CATEGORY_LABEL[ticket.category as TicketCategory]
                    : "-"
                }
              />
              <Row label="Prioritas" value={ticket.priority ?? "normal"} />
              <Row label="Diperbarui" value={formatDateTime(ticket.updatedAt)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
