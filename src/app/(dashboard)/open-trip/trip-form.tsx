"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/form-controls";
import { ArrayInput } from "@/components/forms/array-input";

type Day = { day: number; title: string; activities: string[] };
type TripData = {
  id: string;
  title: string;
  destination: string;
  imageUrl: string | null;
  price: number;
  durationDays: number;
  startDate: string; // yyyy-mm-dd
  totalSlots: number;
  description: string;
  includes: string[];
  guideId: string | null;
  merchantId: string | null;
};

export function TripForm({
  action,
  trip,
  itinerary = [],
  guides,
  merchants,
}: {
  action: (fd: FormData) => Promise<void>;
  trip?: TripData;
  itinerary?: Day[];
  guides: { id: string; name: string }[];
  merchants: { id: string; businessName: string }[];
}) {
  const [days, setDays] = useState<Day[]>(
    itinerary.length ? itinerary : [{ day: 1, title: "Hari 1", activities: [] }]
  );

  const addDay = () =>
    setDays((p) => [...p, { day: p.length + 1, title: `Hari ${p.length + 1}`, activities: [] }]);
  const removeDay = (i: number) =>
    setDays((p) => p.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, day: idx + 1 })));
  const setDay = (i: number, patch: Partial<Day>) =>
    setDays((p) => p.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const addActivity = (i: number, v: string) => {
    const t = v.trim();
    if (t) setDay(i, { activities: [...days[i].activities, t] });
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="space-y-5">
          {trip && <input type="hidden" name="id" value={trip.id} />}
          <input type="hidden" name="itinerary" value={JSON.stringify(days)} />

          <div className="grid max-w-2xl gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Judul Trip</Label>
              <Input name="title" required defaultValue={trip?.title} />
            </div>
            <div className="md:col-span-2">
              <Label>Destinasi</Label>
              <Input name="destination" required defaultValue={trip?.destination} />
            </div>
            <div>
              <Label>Harga / orang (Rp)</Label>
              <Input name="price" type="number" min={1} required defaultValue={trip?.price} />
            </div>
            <div>
              <Label>Durasi (hari)</Label>
              <Input name="durationDays" type="number" min={1} required defaultValue={trip?.durationDays ?? 1} />
            </div>
            <div>
              <Label>Tanggal Mulai</Label>
              <Input name="startDate" type="date" required defaultValue={trip?.startDate} />
            </div>
            <div>
              <Label>Total Slot</Label>
              <Input name="totalSlots" type="number" min={1} required defaultValue={trip?.totalSlots ?? 10} />
            </div>
            <div>
              <Label>Guide</Label>
              <Select name="guideId" defaultValue={trip?.guideId ?? ""}>
                <option value="">— Tidak ada —</option>
                {guides.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Merchant</Label>
              <Select name="merchantId" defaultValue={trip?.merchantId ?? ""}>
                <option value="">— Internal —</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>{m.businessName}</option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>URL Gambar (opsional)</Label>
              <Input name="imageUrl" type="url" defaultValue={trip?.imageUrl ?? ""} placeholder="https://…" />
            </div>
            <div className="md:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea name="description" defaultValue={trip?.description} />
            </div>
            <div className="md:col-span-2">
              <Label>Termasuk (includes)</Label>
              <ArrayInput name="includes" defaultValue={trip?.includes ?? []} placeholder="Transport, Makan…" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Itinerary Harian</Label>
              <Button type="button" variant="secondary" size="sm" onClick={addDay}>
                <Plus className="h-4 w-4" /> Tambah Hari
              </Button>
            </div>
            <div className="space-y-3">
              {days.map((d, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                      Hari {d.day}
                    </span>
                    <Input
                      value={d.title}
                      onChange={(e) => setDay(i, { title: e.target.value })}
                      placeholder="Judul hari"
                      className="h-8"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDay(i)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.activities.map((a, ai) => (
                      <span key={ai} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs">
                        {a}
                        <button
                          type="button"
                          onClick={() => setDay(i, { activities: d.activities.filter((_, x) => x !== ai) })}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <Input
                    placeholder="Tambah aktivitas, tekan Enter"
                    className="mt-2 h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addActivity(i, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <SubmitButton>{trip ? "Simpan Perubahan" : "Buat Trip"}</SubmitButton>
            <Link href="/open-trip" className={buttonVariants({ variant: "outline" })}>Batal</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
