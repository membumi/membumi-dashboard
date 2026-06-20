"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

/** Strip the `/v1` path from the public API URL to get the Socket.IO origin. */
function socketOrigin(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://localhost:3000";
  }
}

/**
 * Live ticket conversation. Seeded with server-fetched messages, then appends
 * incoming `chat:message` events from the backend `/chat` namespace in realtime.
 * Agent replies go through a Server Action (which revalidates and re-seeds), so
 * this component only needs to *receive* live user messages.
 */
export function ChatThread({
  conversationId,
  token,
  agentId,
  initialMessages,
}: {
  conversationId: string;
  token: string;
  agentId: string;
  initialMessages: ChatMessage[];
}) {
  // Messages received live over the socket since mount. Merged with (not
  // replacing) the server-seeded `initialMessages`, so a server revalidation
  // re-seeding the props never wipes live messages, and vice versa.
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const origin = useMemo(() => socketOrigin(), []);

  const messages = useMemo(() => {
    const seen = new Set(initialMessages.map((m) => m.id));
    const extra = liveMessages.filter((m) => !seen.has(m.id));
    return [...initialMessages, ...extra].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [initialMessages, liveMessages]);

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(`${origin}/chat`, {
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
    });

    socket.on("connect", () => {
      socket.emit("chat:subscribe", { conversationId });
    });
    socket.on("chat:message", (msg: ChatMessage) => {
      if (msg.conversationId !== conversationId) return;
      setLiveMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
    });

    return () => {
      socket.emit("chat:unsubscribe", { conversationId });
      socket.disconnect();
    };
  }, [conversationId, token, origin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[28rem] flex-col gap-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-4">
      {messages.length === 0 && (
        <p className="m-auto text-sm text-slate-400">Belum ada pesan</p>
      )}
      {messages.map((m) => {
        const mine = m.senderRole === "agent" || m.senderId === agentId;
        return (
          <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                mine
                  ? "rounded-br-sm bg-emerald-600 text-white"
                  : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
              )}
            >
              {m.type === "image" && m.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt="lampiran" className="max-w-[200px] rounded" />
              ) : (
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
              )}
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  mine ? "text-emerald-100" : "text-slate-400"
                )}
              >
                {formatDateTime(m.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
