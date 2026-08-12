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
