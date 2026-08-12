import { apiClient } from "./client";
import type { Paginated, Product, StockMovement, StockMovementType } from "../types";

export interface ListProductsParams {
  page?: number;
  limit?: number;
  q?: string;
  lowStock?: boolean;
}

export async function listProducts(params: ListProductsParams): Promise<Paginated<Product>> {
  const res = await apiClient.get<Paginated<Product>>("/products", { params });
  return res.data;
}

export async function getProduct(id: string): Promise<Product> {
  const res = await apiClient.get<Product>(`/products/${id}`);
  return res.data;
}

export interface ProductInput {
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock?: number;
  minStockAlert?: number;
  location: string;
  imageUrl?: string;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const res = await apiClient.post<Product>("/products", input);
  return res.data;
}

// currentStock is deliberately not part of this type -- the backend
// rejects it on PUT, stock only changes via createStockMovement below.
export type ProductUpdateInput = Partial<Omit<ProductInput, "currentStock">>;

export async function updateProduct(id: string, input: ProductUpdateInput): Promise<Product> {
  const res = await apiClient.put<Product>(`/products/${id}`, input);
  return res.data;
}

export async function createStockMovement(
  id: string,
  input: { quantityChanged: number; type: StockMovementType; reason: string }
): Promise<{ product: Product; movement: StockMovement }> {
  const res = await apiClient.post(`/products/${id}/stock-movement`, input);
  return res.data;
}

export async function getStockHistory(
  id: string,
  params: { page?: number; limit?: number }
): Promise<Paginated<StockMovement>> {
  const res = await apiClient.get<Paginated<StockMovement>>(`/products/${id}/stock-history`, { params });
  return res.data;
}
