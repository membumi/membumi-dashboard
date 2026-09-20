import Link from "next/link";
import { apiGetPaged, type PageMeta } from "@/lib/api-client";
import {
  NEBENG_CONSENT_STATUS_LABEL,
  NEBENG_EFFECTIVE_STATUS_LABEL,
  NEBENG_RELATION_LABEL,
  NEBENG_ROLE_LABEL,
  NEBENG_VEHICLE_STATUS_LABEL,
  NEBENG_VEHICLE_TYPE_LABEL,
} from "@/lib/constants";
import {
  NEBENG_QUEUE_DETAIL_BASE,
  NEBENG_QUEUE_ENDPOINT,
  NEBENG_QUEUE_SEARCH_PLACEHOLDER,
  NEBENG_QUEUE_STATUSES,
  NEBENG_QUEUE_SUPPORTS_SEARCH,
  NEBENG_QUEUE_TABS,
  resolveNebengQueue,
  resolveNebengQueueStatus,
  type NebengQueueKey,
} from "@/lib/nebeng";
import { PER_PAGE, buildListHref, parsePage } from "@/lib/pagination";
import type { NebengConsent, NebengStudent, NebengVehicle } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { ImagePreview } from "@/components/ui/image-preview";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { EmptyRow, TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { WhatsAppLink } from "@/components/ui/wa-link";
import { cn } from "@/lib/utils";
import { verifyNebengConsent, verifyNebengStudent, verifyNebengVehicle } from "@/server/actions/nebeng";

/**
 * Tiga antrean verifikasi dalam satu halaman bertab.
 *
 * Satu halaman, bukan tiga entri nav: loop harian admin adalah menyapu
 * ketiganya, dan MoNebeng tidak bisa jalan sampai ketiganya lolos untuk seorang
 * Ride Mate. Halaman detail tetap terpisah per entitas.
 *
 * Menyetujui bisa satu klik dari daftar. MENOLAK tidak — butuh daftar alasan,
 * dan fieldset lima checkbox tidak layak dijejalkan ke sel tabel. Menyetujui
 * adalah keputusan sekali lihat; menolak bukan.
 */

interface SearchParams {
  tab?: string;
  status?: string;
  q?: string;
  page?: string;
}

const STATUS_LABEL: Record<NebengQueueKey, Record<string, string>> = {
  pelajar: NEBENG_EFFECTIVE_STATUS_LABEL,
  ortu: NEBENG_CONSENT_STATUS_LABEL,
  kendaraan: NEBENG_VEHICLE_STATUS_LABEL,
};

const UNIT: Record<NebengQueueKey, string> = {
  pelajar: "pelajar",
  ortu: "pengajuan",
  kendaraan: "kendaraan",
};

function queueHref(params: {
  tab: NebengQueueKey;
  status?: string;
  q?: string;
  page?: number;
}): string {
  return buildListHref("/nebeng/verifikasi", {
    tab: params.tab === "pelajar" ? undefined : params.tab,
    status: params.status,
    q: params.q,
    page: params.page,
  });
}

export default async function NebengVerifikasiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tab = resolveNebengQueue(sp.tab);
  const status = resolveNebengQueueStatus(tab, sp.status);
  const q = sp.q?.trim() || undefined;
  const page = parsePage(sp.page);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verifikasi MoNebeng"
        description="Setujui identitas pelajar, izin orang tua, dan kendaraan Ride Mate."
      />

      <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 no-scrollbar sm:mx-0 sm:px-0">
        {NEBENG_QUEUE_TABS.map((t) => (
          <Link
            key={t.key}
            href={queueHref({ tab: t.key })}
            aria-current={t.key === tab ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              t.key === tab
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip href={queueHref({ tab, q })} label="Semua" active={!status} />
          {NEBENG_QUEUE_STATUSES[tab].map((s) => (
            <FilterChip
              key={s}
              href={queueHref({ tab, status: s, q })}
              label={STATUS_LABEL[tab][s] ?? s}
              active={status === s}
            />
          ))}
        </div>

        {NEBENG_QUEUE_SUPPORTS_SEARCH[tab] && (
          <form method="get" className="flex items-center gap-2">
            {/* Tab & status ikut sebagai hidden input supaya pencarian tidak
                diam-diam melebar ke seluruh antrean. */}
            {tab !== "pelajar" && <input type="hidden" name="tab" value={tab} />}
            {status && <input type="hidden" name="status" value={status} />}
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder={NEBENG_QUEUE_SEARCH_PLACEHOLDER[tab]}
              className="h-9 w-56"
            />
            <Button type="submit" variant="secondary" size="sm">
              Cari
            </Button>
            {q && (
              <Link
                href={queueHref({ tab, status })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Reset
              </Link>
            )}
          </form>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 p-0 sm:p-0">
          {tab === "pelajar" && <PelajarQueue status={status} q={q} page={page} />}
          {tab === "ortu" && <OrtuQueue status={status} q={q} page={page} />}
          {tab === "kendaraan" && <KendaraanQueue status={status} q={q} page={page} />}
        </CardContent>
      </Card>
    </div>
  );
}

interface QueueProps {
  status?: string;
  q?: string;
  page: number;
}

function fetchQueue<T>(queue: NebengQueueKey, { status, q, page }: QueueProps) {
  return apiGetPaged<T>(NEBENG_QUEUE_ENDPOINT[queue], {
    page,
    limit: PER_PAGE,
    ...(status ? { status } : {}),
    ...(q ? { q } : {}),
  });
}

function QueuePagination({
  tab,
  status,
  q,
  page,
  meta,
  itemsOnPage,
}: QueueProps & { tab: NebengQueueKey; meta: PageMeta | null; itemsOnPage: number }) {
  return (
    <Pagination
      page={page}
      meta={meta}
      itemsOnPage={itemsOnPage}
      perPage={PER_PAGE}
      buildHref={(p) => queueHref({ tab, status, q, page: p })}
      unit={UNIT[tab]}
      className="px-4 pb-4"
    />
  );
}

/** Satu-klik setuju. Menolak ada di halaman detail — butuh daftar alasan. */
function ApproveButton({
  action,
  id,
  status,
  studentId,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  status: string;
  studentId?: string | null;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      {studentId && <input type="hidden" name="studentId" value={studentId} />}
      <Button type="submit" size="sm">
        Verifikasi
      </Button>
    </form>
  );
}

async function PelajarQueue(props: QueueProps) {
  const { items, meta } = await fetchQueue<NebengStudent>("pelajar", props);

  return (
    <>
      <Table layout="scroll" minWidth="82rem">
        <THead>
          <TR>
            <TH>Foto</TH>
            <TH>Nama</TH>
            <TH>Peran</TH>
            <TH>Sekolah &amp; Kelas</TH>
            <TH>No. HP</TH>
            <TH>Kartu Pelajar</TH>
            <TH>Izin Ortu</TH>
            <TH>Kendaraan</TH>
            <TH>Dikirim</TH>
            <TH>Status</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {items.length === 0 && <EmptyRow colSpan={11} />}
          {items.map((s) => (
            <TR key={s.id}>
              <TD data-label="Foto">
                <ImagePreview url={s.photoUrl} label="Foto profil" />
              </TD>
              <TD data-label="Nama" className="font-medium">
                {s.fullName}
              </TD>
              <TD data-label="Peran">
                {NEBENG_ROLE_LABEL[s.isRideMate ? "RIDE_MATE" : "MONA_MATE"]}
              </TD>
              <TD data-label="Sekolah & Kelas">
                {s.school?.name ?? "—"}
                {s.classLevel ? ` · ${s.classLevel}` : ""}
              </TD>
              <TD data-label="No. HP">
                <WhatsAppLink phone={s.phone} />
              </TD>
              <TD data-label="Kartu Pelajar">
                {/* Pratinjau langsung di baris: admin mentriase dengan MELIHAT
                    kartu pelajar, bukan dengan membuka dua halaman lagi. */}
                {s.studentCardUrl ? (
                  <ImagePreview url={s.studentCardUrl} label="Kartu pelajar" />
                ) : (
                  <span className="text-slate-400">Belum diunggah</span>
                )}
              </TD>
              <TD data-label="Izin Ortu">
                {s.consent ? (
                  <StatusBadge
                    status={s.consent.status}
                    label={NEBENG_CONSENT_STATUS_LABEL[s.consent.status as never] ?? s.consent.status}
                  />
                ) : (
                  "—"
                )}
              </TD>
              <TD data-label="Kendaraan">
                {s.vehicles?.length ? (
                  <StatusBadge
                    status={s.vehicles[0].status}
                    label={
                      NEBENG_VEHICLE_STATUS_LABEL[s.vehicles[0].status as never] ??
                      s.vehicles[0].status
                    }
                  />
                ) : (
                  "—"
                )}
              </TD>
              <TD data-label="Dikirim">{formatDateTime(s.submittedAt)}</TD>
              <TD data-label="Status">
                <StatusBadge
                  status={s.effectiveStatus}
                  label={NEBENG_EFFECTIVE_STATUS_LABEL[s.effectiveStatus as never] ?? s.effectiveStatus}
                  title={s.suspensionReason ?? undefined}
                />
              </TD>
              <TD>
                <div className="flex items-center gap-1">
                  <Link
                    href={`${NEBENG_QUEUE_DETAIL_BASE.pelajar}/${s.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Detail
                  </Link>
                  {s.effectiveStatus === "PENDING" && (
                    <ApproveButton action={verifyNebengStudent} id={s.id} status="VERIFIED" />
                  )}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <QueuePagination {...props} tab="pelajar" meta={meta} itemsOnPage={items.length} />
    </>
  );
}

async function OrtuQueue(props: QueueProps) {
  const { items, meta } = await fetchQueue<NebengConsent>("ortu", props);

  return (
    <>
      <Table layout="scroll" minWidth="76rem">
        <THead>
          <TR>
            <TH>Pelajar</TH>
            <TH>Sekolah</TH>
            <TH>Nama Ortu / Wali</TH>
            <TH>Hubungan</TH>
            <TH>WhatsApp</TH>
            <TH>Surat Izin</TH>
            <TH>Status</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {items.length === 0 && <EmptyRow colSpan={8} />}
          {items.map((c) => (
            <TR key={c.id}>
              <TD data-label="Pelajar" className="font-medium">
                {c.student?.name ?? "—"}
              </TD>
              <TD data-label="Sekolah">
                {c.student?.schoolName ?? "—"}
                {c.student?.classLevel ? ` · ${c.student.classLevel}` : ""}
              </TD>
              <TD data-label="Nama Ortu / Wali">{c.parentName}</TD>
              <TD data-label="Hubungan">
                {NEBENG_RELATION_LABEL[c.relation as never] ?? c.relation}
              </TD>
              <TD data-label="WhatsApp">
                <WhatsAppLink phone={c.parentWa ?? ""} />
              </TD>
              <TD data-label="Surat Izin">
                <ConsentDocument url={c.letterUrl} />
              </TD>
              <TD data-label="Status">
                <StatusBadge
                  status={c.status}
                  label={NEBENG_CONSENT_STATUS_LABEL[c.status as never] ?? c.status}
                  title={c.rejectionReason ?? undefined}
                />
              </TD>
              <TD>
                <div className="flex items-center gap-1">
                  <Link
                    href={`${NEBENG_QUEUE_DETAIL_BASE.ortu}/${c.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Detail
                  </Link>
                  {c.status === "PENDING" && (
                    <ApproveButton
                      action={verifyNebengConsent}
                      id={c.id}
                      status="APPROVED"
                      studentId={c.student?.id}
                    />
                  )}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <QueuePagination {...props} tab="ortu" meta={meta} itemsOnPage={items.length} />
    </>
  );
}

async function KendaraanQueue(props: QueueProps) {
  const { items, meta } = await fetchQueue<NebengVehicle & { student?: { id: string; name: string } }>(
    "kendaraan",
    props,
  );

  return (
    <>
      <Table layout="scroll" minWidth="76rem">
        <THead>
          <TR>
            <TH>Nopol</TH>
            <TH>Jenis</TH>
            <TH>Merk / Tipe / Tahun</TH>
            <TH>STNK</TH>
            <TH>Foto Kendaraan</TH>
            <TH>Status</TH>
            <TH>Aksi</TH>
          </TR>
        </THead>
        <TBody>
          {items.length === 0 && <EmptyRow colSpan={7} />}
          {items.map((v) => (
            <TR key={v.id}>
              <TD data-label="Nopol" className="font-mono font-medium">
                {v.plateNumber}
              </TD>
              <TD data-label="Jenis">
                {NEBENG_VEHICLE_TYPE_LABEL[v.type as never] ?? v.type}
              </TD>
              <TD data-label="Merk / Tipe / Tahun">
                {v.brand} {v.model} ({v.year})
              </TD>
              <TD data-label="STNK">
                <ImagePreview url={v.stnkPhotoUrl} label="Foto STNK" />
              </TD>
              <TD data-label="Foto Kendaraan">
                <ImagePreview url={v.vehiclePhotoUrl} label="Foto kendaraan" />
              </TD>
              <TD data-label="Status">
                <StatusBadge
                  status={v.status}
                  label={NEBENG_VEHICLE_STATUS_LABEL[v.status as never] ?? v.status}
                  title={v.rejectionReason ?? undefined}
                />
              </TD>
              <TD>
                <div className="flex items-center gap-1">
                  <Link
                    href={`${NEBENG_QUEUE_DETAIL_BASE.kendaraan}/${v.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Detail
                  </Link>
                  {v.status === "PENDING" && (
                    <ApproveButton action={verifyNebengVehicle} id={v.id} status="VERIFIED" />
                  )}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <QueuePagination {...props} tab="kendaraan" meta={meta} itemsOnPage={items.length} />
    </>
  );
}

/**
 * Surat izin bisa berupa foto ATAU PDF.
 *
 * Dashboard tidak pernah mencoba menyisipkan PDF sebagai gambar — itu
 * menghasilkan kotak rusak, dan seorang admin akan mengira suratnya tidak
 * terunggah.
 */
function ConsentDocument({ url }: { url?: string | null }) {
  if (!url) return <span className="text-slate-400">Belum diunggah</span>;
  const isPdf = /\.pdf(\?|$)/i.test(url);
  if (isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Buka PDF
      </a>
    );
  }
  return <ImagePreview url={url} label="Surat izin orang tua" />;
}
