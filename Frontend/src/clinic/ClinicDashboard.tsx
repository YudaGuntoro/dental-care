"use client";

import Link from "next/link";
import DatePicker from "@/components/form/date-picker";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";

type Patient = { id: number; fullName: string; createdAt: string };
type Appointment = { id: number; patient_name: string; treatment_name?: string; scheduledAt: string; status: string };
type Payment = { id: number; patient_name: string; amount: number; paidAt: string };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const isSameDay = (value: string, date: Date) => dayKey(new Date(value)) === dayKey(date);

function BarChart({ values, color = "bg-teal-600", formatValue = (value) => String(value) }: { values: { label: string; value: number }[]; color?: string; formatValue?: (value: number) => string }) {
  const chartWidth = 720;
  const plotLeft = 38;
  const plotRight = 710;
  const plotTop = 18;
  const plotBottom = 168;
  const max = Math.max(...values.map((item) => item.value), 1);
  const scaleMax = max * 1.16;
  const slot = values.length ? (plotRight - plotLeft) / values.length : 0;
  const fillColor = color === "bg-emerald-500" ? "#10b981" : color === "bg-teal-500" ? "#14b8a6" : "#0f766e";
  const xAt = (index: number) => plotLeft + slot * (index + 0.5);
  const yAt = (value: number) => plotBottom - (value / scaleMax) * (plotBottom - plotTop);
  const points = values.map((item, index) => ({ x: xAt(index), y: yAt(item.value) }));
  const trendPath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const barWidth = Math.min(34, slot * 0.48);

  return <>
    <div className="mb-2 flex items-center gap-4 text-[11px] font-medium text-slate-600 dark:text-slate-300">
      <span className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-sm ${color}`} />Jumlah</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full bg-orange-500" />Tren total</span>
    </div>
    <svg className="h-52 w-full overflow-visible" viewBox={`0 0 ${chartWidth} 210`} role="img" aria-label="Bar chart with trend line">
      {[0, 1, 2, 3, 4].map((tick) => {
        const y = plotTop + ((plotBottom - plotTop) / 4) * tick;
        return <line key={tick} x1={plotLeft} x2={plotRight} y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="2 4" strokeWidth="1" />;
      })}
      {values.map((item, index) => {
        const x = xAt(index);
        const y = yAt(item.value);
        const barHeight = plotBottom - y;
        return <g key={item.label}>
          <rect x={x - barWidth / 2} y={y} width={barWidth} height={barHeight} rx="6" fill={fillColor} />
          <text x={x} y={Math.max(plotTop - 2, y - 9)} textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold dark:fill-slate-200">{formatValue(item.value)}</text>
          <text x={x} y="198" textAnchor="middle" className="fill-slate-500 text-[10px]">{item.label}</text>
        </g>;
      })}
      {trendPath && <path d={trendPath} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  </>;
}

function Donut({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const segments = items.map((item) => { const start = offset; offset += total ? (item.value / total) * 100 : 0; return `${item.color} ${start}% ${offset}%`; });
  return <div className="flex items-center gap-5"><div className="relative size-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${segments.length ? segments.join(", ") : "#e2e8f0 0 100%"})` }}><div className="absolute inset-5 flex items-center justify-center rounded-full bg-white text-center dark:bg-slate-900"><span className="text-xl font-black text-slate-900 dark:text-white">{total}</span></div></div><div className="space-y-2 text-xs">{items.map((item) => <div className="flex items-center gap-2" key={item.label}><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-slate-500 dark:text-slate-400">{item.label}</span><strong className="text-slate-900 dark:text-white">{item.value}</strong></div>)}</div></div>;
}

export default function ClinicDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  useEffect(() => { void Promise.all([apiGet<Patient[]>("/api/clinic/patients"), apiGet<Appointment[]>("/api/clinic/appointments"), apiGet<Payment[]>("/api/clinic/payments")]).then(([p, a, pay]) => { setPatients(p); setAppointments(a); setPayments(pay); }).catch((err) => setError(err instanceof Error ? err.message : "Dasbor tidak dapat dimuat.")); }, []);

  const reportDate = new Date(`${selectedDate}T00:00:00`);
  const reportEnd = new Date(reportDate); reportEnd.setDate(reportDate.getDate() + 1);
  const reportAppointments = appointments.filter((item) => isSameDay(item.scheduledAt, reportDate));
  const scheduledToday = reportAppointments.filter((item) => item.status === "Scheduled");
  const completedToday = reportAppointments.filter((item) => item.status === "Completed");
  const monthRevenue = payments.filter((item) => { const date = new Date(item.paidAt); return date.getMonth() === reportDate.getMonth() && date.getFullYear() === reportDate.getFullYear() && date < reportEnd; }).reduce((sum, item) => sum + item.amount, 0);
  const statusItems = [{ label: "Terjadwal", value: scheduledToday.length, color: "#0f766e" }, { label: "Sedang diperiksa", value: reportAppointments.filter((item) => item.status === "InProgress").length, color: "#f59e0b" }, { label: "Selesai", value: completedToday.length, color: "#22c55e" }, { label: "Dibatalkan", value: reportAppointments.filter((item) => item.status === "Cancelled").length, color: "#f97316" }, { label: "Tidak hadir", value: reportAppointments.filter((item) => item.status === "NoShow").length, color: "#ef4444" }];
  const hourly = Array.from({ length: 10 }, (_, index) => { const hour = index + 8; return { label: `${String(hour).padStart(2, "0")}h`, value: reportAppointments.filter((item) => new Date(item.scheduledAt).getHours() === hour).length }; });
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => { const date = new Date(reportDate); date.setDate(reportDate.getDate() - (6 - index)); return { date, label: date.toLocaleDateString("id-ID", { weekday: "short" }), value: payments.filter((item) => isSameDay(item.paidAt, date)).reduce((sum, item) => sum + item.amount, 0) }; });
  const treatmentUsage = useMemo(() => { const counts = new Map<string, number>(); appointments.filter((item) => { const date = new Date(item.scheduledAt); return date.getMonth() === reportDate.getMonth() && date.getFullYear() === reportDate.getFullYear() && date < reportEnd; }).forEach((item) => { if (!item.treatment_name) return; const name = item.treatment_name; counts.set(name, (counts.get(name) || 0) + 1); }); return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label: label.length > 13 ? `${label.slice(0, 13)}…` : label, value })); }, [appointments, selectedDate]);
  const upcoming = appointments.filter((item) => new Date(item.scheduledAt) >= reportDate && item.status === "Scheduled").sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)).slice(0, 5);
  const visiblePatients = patients.filter((item) => new Date(item.createdAt) < reportEnd);
  const activityStart = new Date(reportDate); activityStart.setDate(activityStart.getDate() - 29);
  const newPatients = patients.filter((item) => new Date(item.createdAt) >= activityStart && new Date(item.createdAt) < reportEnd).length;
  const cards = [{ label: "Pasien terdaftar", value: visiblePatients.length, note: "Jumlah pasien hingga tanggal yang dipilih", href: "/patients" }, { label: "Janji temu pada tanggal ini", value: scheduledToday.length, note: `${completedToday.length} janji temu selesai pada tanggal yang dipilih`, href: "/appointments" }, { label: "Pendapatan bulan ini", value: money(monthRevenue), note: `Pembayaran pada ${reportDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`, href: "/payments" }, { label: "Perawatan digunakan", value: treatmentUsage.length, note: "Layanan bulan ini", href: "/treatments" }];
  const panel = "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";

  return <div className="min-w-0 space-y-4 sm:space-y-6"><header className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">Dental Care</p><h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Dasbor klinik</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Ringkasan layanan pasien dan kinerja klinik pada tanggal yang dipilih.</p></div><div className="flex w-full items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:w-auto sm:gap-3 sm:px-5 sm:py-4"><div className="min-w-0 flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:w-[260px] sm:flex-none"><DatePicker label="Filter tanggal" id="clinic-dashboard-date" value={selectedDate} onValueChange={(value) => setSelectedDate(value)} dateFormat="Y-m-d" altInput altFormat="d/m/Y" placeholder="Pilih tanggal" className="mt-1 block h-11 w-full min-w-0 rounded-lg border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 focus:border-teal-600 focus:ring-teal-600/15 dark:border-slate-600 dark:bg-slate-950 dark:text-white" /></div><button type="button" aria-label="Atur ulang tanggal ke hari ini" title="Atur ulang ke hari ini" onClick={() => { const now = new Date(); setSelectedDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`); }} className="mb-0 inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl leading-none text-slate-500 transition hover:border-teal-500 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">×</button></div></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:border dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Link href={card.href} key={card.label} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p><p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{card.value}</p><p className="mt-2 text-xs text-slate-400 dark:text-slate-500 group-hover:text-teal-700">{card.note}</p></Link>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"><section className={panel}><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold text-slate-900 dark:text-white">Jadwal janji temu</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Kunjungan pasien per jam · {reportDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p></div><Link href="/appointments" className="text-sm font-semibold text-teal-700 dark:text-teal-300">Kelola jadwal</Link></div><BarChart values={hourly} /></section><section className={panel}><div className="mb-5"><h2 className="font-bold text-slate-900 dark:text-white">Status janji temu</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Rincian jadwal pada tanggal yang dipilih</p></div><Donut items={statusItems} /></section></div>
    <div className="grid gap-6 xl:grid-cols-2"><section className={panel}><div className="mb-5"><h2 className="font-bold text-slate-900 dark:text-white">Tren pendapatan</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pembayaran selama 7 hari hingga {reportDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</p></div><BarChart values={lastSevenDays.map((item) => ({ label: item.label, value: item.value }))} color="bg-emerald-500" formatValue={(value) => value >= 1000000 ? `Rp ${(value / 1000000).toFixed(1)}jt` : value >= 1000 ? `Rp ${Math.round(value / 1000)}rb` : `Rp ${value}`} />{lastSevenDays.every((item) => item.value === 0) && <p className="text-center text-xs text-slate-400 dark:text-slate-500">Tambahkan data pembayaran untuk melihat tren pendapatan.</p>}</section><section className={panel}><div className="mb-5"><h2 className="font-bold text-slate-900 dark:text-white">Perawatan paling sering digunakan</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Berdasarkan janji temu pada {reportDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p></div>{treatmentUsage.length ? <BarChart values={treatmentUsage} color="bg-teal-500" formatValue={(value) => `${value} kunjungan`} /> : <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada data perawatan pada bulan yang dipilih.</p>}</section></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"><section className={panel}><div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-900 dark:text-white">Janji temu mendatang</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Kunjungan pasien berikutnya dari tanggal yang dipilih</p></div><Link href="/appointments" className="inline-flex shrink-0 items-center whitespace-nowrap text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">Lihat semua janji temu <span aria-hidden="true" className="ml-1">→</span></Link></div>{upcoming.length ? <ul className="divide-y divide-slate-100 dark:divide-slate-800">{upcoming.map((item) => <li key={item.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-900 dark:text-white">{item.patient_name}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.treatment_name || "Treatment not assigned"}</p></div><time className="shrink-0 text-right text-xs font-semibold text-teal-700 dark:text-teal-300">{new Date(item.scheduledAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}</time></li>)}</ul> : <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No upcoming appointments.</p>}</section><section className={panel}><div className="mb-4"><h2 className="font-bold text-slate-900 dark:text-white">Patient activity</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">New registrations in the 30 days ending {reportDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</p></div><div className="flex items-end gap-3"><p className="text-4xl font-black text-slate-900 dark:text-white">{newPatients}</p><p className="pb-1 text-sm text-emerald-600 dark:text-emerald-300">new patients</p></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(visiblePatients.length ? (newPatients / visiblePatients.length) * 100 : 0, 100)}%` }} /></div><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{visiblePatients.length ? `${Math.round((newPatients / visiblePatients.length) * 100)}% of all registered patients` : "No patient records yet"}</p></section></div>
  </div>;
}
