import React from "react";
import {
  CalenderIcon,
  DocsIcon,
  GridIcon,
  ListIcon,
  TableIcon,
} from "../icons/index";

export type NavSubItem = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
};

export type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavSubItem[];
};

export const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <ListIcon />,
    name: "Antrean",
    subItems: [
      { name: "Kelola Antrean", path: "/queue" },
      { name: "Cetak Tiket Antrean", path: "/queue/print" },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Resepsionis",
    subItems: [
      { name: "Janji Temu", path: "/appointments" },
      { name: "Tindak Lanjut", path: "/follow-ups" },
    ],
  },
  {
    icon: <TableIcon />,
    name: "Data Utama",
    subItems: [
      { name: "Daftar Pasien", path: "/patients" },
      { name: "Daftar Dokter", path: "/doctors" },
      { name: "Perawatan / Layanan", path: "/treatments" },
    ],
  },
  {
    icon: <DocsIcon />,
    name: "Klinik",
    subItems: [
      { name: "Ruang Dokter", path: "/doctor" },
      { name: "Pembayaran", path: "/payments" },
      { name: "Pengguna", path: "/users" },
    ],
  },
];
