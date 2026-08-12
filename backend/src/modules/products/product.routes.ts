// product.routes.ts: maps URLs to handlers, and attaches whatever
// middleware each route needs. Mounted at /products in server.ts.
//
// Role note: the Role Permissions Matrix (Part A.4) row "Products CRUD"
// gives every role at least view access (Admin/Warehouse full CRUD,
// Sales/Accounts view only) -- so GET routes below only require being
// logged in, no role restriction. But the separate "Stock movements"
// row gives Sales a flat "no access" (❌), distinct from Accounts'
// "view only" -- so stock-history (a stock-movement view) excludes
// Sales specifically, unlike the general product GET routes.

import { Router } from "express";
import {
  listProductsHandler,
  getProductHandler,
  getFieldSuggestionsHandler,
  createProductHandler,
  updateProductHandler,
  createStockMovementHandler,
  getStockHistoryHandler,
  imageUploadUrlHandler,
} from "./product.controller";
import { validateBody, validateQuery } from "../../middleware/validate";
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  createStockMovementSchema,
  stockHistoryQuerySchema,
  imageUploadUrlSchema,
} from "./product.validation";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/roleGuard";

const router = Router();

// Every route in this module requires a logged-in user.
router.use(authenticate);

router.get("/", validateQuery(listProductsQuerySchema), listProductsHandler);

// Must be registered before "/:id" -- otherwise Express would match
// this path as a request for the product whose id is literally
// "field-suggestions".
router.get("/field-suggestions", getFieldSuggestionsHandler);

router.get("/:id", getProductHandler);

router.post(
  "/",
  authorize("ADMIN", "WAREHOUSE"),
  validateBody(createProductSchema),
  createProductHandler
);

router.put(
  "/:id",
  authorize("ADMIN", "WAREHOUSE"),
  validateBody(updateProductSchema),
  updateProductHandler
);

router.post(
  "/:id/stock-movement",
  authorize("ADMIN", "WAREHOUSE"),
  validateBody(createStockMovementSchema),
  createStockMovementHandler
);

router.get(
  "/:id/stock-history",
  authorize("ADMIN", "WAREHOUSE", "ACCOUNTS"),
  validateQuery(stockHistoryQuerySchema),
  getStockHistoryHandler
);

router.post(
  "/:id/image-upload-url",
  authorize("ADMIN", "WAREHOUSE"),
  validateBody(imageUploadUrlSchema),
  imageUploadUrlHandler
);

export default router;
