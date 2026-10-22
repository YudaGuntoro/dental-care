import type { Metadata } from "next";
import QueuePrintPage from "@/clinic/QueuePrintPage";

export const metadata: Metadata = { title: "Cetak Antrean | Dental Care" };

export default function Page() {
  return <QueuePrintPage />;
}
