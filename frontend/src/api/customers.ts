import { apiClient } from "./client";
import type { Customer, CustomerNote, CustomerStatus, CustomerType, Paginated } from "../types";

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: CustomerStatus;
  type?: CustomerType;
}

export async function listCustomers(params: ListCustomersParams): Promise<Paginated<Customer>> {
  const res = await apiClient.get<Paginated<Customer>>("/customers", { params });
  return res.data;
}

export async function getCustomer(id: string): Promise<Customer> {
  const res = await apiClient.get<Customer>(`/customers/${id}`);
  return res.data;
}

export interface CustomerInput {
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  type: CustomerType;
  address: string;
  status?: CustomerStatus;
  followUpDate?: string;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const res = await apiClient.post<Customer>("/customers", input);
  return res.data;
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  const res = await apiClient.put<Customer>(`/customers/${id}`, input);
  return res.data;
}

export async function addCustomerNote(id: string, note: string): Promise<CustomerNote> {
  const res = await apiClient.post<CustomerNote>(`/customers/${id}/notes`, { note });
  return res.data;
}
