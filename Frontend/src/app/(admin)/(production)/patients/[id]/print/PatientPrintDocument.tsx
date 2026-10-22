"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { getStoredToken, redirectToSignIn } from "@/lib/auth";

type Patient = {
  id: number;
  fullName: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  medicalNotes?: string | null;
};

type Appointment = {
  id: number;
  patientId: number;
  scheduledAt: string;
  status: string;
  notes?: string | null;
  treatment_name?: string | null;
};

export default function PatientPrintDocument({ patientId }: { patientId: number }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([apiGet<Patient[]>("/api/clinic/patients"), apiGet<Appointment[]>("/api/clinic/appointments")])
      .then(([patients, appointments]) => {
        if (!active) return;
        const found = patients.find((item) => item.id === patientId);
        if (!found) throw new Error("Data pasien tidak ditemukan.");
        setPatient(found);
        setRecords(appointments
          .filter((item) => item.patientId === patientId && item.status === "Completed")
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()));
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Rekam medis tidak dapat dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patientId]);

  const printDate = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());

  async function downloadPdf() {
    const token = getStoredToken();
    if (!token) {
      redirectToSignIn();
      return;
    }

    setDownloading(true);
    setError("");
    try {
      const response = await fetch(`/api/clinic/patients/${patientId}/medical-record/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.status === 401) {
        redirectToSignIn();
        return;
      }
      if (!response.ok) {
        const details = await response.text();
        let message = `PDF gagal dibuat (HTTP ${response.status}).`;
        try {
          const payload = JSON.parse(details) as { message?: string; title?: string; detail?: string };
          message = payload.message || payload.detail || payload.title || message;
        } catch {
          if (details.trim()) message = `${message} ${details.slice(0, 220)}`;
        }
        throw new Error(message);
      }

      const pdf = await response.blob();
      const objectUrl = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `Rekam-Medis-${String(patientId).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF rekam medis gagal dibuat. Coba lagi.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">Memuat rekam medis...</div>;
  if (error || !patient) return <div role="alert" className="m-8 rounded-xl border border-rose-200 bg-white p-5 text-sm text-rose-700">{error || "Data pasien tidak ditemukan."}</div>;

  return (
    <div className="patient-print-shell min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="patient-print-toolbar mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-semibold text-slate-900">Pratinjau rekam medis</p><p className="mt-1 text-xs text-slate-500">Unduh PDF A4 menggunakan template klinik.</p>{error && <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{error}</p>}</div>
        <div className="flex gap-2"><a href={`/patients/${patient.id}/record`} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Lihat ringkasan</a><button type="button" onClick={() => void downloadPdf()} disabled={downloading} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-wait disabled:opacity-70">{downloading ? "Membuat PDF..." : "Unduh PDF A4"}</button></div>
      </div>

      <article className="patient-print-page relative isolate mx-auto aspect-[210/297] min-h-[900px] max-w-4xl overflow-hidden bg-white px-4 py-6 text-slate-900 shadow-xl sm:px-8 sm:py-8" style={{ backgroundImage: "url('/images/medical-record-template-background.png')", backgroundSize: "100% 100%" }}>

        <header className="relative flex items-center gap-3 border-b-2 border-teal-700/70 pb-3">
          <img src="/dental-care-logo.png" alt="Logo Dental Care" className="size-14 shrink-0 object-contain" />
          <div className="min-w-0 flex-1 text-center"><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800">Dental Care · Klinik Gigi</p><h1 className="mt-1 text-xl font-bold uppercase tracking-wide text-teal-800">Kartu Rekam Medis Pasien</h1><p className="mt-1 text-[11px] font-medium !text-black">Dicetak {printDate}</p></div>
          <p className="w-14 shrink-0 text-right text-[10px] font-semibold !text-black">No. RM<br /><span className="text-sm text-slate-900">{String(patient.id).padStart(5, "0")}</span></p>
        </header>

        <section className="relative my-3 border-y border-slate-700/80 bg-white/60 px-1 py-2.5">
          <div className="grid grid-cols-2 gap-x-10 gap-y-1 text-xs sm:grid-cols-2">
            <Info label="Nama pasien" value={patient.fullName} />
            <Info label="Alamat" value={patient.address || "Belum diisi"} />
            <Info label="Umur" value={formatAge(patient.birthDate)} />
            <Info label="Tanggal lahir" value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("id-ID") : "Belum diisi"} />
            <Info label="Jenis kelamin" value={genderLabel(patient.gender)} />
            <Info label="No. HP" value={patient.phone || "Belum diisi"} />
          </div>
        </section>

        <div className="relative mb-2 flex items-end justify-between gap-4"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Riwayat pemeriksaan</h2><span className="shrink-0 text-xs font-semibold !text-black">{records.length} kunjungan</span></div>
        <table className="w-full table-fixed border-collapse text-center text-sm">
          <thead>
            <tr className="bg-teal-50 text-center text-[10px] font-bold uppercase tracking-wide text-slate-900">
              <th className="w-[12%] border border-slate-700 px-2 py-2">Tgl.</th>
              <th className="w-[38%] border border-slate-700 px-2 py-2">Anamnesis</th>
              <th className="w-[25%] border border-slate-700 px-2 py-2">Diagnosis</th>
              <th className="w-[25%] border border-slate-700 px-2 py-2">Terapi</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="h-[22mm] align-top">
                <td className="border border-slate-700 px-2 py-2 text-center text-[10px] font-medium text-slate-950">{new Date(record.scheduledAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" })}</td>
                <td className="border border-slate-700 px-2 py-2 text-center text-xs leading-relaxed text-slate-950">{record.notes || ""}</td>
                <td className="border border-slate-700 px-2 py-2 text-center text-xs text-slate-950">Belum dicatat</td>
                <td className="border border-slate-700 px-2 py-2 text-center text-xs font-medium text-slate-950">{record.treatment_name || ""}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 8 - records.length) }, (_, index) => <tr key={`blank-${index}`} className="h-[22mm]"><td className="border border-slate-700" /><td className="border border-slate-700" /><td className="border border-slate-700" /><td className="border border-slate-700" /></tr>)}
          </tbody>
        </table>

        <footer className="relative mt-3 flex justify-between text-[10px] font-medium !text-black">
          <span>Dokumen rekam medis Dental Care</span>
          <span>{genderLabel(patient.gender)} · {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("id-ID") : "Tanggal lahir belum diisi"}</span>
        </footer>
      </article>

      <style>{`@page { size: A4 portrait; margin: 10mm; } @media print { html, body { width: 100% !important; min-height: 0 !important; background: #fff !important; } body * { visibility: hidden !important; } .patient-print-shell, .patient-print-shell * { visibility: visible !important; } .patient-print-shell { position: static !important; inset: auto !important; z-index: auto !important; width: 100% !important; min-height: 0 !important; padding: 0 !important; background: #fff !important; } .patient-print-toolbar { display: none !important; } .patient-print-page { position: relative !important; width: 100% !important; max-width: none !important; min-height: 277mm !important; height: 277mm !important; box-sizing: border-box !important; margin: 0 !important; padding: 5mm !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; overflow: hidden !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; } .patient-print-page table { font-size: 11px !important; } .patient-print-page table tbody tr { height: 22mm !important; } }`}</style>
    </div>
  );
}

function Info({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={className}><p className="text-[10px] font-bold uppercase tracking-[0.08em] !text-black">{label}</p><p className="mt-1 text-sm font-bold leading-relaxed text-slate-950">{value}</p></div>;
}

function genderLabel(value?: string | null) {
  if (value === "Female" || value === "Perempuan") return "Perempuan";
  if (value === "Male" || value === "Laki-laki") return "Laki-laki";
  return value || "—";
}

function formatAge(value?: string | null) {
  if (!value) return "Belum diisi";
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return "Belum diisi";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? `${age} tahun` : "Belum diisi";
}
