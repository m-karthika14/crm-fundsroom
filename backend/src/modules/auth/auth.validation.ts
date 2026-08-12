// auth.validation.ts: the zod "shape" each auth request body must match.
// These get plugged into the validateBody() middleware on the routes.

import { z } from "zod";

// Rules for POST /auth/login
export const loginSchema = z.object({
  email: z.string().email({ message: "A valid email is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// Rules for POST /auth/register (Admin-only)
export const registerSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "A valid email is required" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"], {
    errorMap: () => ({ message: "Role must be one of ADMIN, SALES, WAREHOUSE, ACCOUNTS" }),
  }),
});
