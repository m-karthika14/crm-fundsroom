// Shared types mirroring the backend's Prisma models + API response
// shapes. Keeping these in one file makes it easy to see the whole
// data model at a glance.

export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type CustomerType = "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";

export interface CustomerNote {
  id: string;
  customerId: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string | null;
  gstNumber: string | null;
  type: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string | null;
  createdAt: string;
  notes?: CustomerNote[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: string; // Prisma Decimal serializes as a numeric string
  currentStock: number;
  minStockAlert: number;
  location: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export type StockMovementType = "IN" | "OUT";

export interface StockMovement {
  id: string;
  productId: string;
  quantityChanged: number;
  type: StockMovementType;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export type ChallanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  unitPriceSnapshot: string;
  quantity: number;
}

export interface ChallanCustomerSummary {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  type?: CustomerType;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  totalQuantity: number;
  status: ChallanStatus;
  createdBy: string;
  createdAt: string;
  items: ChallanItem[];
  customer: ChallanCustomerSummary;
}

// The pagination envelope every list endpoint returns.
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// The consistent error shape the backend's central error handler sends.
export interface ApiErrorBody {
  error: string;
  details?: Array<{ field?: string; message: string } | Record<string, unknown>>;
}
