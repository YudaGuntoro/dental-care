"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CreateButton from "@/components/common/CreateButton";
import DataTable, { DataTableColumn, DataTablePagination } from "@/components/common/DataTable";
import RowActions from "@/components/common/RowActions";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import CustomerService, { Customer } from "@/services/CustomerService";
import CustomerModal from "./CustomerModal";

export default function CustomerTable() {
  const toast = useToast();
  const lastError = useRef<string | null>(null);
  const [data, setData] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<DataTablePagination>({ page: 1, limit: 10, total: 0, totalPage: 1 });
  const [selected, setSelected] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await CustomerService.getCustomers({ page: pagination.page, limit: pagination.limit, search });
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit, pagination.page, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (error && error !== lastError.current) {
      lastError.current = error;
      toast.error({ title: "Failed to load customers", message: error });
    }
  }, [error, toast]);

  const columns = useMemo<DataTableColumn<Customer>[]>(() => [
    { key: "customer_name", header: "Customer Name", sortable: true },
    { key: "is_active", header: "Status", render: (value) => <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${value ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{value ? "ACTIVE" : "INACTIVE"}</span> },
    { key: "created_at", header: "Created At", render: (value) => typeof value === "string" ? new Date(value).toLocaleDateString("en-GB") : "-" },
    { key: "action", header: "Action", align: "center", render: (_, row) => <RowActions onEdit={() => { setSelected(row); setIsModalOpen(true); }} onDelete={() => setToDelete(row)} /> },
  ], []);

  async function confirmDelete() {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await CustomerService.deleteCustomer(toDelete.id);
      toast.success({ title: "Success", message: "Customer deleted successfully" });
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error({ title: "Error", message: err instanceof Error ? err.message : "Failed to delete customer" });
    } finally {
      setIsDeleting(false);
    }
  }

  return <>
    <DataTable actions={<CreateButton onClick={() => { setSelected(null); setIsModalOpen(true); }} />} columns={columns} data={data} emptyMessage="No customers found" error={error} isLoading={isLoading} minWidth="720px" onLimitChange={(limit) => setPagination((current) => ({ ...current, limit, page: 1 }))} onPageChange={(page) => setPagination((current) => ({ ...current, page }))} onSearchChange={(value) => { setSearch(value); setPagination((current) => ({ ...current, page: 1 })); }} pagination={pagination} rowKey="id" searchPlaceholder="Search customers" searchValue={search} />
    <CustomerModal customer={selected} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={load} />
    <ConfirmModal confirmText="Delete" isDestructive isLoading={isDeleting} isOpen={Boolean(toDelete)} message={`Delete customer "${toDelete?.customer_name}"?`} onClose={() => !isDeleting && setToDelete(null)} onConfirm={() => void confirmDelete()} title="Delete Customer" />
  </>;
}
