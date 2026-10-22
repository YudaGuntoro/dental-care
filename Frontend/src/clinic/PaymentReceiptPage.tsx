"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type Patient = { id: number; fullName: string; phone?: string | null };
type VisitService = { treatment_name?: string | null; unitPrice: number; quantity: number };
type Visit = { id: number; treatment_name?: string | null; doctor_name?: string | null; scheduledAt: string; notes?: string | null; diagnosis?: string | null; procedureNotes?: string | null; prescription?: string | null; services?: VisitService[] };
type Payment = { id: number; patientId: number; appointmentId?: number | null; patient_name: string; amount: number; method: string; status: string; paidAt: string };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function PaymentReceiptPage({ paymentId }: { paymentId: number }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([apiGet<Payment[]>("/api/clinic/payments"), apiGet<Patient[]>("/api/clinic/patients"), apiGet<Visit[]>("/api/clinic/appointments")])
      .then(([payments, patients, visits]) => {
        if (!active) return;
        const selected = payments.find((item) => item.id === paymentId);
        if (!selected) throw new Error("Data pembayaran tidak ditemukan.");
        setPayment(selected);
        setPatient(patients.find((item) => item.id === selected.patientId) || null);
        setVisit(visits.find((item) => item.id === selected.appointmentId) || null);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Kuitansi tidak dapat dimuat."); });
    return () => { active = false; };
  }, [paymentId]);

  if (error) return <p role="alert" className="m-8 rounded-xl border border-rose-200 bg-white p-5 text-sm text-rose-700">{error}</p>;
  if (!payment) return <p className="p-8 text-sm text-slate-500">Memuat kuitansi...</p>;

  const services = visit?.services?.length ? visit.services : visit?.treatment_name ? [{ treatment_name: visit.treatment_name, unitPrice: payment.amount, quantity: 1 }] : [];
  const doctorNotes = [
    ["Keluhan / anamnesis", visit?.notes],
    ["Diagnosis", visit?.diagnosis],
    ["Tindakan", visit?.procedureNotes],
    ["Resep / instruksi", visit?.prescription],
  ].filter(([, value]) => value?.trim());
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900"><div className="receipt-toolbar mx-auto mb-5 flex max-w-[210mm] justify-between"><a href="/payments" className="text-sm font-semibold text-teal-800">Kembali ke pembayaran</a><button onClick={() => window.print()} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">Cetak kuitansi</button></div><article className="receipt relative mx-auto min-h-[277mm] w-full max-w-[210mm] overflow-hidden bg-white p-8 shadow-lg sm:p-12"><div aria-hidden="true" className="receipt-watermark pointer-events-none absolute inset-0 flex items-center justify-center text-[9rem] font-black uppercase tracking-[0.2em] text-teal-900/[0.04]">✚ Dental Care</div><div className="relative z-10"><header className="border-b border-dashed border-slate-400 pb-4 text-center"><img src="/dental-care-logo.png" alt="Dental Care" className="mx-auto mb-2 size-12 object-contain"/><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800">Dental Care</p><h1 className="mt-1 text-base font-black">KLINIK GIGI</h1><p className="mt-1 text-[11px] text-slate-500">Kuitansi pembayaran</p></header><div className="space-y-2 border-b border-dashed border-slate-400 py-4 text-xs"><Info label="No. kuitansi" value={`DC-${String(payment.id).padStart(6, "0")}`}/><Info label="Tanggal" value={new Date(payment.paidAt).toLocaleString("id-ID")}/><Info label="Pasien" value={patient?.fullName || payment.patient_name}/><Info label="Telepon" value={patient?.phone || "—"}/><Info label="Dokter" value={visit?.doctor_name || "Belum ditentukan"}/></div><div className="space-y-2 border-b border-dashed border-slate-400 py-4 text-xs"><div className="mb-2 flex justify-between border-b border-slate-200 pb-2 font-bold"><span>Rincian layanan</span><span>Harga</span></div>{services.length ? services.map((service, index) => <div key={`${service.treatment_name}-${index}`} className="flex justify-between gap-3"><span>{service.treatment_name || "Layanan"}{service.quantity > 1 ? ` ×${service.quantity}` : ""}</span><span className="font-semibold">{money(service.unitPrice * service.quantity)}</span></div>) : <Info label="Perawatan" value="Pembayaran umum"/>}</div>{doctorNotes.length > 0 && <div className="space-y-1 border-b border-dashed border-slate-400 py-4 text-xs"><p className="mb-2 font-bold">Catatan dokter</p>{doctorNotes.map(([label, value]) => <div key={label}><p className="text-slate-500">{label}</p><p className="whitespace-pre-wrap font-medium">{value}</p></div>)}</div>}<div className="space-y-2 border-b border-dashed border-slate-400 py-4 text-xs"><Info label="Metode" value={methodLabel(payment.method)}/><Info label="Status" value={payment.status === "Paid" ? "Lunas" : payment.status}/></div><div className="flex justify-between py-4 text-sm font-bold"><span>Total dibayar</span><span>{money(payment.amount)}</span></div><p className="border-t border-dashed border-slate-400 pt-4 text-center text-[11px] text-slate-500">Terima kasih telah mempercayakan perawatan gigi Anda kepada kami.</p></div></article><style>{`@page { size: A4 portrait; margin: 12mm; } @media print { html,body { background:#fff !important; } .receipt-toolbar { display:none !important; } .receipt { max-width:none !important; width:100% !important; min-height:0 !important; padding:8mm !important; box-shadow:none !important; } .receipt-watermark { display:flex !important; } .receipt * { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }`}</style></main>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><span className="text-slate-500">{label}</span><span className="max-w-[45mm] text-right font-semibold">{value}</span></div>;
}

function methodLabel(value: string) {
  if (value === "Cash") return "Tunai";
  if (value === "Card") return "Kartu";
  if (value === "BankTransfer") return "Transfer bank";
  if (value === "EWallet") return "Dompet digital";
  return value;
}
