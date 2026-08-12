// challan.routes.ts: maps URLs to handlers, and attaches whatever
// middleware each route needs. Mounted at /challans in server.ts.
//
// Role note: unlike Customers/Products, the Role Matrix (Part A.4) row
// "Create/confirm challan" is consistent with the module spec here --
// Admin/Sales get full access, Warehouse/Accounts get view only. So
// GET routes just require being logged in, and every write action
// (create, edit, confirm, cancel) is Admin/Sales only.

import { Router } from "express";
import {
  listChallansHandler,
  getChallanHandler,
  createChallanHandler,
  updateChallanHandler,
  confirmChallanHandler,
  cancelChallanHandler,
} from "./challan.controller";
import { validateBody, validateQuery } from "../../middleware/validate";
import { createChallanSchema, updateChallanSchema, listChallansQuerySchema } from "./challan.validation";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/roleGuard";

const router = Router();

// Every route in this module requires a logged-in user.
router.use(authenticate);

router.get("/", validateQuery(listChallansQuerySchema), listChallansHandler);

router.get("/:id", getChallanHandler);

router.post(
  "/",
  authorize("ADMIN", "SALES"),
  validateBody(createChallanSchema),
  createChallanHandler
);

router.put(
  "/:id",
  authorize("ADMIN", "SALES"),
  validateBody(updateChallanSchema),
  updateChallanHandler
);

router.post("/:id/confirm", authorize("ADMIN", "SALES"), confirmChallanHandler);

router.post("/:id/cancel", authorize("ADMIN", "SALES"), cancelChallanHandler);

export default router;
