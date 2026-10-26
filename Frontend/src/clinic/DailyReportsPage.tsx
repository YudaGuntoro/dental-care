"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { getStoredToken } from "@/lib/auth";
import DatePicker from "@/components/form/date-picker";

type DailyReport = {
  date: string;
  totalRevenue: number;
  payments: Array<{ id: number; patientId: number; patientName: string; amount: number; method: string; status: string; paidAt: string }>;
  arrivals: Array<{ id: number; patientId: number; patientName: string; phone?: string | null; doctorName: string; treatmentName: string; scheduledAt: string; status: string }>;
};

const fieldClass = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const localDate = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; };
const dateLabel = (value: string) => new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
const statusLabel: Record<string, string> = { Scheduled: "Terjadwal", InProgress: "Sedang diperiksa", Completed: "Selesai", Cancelled: "Dibatalkan", NoShow: "Tidak hadir" };

export default function DailyReportsPage() {
  const [date, setDate] = useState(localDate);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void apiGet<DailyReport>(`/api/clinic/reports/daily?date=${encodeURIComponent(date)}`)
      .then((data) => { if (active) setReport(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Laporan tidak dapat dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  const exportReport = async () => {
    setExporting(true); setError("");
    try {
      const token = getStoredToken();
      const response = await fetch(`/api/clinic/reports/daily/export?date=${encodeURIComponent(date)}`, { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Laporan XLSX tidak dapat dibuat.");
      }
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `Laporan-Harian-${date}.xlsx`; link.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : "Laporan XLSX tidak dapat diunduh."); }
    finally { setExporting(false); }
  };

  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">Dental Care</p><h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Laporan Harian</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Lihat dan ekspor transaksi keuangan serta daftar kunjungan pasien berdasarkan tanggal.</p></header>
    <section className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <DatePicker id="daily-report-date" label="Tanggal laporan" name="reportDate" value={date} onValueChange={setDate} dateFormat="Y-m-d" altInput altFormat="d/m/Y" placeholder="Pilih tanggal laporan" className={`${fieldClass} w-full sm:w-64`} />
      <div className="flex flex-wrap items-center gap-3"><p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">Satu workbook berisi sheet keuangan dan kedatangan pasien, lengkap dengan ringkasan dan format siap cetak.</p><button type="button" disabled={!report || loading || exporting} onClick={() => void exportReport()} className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{exporting ? "Menyiapkan XLSX..." : "Unduh laporan XLSX"}</button></div>
    </section>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
    {loading ? <p className="py-10 text-center text-sm text-slate-500">Memuat laporan...</p> : report && <>
      <section className="grid gap-4 sm:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">Total pendapatan</p><p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{money(report.totalRevenue)}</p></article><article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">Transaksi pembayaran</p><p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{report.payments.length}</p></article><article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">Kunjungan terjadwal</p><p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{report.arrivals.length}</p></article></section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-white">Keuangan harian</h2><p className="mt-1 text-xs text-slate-500">{report.payments.length} transaksi · Total {money(report.totalRevenue)}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-teal-700 text-xs uppercase text-white"><tr>{["Waktu", "Pasien", "Metode", "Status", "Jumlah"].map((x) => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{report.payments.length ? report.payments.map((item) => <tr key={item.id}><td className="px-4 py-3">{dateLabel(item.paidAt)}</td><td className="px-4 py-3 font-medium">{item.patientName}</td><td className="px-4 py-3">{item.method}</td><td className="px-4 py-3">{item.status === "Paid" ? "Lunas" : item.status}</td><td className="px-4 py-3">{money(item.amount)}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Tidak ada pembayaran pada tanggal ini.</td></tr>}</tbody></table></div></section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-white">Daftar kedatangan pasien</h2><p className="mt-1 text-xs text-slate-500">Janji temu pada tanggal yang dipilih, beserta statusnya.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead className="bg-teal-700 text-xs uppercase text-white"><tr>{["Waktu", "Pasien", "Telepon", "Dokter", "Perawatan", "Status"].map((x) => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{report.arrivals.length ? report.arrivals.map((item) => <tr key={item.id}><td className="px-4 py-3">{dateLabel(item.scheduledAt)}</td><td className="px-4 py-3 font-medium">{item.patientName}</td><td className="px-4 py-3">{item.phone || "—"}</td><td className="px-4 py-3">{item.doctorName || "Belum dipilih"}</td><td className="px-4 py-3">{item.treatmentName || "Belum ditentukan"}</td><td className="px-4 py-3">{statusLabel[item.status] || item.status}</td></tr>) : <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Tidak ada kunjungan pada tanggal ini.</td></tr>}</tbody></table></div></section>
    </>}
  </div>;
}
