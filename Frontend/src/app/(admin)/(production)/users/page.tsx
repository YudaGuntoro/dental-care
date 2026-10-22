import type { Metadata } from "next";
import UserTable from "@/components/user/UserTable";

export const metadata: Metadata = { title: "Users | Dental Care" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Dental Care</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Users</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Manage system accounts, access roles, and active user status.
        </p>
      </div>
      <UserTable />
    </div>
  );
}
