import type { Metadata } from "next";
import PublicQueuePage from "@/clinic/PublicQueuePage";

export const metadata: Metadata = { title: "Pratinjau Layar Antrean" };

export default function QueueDisplayDemoRoute() {
  return <PublicQueuePage forceDemo />;
}
