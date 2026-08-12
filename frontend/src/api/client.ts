// client.ts: the one axios instance the whole app uses.
//
// Two things happen here that every request/response needs, so they
// live in one place instead of being repeated per API call:
// 1. Request interceptor: attaches the JWT from localStorage, if any.
// 2. Response interceptor: if the backend says the token is invalid/
//    expired (401), clear it and send the user back to /login instead
//    of letting every page handle that case separately.

import axios from "axios";
import type { ApiErrorBody } from "../types";

export const TOKEN_STORAGE_KEY = "fundsroom_token";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      // A full reload (not client-side navigation) guarantees every
      // bit of in-memory app state gets wiped along with the token.
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Every controller in the backend throws errors in the same
// { error, details } shape (see backend/src/middleware/errorHandler.ts).
// This helper pulls a human-readable message out of any axios error,
// whether it came from that shape, a network failure, or something
// unexpected.
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (err.response?.data?.error) {
      return err.response.data.error;
    }
    if (err.request) {
      return "Could not reach the server. Check your connection and try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

// Field-level validation errors (from zod, via validateBody/validateQuery)
// come back as details: [{ field, message }]. This pulls that array out
// safely, or returns an empty list for error shapes that don't have it.
export function getFieldErrors(err: unknown): Record<string, string> {
  if (axios.isAxiosError<ApiErrorBody>(err) && Array.isArray(err.response?.data?.details)) {
    const fields: Record<string, string> = {};
    for (const detail of err.response.data.details) {
      if ("field" in detail && "message" in detail && typeof detail.field === "string") {
        fields[detail.field] = String(detail.message);
      }
    }
    return fields;
  }
  return {};
}

export interface InsufficientStockDetail {
  productId: string;
  productName: string;
  available: number;
  requested: number;
}

// POST /challans/:id/confirm's 400 details are shaped differently from
// field-validation errors -- [{ productId, productName, available,
// requested }], naming exactly which product(s) fell short and by how
// much (see Part F of the plan).
export function getInsufficientStockDetails(err: unknown): InsufficientStockDetail[] {
  if (axios.isAxiosError<ApiErrorBody>(err) && Array.isArray(err.response?.data?.details)) {
    const details: InsufficientStockDetail[] = [];
    for (const d of err.response.data.details) {
      if ("productName" in d && "available" in d && "requested" in d) {
        details.push(d as unknown as InsufficientStockDetail);
      }
    }
    return details;
  }
  return [];
}
