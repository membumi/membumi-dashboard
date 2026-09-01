import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn, waUrl } from "@/lib/utils";

/**
 * Pintasan chat WhatsApp ke sebuah nomor. `null` bila nomornya tidak bisa
 * dipakai, supaya baris tanpa kontak tidak menampilkan tombol mati — kontrak
 * yang sama dengan `MapsLinkButton`.
 */
export function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
  className,
}: {
  phone?: string | null;
  message?: string | null;
  label?: string;
  className?: string;
}) {
  const href = waUrl(phone, message);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Chat WhatsApp ${phone}`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
    >
      <MessageCircle className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

/** Nomor sebagai teks yang bisa diklik ke WhatsApp; jatuh ke teks biasa bila tak valid. */
export function WhatsAppLink({ phone, className }: { phone?: string | null; className?: string }) {
  const href = waUrl(phone);
  if (!href) return <span className={cn("text-slate-400", className)}>—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("text-emerald-700 hover:underline", className)}
    >
      {phone}
    </a>
  );
}
