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
