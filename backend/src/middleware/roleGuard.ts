// authorize: checks that the logged-in user's role is one of the
// roles allowed to use this endpoint.
//
// IMPORTANT: this must run AFTER `authenticate`, because it needs
// req.user to already be set. Usage on a route looks like:
//   router.post("/products", authenticate, authorize("ADMIN", "WAREHOUSE"), handler)

import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // Should never happen if authenticate() ran first, but we guard
      // anyway rather than trusting route ordering blindly.
      return res.status(401).json({ error: "Not authenticated", details: [] });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to do this", details: [] });
    }

    next();
  };
}
