import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PushEnableButton } from "@/components/push-enable-button";
import { pushPreferences, pushPublicKey } from "@/server/queries";
import { NotificationSettingsForm } from "./notification-settings-form";

export const dynamic = "force-dynamic";

export default async function NotifikasiPage() {
  const [vapidKey, prefs] = await Promise.all([pushPublicKey(), pushPreferences()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifikasi"
        description="Terima pemberitahuan pesanan & antrean baru, bahkan saat dashboard ditutup."
      />

      <Card>
        <CardHeader>
          <CardTitle>Perangkat ini</CardTitle>
          <CardDescription>
            Notifikasi dikirim per browser. Aktifkan di setiap perangkat yang Anda pakai.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vapidKey ? (
            <PushEnableButton vapidKey={vapidKey} variant="full" />
          ) : (
            <p className="text-sm text-slate-500">
              Web push belum dikonfigurasi di server. Hubungi tim backend untuk mengisi kunci VAPID.
            </p>
          )}
        </CardContent>
      </Card>

      <NotificationSettingsForm topics={prefs.topics} disabled={!vapidKey} />
    </div>
  );
}
