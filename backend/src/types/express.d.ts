// This file teaches TypeScript that an Express Request can carry a
// "user" field. We set req.user inside the authenticate middleware,
// then read it later in roleGuard and in controllers.

import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}

// An empty export turns this into a module, which is required for
// "declare global" to work correctly.
export {};
