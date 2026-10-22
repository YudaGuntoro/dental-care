import api, { ApiRequestOptions } from "@/utils/api";
import type { ApiListResponse } from "./PartService";

export type Customer = {
  id: number;
  customer_name: string;
  is_active: boolean;
  created_at: string;
};

export type CustomerPayload = Pick<Customer, "customer_name" | "is_active">;

export type CustomerQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

const CustomerService = {
  getCustomers: async (query: CustomerQuery = {}, options?: ApiRequestOptions) => {
    const response = await api.get<ApiListResponse<Customer>>("/api/customers", {
      ...options,
      params: query,
    });
    return response.data;
  },

  createCustomer: async (data: CustomerPayload, options?: ApiRequestOptions) => {
    const response = await api.post<{ success: boolean; message: string; data: Customer }>("/api/customers", data, options);
    return response.data;
  },

  updateCustomer: async (id: number, data: CustomerPayload, options?: ApiRequestOptions) => {
    const response = await api.put<{ success: boolean; message: string; data: Customer }>(`/api/customers/${id}`, data, options);
    return response.data;
  },

  deleteCustomer: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.delete<{ success: boolean; message: string }>(`/api/customers/${id}`, options);
    return response.data;
  },
};

export default CustomerService;
