"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { liftNebengSuspension, suspendNebengStudent } from "@/server/actions/nebeng";

/**
 * Menangguhkan / mencabut penangguhan.
 *
 * Client component karena dua nilai bebas (alasan, lalu tanggal opsional) dan
 * tindakannya destruktif dan jarang — sebuah kartu berisi input permanen di
 * setiap halaman pelajar hanya jadi kebisingan. Pola yang sama dengan
 * `topup/review-actions.tsx`.
 */
export function SuspensionActions({ id, isSuspended }: { id: string; isSuspended: boolean }) {
  const [pending, start] = useTransition();

  function suspend() {
    const reason = window.prompt("Alasan penangguhan (wajib):");
    if (!reason?.trim()) return;
    const until = window.prompt(
      "Tanggal berakhir (YYYY-MM-DD). Kosongkan untuk penangguhan PERMANEN:",
      "",
    );
    if (until === null) return;
    if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
      window.alert("Format tanggal harus YYYY-MM-DD.");
      return;
    }
    if (
      !until &&
      !window.confirm("Tanpa tanggal berarti penangguhan PERMANEN. Lanjutkan?")
    ) {
      return;
    }

    const fd = new FormData();
    fd.set("id", id);
    fd.set("reason", reason);
    fd.set("until", until);
    start(() => void suspendNebengStudent(fd));
  }

  function lift() {
    if (!window.confirm("Cabut penangguhan siswa ini?")) return;
    const fd = new FormData();
    fd.set("id", id);
    start(() => void liftNebengSuspension(fd));
  }

  return isSuspended ? (
    <Button variant="outline" size="sm" disabled={pending} onClick={lift} className="w-full">
      {pending ? "Memproses…" : "Cabut Penangguhan"}
    </Button>
  ) : (
    <Button variant="destructive" size="sm" disabled={pending} onClick={suspend} className="w-full">
      {pending ? "Memproses…" : "Tangguhkan Akun"}
    </Button>
  );
}
