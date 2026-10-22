"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type QueueEntry = { queueNumber: number; appointmentId: number; scheduledAt: string; status: "Scheduled" };
type QueueState = { currentAppointmentId: number | null; entries: QueueEntry[] };

function getTodayRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function QueuePrintPage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(getTodayRange, []);
  const query = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;

  const refresh = useCallback(async () => {
    try {
      const state = await apiGet<QueueState>(`/api/clinic/queue-control?${query}`);
      setEntries(state.entries);
      setSelectedIds(state.entries.map((entry) => entry.appointmentId));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data antrean tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void refresh(); }, [refresh]);

  const selectedEntries = entries.filter((entry) => selectedIds.includes(entry.appointmentId));
  const dateLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  function toggleEntry(id: number) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function printSingle(id: number) {
    setSelectedIds([id]);
    window.setTimeout(() => window.print(), 0);
  }

  return <main className="queue-print-shell min-h-screen bg-slate-50 px-5 py-6 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="queue-print-toolbar mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Dental Care</p><h1 className="mt-2 text-2xl font-bold">Cetak Nomor Antrean</h1><p className="mt-1 text-sm text-slate-500">Format printer thermal 80 mm. Pilih nomor yang akan dicetak; nama pasien tidak dicantumkan.</p></div>
        <div className="flex gap-2"><Link href="/queue" className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Kembali ke antrean</Link><button type="button" disabled={loading || selectedEntries.length === 0} onClick={() => window.print()} className="inline-flex h-10 items-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">Cetak {selectedEntries.length} nomor</button></div>
      </header>

      {error && <p role="alert" className="queue-print-toolbar mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}

      <section className="queue-print-toolbar mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span>{loading ? "Memuat antrean..." : `${selectedEntries.length} dari ${entries.length} nomor dipilih`}</span>
        <button type="button" onClick={() => setSelectedIds(selectedIds.length === entries.length ? [] : entries.map((entry) => entry.appointmentId))} disabled={loading || entries.length === 0} className="font-semibold text-teal-800 hover:text-teal-950">{selectedIds.length === entries.length ? "Hapus semua pilihan" : "Pilih semua"}</button>
      </section>

      {error ? null : loading ? <p className="rounded-xl bg-white p-8 text-center text-slate-500">Memuat antrean...</p> : entries.length === 0 ? <p className="rounded-xl bg-white p-8 text-center text-slate-500">Belum ada antrean hari ini.</p> : <section className="queue-print-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const selected = selectedIds.includes(entry.appointmentId);
          return <article key={entry.appointmentId} className={`queue-ticket relative rounded-xl border border-dashed border-teal-700 bg-white p-4 text-center shadow-sm ${selected ? "" : "queue-ticket-unselected"}`}>
            <div className="queue-ticket-toolbar absolute right-3 top-3 flex items-center gap-2"><label className="queue-ticket-checkbox inline-flex items-center gap-2 text-xs font-medium text-slate-500"><input type="checkbox" checked={selected} onChange={() => toggleEntry(entry.appointmentId)} className="size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" /> Pilih</label><button type="button" onClick={() => printSingle(entry.appointmentId)} className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800">Cetak</button></div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">Dental Care</p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Nomor Antrean</p>
            <p className="my-2 text-4xl font-bold leading-none tabular-nums tracking-tight text-slate-900">{String(entry.queueNumber).padStart(3, "0")}</p>
            <div className="mx-auto my-3 h-px w-2/3 bg-teal-100" />
            <p className="text-sm font-semibold text-slate-800">{formatTime(entry.scheduledAt)}</p>
            <p className="mt-1 text-xs capitalize text-slate-500">{dateLabel}</p>
            <p className="mt-4 text-xs text-slate-400">Mohon tunggu hingga nomor dipanggil</p>
          </article>;
        })}
      </section>}
    </div>
    <style>{`@page { size: 80mm auto; margin: 0; } @media print { html, body { width: 80mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; } body * { visibility: hidden !important; } .queue-print-shell, .queue-print-shell * { visibility: visible !important; } .queue-print-shell { position: static !important; inset: auto !important; z-index: auto !important; width: 80mm !important; min-height: 0 !important; padding: 0 !important; background: #fff !important; } .queue-print-toolbar, .queue-ticket-toolbar, .queue-ticket-checkbox, .queue-ticket-unselected { display: none !important; } .queue-print-grid { display: block !important; } .queue-ticket { box-sizing: border-box !important; width: 72mm !important; min-height: 0 !important; margin: 0 auto !important; padding: 4mm 3mm !important; border: 0 !important; border-bottom: 1px dashed #111 !important; border-radius: 0 !important; break-inside: avoid !important; page-break-inside: avoid !important; box-shadow: none !important; } .queue-ticket:not(:last-child) { break-after: page !important; page-break-after: always !important; } .queue-ticket > p:nth-of-type(1) { font-size: 11pt !important; letter-spacing: .16em !important; color: #000 !important; } .queue-ticket > p:nth-of-type(2) { margin-top: 3mm !important; font-size: 9pt !important; color: #000 !important; } .queue-ticket > p:nth-of-type(3) { margin: 3mm 0 !important; font-size: 40pt !important; line-height: 1 !important; color: #000 !important; } .queue-ticket > p:nth-of-type(4) { font-size: 12pt !important; color: #000 !important; } .queue-ticket > p:nth-of-type(5) { font-size: 8pt !important; color: #333 !important; } .queue-ticket > p:last-child { margin-top: 4mm !important; font-size: 8pt !important; color: #333 !important; } }`}</style>
  </main>;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
