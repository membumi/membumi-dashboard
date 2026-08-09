"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/form-controls";
import {
  COUNTER_TOPICS,
  COUNTER_TOPIC_SHORT_LABEL,
  type CounterTopic,
} from "@/lib/constants";
import { sendTestNotification, updatePushPreferences } from "@/server/actions/push";

export function NotificationSettingsForm({
  topics,
  disabled,
}: {
  topics: Record<CounterTopic, boolean>;
  disabled?: boolean;
}) {
  const [testState, setTestState] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runTest = () => {
    setTestState(null);
    startTransition(async () => {
      try {
        const { sent } = await sendTestNotification();
        setTestState(
          sent > 0
            ? `Notifikasi uji terkirim ke ${sent} perangkat.`
            : "Belum ada perangkat terdaftar. Aktifkan notifikasi di atas dulu."
        );
      } catch {
        setTestState("Gagal mengirim notifikasi uji.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jenis Notifikasi</CardTitle>
        <CardDescription>
          Pilih antrean mana saja yang ingin Anda terima. Berlaku untuk semua perangkat Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={updatePushPreferences} className="space-y-3">
          {COUNTER_TOPICS.map((topic) => (
            <label
              key={topic}
              className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-3 py-2.5"
            >
              <span className="text-sm font-medium text-slate-700">
                {COUNTER_TOPIC_SHORT_LABEL[topic]}
              </span>
              <input
                type="checkbox"
                name="topics"
                value={topic}
                defaultChecked={topics[topic]}
                disabled={disabled}
                className="h-5 w-5 shrink-0 accent-emerald-600"
              />
            </label>
          ))}
          <SubmitButton disabled={disabled} className="w-full sm:w-auto">
            Simpan preferensi
          </SubmitButton>
        </form>

        <div className="border-t border-slate-200 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={runTest}
            disabled={disabled || pending}
            className="w-full sm:w-auto"
          >
            {pending ? "Mengirim…" : "Kirim notifikasi uji"}
          </Button>
          {testState && <p className="mt-2 text-sm text-slate-500">{testState}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
