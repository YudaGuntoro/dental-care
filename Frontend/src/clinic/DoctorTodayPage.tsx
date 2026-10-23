"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type Appointment = { id: number; patientId: number; patient_name: string; doctor_name?: string; treatment_name?: string; scheduledAt: string; status: string };

function todayRange() {
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(from); to.setDate(to.getDate() + 1);
  return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
}

export default function DoctorTodayPage() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()), []);

  useEffect(() => {
    void apiGet<Appointment[]>(`/api/clinic/appointments?${todayRange()}`)
      .then((data) => setRows(data ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Jadwal dokter tidak dapat dimuat."))
      .finally(() => setLoading(false));
  }, []);

  return <div className="min-w-0 space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">Ruang Dokter</p><h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Jadwal Kunjungan Hari Ini</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{dateLabel} · Buka nama pasien untuk mengisi hasil pemeriksaan.</p></header>{error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-white">Daftar pasien hari ini</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Petugas menjadwalkan kunjungan, dokter melengkapi rekam medis setelah pemeriksaan.</p></div>{loading ? <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Memuat jadwal...</p> : rows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada kunjungan untuk hari ini.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-teal-700 text-xs uppercase tracking-wide text-white"><tr><th className="px-5 py-3">Jam</th><th className="px-5 py-3">Pasien</th><th className="px-5 py-3">Perawatan</th><th className="px-5 py-3">Dokter</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-center">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="whitespace-nowrap px-5 py-4 font-semibold">{new Date(row.scheduledAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td><td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{row.patient_name}</td><td className="px-5 py-4">{row.treatment_name || "Belum ditentukan"}</td><td className="px-5 py-4">{row.doctor_name || "Belum dipilih"}</td><td className="px-5 py-4"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{row.status === "Completed" ? "Selesai" : row.status === "InProgress" ? "Sedang diperiksa" : "Menunggu"}</span></td><td className="px-5 py-4 text-center"><Link href={`/patients/${row.patientId}/record`} className="font-semibold text-teal-700 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200">Buka pemeriksaan</Link></td></tr>)}</tbody></table></div>}</section></div>;
}
