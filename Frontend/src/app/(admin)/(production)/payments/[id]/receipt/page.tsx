import type { Metadata } from "next";
import PaymentReceiptPage from "@/clinic/PaymentReceiptPage";

export const metadata: Metadata = { title: "Kuitansi Pembayaran | Dental Care" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paymentId = Number(id);
  if (!Number.isInteger(paymentId) || paymentId < 1) return <p className="p-8 text-sm text-rose-700">Nomor pembayaran tidak valid.</p>;
  return <PaymentReceiptPage paymentId={paymentId} />;
}
