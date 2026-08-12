// challan.validation.ts: the zod "shape" each challan request must
// match. Plugged into validateBody()/validateQuery() on the routes.

import { z } from "zod";

const challanItemSchema = z.object({
  productId: z.string().uuid({ message: "productId must be a valid id" }),
  quantity: z.coerce.number().int().positive({ message: "quantity must be a positive integer" }),
});

// Rules for POST /challans
export const createChallanSchema = z.object({
  customerId: z.string().uuid({ message: "customerId must be a valid id" }),
  items: z.array(challanItemSchema).min(1, { message: "At least one item is required" }),
});

// Rules for PUT /challans/:id (DRAFT only). Both fields optional since
// this is a partial update, but if items is sent it must still be a
// non-empty list -- a challan with zero items doesn't make sense.
export const updateChallanSchema = z.object({
  customerId: z.string().uuid({ message: "customerId must be a valid id" }).optional(),
  items: z.array(challanItemSchema).min(1, { message: "At least one item is required" }).optional(),
});

// Rules for GET /challans query params (?page=&limit=&status=&customerId=)
export const listChallansQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["DRAFT", "CONFIRMED", "CANCELLED"], {
    errorMap: () => ({ message: "Status must be one of DRAFT, CONFIRMED, CANCELLED" }),
  }).optional(),
  customerId: z.string().uuid({ message: "customerId must be a valid id" }).optional(),
});
