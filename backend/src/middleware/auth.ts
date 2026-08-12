// authenticate: checks that the incoming request has a valid JWT.
//
// How it works:
// 1. Read the "Authorization: Bearer <token>" header.
// 2. Verify the token's signature and expiry using our JWT_SECRET.
// 3. If everything checks out, attach { id, role } to req.user so
//    later code (roleGuard, controllers) can know who is asking.
// 4. If anything is wrong, stop the request here with a 401 error --
//    we never let a bad/missing token reach a controller.

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env";

// This is the shape of data we packed into the JWT when the user logged in.
interface TokenPayload {
  userId: string;
  role: Role;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header", details: [] });
  }

  // "Bearer <token>" -> just the token part
  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    req.user = { id: payload.userId, role: payload.role };

    next();
  } catch (err) {
    // jwt.verify throws for both an invalid signature and an expired token,
    // so one generic message covers both cases.
    return res.status(401).json({ error: "Invalid or expired token", details: [] });
  }
}
