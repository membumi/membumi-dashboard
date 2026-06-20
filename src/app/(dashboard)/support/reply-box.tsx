"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { QuickReply } from "@/lib/types";
import { Textarea, Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { replyTicket } from "@/server/actions/support";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Mengirim…" : "Kirim balasan"}
    </Button>
  );
}

export function ReplyBox({
  ticketId,
  quickReplies,
  disabled,
}: {
  ticketId: string;
  quickReplies: QuickReply[];
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  if (disabled) {
    return (
      <p className="rounded-md bg-slate-50 p-4 text-center text-sm text-slate-400">
        Tiket sudah ditutup — balasan dinonaktifkan.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await replyTicket(fd);
        setText("");
        formRef.current?.reset();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={ticketId} />

      {quickReplies.length > 0 && (
        <div>
          <Label>Quick reply</Label>
          <Select
            defaultValue=""
            onChange={(e) => {
              const qr = quickReplies.find((q) => q.id === e.target.value);
              if (qr) setText(qr.body);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Sisipkan template…
            </option>
            {quickReplies.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </Select>
        </div>
      )}

      <Textarea
        name="text"
        required
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tulis balasan untuk pengguna…"
      />
      <SendButton />
    </form>
  );
}
