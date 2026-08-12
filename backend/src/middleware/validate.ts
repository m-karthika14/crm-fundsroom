// validateBody: runs a zod schema against req.body and stops the
// request with a clean 400 error if the body doesn't match.
//
// This is the ONE place validation-error formatting happens, so every
// module (auth, customers, products, challans...) gets back the exact
// same { error, details } shape without repeating this code.

import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Turn zod's error format into our API's { field, message } shape.
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(body)",
        message: issue.message,
      }));

      return res.status(400).json({ error: "Validation failed", details });
    }

    // Use the parsed data (zod may have applied defaults/coercions).
    req.body = result.data;
    next();
  };
}
