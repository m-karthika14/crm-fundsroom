# Backend README

Simple backend scaffold for Fundsroom CRM.

Quick start (developer):

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
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
