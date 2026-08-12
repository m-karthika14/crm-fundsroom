# Fundsroom CRM — Mini ERP + CRM Portal

A small but real ERP/CRM: customer pipeline, product inventory with a
full audit trail of every stock change, and sales challans (dispatch
notes) with transactional stock deduction and historical snapshots.
Built to the spec in [`ERP_CRM_Complete_Master_Plan.md`](ERP_CRM_Complete_Master_Plan.md).

## Architecture

```
┌─────────────────┐        HTTPS/JSON        ┌──────────────────┐         ┌──────────────┐
│   Frontend       │ ───────────────────────▶ │   Backend         │ ──────▶ │   Postgres    │
│  React + Vite    │ ◀─────────────────────── │  Express + Prisma │         │   (Neon)      │
│  (Vercel)         │      JWT in header        │  (Render)          │         │              │
└─────────────────┘                          └────────┬─────────┘         └──────────────┘
                                                        │
                                                        ▼
                                                ┌──────────────┐
                                                │   AWS S3      │
                                                │ (product      │
                                                │  images)      │
                                                └──────────────┘
```

The frontend never talks to Postgres or S3 directly -- everything
goes through the backend's REST API, which is the only thing holding
credentials for either.

## Tech stack

- **Backend:** Node.js, TypeScript, Express, Prisma ORM
- **Database:** PostgreSQL, hosted on [Neon](https://neon.tech)
- **Auth:** JWT (`jsonwebtoken`) + `bcrypt` password hashing
- **Frontend:** React, Vite, TypeScript, Tailwind CSS v4, React Router, Axios
- **File storage:** AWS S3 (pre-signed upload URLs) -- bonus feature
- **PDF export:** `pdfkit` -- bonus feature
- **CI:** GitHub Actions -- bonus feature

## Repo layout

```
backend/    Express API, Prisma schema + migrations, seed script
frontend/   React app (Vite)
postman_collection.json    Importable Postman collection covering every endpoint
```

Each module has its own README with endpoint details and the
"Design decisions / assumptions" made along the way:
[`backend/README.md`](backend/README.md), [`frontend/README.md`](frontend/README.md).

## Local setup

Requires Node.js 20+ and a Postgres database (a free [Neon](https://neon.tech) project works well).

**1. Clone and install:**
```bash
git clone https://github.com/m-karthika14/crm-fundsroom.git
cd crm-fundsroom
cd backend && npm install
cd ../frontend && npm install
```

**2. Configure environment variables** (see "Environment variables" below):
```bash
cd backend && cp .env.example .env    # fill in DATABASE_URL, JWT_SECRET
cd ../frontend && cp .env.example .env
```

**3. Set up the database:**
```bash
cd backend
npx prisma migrate dev --name init
npm run seed     # creates 4 test users, one per role
```

**4. Run both apps** (in separate terminals):
```bash
cd backend && npm run dev     # http://localhost:4000
cd frontend && npm run dev    # http://localhost:5173
```

Open http://localhost:5173 and log in with any of the [test credentials](#test-credentials) below.

## Environment variables

Every real `.env` file is gitignored; only the `.env.example` templates
are committed. Copy the example, then fill in real values locally (and
set the real values as environment variables in Render/Vercel for
deployment -- never commit them).

**`backend/.env`:**
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon) |
| `JWT_SECRET` | Random secret used to sign login tokens |
| `PORT` | Defaults to 4000 |
| `FRONTEND_URL` | The frontend's origin, for CORS. Defaults to `http://localhost:5173` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `AWS_BUCKET_NAME` | S3 bonus feature |

**`frontend/.env`:**
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | The backend's URL. Defaults to `http://localhost:4000` |

## Deployment

1. **Neon** (done): create a project, copy the connection string into
   `DATABASE_URL`, run `npx prisma migrate deploy` against it.
2. **Render (backend):** New Web Service → connect this repo → root
   directory `backend` → build command `npm run build` → start command
   `npm start` → set all the `backend/.env` variables above (with
   `FRONTEND_URL` pointed at the deployed Vercel URL) as environment
   variables in the Render dashboard.
3. **Vercel (frontend):** import this repo → root directory `frontend`
   → set `VITE_API_URL` to the deployed Render URL → deploy.
4. Click-test both live URLs end-to-end before calling it done.

Steps 2-3 are not done yet -- see "Known limitations" below.

## Test credentials

After running `npm run seed`, all 4 users share the password `Password123!`:

| Role | Email | Can do |
|---|---|---|
| Admin | admin@fundsroom.test | Everything |
| Sales | sales@fundsroom.test | Customers (full), Products (view only), Challans (full), no stock movements |
| Warehouse | warehouse@fundsroom.test | Products (full) incl. stock movements, Challans (view only), no Customers access |
| Accounts | accounts@fundsroom.test | View-only across Customers/Products/Challans, can view stock history |

Full role matrix in `ERP_CRM_Complete_Master_Plan.md` Part A.4, with the
edge cases (Warehouse/Customers, Sales/stock-movements) documented in
`backend/README.md`.

## API docs

[`postman_collection.json`](postman_collection.json) -- import into
Postman. It's pre-wired so you can run it top to bottom with almost no
manual editing:
- The **Login** request captures the returned JWT into a collection
  variable (`token`), which every other request uses automatically.
- **Create Customer**, **Create Product**, and **Create Challan**
  likewise capture the created record's id (`customerId`, `productId`,
  `challanId`) for the detail/update/confirm/cancel requests below them.

Run Login first (as Admin, to unlock every endpoint including
`/auth/register`), then any other request in any order.

## Known limitations / what's next

Honest gaps, roughly in the order they'd get picked up:

- **Not deployed yet.** Neon is live; Render (backend) and Vercel
  (frontend) haven't been set up. Deployment steps above are ready to
  follow.
- **No automated test suite.** Every business rule (transactional
  stock deduction, insufficient-stock rejection, snapshot immutability,
  concurrent challan-number generation, role restrictions) was verified
  through extensive manual + scripted smoke testing during development,
  not a checked-in test suite. Given more time, this is the highest-value
  addition -- particularly around the Challan confirm/cancel transaction
  logic.
- **S3 image upload isn't wired up yet.** AWS credentials are
  configured and connectivity is verified (`PutObject`/`GetObject`
  tested), but the pre-signed-upload-URL endpoint and the frontend
  upload UI (Part E.1 of the plan) aren't built.
- **PDF export isn't built yet** (Part F.1 -- `GET /challans/:id/pdf`).
- **GitHub Actions CI isn't set up yet** (Part H.1).
- **No rate limiting** on `/auth/login` -- fine for a demo, not for
  production.
- **No delete endpoints** for any entity. Not required by the spec,
  but a real deployment would eventually need soft-deletes or an
  archival flow for customers/products that are no longer active.
- **Challan number generation is atomic but not gap-free** -- see
  `backend/README.md` for the reasoning (uniqueness matters more than
  perfectly sequential numbers, and the alternative approach was
  measurably worse under concurrent load).
- **"Pending follow-ups" on the dashboard filters client-side** rather
  than via a dedicated backend query -- fine at this data scale, would
  move server-side if the customer list grew large.
