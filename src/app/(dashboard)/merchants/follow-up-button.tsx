"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markMerchantFollowedUp } from "@/server/actions/merchants";

/**
 * Buka chat WhatsApp follow-up sekaligus mencatatnya.
 *
 * Tab WhatsApp dibuka lebih dulu dan tidak menunggu Server Action: kalau
 * pencatatan yang duluan, browser sudah menganggap `window.open` bukan hasil
 * klik pengguna dan memblokir pop-up-nya. Kegagalan pencatatan tidak
 * menghalangi admin menghubungi merchant — cuma kolom Follow-up yang tidak
 * terisi, dan itu dilaporkan lewat teks kecil di bawah tombol.
 */
export function FollowUpButton({
  merchantId,
  waHref,
  followedUp,
}: {
  merchantId: string;
  waHref: string;
  followedUp: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function handleClick() {
    window.open(waHref, "_blank", "noopener,noreferrer");
    setFailed(false);
    startTransition(async () => {
      try {
        await markMerchantFollowedUp(merchantId);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant={followedUp ? "outline" : "default"}
        size="sm"
        onClick={handleClick}
        disabled={pending}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {followedUp ? "Follow-up lagi" : "Follow-up WA"}
      </Button>
      {failed && (
        <p className="text-xs text-amber-700">Chat terbuka, tapi gagal dicatat.</p>
      )}
    </div>
  );
}
