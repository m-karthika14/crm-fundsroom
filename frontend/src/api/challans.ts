import { apiClient } from "./client";
import type { Challan, ChallanStatus, Paginated } from "../types";

export interface ListChallansParams {
  page?: number;
  limit?: number;
  status?: ChallanStatus;
  customerId?: string;
}

export async function listChallans(params: ListChallansParams): Promise<Paginated<Challan>> {
  const res = await apiClient.get<Paginated<Challan>>("/challans", { params });
  return res.data;
}

export async function getChallan(id: string): Promise<Challan> {
  const res = await apiClient.get<Challan>(`/challans/${id}`);
  return res.data;
}

export interface ChallanItemInput {
  productId: string;
  quantity: number;
}

export async function createChallan(customerId: string, items: ChallanItemInput[]): Promise<Challan> {
  const res = await apiClient.post<Challan>("/challans", { customerId, items });
  return res.data;
}

export async function updateChallan(
  id: string,
  input: { customerId?: string; items?: ChallanItemInput[] }
): Promise<Challan> {
  const res = await apiClient.put<Challan>(`/challans/${id}`, input);
  return res.data;
}

export async function confirmChallan(id: string): Promise<Challan> {
  const res = await apiClient.post<Challan>(`/challans/${id}/confirm`);
  return res.data;
}

export async function cancelChallan(id: string): Promise<Challan> {
  const res = await apiClient.post<Challan>(`/challans/${id}/cancel`);
  return res.data;
}

// Downloads and saves the PDF locally. A plain <a href> to the API
// wouldn't work here -- our auth is a JWT header, not a cookie, so the
// browser would hit the endpoint unauthenticated. Fetching through
// apiClient (which attaches the header) as a blob, then triggering a
// save via a throwaway <a download>, gets the same "click and it
// downloads" result while keeping the request authenticated.
export async function downloadChallanPdf(id: string, challanNumber: string): Promise<void> {
  const res = await apiClient.get(`/challans/${id}/pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${challanNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
