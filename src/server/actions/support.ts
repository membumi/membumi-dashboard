"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { requireRole } from "@/lib/session";
import {
  quickReplySchema,
  ticketAssignSchema,
  ticketReplySchema,
  ticketStatusSchema,
} from "@/lib/validations";
import { str, strOrUndef } from "@/lib/form";

// ── Ticket actions (any agent / operator) ──────────────────────────────────

export async function assignTicket(fd: FormData) {
  await requireRole("OPERATOR");
  const data = ticketAssignSchema.parse({
    id: str(fd, "id"),
    agentId: strOrUndef(fd, "agentId"),
  });
  await apiPost(`/admin/support/tickets/${data.id}/assign`, {
    agentId: data.agentId,
  });
  revalidatePath(`/support/${data.id}`);
  revalidatePath("/support");
}

export async function replyTicket(fd: FormData) {
  await requireRole("OPERATOR");
  const data = ticketReplySchema.parse({
    id: str(fd, "id"),
    text: str(fd, "text"),
  });
  await apiPost(`/admin/support/tickets/${data.id}/messages`, {
    type: "text",
    text: data.text,
  });
  revalidatePath(`/support/${data.id}`);
  revalidatePath("/support");
}

export async function updateTicketStatus(fd: FormData) {
  await requireRole("OPERATOR");
  const data = ticketStatusSchema.parse({
    id: str(fd, "id"),
    status: str(fd, "status"),
  });
  await apiPatch(`/admin/support/tickets/${data.id}/status`, { status: data.status });
  revalidatePath(`/support/${data.id}`);
  revalidatePath("/support");
}

// ── Quick replies (management is admin+) ────────────────────────────────────

function parseQuickReply(fd: FormData) {
  return quickReplySchema.parse({
    title: str(fd, "title"),
    body: str(fd, "body"),
    category: strOrUndef(fd, "category"),
  });
}

export async function createQuickReply(fd: FormData) {
  await requireRole("ADMIN");
  await apiPost("/admin/support/quick-replies", parseQuickReply(fd));
  revalidatePath("/support/quick-replies");
  redirect("/support/quick-replies");
}

export async function updateQuickReply(fd: FormData) {
  await requireRole("ADMIN");
  const id = str(fd, "id");
  await apiPatch(`/admin/support/quick-replies/${id}`, parseQuickReply(fd));
  revalidatePath("/support/quick-replies");
  redirect("/support/quick-replies");
}

export async function deleteQuickReply(fd: FormData) {
  await requireRole("ADMIN");
  await apiDelete(`/admin/support/quick-replies/${str(fd, "id")}`);
  revalidatePath("/support/quick-replies");
}
