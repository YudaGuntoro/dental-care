import type { Metadata } from "next";
import DailyReportsPage from "@/clinic/DailyReportsPage";

export const metadata: Metadata = { title: "Laporan Harian | Dental Care" };

export default function Page() {
  return <DailyReportsPage />;
}
