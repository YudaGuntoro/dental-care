"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import DatePicker from "@/components/form/date-picker";

type Appointment = { id: number; patientId: number; patient_name: string; treatment_name?: string; scheduledAt: string; status: string };
type FollowUp = { id: number; appointmentId?: number | null; patientId: number; treatmentId?: number; patient_name: string; treatment_name: string; lastTreatmentAt: string; followUpAt: string; status: string; notes?: string };
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

function followUpTemplate(treatmentName = "") {
  const treatment = treatmentName.toLowerCase();
  if (treatment.includes("scaling") || treatment.includes("pemeriksaan")) return "Halo Kak, sudah waktunya kontrol gigi kembali. Jangan lupa jadwalkan kunjungan berikutnya di Klinik Dental Care ya.";
  if (treatment.includes("cabut")) return "Halo Kak, bagaimana kondisi gigi setelah pencabutan? Kami mengundang Kakak untuk kontrol lanjutan di Klinik Dental Care.";
  if (treatment.includes("tambal")) return "Halo Kak, kami ingin memastikan kondisi gigi setelah perawatan tambal. Silakan jadwalkan kontrol lanjutan di Klinik Dental Care ya.";
  if (treatment.includes("saluran") || treatment.includes("akar")) return "Halo Kak, jangan lupa melanjutkan kontrol perawatan gigi sesuai jadwal di Klinik Dental Care ya.";
  return "Halo Kak, kami ingin menanyakan kabar setelah perawatan terakhir. Jangan lupa kontrol kembali di Klinik Dental Care ya.";
}

export default function FollowUpPage() {
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [followUpAt, setFollowUpAt] = useState("");

  useEffect(() => {
    if (!showForm) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeForm(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showForm, formDirty]);

  function closeForm() {
    if (formDirty && !window.confirm("Data yang sudah diisi belum disimpan. Tutup formulir?")) return;
    setFormDirty(false); setShowForm(false);
  }

  async function refresh() {
    setLoading(true);
    try {
      const [followUps, visits] = await Promise.all([
        apiGet<FollowUp[]>("/api/clinic/follow-ups"),
        apiGet<Appointment[]>("/api/clinic/appointments"),
      ]);
      setRows(followUps);
      setAppointments(visits.filter((appointment) => appointment.status === "Completed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data tindak lanjut tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true); setMessage(""); setError("");
    try {
      await apiPost("/api/clinic/follow-ups", {
        appointmentId: Number(form.get("appointmentId")),
        followUpAt: new Date(followUpAt).toISOString(),
        notes: noteValue.trim(),
      });
      event.currentTarget.reset(); setNoteValue(""); setFormDirty(false); setShowForm(false); setMessage("Pengingat berhasil ditambahkan."); await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tindak lanjut tidak dapat disimpan.");
    } finally { setSaving(false); }
  }

  async function updateStatus(id: number, status: string) {
    try { await apiPut(`/api/clinic/follow-ups/${id}/status`, status); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Status tindak lanjut tidak dapat diperbarui."); }
  }

  const today = new Date();
  const record = (row: FollowUp) => {
    const due = new Date(row.followUpAt) <= today && row.status === "Pending";
    return <article key={row.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 p-3 sm:p-4 ${due ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
      <div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{row.patient_name}</h3><p className="truncate text-xs text-slate-600 dark:text-slate-300">{row.treatment_name}</p></div>
      <span className="shrink-0 text-right text-[11px] font-medium text-slate-500 dark:text-slate-400">{new Date(row.followUpAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
      <p className="min-w-0 truncate text-xs text-slate-500 dark:text-slate-400">Terakhir {new Date(row.lastTreatmentAt).toLocaleDateString("id-ID")} · Tindak lanjut {new Date(row.followUpAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}{due ? <span className="ml-1 font-semibold text-amber-700">· Perlu dihubungi</span> : null}</p>
      <div className="flex items-center justify-end gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${row.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.status === "Pending" ? "Menunggu dihubungi" : row.status === "Completed" ? "Sudah dihubungi" : row.status}</span>{row.status === "Pending" && <button onClick={() => void updateStatus(row.id, "Completed")} className="min-h-8 rounded-lg px-2 text-[11px] font-semibold text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40">Tandai dihubungi</button>}</div>
      {row.notes && <p className="col-span-2 break-words text-xs text-slate-500 dark:text-slate-400">{row.notes}</p>}
    </article>;
  };

  return <div className="min-w-0 space-y-4 sm:space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">Dental Care</p><h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Pengingat Pasien</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Hubungi kembali pasien yang sudah lama tidak kontrol setelah perawatan terakhir.</p></div><button type="button" onClick={() => setShowForm(true)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">Buat pengingat</button></header>
    {(error || message) && <p className={`rounded-xl p-4 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}
    <div className="min-w-0">
      {showForm && <><button type="button" aria-label="Tutup formulir" onClick={closeForm} className="fixed inset-0 z-40 h-full w-full cursor-default bg-slate-950/30 backdrop-blur-[2px]" /><form onInput={() => setFormDirty(true)} onSubmit={save} className="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-slate-900 dark:text-white">Buat pengingat follow-up</h2><button type="button" aria-label="Tutup formulir" onClick={closeForm} className="inline-flex size-9 items-center justify-center rounded-lg text-2xl leading-none text-slate-400 dark:text-slate-500 hover:bg-slate-100">×</button></div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Kunjungan terakhir<select className={`${field} mt-1`} name="appointmentId" required defaultValue="" onChange={(event) => { const appointment = appointments.find((item) => item.id === Number(event.target.value)); setNoteValue(followUpTemplate(appointment?.treatment_name)); }}><option value="" disabled>Pilih kunjungan yang sudah selesai</option>{appointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{appointment.patient_name} · {appointment.treatment_name || "Perawatan"} · {new Date(appointment.scheduledAt).toLocaleDateString("id-ID")}</option>)}</select></label><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Jadwalkan pengingat<DatePicker id="follow-up-at" label="" name="followUpAt" value={followUpAt} onValueChange={setFollowUpAt} enableTime dateFormat="Y-m-d H:i" altInput altFormat="d/m/Y H:i" placeholder="Pilih tanggal dan waktu" className="mt-1" required /></label><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Pesan / catatan untuk pasien<textarea className={`${field} mt-1`} name="notes" rows={4} value={noteValue} onChange={(event) => setNoteValue(event.target.value)} placeholder="Pilih kunjungan untuk membuat saran pesan otomatis, lalu edit bila perlu." /></label><button disabled={saving || appointments.length === 0 || !followUpAt} className="min-h-11 w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto">{saving ? "Menyimpan..." : "Simpan pengingat"}</button>{appointments.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400">Pengingat dapat dibuat setelah kunjungan selesai dicatat.</p>}<div className="flex justify-end gap-2"><button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Batal</button></div></form></>}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5 sm:py-4"><h2 className="font-bold text-slate-900 dark:text-white">Pasien yang perlu dihubungi</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Diurutkan berdasarkan jadwal pengingat terdekat</p></div>{loading ? <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Memuat...</p> : rows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada pengingat pasien.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-teal-700 text-[11px] uppercase tracking-wide text-white"><tr><th className="px-4 py-3">Pasien</th><th className="px-4 py-3">Perawatan</th><th className="px-4 py-3">Kunjungan terakhir</th><th className="px-4 py-3">Jadwal pengingat</th><th className="px-4 py-3">Pesan / catatan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map((row) => { const due = new Date(row.followUpAt) <= today && row.status === "Pending"; return <tr key={row.id} className={due ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900 dark:text-white">{row.patient_name}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{row.treatment_name}</td><td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(row.lastTreatmentAt).toLocaleDateString("id-ID")}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(row.followUpAt).toLocaleDateString("id-ID")} · {new Date(row.followUpAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td><td className="max-w-[260px] px-4 py-3 text-slate-600 dark:text-slate-300"><p className="line-clamp-2">{row.notes || "—"}</p></td><td className="whitespace-nowrap px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${row.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.status === "Pending" ? "Menunggu dihubungi" : row.status === "Completed" ? "Sudah dihubungi" : row.status}</span></td><td className="whitespace-nowrap px-4 py-3 text-center">{row.status === "Pending" && <button onClick={() => void updateStatus(row.id, "Completed")} className="font-semibold text-teal-700 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200">Tandai dihubungi</button>}</td></tr>; })}</tbody></table></div>}</section>
    </div>
  </div>;
}
