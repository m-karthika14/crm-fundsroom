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
