import type { Metadata } from "next";
import PublicQueuePage from "@/clinic/PublicQueuePage";

export const metadata: Metadata = { title: "Cetak Antrean Klinik" };

export default function KioskQueueRoute() {
  return <PublicQueuePage kioskPrint />;
}
