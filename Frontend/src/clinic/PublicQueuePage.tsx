"use client";

import { useCallback, useEffect, useState } from "react";

type QueueEntry = {
  queueNumber: number;
  scheduledAt: string;
  status: "Scheduled" | "Completed";
  isCurrent: boolean;
};
type QueueResponse = { success: boolean; data: QueueEntry[]; message?: string };

function getTodayRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function createDemoEntries(startedAt: Date): QueueEntry[] {
  return Array.from({ length: 8 }, (_, index) => ({
    queueNumber: index + 1,
    scheduledAt: new Date(startedAt.getTime() + (index - 2) * 5 * 60_000).toISOString(),
    status: index < 2 ? "Completed" as const : "Scheduled" as const,
    isCurrent: index === 2,
  }));
}

export default function PublicQueuePage({ kioskPrint = false, forceDemo = false }: { kioskPrint?: boolean; forceDemo?: boolean }) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);

  const refresh = useCallback(async () => {
    const range = getTodayRange();
    try {
      const response = await fetch(`/api/clinic/public-queue?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, { cache: "no-store" });
      const body = await response.json() as QueueResponse;
      if (!response.ok || !body.success) throw new Error(body.message || "Data antrean tidak dapat dimuat.");
      setEntries(body.data || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data antrean tidak dapat dimuat.");
    }
  }, []);

  useEffect(() => {
    const startedAt = new Date();
    setNow(startedAt);
    const demo = forceDemo || new URLSearchParams(window.location.search).get("demo") === "1";
    setDemoMode(demo);
    if (demo) setEntries(createDemoEntries(startedAt));
    else void refresh();
    const clockTimer = window.setInterval(() => setNow(new Date()), 1000);
    const refreshTimer = demo ? null : window.setInterval(() => void refresh(), 8000);
    return () => { window.clearInterval(clockTimer); if (refreshTimer) window.clearInterval(refreshTimer); };
  }, [forceDemo, refresh]);

  const current = entries.find((entry) => entry.isCurrent && entry.status === "Scheduled");
  const waiting = entries.filter((entry) => entry.status === "Scheduled" && !entry.isCurrent && (!current || entry.queueNumber > current!.queueNumber));
  const completed = entries.filter((entry) => entry.status === "Completed");
  const dateLabel = now ? new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now) : "";

  if (!kioskPrint) {
    return <QueueMonitor
      current={current}
      waiting={waiting}
      dateLabel={dateLabel}
      timeLabel={now ? now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
      error={error}
      demoMode={demoMode}
    />;
  }

  return <KioskTicket
    current={current}
    next={waiting[0]}
    waitingCount={waiting.length + (current ? 1 : 0)}
    dateLabel={dateLabel}
    timeLabel={now ? now!.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
    error={error}
    demoMode={demoMode}
  />;

  return (
    <main className={`min-h-screen bg-slate-50 px-5 py-6 text-slate-900 sm:px-8 lg:px-12 lg:py-9 ${kioskPrint ? "kiosk-print-page" : ""}`}>
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-8 flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">Dental Care</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{kioskPrint ? "Cetak Antrean Klinik" : "Antrean Klinik"}</h1><p className="mt-2 text-sm text-slate-500">Silakan perhatikan nomor antrean Anda</p></div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end"><div className="sm:text-right"><p className="text-sm font-medium capitalize text-slate-500">{dateLabel}</p><time className="mt-1 block font-mono text-3xl font-semibold tabular-nums tracking-tight text-slate-800 sm:text-4xl">{now ? now!.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}</time></div>{kioskPrint && <button type="button" onClick={() => window.print()} className="kiosk-print-toolbar inline-flex h-10 items-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">Cetak daftar antrean</button>}</div>
        </header>

        {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-white p-5 text-sm text-rose-700">{error}</p> : <>
          <section className="mb-6 flex flex-col items-center justify-center rounded-2xl bg-teal-800 px-6 py-8 text-center text-white sm:min-h-64 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-100">{current ? "Nomor dipanggil" : "Sedang menunggu panggilan"}</p>
            <p className="mt-2 text-6xl font-bold tabular-nums tracking-tight sm:text-8xl">{current ? String(current!.queueNumber).padStart(2, "0") : "—"}</p>
            <p className="mt-3 text-sm text-teal-50 sm:text-base">{current ? "Silakan menuju ruang pemeriksaan" : "Mohon menunggu, antrean akan segera dimulai"}</p>
          </section>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <Metric title="Menunggu" value={waiting.length + (current ? 1 : 0)} tone="teal" />
            <Metric title="Selesai hari ini" value={completed.length} tone="slate" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <QueueList title="Antrean Berikutnya" entries={waiting} emptyMessage="Tidak ada antrean berikutnya." />
            <QueueList title="Selesai Hari Ini" entries={completed} emptyMessage="Belum ada antrean yang selesai." completed />
          </div>
        </>}
        <footer className="mt-8 text-center text-xs text-slate-400">Nomor antrean diperbarui otomatis</footer>
      </div>
      {kioskPrint && <style>{`@page { size: A4 portrait; margin: 12mm; } @media print { body { background: #fff !important; } body * { visibility: hidden !important; } .kiosk-print-page, .kiosk-print-page * { visibility: visible !important; } .kiosk-print-page { position: fixed !important; inset: 0 !important; min-height: 0 !important; padding: 0 !important; background: #fff !important; } .kiosk-print-toolbar { display: none !important; } }`}</style>}
    </main>
  );
}

function KioskTicket({ current, next, waitingCount, dateLabel, timeLabel, error, demoMode }: {
  current?: QueueEntry;
  next?: QueueEntry;
  waitingCount: number;
  dateLabel: string;
  timeLabel: string;
  error: string;
  demoMode: boolean;
}) {
  const ticket = next || current;
  return <main className="kiosk-ticket-page flex min-h-screen items-center justify-center bg-[#eef5f6] p-4 text-slate-900 sm:p-8">
    <section className="kiosk-ticket-card w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <header className="flex items-center justify-between gap-4 bg-teal-800 px-6 py-5 text-white sm:px-10 sm:py-7"><div className="flex items-center gap-3"><img src="/dental-care-logo.png" alt="Dental Care" className="size-12 rounded-xl object-contain sm:size-16" /><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-teal-100 sm:text-xs">Dental Care</p><h1 className="mt-1 text-lg font-black sm:text-2xl">Klinik Gigi</h1></div></div><div className="text-right"><p className="text-xs capitalize text-teal-100">{dateLabel}</p><time className="mt-1 block font-mono text-lg font-bold tabular-nums sm:text-2xl">{timeLabel}</time></div></header>
      {error ? <div role="alert" className="p-8 text-center text-sm text-rose-700">Data antrean belum dapat dimuat.</div> : <div className="px-6 py-8 text-center sm:px-12 sm:py-12"><p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">Silakan ambil nomor antrean</p><h2 className="mt-3 text-xl font-black text-slate-900 sm:text-3xl">Tekan tombol di bawah untuk mencetak</h2><div className="mx-auto mt-8 flex max-w-md flex-col items-center rounded-3xl border-2 border-teal-100 bg-teal-50/60 px-6 py-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Nomor antrean berikutnya</p><p className="mt-3 font-black leading-none tabular-nums tracking-tight text-teal-800" style={{ fontSize: "clamp(5rem, 18vw, 9rem)" }}>{ticket ? String(ticket.queueNumber).padStart(3, "0") : "—"}</p><p className="mt-3 text-sm font-medium text-slate-500">{ticket ? `Perkiraan pelayanan pukul ${new Date(ticket.scheduledAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Belum ada antrean tersedia"}</p></div><button type="button" disabled={!ticket} onClick={() => window.print()} className="kiosk-ticket-action mt-8 inline-flex min-h-14 w-full max-w-md items-center justify-center rounded-2xl bg-teal-700 px-6 text-lg font-bold text-white shadow-lg shadow-teal-700/20 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">Cetak Nomor Antrean</button><div className="mt-6 flex items-center justify-center gap-3 text-sm text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold">{waitingCount} menunggu</span>{demoMode && <span className="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-800">Data contoh</span>}</div><p className="mt-7 text-xs text-slate-400">Simpan tiket Anda dan tunggu nomor dipanggil di ruang tunggu.</p></div>}
    </section>
    <style>{`@media print { @page { size: 80mm auto; margin: 0; } html, body { width: 80mm !important; margin: 0 !important; background: #fff !important; } .kiosk-ticket-page { width: 80mm !important; min-height: 0 !important; padding: 0 !important; background: #fff !important; } .kiosk-ticket-card { width: 72mm !important; margin: 0 auto !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; } .kiosk-ticket-card > header { padding: 4mm 3mm !important; } .kiosk-ticket-card > header img { display: none !important; } .kiosk-ticket-card > header h1 { font-size: 13pt !important; } .kiosk-ticket-card > header p, .kiosk-ticket-card > header time { font-size: 8pt !important; } .kiosk-ticket-card > div { padding: 5mm 3mm !important; } .kiosk-ticket-card h2 { font-size: 10pt !important; } .kiosk-ticket-card > div > div { margin-top: 4mm !important; padding: 4mm 2mm !important; border: 0 !important; background: #fff !important; } .kiosk-ticket-card > div > div > p:nth-of-type(2) { font-size: 42pt !important; color: #000 !important; } .kiosk-ticket-action, .kiosk-ticket-card .mt-6, .kiosk-ticket-card .mt-7 { display: none !important; } }`}</style>
  </main>;
}

function QueueMonitor({ current, waiting, dateLabel, timeLabel, error, demoMode }: {
  current?: QueueEntry;
  waiting: QueueEntry[];
  dateLabel: string;
  timeLabel: string;
  error: string;
  demoMode: boolean;
}) {
  return <main className="flex min-h-screen min-w-0 flex-col bg-[#f3f7f8] px-3 py-4 text-slate-900 sm:px-8 sm:py-5 lg:h-screen lg:overflow-hidden lg:px-10 lg:py-7">
    <header className="mx-auto mb-4 grid w-full max-w-[1600px] grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 border-b border-slate-200 pb-4 sm:mb-6 sm:flex sm:justify-between sm:gap-5 sm:pb-5">
      <div className="flex min-w-0 items-center gap-3"><img src="/dental-care-logo.png" alt="Dental Care" className="size-12 shrink-0 object-contain sm:size-14"/><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Dental Care</p><p className="truncate text-sm font-semibold text-slate-700 sm:text-base">Klinik Gigi</p></div></div>
      <div className="col-span-2 row-start-2 text-center sm:col-span-1 sm:row-auto"><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 sm:text-sm">Panggilan Antrean</p><h1 className="mt-1 text-lg font-bold text-slate-900 sm:text-2xl">Silakan perhatikan nomor Anda</h1>{demoMode && <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Pratinjau data contoh</span>}</div>
      <div className="shrink-0 text-right"><p className="text-xs font-medium capitalize text-slate-500 sm:text-sm">{dateLabel}</p><time className="font-mono text-xl font-bold tabular-nums tracking-tight text-slate-800 sm:text-3xl">{timeLabel}</time></div>
    </header>

    {error ? <div role="alert" className="mx-auto w-full max-w-[1600px] rounded-2xl border border-rose-200 bg-white p-6 text-center font-medium text-rose-700">Layar antrean belum dapat memuat data. Mencoba kembali secara otomatis...</div> : <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-5 lg:min-h-0 lg:grid-cols-[1.12fr_0.88fr] lg:gap-7">
      <section className="flex min-h-[380px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
        <div className="flex items-center justify-center bg-teal-700 px-5 py-4 text-center text-base font-bold uppercase tracking-[0.12em] text-white sm:text-lg">Nomor antrean dipanggil</div>
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 sm:text-sm">Nomor antrean</p>
          {current ? <p aria-live="polite" className="my-3 font-black leading-none tabular-nums tracking-tight text-slate-900" style={{ fontSize: "clamp(7rem, 20vw, 15rem)" }}>{String(current!.queueNumber).padStart(3, "0")}</p> : <p aria-live="polite" className="my-8 text-3xl font-bold text-slate-300 sm:text-5xl">Belum dipanggil</p>}
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold sm:text-base ${current ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}><span className={`size-2.5 rounded-full ${current ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} />{current ? "Silakan menuju ruang pemeriksaan" : "Menunggu panggilan berikutnya"}</div>
        </div>
      </section>

      <section className="flex min-h-[340px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Antrean selanjutnya</p><h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Harap bersiap</h2></div><span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold tabular-nums text-teal-800 sm:text-sm">{waiting.length} menunggu</span></header>
        <div className="flex-1 divide-y divide-slate-100 overflow-hidden px-5 sm:px-7">{waiting.length === 0 ? <div className="flex h-full min-h-48 items-center justify-center text-center text-slate-500">Belum ada nomor berikutnya.</div> : waiting.slice(0, 6).map((entry, index) => <div key={entry.queueNumber} className={`flex items-center justify-between gap-4 py-4 sm:py-5 ${index === 0 ? "" : "opacity-80"}`}><div className="flex items-center gap-4"><span className={`flex size-12 items-center justify-center rounded-2xl text-lg font-extrabold tabular-nums sm:size-14 sm:text-xl ${index === 0 ? "bg-teal-700 text-white" : "bg-teal-50 text-teal-800"}`}>{String(entry.queueNumber).padStart(3, "0")}</span><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{index === 0 ? "Berikutnya" : `Urutan ${index + 1}`}</p><p className="mt-1 text-sm font-semibold text-slate-800 sm:text-base">Pukul {new Date(entry.scheduledAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p></div></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Menunggu</span></div>)}</div>
        {waiting.length > 6 && <footer className="border-t border-slate-100 px-7 py-3 text-center text-xs font-medium text-slate-500">+{waiting.length - 6} nomor antrean lainnya</footer>}
      </section>
    </div>}

    <footer className="mx-auto mt-5 flex w-full max-w-[1600px] items-center justify-center gap-2 text-xs font-medium text-slate-400"><span className="size-2 rounded-full bg-emerald-500" />Nomor antrean diperbarui otomatis</footer>
  </main>;
}

function Metric({ title, value, tone }: { title: string; value: number; tone: "teal" | "slate" }) {
  return <section className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${tone === "teal" ? "border-teal-100" : "border-slate-200"}`}><p className="text-sm font-medium text-slate-500">{title}</p><p className={`mt-2 text-4xl font-bold tabular-nums ${tone === "teal" ? "text-teal-800" : "text-slate-800"}`}>{value}</p></section>;
}

function QueueList({ title, entries, emptyMessage, completed = false }: { title: string; entries: QueueEntry[]; emptyMessage: string; completed?: boolean }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">{title}</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${completed ? "bg-slate-100 text-slate-600" : "bg-teal-50 text-teal-800"}`}>{entries.length} antrean</span></div>
    {entries.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-400">{emptyMessage}</p> : <ol className="divide-y divide-slate-100">{entries.map((entry) => <li key={entry.queueNumber} className="flex items-center gap-4 px-5 py-4 sm:px-6"><span className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold tabular-nums ${completed ? "bg-slate-100 text-slate-500" : "bg-teal-50 text-teal-800"}`}>{String(entry.queueNumber).padStart(2, "0")}</span><p className="flex-1 text-base font-semibold text-slate-800">{new Date(entry.scheduledAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${completed ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>{completed ? "Selesai" : "Menunggu"}</span></li>)}</ol>}
  </section>;
}
