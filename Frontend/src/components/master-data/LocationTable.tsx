"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CreateButton from "@/components/common/CreateButton";
import DataTable, { DataTableColumn, DataTablePagination } from "@/components/common/DataTable";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import RowActions from "@/components/common/RowActions";
import LocationService, { Location } from "@/services/LocationService";
import LocationModal from "./LocationModal";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

const baseColumns: DataTableColumn<Location>[] = [
  {
    key: "location_code",
    header: "Location Code",
    sortable: true,
  },
  {
    key: "location_name",
    header: "Location Name",
    sortable: true,
  },
  {
    key: "description",
    header: "Description",
  },
  {
    key: "is_active",
    header: "Status",
    render: (value) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${value ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {value ? "ACTIVE" : "INACTIVE"}
      </span>
    ),
  },
  {
    key: "created_at",
    header: "Created At",
    render: (value) => (typeof value === "string" ? formatDate(value) : "-"),
  },
];

export default function LocationTable() {
  const toast = useToast();
  const lastErrorRef = useRef<string | null>(null);
  const [data, setData] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<DataTablePagination>({
    limit: 10,
    page: 1,
    total: 0,
    totalPage: 1,
  });
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await LocationService.getLocations({
        limit: pagination.limit,
        page: pagination.page,
        search,
      });
      setData(result.data);
      setPagination(result.pagination);
    } catch (fetchError: unknown) {
      setError(getErrorMessage(fetchError, "Failed to fetch locations"));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit, pagination.page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    toast.error({
      message: error,
      title: "Failed to load locations",
    });
  }, [error, toast]);

  const handleCreate = () => {
    setSelectedLocation(null);
    setIsModalOpen(true);
  };

  const handleUpdate = useCallback((location: Location) => {
    setSelectedLocation(location);
    setIsModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((location: Location) => {
    setLocationToDelete(location);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!locationToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await LocationService.deleteLocation(locationToDelete.id);
      toast.success({ title: "Success", message: "Location deleted successfully" });
      await load();
      setIsDeleteModalOpen(false);
      setLocationToDelete(null);
    } catch (deleteError: unknown) {
      toast.error({
        title: "Error",
        message: getErrorMessage(deleteError, "Failed to delete location"),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo<DataTableColumn<Location>[]>(
    () => [
      ...baseColumns,
      {
        align: "center",
        header: "Action",
        key: "action",
        render: (_, row) => (
          <RowActions
            onEdit={() => handleUpdate(row)}
            onDelete={() => handleDeleteClick(row)}
          />
        ),
      },
    ],
    [handleDeleteClick, handleUpdate]
  );

  return (
    <>
      <DataTable
        actions={<CreateButton onClick={handleCreate} />}
        columns={columns}
        data={data}
        emptyMessage="No locations found"
        error={error}
        isLoading={isLoading}
        minWidth="820px"
        onLimitChange={(limit) => setPagination((current) => ({ ...current, limit, page: 1 }))}
        onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
        onSearchChange={(value) => {
          setSearch(value);
          setPagination((current) => ({ ...current, page: 1 }));
        }}
        pagination={pagination}
        rowKey="id"
        searchPlaceholder="Search location code, name, or description"
        searchValue={search}
      />

      <LocationModal
        isOpen={isModalOpen}
        location={selectedLocation}
        onClose={() => setIsModalOpen(false)}
        onSuccess={load}
      />

      <ConfirmModal
        confirmText="Delete"
        isDestructive
        isLoading={isDeleting}
        isOpen={isDeleteModalOpen}
        message={`Are you sure you want to delete location "${locationToDelete?.location_code}"?`}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
          }
        }}
        onConfirm={confirmDelete}
        title="Delete Location"
      />
    </>
  );
}
