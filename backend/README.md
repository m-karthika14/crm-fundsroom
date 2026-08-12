# Backend README

Simple backend scaffold for Fundsroom CRM.

Quick start (developer):

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`. `FRONTEND_URL` defaults to `http://localhost:5173` (the frontend's dev port) and only needs changing for production.
2. Install dependencies in `backend` folder: `npm install`.
3. Create the database tables: `npx prisma migrate dev --name init`.
4. Seed 4 test users (one per role): `npm run seed`.
5. Run dev server: `npm run dev`.

Files to look at:
- `src/server.ts` -> entrypoint
- `src/config/db.ts` -> Prisma client
- `prisma/schema.prisma` -> DB models
- `prisma/seed.ts` -> creates the 4 test-role users below

All files include simple comments to make them easy to read.

## Module 1: Auth

Endpoints:
- `POST /auth/login` -> `{ email, password }` returns `{ token, user }`
- `POST /auth/register` -> Admin-only, creates a new user (needs a valid Admin token)

Every other module's write endpoints will require the JWT from login, sent as:
`Authorization: Bearer <token>`

## Test credentials (after running `npm run seed`)

All 4 test users share the password: `Password123!`

| Role | Email |
|---|---|
| Admin | admin@fundsroom.test |
| Sales | sales@fundsroom.test |
| Warehouse | warehouse@fundsroom.test |
| Accounts | accounts@fundsroom.test |

## Module 2: Customer CRM

Endpoints (all require `Authorization: Bearer <token>`):
- `GET /customers` -> list, query params `page`, `limit`, `q` (search name/mobile/businessName), `status`, `type`
- `GET /customers/:id` -> customer + its notes
- `POST /customers` -> create (Admin, Sales)
- `PUT /customers/:id` -> partial update (Admin, Sales)
- `POST /customers/:id/notes` -> add a note (Admin, Sales)

## Module 3: Product & Inventory

Endpoints (all require `Authorization: Bearer <token>`):
- `GET /products` -> list, query params `page`, `limit`, `q` (search name/sku/category), `lowStock=true` (currentStock <= minStockAlert)
- `GET /products/:id` -> single product
- `POST /products` -> create (Admin, Warehouse)
- `PUT /products/:id` -> partial update, any field EXCEPT `currentStock` (Admin, Warehouse) -- sending `currentStock` here is rejected with `400`
- `POST /products/:id/stock-movement` -> `{ quantityChanged, type: "IN"|"OUT", reason }`, the only way stock changes (Admin, Warehouse)
- `GET /products/:id/stock-history` -> paginated movement log, newest first (Admin, Warehouse, Accounts)

## Module 4: Sales Challan

Endpoints (all require `Authorization: Bearer <token>`):
- `GET /challans` -> list, query params `page`, `limit`, `status`, `customerId`
- `GET /challans/:id` -> challan + items (with product snapshots) + customer summary
- `POST /challans` -> `{ customerId, items: [{ productId, quantity }] }`, creates a `DRAFT` (Admin, Sales)
- `PUT /challans/:id` -> partial update, DRAFT only -- `409` otherwise (Admin, Sales)
- `POST /challans/:id/confirm` -> DRAFT -> CONFIRMED: re-checks live stock for every item in one transaction, deducts stock + logs an `OUT` movement per item, all-or-nothing (Admin, Sales)
- `POST /challans/:id/cancel` -> DRAFT or CONFIRMED -> CANCELLED; if it was CONFIRMED, restores stock via a reversing `IN` movement per item (Admin, Sales)

## Bonus: Product Image Upload (S3)

Endpoint: `POST /products/:id/image-upload-url` -> `{ fileName, fileType }` returns `{ uploadUrl, publicUrl }` (Admin, Warehouse)

Flow: frontend requests a signed URL -> uploads the file directly to S3 with a `PUT` to `uploadUrl` (bytes never pass through our server) -> frontend calls `PUT /products/:id` with `imageUrl: publicUrl` to save it.

Requires three one-time settings on the S3 bucket (console, not code -- our IAM user is deliberately scoped to just `PutObject`/`GetObject`, not bucket administration):
1. Block Public Access disabled for the bucket
2. A bucket policy allowing public `s3:GetObject` scoped to the `products/*` prefix only (not the whole bucket)
3. CORS allowing `PUT`/`GET` from the frontend's origin (needed because the browser uploads directly to S3, cross-origin)

Verified end-to-end in a real browser: presigned URL requested, file `PUT` directly to S3, and the resulting public URL rendered in an `<img>` tag with a real network fetch (not mocked).

## Bonus: Export Challan as PDF

Endpoint: `GET /challans/:id/pdf` (Admin, Sales, Accounts -- Warehouse excluded, same as everywhere else in this module) -> streams a PDF directly in the response (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="CH-2026-0001.pdf"`).

Built with `pdfkit`. Content: company header, challan number/date/status, customer details, an itemized table (product, SKU, unit price, quantity, subtotal) built from the same snapshot data shown on the challan detail page, grand total, and a created-by/date footer.

Frontend note: the download button doesn't use a plain `<a href>` to the API -- auth here is a JWT header, not a cookie, so a bare link would hit the endpoint unauthenticated and get a `401`. Instead it fetches the PDF as a blob through the authenticated API client, then triggers a save via a throwaway `<a download>` pointed at an object URL.

## Design decisions / assumptions

- **Mobile number uniqueness:** enforced strictly at the database level
  (`@unique`). A duplicate mobile on create/update returns `409`. Chosen
  over "warn-only" because two customer records sharing a phone number
  is almost always a data-entry mistake, and catching it immediately is
  more useful than a soft warning that's easy to ignore.
- **Customer view access for Warehouse:** the plan's endpoint list
  (Part D) marks `GET /customers` as "all roles", but the Role
  Permissions Matrix (Part A.4) gives Warehouse a distinct "no access"
  (❌) mark versus Accounts' "view only" mark for Customers CRUD -- a
  distinction that only makes sense if Warehouse truly has zero access.
  We followed the more specific matrix: `GET /customers` and
  `GET /customers/:id` are open to Admin/Sales/Accounts only, not
  Warehouse.
- **Blocking `currentStock` on `PUT /products/:id`:** the update schema
  simply omits `currentStock` and is marked `.strict()`, so zod itself
  rejects the request with `400` if it's present -- no special-case code
  needed, and the rule is enforced the same way validation already works
  everywhere else.
- **Stock-history access for Sales:** similar reasoning to the Warehouse
  case above -- the Role Matrix's "Stock movements" row gives Sales a
  flat "no access" (❌), distinct from Accounts' "view only", so
  `GET /products/:id/stock-history` excludes Sales even though general
  product viewing (`GET /products`) does not.
- **Low-stock filtering:** `currentStock <= minStockAlert` compares two
  columns on the same row, which Prisma's query builder can't express
  directly. Rather than hand-writing raw SQL, `lowStock=true` fetches
  the (search-)filtered set and filters/paginates in application code.
  Fine at this catalog size; would move to raw SQL or a generated column
  if the product count grew large.
- **Challan number generation is atomic but not gap-free.** A single
  Postgres `INSERT ... ON CONFLICT DO UPDATE` on a per-year counter row
  hands out each number, and runs as its own standalone statement
  *before* the main creation transaction opens (not inside it) -- doing
  the increment inside the transaction was tested and found to hold
  that row's lock for the whole transaction (customer + product lookups
  + nested create), which serialized concurrent challan creation behind
  each other and could time out. Standalone, the lock is only held for
  one quick round trip. Trade-off: if challan creation fails right after
  a number is allocated (e.g. bad `customerId`), that number is never
  used again -- a small gap is possible, but two challans can never get
  the same number. Verified with 12 concurrent creation requests: all
  succeeded with unique, sequential numbers.
- **Cancelling a CONFIRMED challan restores stock**, reversing exactly
  what confirming did (one `IN` movement per item). Not explicitly
  required by the brief, but the only logically consistent behavior --
  otherwise a cancelled sale would permanently "lose" stock.
- **`PUT /challans/:id` does a full items replace**, not a per-item
  merge/patch: if `items` is sent, all existing items are deleted and
  replaced with fresh snapshots of the new list. Simpler and less
  error-prone than reconciling partial item diffs for a DRAFT that's
  still fully editable anyway.
- **Product images are public-read, not signed-GET.** The plan (Part
  E.1) explicitly allows either. Chose public read via a bucket policy
  scoped to the `products/*` prefix: product photos aren't sensitive
  data, and a plain public URL is simpler for the frontend (`<img src>`
  with no signing/expiry to manage) and for any future integration that
  wants to hotlink a product image. The rest of the bucket stays
  private -- only that one prefix is public.
