// validateBody / validateQuery: run a zod schema against req.body or
// req.query, and stop the request with a clean 400 error if it doesn't
// match.
//
// This is the ONE place validation-error formatting happens, so every
// module (auth, customers, products, challans...) gets back the exact
// same { error, details } shape without repeating this code.

import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

// Shared by both helpers below: turn a zod failure into our API's
// { field, message } shape and send the 400 response.
function sendValidationError(res: Response, error: any) {
  const details = error.issues.map((issue: any) => ({
    field: issue.path.join(".") || "(body)",
    message: issue.message,
  }));

  res.status(400).json({ error: "Validation failed", details });
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    // Use the parsed data (zod may have applied defaults/coercions).
    req.body = result.data;
    next();
  };
}

// Same idea as validateBody, but for query strings (?page=1&limit=20).
// Query values always arrive as strings, so schemas passed here should
// use z.coerce.number() / z.coerce.date() etc where needed.
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    // Stash the parsed query on a separate field instead of overwriting
    // req.query -- some Express versions expose req.query as read-only.
    (req as any).validatedQuery = result.data;
    next();
  };
}
