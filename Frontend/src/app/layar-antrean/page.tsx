import type { Metadata } from "next";
import PublicQueuePage from "@/clinic/PublicQueuePage";

export const metadata: Metadata = { title: "Layar Antrean" };

export default function QueueDisplayRoute() {
  return <PublicQueuePage />;
}
