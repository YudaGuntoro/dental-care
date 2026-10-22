import api, { ApiRequestOptions } from "@/utils/api";
import { getApiBaseUrl } from "@/lib/api";
import { getStoredToken } from "@/lib/auth";
import type { ApiListResponse } from "@/services/PartService";

export type StockMovementType = "IN" | "OUT";

export type StockMovement = {
  id: number;
  movement_type: StockMovementType;
  part_id: number;
  part_number: string;
  part_name: string;
  location_id: number;
  location: string;
  quantity: number;
  customer_id?: number | null;
  customer_name?: string | null;
  timestamp: string;
};

export type StockMovementPayload = Pick<
  StockMovement,
  "part_number" | "part_name" | "location" | "quantity" | "customer_id" | "customer_name" | "timestamp"
>;

export type StockMovementQuery = {
  date?: string;
  page?: number;
  limit?: number;
  search?: string;
  type?: StockMovementType;
};

export type ItemCheckResult = {
  part_name: string;
  part_number: string;
  location: string;
  stock_in_qty: number;
  stock_out_qty: number;
  remaining_qty: number;
  last_timestamp: string;
};

export type ItemCheckQuery = {
  partName?: string;
  partNumber?: string;
  location?: string;
};

const getFileNameFromContentDisposition = (value: string | null) => {
  const match = value?.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
  const fileName = match?.[1] || match?.[2];
  return fileName ? decodeURIComponent(fileName) : null;
};

const StockMovementService = {
  getMovements: async (
    query: StockMovementQuery = {},
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiListResponse<StockMovement>>(
      "/api/stock-movements",
      {
        ...options,
        params: query,
      }
    );

    return response.data;
  },

  createMovement: async (
    type: StockMovementType,
    data: StockMovementPayload,
    options?: ApiRequestOptions
  ) => {
    const endpoint = type === "IN" ? "/api/stock-movements/in" : "/api/stock-movements/out";
    const response = await api.post<{
      success: boolean;
      message: string;
      data: StockMovement;
    }>(endpoint, data, options);

    return response.data;
  },

  deleteMovement: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/api/stock-movements/${id}`,
      options
    );

    return response.data;
  },

  checkItem: async (query: string | ItemCheckQuery, options?: ApiRequestOptions) => {
    const params =
      typeof query === "string"
        ? { partName: query }
        : {
            location: query.location,
            partName: query.partName,
            partNumber: query.partNumber,
          };

    const response = await api.get<{
      success: boolean;
      message: string;
      data: ItemCheckResult[];
    }>("/api/stock-movements/item-check", {
      ...options,
      params,
    });

    return response.data;
  },

  exportStockOpname: async (partName?: string) => {
    const params = new URLSearchParams();
    if (partName?.trim()) {
      params.set("partName", partName.trim());
    }

    const token = getStoredToken();
    const response = await fetch(
      `${getApiBaseUrl()}/api/stock-movements/stock-opname/export${params.toString() ? `?${params}` : ""}`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to export stock opname (${response.status})`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      getFileNameFromContentDisposition(response.headers.get("content-disposition")) ??
      `Stock-Opname-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export default StockMovementService;
