import api, { ApiRequestOptions } from "@/utils/api";
import type { ApiListResponse } from "@/services/PartService";

export type Location = {
  id: number;
  location_code: string;
  location_name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
};

export type LocationPayload = Pick<
  Location,
  "location_code" | "location_name" | "description" | "is_active"
>;

export type LocationQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

const LocationService = {
  getLocations: async (query: LocationQuery = {}, options?: ApiRequestOptions) => {
    const response = await api.get<ApiListResponse<Location>>("/api/locations", {
      ...options,
      params: query,
    });

    return response.data;
  },

  createLocation: async (data: LocationPayload, options?: ApiRequestOptions) => {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: Location;
    }>("/api/locations", data, options);

    return response.data;
  },

  updateLocation: async (
    id: number,
    data: Partial<LocationPayload>,
    options?: ApiRequestOptions
  ) => {
    const response = await api.put<{
      success: boolean;
      message: string;
      data: Location;
    }>(`/api/locations/${id}`, data, options);

    return response.data;
  },

  deleteLocation: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/api/locations/${id}`,
      options
    );

    return response.data;
  },
};

export default LocationService;
