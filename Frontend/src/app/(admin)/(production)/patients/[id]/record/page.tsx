import type { Metadata } from "next";
import PatientMedicalRecordPreview from "@/clinic/PatientMedicalRecordPreview";

export const metadata: Metadata = { title: "Pratinjau Rekam Medis | Dental Care" };

export default async function PatientRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isInteger(patientId) || patientId < 1) return <p className="p-8 text-sm text-rose-700">Nomor pasien tidak valid.</p>;
  return <PatientMedicalRecordPreview patientId={patientId} />;
}
