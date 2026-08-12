// product.validation.ts: the zod "shape" each product request must
// match. Plugged into validateBody()/validateQuery() on the routes.

import { z } from "zod";

// Rules for POST /products
export const createProductSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }),
  sku: z.string().trim().min(1, { message: "SKU is required" }),
  category: z.string().trim().min(1, { message: "Category is required" }),
  unitPrice: z.coerce.number().positive({ message: "Unit price must be greater than 0" }),
  currentStock: z.coerce.number().int().nonnegative().default(0),
  minStockAlert: z.coerce.number().int().nonnegative().default(0),
  location: z.string().trim().min(1, { message: "Location is required" }),
  imageUrl: z.string().trim().optional(),
});

// Rules for PUT /products/:id -- every field optional (partial update).
// currentStock is deliberately NOT in this schema, and .strict() means
// zod rejects the request outright if it's included in the body -- the
// plan requires stock changes to only ever happen through the
// stock-movement endpoint, so every change gets logged.
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    sku: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    unitPrice: z.coerce.number().positive({ message: "Unit price must be greater than 0" }).optional(),
    minStockAlert: z.coerce.number().int().nonnegative().optional(),
    location: z.string().trim().min(1).optional(),
    imageUrl: z.string().trim().optional(),
  })
  .strict();

// Rules for GET /products query params (?page=&limit=&q=&lowStock=true)
export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().optional(),
  // Query params always arrive as strings, so "true"/"false" text needs
  // an explicit comparison rather than z.coerce.boolean() (which would
  // treat the non-empty string "false" as truthy).
  lowStock: z.string().optional().transform((v) => v === "true"),
});

// Rules for POST /products/:id/stock-movement
export const createStockMovementSchema = z.object({
  quantityChanged: z.coerce.number().int().positive({ message: "quantityChanged must be a positive integer" }),
  type: z.enum(["IN", "OUT"], { errorMap: () => ({ message: "Type must be IN or OUT" }) }),
  reason: z.string().trim().min(1, { message: "Reason is required" }),
});

// Rules for GET /products/:id/stock-history query params
export const stockHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Rules for POST /products/:id/image-upload-url
export const imageUploadUrlSchema = z.object({
  fileName: z.string().trim().min(1, { message: "fileName is required" }),
  fileType: z
    .string()
    .trim()
    .regex(/^image\//, { message: "fileType must be an image MIME type, e.g. image/png" }),
});
