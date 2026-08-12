// customer.validation.ts: the zod "shape" each customer request must
// match. Plugged into validateBody()/validateQuery() on the routes.

import { z } from "zod";

const customerTypeEnum = z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"], {
  errorMap: () => ({ message: "Type must be one of RETAIL, WHOLESALE, DISTRIBUTOR" }),
});

const customerStatusEnum = z.enum(["LEAD", "ACTIVE", "INACTIVE"], {
  errorMap: () => ({ message: "Status must be one of LEAD, ACTIVE, INACTIVE" }),
});

// A simple, permissive check for a phone number: digits, spaces, +, -.
// This is intentionally loose since customers can be Indian or
// international numbers -- we just want to catch obviously-wrong input.
const mobileRegex = /^[0-9+\-\s]{7,20}$/;

// Rules for POST /customers
export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }),
  mobile: z.string().trim().regex(mobileRegex, { message: "Enter a valid mobile number" }),
  email: z.string().email({ message: "Enter a valid email" }).optional(),
  businessName: z.string().trim().optional(),
  gstNumber: z.string().trim().optional(),
  type: customerTypeEnum,
  address: z.string().trim().min(1, { message: "Address is required" }),
  status: customerStatusEnum.optional(),
  followUpDate: z.coerce.date().optional(),
});

// Rules for PUT /customers/:id -- every field optional (partial update),
// but whatever IS sent must still be valid.
export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  mobile: z.string().trim().regex(mobileRegex, { message: "Enter a valid mobile number" }).optional(),
  email: z.string().email({ message: "Enter a valid email" }).optional(),
  businessName: z.string().trim().optional(),
  gstNumber: z.string().trim().optional(),
  type: customerTypeEnum.optional(),
  address: z.string().trim().min(1).optional(),
  status: customerStatusEnum.optional(),
  followUpDate: z.coerce.date().optional(),
});

// Rules for GET /customers query params (?page=&limit=&q=&status=&type=)
export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().optional(),
  status: customerStatusEnum.optional(),
  type: customerTypeEnum.optional(),
});

// Rules for POST /customers/:id/notes
export const addNoteSchema = z.object({
  note: z.string().trim().min(1, { message: "Note text is required" }),
});
