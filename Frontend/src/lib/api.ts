import type { ApiResponse } from "./types";
import { clearAuthSession, getStoredToken, redirectToSignIn } from "./auth";

// Browser API calls must stay on the page's origin, including HTTPS on the VPS.
export function getApiBaseUrl() {
  return "";
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getStoredToken();
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  if (!headers.has("Content-Type") && init.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });
  const text = await response.text();
  let payload: ApiResponse<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiResponse<T>;
    } catch {
      // Proxies can return HTML or plain text instead of the JSON API contract.
      throw new Error(response.ok ? "Invalid response from server. Please try again." : `Request failed with status ${response.status}. Please try again.`);
    }
  }

  if (response.status === 401) {
    clearAuthSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/signin")) {
      redirectToSignIn();
    }
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message?.trim() || `Request failed with status ${response.status}`);
  }

  return payload ? payload.data : (undefined as T);
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPut<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, {
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string) {
  return apiRequest<T>(path, {
    method: "DELETE",
  });
}
