import type { Metadata } from "next";
import ClinicPage from "@/clinic/ClinicPage";
export const metadata: Metadata = { title: "Treatments | Dental Care" };
export default function Page() { return <ClinicPage kind="treatments" />; }
