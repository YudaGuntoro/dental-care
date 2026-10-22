"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { apiPost, apiPut } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import type { PicCard, PicCardPayload, ShiftMaster } from "./types";

interface PicCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  card: PicCard | null;
  shifts: ShiftMaster[];
}

const emptyForm = (shiftId = 0): PicCardPayload => ({
  card_uid: "",
  employee_no: "",
  full_name: "",
  department: "Warehouse",
  shift_id: shiftId,
  is_active: true,
});

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function PicCardModal({
  isOpen,
  onClose,
  onSuccess,
  card,
  shifts,
}: PicCardModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<PicCardPayload>(() => emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setForm(card
      ? {
          card_uid: card.card_uid,
          employee_no: card.employee_no,
          full_name: card.full_name,
          department: card.department,
          shift_id: card.shift_id,
          is_active: card.is_active,
        }
      : emptyForm(shifts[0]?.id || 0));
  }, [card, isOpen, shifts]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (card) {
        await apiPut<PicCard>(`/api/production/pic-cards/${card.id}`, form);
        toast.success({ title: "Success", message: "Staff list updated successfully" });
      } else {
        await apiPost<PicCard>("/api/production/pic-cards", form);
        toast.success({ title: "Success", message: "Staff list created successfully" });
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error({
        title: "Error",
        message: error instanceof Error
          ? error.message
          : `Failed to ${card ? "update" : "create"} staff list`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-6 sm:p-7">
      <h3 className="mb-1 pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
        {card ? "Update Staff List" : "Create Staff List"}
      </h3>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        {card ? "Update staff information and access status." : "Add a staff member for warehouse job scanning."}
      </p>

      <form className="grid gap-x-4 gap-y-5 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Card UID</label>
          <input className={inputClass} name="card_uid" onChange={(event) => setForm((current) => ({ ...current, card_uid: event.target.value }))} placeholder="Enter card UID" required value={form.card_uid} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Employee No</label>
          <input className={inputClass} name="employee_no" onChange={(event) => setForm((current) => ({ ...current, employee_no: event.target.value }))} placeholder="Enter employee number" required value={form.employee_no} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Staff Name</label>
          <input className={inputClass} name="full_name" onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="Enter staff name" required value={form.full_name} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
          <input className={inputClass} name="department" onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} placeholder="Enter department" required value={form.department} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Shift</label>
          <select className={inputClass} name="shift_id" onChange={(event) => setForm((current) => ({ ...current, shift_id: Number(event.target.value) }))} required value={form.shift_id}>
            <option disabled value={0}>Select shift</option>
            {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.shift_name}</option>)}
          </select>
        </div>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
          <input checked={form.is_active} className="size-4 rounded border-gray-300 accent-[#184F8F]" onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" />
          Active
        </label>
        <div className="mt-1 flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:col-span-2">
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50" disabled={isSubmitting || !form.shift_id} type="submit">
            {isSubmitting ? "Saving..." : card ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
