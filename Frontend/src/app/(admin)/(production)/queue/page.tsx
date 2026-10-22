import type { Metadata } from "next";
import QueueControlPage from "@/clinic/QueueControlPage";

export const metadata: Metadata = { title: "Antrean | Dental Care" };

export default function Page() {
  return <QueueControlPage />;
}
