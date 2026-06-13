import { guideOptions } from "@/server/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from "@/components/ui/table";
import { Input, Label } from "@/components/ui/input";
import { SubmitButton, ConfirmDelete } from "@/components/forms/form-controls";
import { createGuide, deleteGuide } from "@/server/actions/trips";

export default async function GuidesPage() {
  const guides = await guideOptions();

  return (
    <div className="space-y-6">
      <PageHeader title="Guide" description="Pemandu / organizer open trip." />

      <Card>
        <CardContent className="pt-5">
          <form action={createGuide} className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Nama Guide</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Rating</Label>
              <Input name="rating" type="number" step="0.1" min={0} max={5} defaultValue={0} />
            </div>
            <div className="flex items-end">
              <SubmitButton variant="secondary">Tambah Guide</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Table>
        <THead>
          <TR>
            <TH>Nama</TH>
            <TH>Rating</TH>
            <TH>Jumlah Trip</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {guides.length === 0 && <EmptyRow colSpan={4} />}
          {guides.map((g) => (
            <TR key={g.id}>
              <TD className="font-medium">{g.name}</TD>
              <TD>★ {g.rating}</TD>
              <TD>{g.tripCount}</TD>
              <TD className="text-right"><ConfirmDelete action={deleteGuide} id={g.id} label="Hapus guide ini?" /></TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
