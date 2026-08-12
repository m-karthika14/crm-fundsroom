// This file teaches TypeScript about extra fields our middleware puts
// on the Express Request:
// - req.user: set by authenticate, read by roleGuard and controllers.
// - req.validatedQuery: set by validateQuery, holds the parsed query
//   params (we don't overwrite req.query since some Express versions
//   make it read-only).

import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
      validatedQuery?: any;
    }
  }
}

// An empty export turns this into a module, which is required for
// "declare global" to work correctly.
export {};
