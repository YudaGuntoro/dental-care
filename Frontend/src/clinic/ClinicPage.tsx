"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import RowActions from "@/components/common/RowActions";
import DatePicker from "@/components/form/date-picker";

type Patient = { id: number; fullName: string; phone?: string; email?: string; address?: string; emergencyContact?: string; birthDate?: string; gender?: string; allergies?: string; medicalNotes?: string };
type Appointment = { id: number; patientId: number; doctorId?: number; treatmentId?: number; patient_name: string; doctor_name?: string; treatment_name?: string; scheduledAt: string; status: string; notes?: string; diagnosis?: string; procedureNotes?: string; prescription?: string };
type Treatment = { id: number; name: string; description?: string; price: number; durationMinutes: number; isActive: boolean };
type Payment = { id: number; patientId: number; patient_name: string; amount: number; method: string; status: string; paidAt: string };
type Doctor = { id: number; fullName: string; specialty?: string; phone?: string; email?: string; licenseNumber?: string; practiceSchedule?: string; practiceSchedules?: Array<{ dayOfWeek: number | null; startTime: string | null; endTime: string | null; legacyText?: string | null }>; isActive: boolean };
type PageKind = "patients" | "doctors" | "appointments" | "treatments" | "payments";

const labels: Record<PageKind, { title: string; description: string; endpoint: string }> = {
  patients: { title: "Daftar Pasien", description: "Kelola profil pasien, informasi kontak, dan catatan medis.", endpoint: "/api/clinic/patients" },
  doctors: { title: "Daftar Dokter", description: "Kelola dokter gigi, spesialisasi, dan informasi kontak.", endpoint: "/api/clinic/doctors" },
  appointments: { title: "Janji Temu", description: "Atur kunjungan dan pantau status janji temu.", endpoint: "/api/clinic/appointments" },
  treatments: { title: "Perawatan / Layanan", description: "Daftar layanan gigi, biaya, dan durasi kunjungan.", endpoint: "/api/clinic/treatments" },
  payments: { title: "Pembayaran", description: "Catat pembayaran pasien dan metode pembayarannya.", endpoint: "/api/clinic/payments" },
};

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function ClinicPage({ kind }: { kind: PageKind }) {
  const meta = labels[kind];
  const [rows, setRows] = useState<Array<Patient | Doctor | Appointment | Treatment | Payment>>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const useCreateModal = true;

  useEffect(() => {
    if (!showForm) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeForm(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showForm, formDirty]);

  function closeForm() {
    if (formDirty && !window.confirm("Data yang sudah diisi belum disimpan. Tutup formulir?")) return;
    setFormDirty(false);
    setShowForm(false);
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<Array<Patient | Doctor | Appointment | Treatment | Payment>>(meta.endpoint);
      setRows(data ?? []);
      if (kind !== "patients" && kind !== "doctors" && kind !== "treatments") setPatients(await apiGet<Patient[]>(labels.patients.endpoint));
      if (kind === "appointments") setTreatments(await apiGet<Treatment[]>(labels.treatments.endpoint));
      if (kind === "appointments") setDoctors((await apiGet<Doctor[]>(labels.doctors.endpoint)).filter((doctor) => doctor.isActive));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data klinik tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [kind, meta.endpoint]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    let body: Record<string, unknown>;
    if (kind === "patients") {
      body = { fullName: value("fullName"), phone: value("phone"), email: value("email"), address: value("address"), emergencyContact: value("emergencyContact"), birthDate: value("birthDate") || null, gender: value("gender") || null, allergies: value("allergies"), medicalNotes: value("medicalNotes") };
    } else if (kind === "doctors") {
      const startTime = value("startTime"); const endTime = value("endTime");
      body = { fullName: value("fullName"), specialty: value("specialty") || null, phone: value("phone") || null, email: value("email") || null, licenseNumber: value("licenseNumber") || null, practiceHours: form.getAll("practiceDays").map((day) => ({ dayOfWeek: Number(day), startTime, endTime })), isActive: true };
    } else if (kind === "appointments") {
      body = { patientId: Number(value("patientId")), doctorId: value("doctorId") ? Number(value("doctorId")) : null, treatmentId: value("treatmentId") ? Number(value("treatmentId")) : null, scheduledAt: new Date(value("scheduledAt")).toISOString(), notes: value("notes") || null };
    } else if (kind === "treatments") {
      body = { name: value("name"), description: value("description") || null, price: Number(value("price")), durationMinutes: Number(value("durationMinutes")), isActive: true };
    } else {
      body = { patientId: Number(value("patientId")), appointmentId: value("appointmentId") ? Number(value("appointmentId")) : null, amount: Number(value("amount")), method: value("method") };
    }
    setSaving(true); setError(""); setSuccess("");
    try {
      await apiPost(meta.endpoint, body);
      formElement.reset(); setFormDirty(false);
      setSuccess(`${meta.title} berhasil disimpan.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data tidak dapat disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function markAppointment(appointment: Appointment, status: string) {
    try {
      await apiPut(`/api/clinic/appointments/${appointment.id}/status`, status);
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Janji temu tidak dapat diperbarui."); }
  }

  async function removeRow(id: number) {
    if (!window.confirm("Hapus data ini?")) return;
    const endpoint = kind === "patients" ? "patients" : kind === "doctors" ? "doctors" : kind === "treatments" ? "treatments" : kind === "appointments" ? "appointments" : "payments";
    try { await apiDelete(`/api/clinic/${endpoint}/${id}`); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Data tidak dapat dihapus."); }
  }

  const filteredRows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Dental Care</p><h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{meta.title}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{meta.description}</p></header>
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-4"><div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><span>Tampilkan</span><select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"><option>10</option><option>25</option><option>50</option></select><span>data</span><button type="button" onClick={() => setShowForm(true)} className="min-h-10 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Tambah</button></div><label className="flex w-full min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-300 sm:w-auto">Cari<input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} min-w-0 w-full sm:w-64`} placeholder={`Cari ${meta.title.toLowerCase()}...`} /></label></div>
    {useCreateModal && showForm && <button type="button" aria-label="Tutup formulir" onClick={closeForm} className="fixed inset-0 z-40 h-full w-full cursor-default bg-slate-950/30 backdrop-blur-[2px]" />}
    <div className={`grid gap-6 ${!useCreateModal || showForm ? "xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.65fr)]" : "xl:grid-cols-1"}`}>
      <form id="clinic-entry-form" onInput={() => setFormDirty(true)} onSubmit={handleSubmit} className={`${useCreateModal && !showForm ? "hidden" : useCreateModal ? "fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2" : ""} space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900`}>
        <div className="mb-1 flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-900 dark:text-white">Tambah {kind === "patients" ? "pasien" : kind === "doctors" ? "dokter" : kind === "treatments" ? "perawatan / layanan" : meta.title.toLowerCase()}</h2><button type="button" aria-label="Tutup formulir" onClick={closeForm} className="inline-flex size-9 items-center justify-center rounded-lg text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">×</button></div>
        {kind === "patients" && <>
          <input className={fieldClass} name="fullName" placeholder="Nama lengkap" required />
          <div className="grid gap-3 sm:grid-cols-2"><input className={fieldClass} name="phone" placeholder="Nomor telepon" /><input className={fieldClass} name="emergencyContact" placeholder="Kontak darurat" /></div>
          <input className={fieldClass} name="address" placeholder="Alamat pasien" />
          <div className="grid gap-3 sm:grid-cols-2"><input className={fieldClass} name="birthDate" type="date" /><select className={fieldClass} name="gender" defaultValue=""><option value="">Jenis kelamin (opsional)</option><option>Perempuan</option><option>Laki-laki</option><option>Lainnya</option></select></div>
          <textarea className={fieldClass} name="allergies" placeholder="Alergi (pisahkan dengan koma atau baris baru)" rows={2} />
          <textarea className={fieldClass} name="medicalNotes" placeholder="Riwayat penyakit dan catatan medis" rows={3} />
        </>}
        {kind === "doctors" && <>
          <input className={fieldClass} name="fullName" placeholder="Nama dokter" required />
          <input className={fieldClass} name="specialty" placeholder="Spesialisasi (misalnya ortodonti)" />
          <div className="grid gap-3 sm:grid-cols-2"><input className={fieldClass} name="phone" placeholder="Nomor telepon" /><input className={fieldClass} name="licenseNumber" placeholder="Nomor izin praktik" /></div>
          <input className={fieldClass} name="email" type="email" placeholder="Email" />
          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><legend className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Jam praktik mingguan</legend><div className="grid grid-cols-4 gap-2 text-xs sm:grid-cols-7">{[[1,"Senin"],[2,"Selasa"],[3,"Rabu"],[4,"Kamis"],[5,"Jumat"],[6,"Sabtu"],[7,"Minggu"]].map(([day, label]) => <label key={day} className="flex items-center gap-1.5"><input type="checkbox" name="practiceDays" value={day} className="rounded border-slate-300 text-teal-700 focus:ring-teal-600" />{label}</label>)}</div><div className="grid grid-cols-2 gap-3"><label className="text-xs font-medium text-slate-500">Mulai<input className={`${fieldClass} mt-1`} name="startTime" type="time" defaultValue="09:00" /></label><label className="text-xs font-medium text-slate-500">Selesai<input className={`${fieldClass} mt-1`} name="endTime" type="time" defaultValue="16:00" /></label></div><p className="text-xs text-slate-500">Pilih hari yang berlaku untuk jam di atas. Hari tanpa centang tidak dijadwalkan.</p></fieldset>
        </>}
        {kind === "appointments" && <>
          <select className={fieldClass} name="patientId" required defaultValue=""><option value="" disabled>Pilih pasien</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select>
          <select className={fieldClass} name="doctorId" defaultValue=""><option value="">Pilih dokter (opsional)</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.fullName}{doctor.specialty ? ` · ${doctor.specialty}` : ""}</option>)}</select>
          <select className={fieldClass} name="treatmentId" defaultValue=""><option value="">Pilih perawatan (opsional)</option>{treatments.map((treatment) => <option key={treatment.id} value={treatment.id}>{treatment.name} · {money(treatment.price)}</option>)}</select>
          <DatePicker id="appointment-scheduled-at" name="scheduledAt" enableTime dateFormat="Y-m-d H:i" altInput altFormat="d/m/Y H:i" placeholder="Pilih tanggal dan waktu" className={fieldClass} required />
          <textarea className={fieldClass} name="notes" placeholder="Anamnesa / keluhan pasien" rows={3} />
        </>}
        {kind === "treatments" && <>
          <input className={fieldClass} name="name" placeholder="Nama perawatan" required />
          <textarea className={fieldClass} name="description" placeholder="Deskripsi" rows={2} />
          <div className="grid gap-3 sm:grid-cols-2"><input className={fieldClass} name="price" type="number" min="0" step="1000" placeholder="Harga (Rp)" required /><input className={fieldClass} name="durationMinutes" type="number" min="1" defaultValue="30" placeholder="Menit" required /></div>
        </>}
        {kind === "payments" && <>
          <select className={fieldClass} name="patientId" required defaultValue=""><option value="" disabled>Pilih pasien</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select>
          <input className={fieldClass} name="amount" type="number" min="1" step="1000" placeholder="Jumlah (Rp)" required />
          <select className={fieldClass} name="method" defaultValue="Cash"><option>Tunai</option><option>Kartu</option><option>Transfer bank</option><option>Dompet digital</option></select>
        </>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}{success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
        <div className="flex gap-2"><button disabled={saving} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan"}</button>{useCreateModal && <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 dark:border-slate-700">Batal</button>}</div>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-white">Daftar {meta.title.toLowerCase()}</h2><p className="mt-1 text-xs text-slate-500">Data terbaru yang tersimpan di klinik</p></div>
        <div className="space-y-1.5 p-2 sm:hidden">
          {loading ? <p className="px-4 py-8 text-center text-sm text-slate-500">Memuat...</p> : filteredRows.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">Belum ada data.</p> : filteredRows.map((row) => {
            if (kind === "patients") { const patient = row as Patient; return <article key={patient.id} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/30"><div className="flex min-w-0 items-start gap-3"><span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">{patient.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{patient.fullName}</h3><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{patient.phone || "Telepon belum diisi"}</p>{patient.email && <p className="truncate text-xs text-slate-500">{patient.email}</p>}</div></div><div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2 dark:border-slate-700"><div className="flex min-w-0 items-center gap-2"><Link href={`/patients/${patient.id}/record`} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-teal-800 dark:border-slate-700 dark:bg-slate-900 dark:text-teal-300">Rekam medis</Link><Link href={`/patients/${patient.id}/print`} target="_blank" className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-teal-800 dark:border-slate-700 dark:bg-slate-900 dark:text-teal-300">Cetak</Link></div><RowActions onEdit={() => setShowForm(true)} onDelete={() => void removeRow(patient.id)} /></div></article>; }
            if (kind === "doctors") { const doctor = row as Doctor; return <article key={doctor.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-slate-900 dark:text-white">{doctor.fullName}</h3><p className="text-sm text-slate-600 dark:text-slate-300">{doctor.specialty || "Dokter gigi"}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${doctor.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{doctor.isActive ? "Aktif" : "Tidak aktif"}</span></div><dl className="grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-500">Jadwal praktik</dt><dd className="mt-0.5 break-words font-medium text-slate-800 dark:text-slate-200">{doctor.practiceSchedule || "Belum diatur"}</dd></div><div><dt className="text-slate-500">Telepon</dt><dd className="mt-0.5 break-words font-medium text-slate-800 dark:text-slate-200">{doctor.phone || "—"}</dd></div><div><dt className="text-slate-500">Izin praktik</dt><dd className="mt-0.5 break-words font-medium text-slate-800 dark:text-slate-200">{doctor.licenseNumber || "—"}</dd></div></dl><RowActions onEdit={() => setShowForm(true)} onDelete={() => void removeRow(doctor.id)} /></article>; }
            if (kind === "appointments") { const appointment = row as Appointment; const statusStyle = appointment.status === "Completed" ? "bg-emerald-50 text-emerald-700" : appointment.status === "Cancelled" || appointment.status === "NoShow" ? "bg-rose-50 text-rose-700" : appointment.status === "InProgress" ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700"; return <article key={appointment.id} className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"><div className="flex items-center justify-between gap-2"><h3 className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-white">{appointment.patient_name}</h3><span className="shrink-0 rounded-md bg-white/80 px-1.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-900/70">{new Date(appointment.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · {new Date(appointment.scheduledAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span></div><p className="truncate text-xs text-slate-600 dark:text-slate-300">{appointment.treatment_name || "Perawatan belum ditentukan"} · {appointment.doctor_name || "Dokter belum dipilih"}</p><div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-1 dark:border-slate-700"><select aria-label={`Ubah status janji temu ${appointment.patient_name}`} value={appointment.status} onChange={(event) => void markAppointment(appointment, event.target.value)} className={`min-h-9 min-w-0 max-w-[170px] flex-1 cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ring-1 ring-inset ring-current/10 focus:ring-2 focus:ring-teal-500 ${statusStyle}`}><option value="Scheduled">Terjadwal</option><option value="InProgress">Sedang diperiksa</option><option value="Completed">Selesai</option><option value="Cancelled">Dibatalkan</option><option value="NoShow">Tidak hadir</option></select><RowActions onEdit={() => setShowForm(true)} onDelete={() => void removeRow(appointment.id)} /></div></article>; }
            if (kind === "treatments") { const treatment = row as Treatment; return <article key={treatment.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><h3 className="break-words font-bold text-slate-900 dark:text-white">{treatment.name}</h3><p className="mt-1 text-xs text-slate-500">{treatment.durationMinutes} menit · {money(treatment.price)}</p></div><RowActions onEdit={() => setShowForm(true)} onDelete={() => void removeRow(treatment.id)} /></article>; }
            const payment = row as Payment; return <article key={payment.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><h3 className="font-bold text-slate-900 dark:text-white">{payment.patient_name}</h3><p className="mt-1 text-xs text-slate-500">{new Date(payment.paidAt).toLocaleDateString("id-ID")} · {payment.method}</p><p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{money(payment.amount)}</p></div><div className="flex shrink-0 flex-col items-end gap-2"><Link href={`/payments/${payment.id}/receipt`} target="_blank" className="text-xs font-semibold text-teal-700">Kuitansi</Link><RowActions onEdit={() => setShowForm(true)} onDelete={() => void removeRow(payment.id)} /></div></article>;
          })}
        </div>
        <div className="hidden overflow-x-auto sm:block"><table className="w-full text-left text-sm"><thead className="bg-teal-700 text-xs uppercase tracking-wide text-white"><tr>{(kind === "patients" ? ["Pasien", "Telepon", "Email", "Aksi"] : kind === "doctors" ? ["Dokter", "Spesialisasi", "Jadwal praktik", "Telepon", "Izin Praktik", "Status", "Aksi"] : kind === "appointments" ? ["Pasien", "Dokter", "Perawatan", "Tanggal & waktu", "Status", "Aksi"] : kind === "treatments" ? ["Perawatan", "Durasi", "Harga", "Aksi"] : ["Pasien", "Tanggal bayar", "Metode", "Jumlah", "Aksi"]).map((heading) => <th key={heading} className={`px-4 py-3 font-semibold ${heading === "Aksi" ? "text-center" : ""}`}>{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Memuat...</td></tr> : filteredRows.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Belum ada data.</td></tr> : filteredRows.map((row) => {
            if (kind === "patients") { const patient = row as Patient; return <tr key={patient.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"><td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{patient.fullName}</td><td className="px-4 py-3">{patient.phone || "—"}</td><td className="px-4 py-3">{patient.email || "—"}</td><td className="px-3 py-2"><div className="flex items-center justify-center gap-1"><Link href={`/patients/${patient.id}/record`} aria-label={`Pratinjau rekam medis ${patient.fullName}`} title="Pratinjau rekam medis" className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-teal-700 transition-colors hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 md:size-8"><svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></Link><Link href={`/patients/${patient.id}/print`} target="_blank" aria-label={`Cetak rekam medis ${patient.fullName}`} title="Cetak rekam medis" className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-teal-700 transition-colors hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 md:size-8"><svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6H7z"/><path d="M17 12h.01"/></svg></Link><RowActions onEdit={() => setShowForm(true)} onDelete={() => void removeRow(patient.id)} /></div></td></tr>; }
            if (kind === "doctors") { const doctor = row as Doctor; const schedule = doctor.practiceSchedules?.map((item) => item.legacyText || (item.dayOfWeek ? `${["","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"][item.dayOfWeek]} ${item.startTime?.slice(0,5)}–${item.endTime?.slice(0,5)}` : "")).filter(Boolean).join(", ") || doctor.practiceSchedule; return <tr key={doctor.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"><td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{doctor.fullName}</td><td className="px-4 py-3">{doctor.specialty || "—"}</td><td className="px-4 py-3 text-xs">{schedule || "Belum diatur"}</td><td className="px-4 py-3">{doctor.phone || "—"}</td><td className="px-4 py-3">{doctor.licenseNumber || "—"}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{doctor.isActive ? "Aktif" : "Tidak aktif"}</span></td><td className="px-3 py-2"><RowActions onEdit={() => setShowForm(true)} onDelete={() => void removeRow(doctor.id)} /></td></tr>; }
            if (kind === "appointments") { const appointment = row as Appointment; const statuses = { Scheduled: "Terjadwal", InProgress: "Sedang diperiksa", Completed: "Selesai", Cancelled: "Dibatalkan", NoShow: "Tidak hadir" }; const statusLabel = statuses[appointment.status as keyof typeof statuses] || appointment.status; const statusStyle = appointment.status === "Completed" ? "bg-emerald-50 text-emerald-700" : appointment.status === "Cancelled" || appointment.status === "NoShow" ? "bg-rose-50 text-rose-700" : appointment.status === "InProgress" ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700"; return <tr key={appointment.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"><td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{appointment.patient_name}</td><td className="px-4 py-3">{appointment.doctor_name || "Belum dipilih"}</td><td className="px-4 py-3">{appointment.treatment_name || "Belum ditentukan"}</td><td className="px-4 py-3">{new Date(appointment.scheduledAt).toLocaleString("id-ID")}</td><td className="px-4 py-3"><select aria-label={`Ubah status janji temu ${appointment.patient_name}`} value={appointment.status} onChange={(event) => void markAppointment(appointment, event.target.value)} className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ring-1 ring-inset ring-current/10 focus:ring-2 focus:ring-teal-500 ${statusStyle}`}><option value="Scheduled">Terjadwal</option><option value="InProgress">Sedang diperiksa</option><option value="Completed">Selesai</option><option value="Cancelled">Dibatalkan</option><option value="NoShow">Tidak hadir</option></select></td><td className="px-3 py-2"><RowActions onEdit={() => setShowForm(true)} onDelete={() => void removeRow(appointment.id)} /></td></tr>; }
            if (kind === "treatments") { const treatment = row as Treatment; return <tr key={treatment.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"><td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{treatment.name}</td><td className="px-4 py-3">{treatment.durationMinutes} menit</td><td className="px-4 py-3">{money(treatment.price)}</td><td className="px-3 py-2"><RowActions onEdit={() => setShowForm(true)} onDelete={() => void removeRow(treatment.id)} /></td></tr>; }
            const payment = row as Payment; return <tr key={payment.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"><td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{payment.patient_name}</td><td className="px-4 py-3">{new Date(payment.paidAt).toLocaleDateString("id-ID")}</td><td className="px-4 py-3">{payment.method}</td><td className="px-4 py-3">{money(payment.amount)}</td><td className="px-3 py-2"><div className="flex items-center justify-center gap-1"><Link href={`/payments/${payment.id}/receipt`} target="_blank" className="rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">Kuitansi</Link><RowActions onEdit={() => setShowForm(true)} onDelete={() => void removeRow(payment.id)} /></div></td></tr>;
          })}
        </tbody></table></div>
      </section>
    </div>
  </div>;
}
