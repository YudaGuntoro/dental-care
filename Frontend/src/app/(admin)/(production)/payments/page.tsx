import type { Metadata } from "next";
import ClinicPage from "@/clinic/ClinicPage";
export const metadata: Metadata = { title: "Payments | Dental Care" };
export default function Page() { return <ClinicPage kind="payments" />; }
