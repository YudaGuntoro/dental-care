"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  dashboard: "Dashboard", queue: "Antrean", appointments: "Janji Temu", "follow-ups": "Pengingat Pasien", patients: "Pasien", doctors: "Dokter", treatments: "Perawatan / Layanan", payments: "Pembayaran", users: "Pengguna", doctor: "Ruang Dokter", print: "Cetak", record: "Rekam medis", visit: "Pemeriksaan baru",
};

export default function AdminBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const crumbs = parts.filter((part) => !/^\d+$/.test(part)).map((part, index, visibleParts) => ({ label: labels[part] || part, href: `/${visibleParts.slice(0, index + 1).join("/")}` }));
  return <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 px-1 text-xs font-medium text-slate-500 dark:text-slate-400"><Link href="/" className="hover:text-teal-700">Dashboard</Link>{crumbs.map((crumb, index) => <span key={crumb.href} className="flex items-center gap-2"><span aria-hidden="true">/</span>{index === crumbs.length - 1 ? <span className="text-slate-800 dark:text-slate-200">{crumb.label}</span> : <Link href={crumb.href} className="hover:text-teal-700">{crumb.label}</Link>}</span>)}</nav>;
}
