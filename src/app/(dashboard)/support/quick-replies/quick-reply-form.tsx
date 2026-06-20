import Link from "next/link";
import type { QuickReply } from "@/lib/types";
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABEL } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/form-controls";
import { buttonVariants } from "@/components/ui/button";

export function QuickReplyForm({
  action,
  quickReply,
}: {
  action: (fd: FormData) => Promise<void>;
  quickReply?: QuickReply;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="grid max-w-xl gap-4">
          {quickReply && <input type="hidden" name="id" value={quickReply.id} />}
          <div>
            <Label>Judul</Label>
            <Input name="title" required defaultValue={quickReply?.title} maxLength={100} />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select name="category" defaultValue={quickReply?.category ?? ""}>
              <option value="">Tanpa kategori</option>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {TICKET_CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Isi balasan</Label>
            <Textarea name="body" required rows={4} defaultValue={quickReply?.body} maxLength={4000} />
          </div>
          <div className="flex gap-2">
            <SubmitButton>{quickReply ? "Simpan Perubahan" : "Tambah Template"}</SubmitButton>
            <Link href="/support/quick-replies" className={buttonVariants({ variant: "outline" })}>
              Batal
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
