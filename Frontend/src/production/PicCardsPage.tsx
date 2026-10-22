"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CreateButton from "@/components/common/CreateButton";
import DataTable, { DataTableColumn } from "@/components/common/DataTable";
import RowActions from "@/components/common/RowActions";
import { ConfirmModal } from "@/components/ui/modal/ConfirmModal";
import { useToast } from "@/context/ToastContext";
import { apiDelete, apiGet } from "@/lib/api";
import PicCardModal from "./PicCardModal";
import type { PicCard, ShiftMaster } from "./types";
import { formatDateTime } from "./ui";

export default function PicCardsPage() {
  const toast = useToast();
  const [items, setItems] = useState<PicCard[]>([]);
  const [shifts, setShifts] = useState<ShiftMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<PicCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PicCard | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cardsResult, shiftsResult] = await Promise.all([
        apiGet<PicCard[]>("/api/production/pic-cards"),
        apiGet<ShiftMaster[]>("/api/production/shift-masters"),
      ]);
      setItems(cardsResult);
      setShifts(shiftsResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load staff list.";
      setError(message);
      toast.error({ title: "Failed to load staff list", message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return keyword ? items.filter((item) =>
      `${item.full_name} ${item.employee_no} ${item.department} ${item.card_uid}`.toLowerCase().includes(keyword)
    ) : items;
  }, [items, search]);
  const totalPage = Math.max(1, Math.ceil(filteredItems.length / limit));
  const currentPage = Math.min(page, totalPage);
  const visibleItems = filteredItems.slice((currentPage - 1) * limit, currentPage * limit);

  const editCard = useCallback((item: PicCard) => {
    setEditingItem(item);
    setIsModalOpen(true);
  }, []);

  const columns = useMemo<DataTableColumn<PicCard>[]>(() => [
    { key: "full_name", header: "Staff Name" },
    { key: "employee_no", header: "Employee No" },
    { key: "department", header: "Department" },
    { key: "last_scanned_at", header: "Last Scan", render: (_, row) => formatDateTime(row.last_scanned_at) },
    {
      key: "is_active",
      header: "Status",
      render: (value) => <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${value ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>
        {value ? "ACTIVE" : "INACTIVE"}
      </span>,
    },
    {
      key: "action",
      header: "Action",
      align: "center",
      render: (_, row) => <RowActions onEdit={() => editCard(row)} onDelete={() => setItemToDelete(row)} deleteDisabled={deletingId === row.id} />,
    },
  ], [deletingId, editCard]);

  async function confirmDeleteCard() {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    try {
      await apiDelete<boolean>(`/api/production/pic-cards/${itemToDelete.id}`);
      toast.success({ message: "Staff list deleted successfully." });
      setItemToDelete(null);
      await load();
    } catch (err) {
      toast.error({ message: err instanceof Error ? err.message : "Failed to delete staff list." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#184F8F]">Master Data</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Staff List</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Warehouse staff list available for job scanning.</p>
      </div>

      <DataTable
        actions={<CreateButton onClick={() => { setEditingItem(null); setIsModalOpen(true); }} />}
        columns={columns}
        data={visibleItems}
        emptyMessage="No staff found"
        error={error}
        isLoading={loading}
        minWidth="900px"
        onLimitChange={(value) => { setLimit(value); setPage(1); }}
        onPageChange={setPage}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        pagination={{ page: currentPage, limit, total: filteredItems.length, totalPage }}
        rowKey="id"
        searchPlaceholder="Search staff"
        searchValue={search}
      />

      <ConfirmModal
        confirmText="Delete"
        isDestructive
        isLoading={deletingId !== null}
        isOpen={Boolean(itemToDelete)}
        message={itemToDelete ? `Delete staff list for "${itemToDelete.full_name}"?` : ""}
        onClose={() => { if (!deletingId) setItemToDelete(null); }}
        onConfirm={() => void confirmDeleteCard()}
        title="Delete Staff List"
      />
      <PicCardModal
        card={editingItem}
        isOpen={isModalOpen}
        onClose={() => { setEditingItem(null); setIsModalOpen(false); }}
        onSuccess={() => void load()}
        shifts={shifts}
      />
    </div>
  );
}
