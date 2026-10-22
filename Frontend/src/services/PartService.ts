import { getApiBaseUrl } from "@/lib/api";
import { getStoredToken } from "@/lib/auth";
import api, { ApiRequestOptions } from "@/utils/api";

export type ApiPagination = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

export type ApiListResponse<T> = {
  success: boolean;
  message: string;
  data: T[];
  pagination: ApiPagination;
};

export type Part = {
  id: number;
  part_number: string;
  part_name: string;
  timestamp: string;
};

export type PartPayload = Pick<
  Part,
  "part_number" | "part_name" | "timestamp"
>;

export type PartQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

const normalizeQuery = (query: PartQuery) => ({
  page: query.page,
  limit: query.limit,
  search: query.search,
});

const PartService = {
  downloadTemplate: async () => {
    const token = getStoredToken();
    const response = await fetch(`${getApiBaseUrl()}/api/parts/import-template`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) throw new Error("Failed to download the template. Please try again.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "Part-Master-Template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  },

  importParts: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post<{ success: boolean; message: string; data: { imported: number } }>(
      "/api/parts/import", form
    );
    return response.data;
  },

  getParts: async (query: PartQuery = {}, options?: ApiRequestOptions) => {
    const response = await api.get<ApiListResponse<Part>>("/api/parts", {
      ...options,
      params: normalizeQuery(query),
    });

    return response.data;
  },

  getPart: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: Part;
    }>(`/api/parts/${id}`, options);

    return response.data;
  },

  createPart: async (data: PartPayload, options?: ApiRequestOptions) => {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: Part;
    }>("/api/parts", data, options);

    return response.data;
  },

  updatePart: async (
    id: number,
    data: Partial<PartPayload>,
    options?: ApiRequestOptions
  ) => {
    const response = await api.put<{
      success: boolean;
      message: string;
      data: Part;
    }>(`/api/parts/${id}`, data, options);

    return response.data;
  },

  deletePart: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/api/parts/${id}`,
      options
    );

    return response.data;
  },
};

export default PartService;
