import { Request, Response, NextFunction } from "express";

// Central error handler: every route in the app calls next(err) when
// something goes wrong, and they all end up here. This is the ONLY
// place that decides what an error response looks like, so every
// endpoint stays consistent automatically.
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Business errors we throw on purpose (see AppError in each module's
  // service.ts) already carry the correct HTTP status + message.
  if (err && typeof err.status === "number") {
    return res.status(err.status).json({ error: err.message, details: err.details || [] });
  }

  // Anything else is a real bug -- log the full error for debugging,
  // but never leak internal details to the client.
  console.error(err);
  res.status(500).json({ error: "Unexpected server error", details: [] });
}
