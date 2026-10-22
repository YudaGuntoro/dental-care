"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import CustomerService, { Customer, CustomerPayload } from "@/services/CustomerService";

type CustomerModalProps = {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSuccess: () => void;
};

const emptyForm = (): CustomerPayload => ({ customer_name: "", is_active: true });
const inputClass = "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function CustomerModal({ isOpen, customer, onClose, onSuccess }: CustomerModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<CustomerPayload>(() => emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(customer ? { customer_name: customer.customer_name, is_active: customer.is_active } : emptyForm());
  }, [customer, isOpen]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (customer) {
        await CustomerService.updateCustomer(customer.id, form);
        toast.success({ title: "Success", message: "Customer updated successfully" });
      } else {
        await CustomerService.createCustomer(form);
        toast.success({ title: "Success", message: "Customer created successfully" });
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error({ title: "Error", message: error instanceof Error ? error.message : "Failed to save customer" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] p-6">
      <h3 className="mb-4 pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">{customer ? "Update Customer" : "Create Customer"}</h3>
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name</label>
          <input className={inputClass} onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))} placeholder="Enter customer name" required value={form.customer_name} />
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          <input checked={form.is_active} className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" />
          Active customer
        </label>
        <div className="mt-2 flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : customer ? "Update" : "Create"}</button>
        </div>
      </form>
    </Modal>
  );
}
