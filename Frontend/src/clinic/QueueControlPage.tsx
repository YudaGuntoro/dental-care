"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPut } from "@/lib/api";

type QueueEntry = { queueNumber: number; appointmentId: number; scheduledAt: string; status: "Scheduled" };
type QueueState = { currentAppointmentId: number | null; entries: QueueEntry[] };

function getTodayRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function QueueControlPage() {
  const [queue, setQueue] = useState<QueueState>({ currentAppointmentId: null, entries: [] });
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<"screen" | "kiosk" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const range = useMemo(getTodayRange, []);
  const query = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;

  const refresh = useCallback(async () => {
    try {
      const state = await apiGet<QueueState>(`/api/clinic/queue-control?${query}`);
      setQueue(state);
      setSelectedId((selected) => selected || state.currentAppointmentId?.toString() || "");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data antrean tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const currentIndex = queue.entries.findIndex((item) => item.appointmentId === queue.currentAppointmentId);
  const current = currentIndex >= 0 ? queue.entries[currentIndex] : undefined;
  const selected = queue.entries.find((item) => item.appointmentId === Number(selectedId));

  async function callNumber(appointmentId: number | null) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiPut(`/api/clinic/queue-control?${query}`, { appointmentId });
      setSelectedId(appointmentId?.toString() || "");
      await refresh();
      if (appointmentId === null) setNotice("Panggilan antrean dihentikan.");
      else setNotice(`Nomor ${String(queue.entries.find((item) => item.appointmentId === appointmentId)?.queueNumber || "").padStart(3, "0")} sedang dipanggil.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nomor antrean tidak dapat dipanggil.");
    } finally {
      setSaving(false);
    }
  }

  function callNext(direction: -1 | 1) {
    const nextIndex = currentIndex < 0 ? 0 : currentIndex + direction;
    const entry = queue.entries[nextIndex];
    if (entry) void callNumber(entry.appointmentId);
  }

  async function copyPublicUrl(page: "screen" | "kiosk") {
    const url = `${window.location.origin}/${page === "screen" ? "layar-antrean" : "kiosk-antrean"}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setCopied(page);
      window.setTimeout(() => setCopied(null), 2200);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const success = document.execCommand("copy");
      input.remove();
      setCopied(success ? page : null);
      window.setTimeout(() => setCopied(null), 2200);
    }
  }

  return <div className="min-w-0 space-y-4 sm:space-y-6">
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Dental Care</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Kelola Antrean</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Ikuti langkah berikut untuk memanggil nomor dan menyiapkan antrean di ruang tunggu.</p>
    </header>

    {(error || notice) && <p role={error ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || notice}</p>}

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="mb-5 flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">1</span><div><h2 className="font-bold text-slate-900 dark:text-white">Atur panggilan</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Panggil nomor selanjutnya, kembali ke nomor sebelumnya, atau pilih nomor yang terlewat.</p></div></div>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nomor yang sedang dipanggil</p><p className="mt-1 text-5xl font-bold tabular-nums tracking-tight text-teal-800 dark:text-teal-300">{current ? String(current.queueNumber).padStart(2, "0") : "—"}</p>{current && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Jadwal {formatTime(current.scheduledAt)}</p>}</div>
        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <button type="button" disabled={loading || saving || currentIndex <= 0} onClick={() => callNext(-1)} className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 sm:w-auto">Panggil nomor sebelumnya</button>
          <button type="button" disabled={loading || saving || currentIndex >= queue.entries.length - 1} onClick={() => callNext(1)} className="min-h-11 w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">Panggil nomor selanjutnya</button>
          <button type="button" disabled={saving || !current} onClick={() => void callNumber(null)} className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 sm:w-auto">Hentikan panggilan</button>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center">
        <label htmlFor="queue-number-select" className="w-full text-sm font-medium text-slate-700 dark:text-slate-300 sm:w-auto">Pilih nomor antrean</label>
        <select id="queue-number-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={loading || queue.entries.length === 0} className="h-11 min-w-0 w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-teal-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:min-w-64 sm:w-auto">
          <option value="">Pilih nomor</option>
          {queue.entries.map((entry) => <option key={entry.appointmentId} value={entry.appointmentId}>Nomor {String(entry.queueNumber).padStart(2, "0")} · {formatTime(entry.scheduledAt)}</option>)}
        </select>
        <button type="button" disabled={saving || !selected} onClick={() => selected && void callNumber(selected.appointmentId)} className="h-11 w-full rounded-xl border border-teal-700 px-4 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-teal-300 sm:w-auto">Panggil nomor terpilih</button>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="mb-4 flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">2</span><div><h2 className="font-bold text-slate-900 dark:text-white">Tampilkan antrean di layar</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pilih halaman, lalu salin alamatnya untuk dibuka di komputer kiosk.</p></div></div>
      <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="font-semibold text-slate-900 dark:text-white">Layar panggilan</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Menampilkan nomor yang dipanggil dan antrean berikutnya.</p><div className="mt-4 grid gap-2 sm:flex sm:flex-wrap"><Link href="/layar-antrean" target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 sm:w-auto">Buka halaman</Link><Link href="/layar-antrean/contoh" target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 sm:w-auto">Lihat data contoh</Link><button type="button" onClick={() => void copyPublicUrl("screen")} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-teal-700 px-4 py-2 text-center text-sm font-semibold text-teal-800 hover:bg-teal-50 dark:text-teal-300 sm:w-auto">{copied === "screen" ? "Alamat disalin" : "Salin alamat halaman"}</button></div></div>
        <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="font-semibold text-slate-900 dark:text-white">Halaman cetak antrean</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Menampilkan daftar nomor dan bisa dicetak dari kiosk.</p><div className="mt-4 grid gap-2 sm:flex sm:flex-wrap"><Link href="/kiosk-antrean" target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 sm:w-auto">Buka halaman</Link><button type="button" onClick={() => void copyPublicUrl("kiosk")} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800 sm:w-auto">{copied === "kiosk" ? "Alamat disalin" : "Salin alamat halaman"}</button></div></div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">3</span><div><h2 className="font-bold text-slate-900 dark:text-white">Cetak tiket antrean</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cetak nomor untuk diberikan kepada pasien.</p></div></div><Link href="/queue/print" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-teal-800 sm:w-auto">Buka halaman cetak tiket</Link></div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-white">Daftar antrean hari ini</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pilih “Panggil ulang” pada nomor yang terlewat.</p></div>
      <div className="space-y-3 p-3 sm:hidden">{loading ? <p className="py-5 text-center text-sm text-slate-500 dark:text-slate-400">Memuat antrean...</p> : queue.entries.length === 0 ? <p className="py-5 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada antrean hari ini.</p> : queue.entries.map((entry) => { const isCurrent = entry.appointmentId === queue.currentAppointmentId; return <article key={entry.appointmentId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="min-w-0"><p className="font-bold text-slate-900 dark:text-white">Nomor {String(entry.queueNumber).padStart(2, "0")}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatTime(entry.scheduledAt)} · {isCurrent ? "Sedang dipanggil" : "Menunggu"}</p></div><button type="button" disabled={saving || isCurrent} onClick={() => void callNumber(entry.appointmentId)} className="min-h-10 shrink-0 rounded-lg px-3 text-xs font-semibold text-teal-800 hover:bg-teal-50 disabled:cursor-default disabled:text-slate-400 dark:text-teal-300">{isCurrent ? "Dipanggil" : "Panggil ulang"}</button></article>; })}</div>
      <div className="hidden overflow-x-auto sm:block"><table className="w-full text-left text-sm"><thead className="bg-teal-700 text-xs uppercase tracking-wide text-white"><tr><th className="px-4 py-3">Nomor</th><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Memuat antrean...</td></tr> : queue.entries.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Belum ada antrean hari ini.</td></tr> : queue.entries.map((entry) => {
          const isCurrent = entry.appointmentId === queue.currentAppointmentId;
          return <tr key={entry.appointmentId} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Nomor {String(entry.queueNumber).padStart(2, "0")}</td><td className="px-4 py-3">{formatTime(entry.scheduledAt)}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${isCurrent ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-700"}`}>{isCurrent ? "Sedang dipanggil" : "Menunggu"}</span></td><td className="px-4 py-3 text-center"><button type="button" disabled={saving || isCurrent} onClick={() => void callNumber(entry.appointmentId)} className="rounded-lg px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 disabled:cursor-default disabled:text-slate-400 dark:text-teal-300">{isCurrent ? "Sedang dipanggil" : "Panggil ulang"}</button></td></tr>;
        })}
      </tbody></table></div>
    </section>
  </div>;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
