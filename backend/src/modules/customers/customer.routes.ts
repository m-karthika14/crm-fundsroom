// customer.routes.ts: maps URLs to handlers, and attaches whatever
// middleware each route needs. Mounted at /customers in server.ts.
//
// Role note: the plan's endpoint list says GET routes are "(all roles)",
// but the Role Permissions Matrix (Part A.4) explicitly gives Warehouse
// a "no access" (❌) mark for Customers, distinct from Accounts' "view
// only" mark -- that distinction only makes sense if Warehouse truly
// cannot see customer data. We follow the more specific matrix: GET
// routes are open to ADMIN/SALES/ACCOUNTS but not WAREHOUSE. Documented
// in backend/README.md under "Design decisions / assumptions".

import { Router } from "express";
import {
  listCustomersHandler,
  getCustomerHandler,
  createCustomerHandler,
  updateCustomerHandler,
  addNoteHandler,
} from "./customer.controller";
import { validateBody, validateQuery } from "../../middleware/validate";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
  addNoteSchema,
} from "./customer.validation";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/roleGuard";

const router = Router();

// Every route in this module requires a logged-in user.
router.use(authenticate);

router.get(
  "/",
  authorize("ADMIN", "SALES", "ACCOUNTS"),
  validateQuery(listCustomersQuerySchema),
  listCustomersHandler
);

router.get("/:id", authorize("ADMIN", "SALES", "ACCOUNTS"), getCustomerHandler);

router.post(
  "/",
  authorize("ADMIN", "SALES"),
  validateBody(createCustomerSchema),
  createCustomerHandler
);

router.put(
  "/:id",
  authorize("ADMIN", "SALES"),
  validateBody(updateCustomerSchema),
  updateCustomerHandler
);

router.post(
  "/:id/notes",
  authorize("ADMIN", "SALES"),
  validateBody(addNoteSchema),
  addNoteHandler
);

export default router;
