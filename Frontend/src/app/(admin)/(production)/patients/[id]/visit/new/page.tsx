import DoctorVisitPage from "@/clinic/DoctorVisitPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DoctorVisitPage patientId={Number(id)} />;
}
