import type { Metadata } from "next";
import ClinicDashboard from "@/clinic/ClinicDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Dental Care Dashboard",
  description: "Patient and clinic operations dashboard",
};

export default function DentalCareHome() {
  return <ClinicDashboard />;
}
