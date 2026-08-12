// auth.routes.ts: maps URLs to handlers, and attaches whatever
// middleware each route needs (validation, login-check, role-check).
// Mounted at /auth in server.ts, so these become:
//   POST /auth/login
//   POST /auth/register

import { Router } from "express";
import { loginHandler, registerHandler } from "./auth.controller";
import { validateBody } from "../../middleware/validate";
import { loginSchema, registerSchema } from "./auth.validation";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/roleGuard";

const router = Router();

// Anyone can attempt to log in -- no authenticate/authorize here.
router.post("/login", validateBody(loginSchema), loginHandler);

// Only an already-logged-in Admin can create new users. Order matters:
// authenticate first (who are you?), then authorize (are you allowed?),
// then validateBody (is your request well-formed?).
router.post(
  "/register",
  authenticate,
  authorize("ADMIN"),
  validateBody(registerSchema),
  registerHandler
);

export default router;
