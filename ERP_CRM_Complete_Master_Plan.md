# Mini ERP + CRM Portal — Complete Master Plan
*(Combined: Execution Plan + Full Module/API Spec + Bonus Features)*

---

# PART A — OVERVIEW & STRATEGY

## A.1 Stack Decision

- **Backend:** Node.js + TypeScript + Express + Prisma ORM
- **Database:** PostgreSQL (via Neon — free, instant, no local Postgres install needed)
- **Auth:** JWT (jsonwebtoken + bcrypt)
- **Frontend:** React + Vite + TypeScript + Tailwind CSS + React Router + Axios
- **Deployment:** Backend → Render, Frontend → Vercel, DB → Neon
- **PDF:** pdfkit (backend-generated)
- **File storage:** AWS S3 (pre-signed URL upload)
- **CI:** GitHub Actions
- **Docs/testing:** Postman collection + README

Why Prisma: auto-migrations, type-safe queries, saves hours vs raw SQL.

## A.2 Priority Order

**Must-have (build first, in this order):**
1. Auth + roles (JWT)
2. Customer CRM
3. Product & Inventory
4. Sales Challan (hardest — real business logic)
5. Deployment
6. README + Postman collection

**Bonus (build only after core is solid and deployed):**
7. Product image upload → AWS S3
8. Export challan as PDF
9. GitHub Actions CI

## A.3 Folder Structure

```
erp-crm/
├── backend/
│   ├── src/
│   │   ├── config/          (db.ts, env.ts, s3.ts)
│   │   ├── middleware/       (auth.ts, roleGuard.ts, errorHandler.ts, validate.ts)
│   │   ├── modules/
│   │   │   ├── auth/         (auth.controller.ts, auth.routes.ts, auth.service.ts)
│   │   │   ├── customers/
│   │   │   ├── products/     (includes stock-movement + s3 upload-url endpoint)
│   │   │   └── challans/     (includes pdf export endpoint)
│   │   ├── prisma/           (schema.prisma)
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/               (axios instance + per-module API calls)
│   │   ├── components/
│   │   ├── pages/              (Login, Dashboard, Customers, Products, Challans)
│   │   ├── context/             (AuthContext for JWT + role)
│   │   └── routes/              (ProtectedRoute.tsx)
│   └── package.json
├── .github/workflows/ci.yml
├── postman_collection.json
├── README.md
└── docs/architecture.md
```

## A.4 Role Permissions Matrix

| Action | Admin | Sales | Warehouse | Accounts |
|---|---|---|---|---|
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Customers CRUD | ✅ | ✅ | ❌ | View only |
| Products CRUD | ✅ | View only | ✅ | View only |
| Stock movements | ✅ | ❌ | ✅ | View only |
| Create/confirm challan | ✅ | ✅ | View only | View only |
| Download challan PDF | ✅ | ✅ | ❌ | ✅ |

## A.5 Frontend Pages

1. **Login** — role-based redirect after auth
2. **Dashboard** — quick stats (low stock alerts, pending follow-ups, draft challans)
3. **Customers** — list (search/filter/pagination) → detail (edit, notes, follow-up date)
4. **Products** — list (search/filter) → detail (edit, image upload, stock movement log)
5. **Challans** — list (filter by status) → create (multi-product picker) → detail (confirm/cancel, download PDF, shows snapshot data)

Shared layout: sidebar nav (role-based menu items) + topbar with logged-in user/role.

## A.6 Hour-by-Hour Timeline (48h)

| Hours | Task |
|---|---|
| 0–2 | Init repos, Prisma schema, Neon DB connected, seed script (test users per role) |
| 2–6 | Auth (login, JWT middleware, role guard) |
| 6–10 | Customers module (API + validation) |
| 10–14 | Products module + stock movement log |
| 14–20 | Challans module — draft/confirm/cancel, transaction logic, snapshot storage |
| 20–22 | Postman collection for all endpoints, test edge cases (negative stock, invalid role) |
| 22–28 | Frontend scaffold, auth context, protected routes, login page |
| 28–34 | Customers UI (list/search/detail/notes) |
| 34–38 | Products UI (list/detail/stock log) |
| 38–42 | Challans UI (create flow, confirm/cancel, status badges) |
| 42–44 | Deploy: Neon → Render (backend) → Vercel (frontend) |
| 44–46 | Bonus: S3 image upload, PDF export, GitHub Actions CI |
| 46–47 | README, architecture doc, screen recording, Postman export |
| 47–48 | Buffer / final commit / submission checklist |

If time gets tight, drop bonuses first — core modules and deployment always win over bonus points.

---

# PART B — DATABASE SCHEMA (FULL)

```
User {
  id: uuid
  name: string
  email: string (unique)
  passwordHash: string
  role: ADMIN | SALES | WAREHOUSE | ACCOUNTS
  createdAt: datetime
}

Customer {
  id: uuid
  name: string (required)
  mobile: string (required, validated format)
  email: string (optional, valid email format if present)
  businessName: string (optional)
  gstNumber: string (optional)
  type: RETAIL | WHOLESALE | DISTRIBUTOR (required)
  address: string (required)
  status: LEAD | ACTIVE | INACTIVE (default LEAD)
  followUpDate: date (optional)
  createdAt: datetime
}

CustomerNote {
  id: uuid
  customerId: FK -> Customer
  note: string
  createdBy: FK -> User
  createdAt: datetime
}

Product {
  id: uuid
  name: string (required)
  sku: string (required, unique)
  category: string (required)
  unitPrice: decimal (required, > 0)
  currentStock: integer (required, >= 0, default 0)
  minStockAlert: integer (default 0)
  location: string
  imageUrl: string (optional — S3 bonus feature)
  createdAt: datetime
}

StockMovement {
  id: uuid
  productId: FK -> Product
  quantityChanged: integer (positive, direction defined by type)
  type: IN | OUT
  reason: string (required)
  createdBy: FK -> User
  createdAt: datetime
}

Challan {
  id: uuid
  challanNumber: string (unique, auto-generated e.g. "CH-2026-0001")
  customerId: FK -> Customer
  totalQuantity: integer (computed)
  status: DRAFT | CONFIRMED | CANCELLED (default DRAFT)
  createdBy: FK -> User
  createdAt: datetime
}

ChallanItem {
  id: uuid
  challanId: FK -> Challan
  productId: FK -> Product
  productNameSnapshot: string
  productSkuSnapshot: string
  unitPriceSnapshot: decimal
  quantity: integer (> 0)
}
```

**Key relations:** Customer 1→N CustomerNote · Product 1→N StockMovement · Challan 1→N ChallanItem · Challan N→1 Customer · ChallanItem N→1 Product

**Why snapshots on ChallanItem:** if a product's price/name changes later, old challans must still reflect what was true at sale time — this is core historical data integrity, and it's exactly what the brief is testing.

---

# PART C — MODULE 1: AUTHENTICATION & ROLES

### Purpose
Every user logs in with email/password and gets a JWT encoding `userId` and `role`. All protected routes check this token and, where needed, the role.

### Middleware to build
- `authenticate` — verifies JWT from `Authorization: Bearer <token>`, attaches `req.user = { id, role }`, else `401`
- `authorize(...roles)` — checks `req.user.role` is in the allowed list, else `403`

### Endpoints

**`POST /auth/login`**
- Body: `{ email, password }`
- Validation: both required, valid email format
- Logic: find user → bcrypt compare → sign JWT `{ userId, role }`, expiry ~8h
- `200`: `{ token, user: { id, name, email, role } }`
- Errors: `400` missing/invalid fields · `401` invalid credentials (generic message for both cases)

**`POST /auth/register`** (Admin-only, or replace with a seed script)
- Body: `{ name, email, password, role }`
- Validation: unique email, password min length, role valid enum
- `201`: created user (no password hash returned)
- Errors: `400`, `409` (email exists), `403` (caller not Admin)

### Seed data
Create one test user per role at seed time — you need to hand over 4 working logins in your submission.

---

# PART D — MODULE 2: CUSTOMER CRM

### Business rules
- Mobile number ideally unique per customer — decide strict-enforce vs warn-only, and document your choice.
- `status` is Lead/Active/Inactive — validate against enum, no strict state machine needed.
- Only Admin/Sales create/edit; Warehouse has no access; Accounts is read-only.

### Endpoints

**`POST /customers`** (Admin, Sales)
- Body: `{ name, mobile, email?, businessName?, gstNumber?, type, address, status?, followUpDate? }`
- Validation: `name`, `mobile`, `type`, `address` required; `type` valid enum; `email` format if present
- `201`: created customer · Errors: `400`, `403`

**`GET /customers`** (all roles)
- Query: `page`, `limit`, `q` (search name/mobile/businessName), `status`, `type`
- `200`: `{ data, total, page, totalPages }`

**`GET /customers/:id`**
- `200`: customer + notes array · Errors: `404`

**`PUT /customers/:id`** (Admin, Sales)
- Body: any subset of fields (partial update)
- `200`: updated customer · Errors: `400`, `403`, `404`

**`POST /customers/:id/notes`** (Admin, Sales)
- Body: `{ note }` · `createdBy` taken from `req.user.id`, never from body
- `201`: created note · Errors: `400`, `404`

---

# PART E — MODULE 3: PRODUCT & INVENTORY

### Business rules
- `currentStock` is **never** directly editable via plain PUT — only changes through the stock-movement endpoint, so every change is logged.
- Stock can never go below 0 — a rejected OUT movement returns `400`.
- `sku` unique — DB-level constraint, clean `409` on collision.

### Endpoints

**`POST /products`** (Admin, Warehouse)
- Body: `{ name, sku, category, unitPrice, currentStock?, minStockAlert?, location, imageUrl? }`
- Validation: required fields present, `unitPrice > 0`, `sku` unique
- `201`: created product · Errors: `400`, `409` (duplicate SKU), `403`

**`GET /products`**
- Query: `page`, `limit`, `q`, `lowStock=true` (where `currentStock <= minStockAlert`)
- `200`: `{ data, total, page, totalPages }`

**`GET /products/:id`** → `200` product · `404`

**`PUT /products/:id`** (Admin, Warehouse)
- Any field except `currentStock` (blocked — must go through stock-movement)
- `200` updated product · Errors: `400`, `403`, `404`

**`POST /products/:id/stock-movement`** (Admin, Warehouse)
- Body: `{ quantityChanged: number, type: 'IN'|'OUT', reason: string }`
- Logic (transaction): fetch product → if OUT and `quantityChanged > currentStock` → `400` `"Insufficient stock: available 5, requested 10"` → else update stock, create `StockMovement` with `createdBy = req.user.id`
- `201`: `{ product, movement }` · Errors: `400`, `404`

**`GET /products/:id/stock-history`**
- Query: `page`, `limit` · `200`: paginated movements, newest first

### E.1 Bonus — Product Image Upload to S3

**Flow (pre-signed URL — avoids routing large files through your server):**
1. Frontend requests an upload URL
2. Backend generates a pre-signed S3 PUT URL
3. Frontend uploads the file directly to S3 using that URL
4. Frontend calls `PUT /products/:id` with the resulting S3 object URL to save as `imageUrl`

**`POST /products/:id/image-upload-url`** (Admin, Warehouse)
- Body: `{ fileName, fileType }`
- Logic: use `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` to generate a time-limited signed PUT URL for a key like `products/{productId}/{fileName}`
- `200`: `{ uploadUrl, publicUrl }`
- Errors: `400`, `404`, `403`

**Env vars:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME` — add (without values) to `.env.example`, and set real values in Render.

**Bucket setup:** either allow public read via bucket policy (simplest for a demo) or keep private and serve signed GET URLs (more correct, mention your choice in README under "assumptions").

---

# PART F — MODULE 4: SALES CHALLAN (most scrutinized module)

### Business rules
1. **Challan number generation** — auto-increment per year (`CH-2026-0001`, `CH-2026-0002`...), generated atomically to avoid duplicates under concurrent requests.
2. **Snapshot, not live reference** — at creation, copy `name`/`sku`/`unitPrice` from Product into ChallanItem. Later product changes must never alter historical challans.
3. **Draft is editable** — while `DRAFT`, items/quantities/customer can change freely; stock untouched.
4. **Confirm is the critical transition:**
   - Only `DRAFT` → `CONFIRMED`, inside a single DB transaction
   - Re-check current stock for every item (not the snapshot)
   - Any insufficient item → abort entire transaction, `400` naming exactly which product(s) failed and by how much
   - All pass → reduce `Product.currentStock` per item, insert `StockMovement` (`OUT`, reason `"Challan CH-2026-0001 confirmed"`), set `status = CONFIRMED`
   - All-or-nothing — never partially deduct stock
5. **Cancel** — allowed from `DRAFT` or `CONFIRMED`. Cancelling a `CONFIRMED` challan should restore stock (reverse IN movement) — document this choice clearly since it's not explicitly mandated but is the logically consistent behavior.
6. **Stock never goes negative** — same rule as the Product module.

### Endpoints

**`POST /challans`** (Admin, Sales)
- Body: `{ customerId, items: [{ productId, quantity }] }`
- Validation: customer exists, items non-empty, each `quantity > 0`, each product exists
- Logic: generate `challanNumber`, snapshot each item, compute `totalQuantity`, `status = DRAFT`
- `201`: full challan + items · Errors: `400`, `404`

**`GET /challans`**
- Query: `page`, `limit`, `status`, `customerId` · `200`: `{ data, total, page, totalPages }`

**`GET /challans/:id`** → `200` challan + items + customer summary · `404`

**`PUT /challans/:id`** (Admin, Sales — DRAFT only)
- `409` if not DRAFT ("Cannot edit a confirmed/cancelled challan")
- Re-snapshots items if changed, recomputes total · `200` updated challan

**`POST /challans/:id/confirm`** (Admin, Sales)
- `409` if not DRAFT · runs the transaction above
- `200`: confirmed challan · Errors:
  - `400` — `{ error: "Insufficient stock", details: [{ productId, productName, available: 5, requested: 10 }] }`
  - `404`, `409`

**`POST /challans/:id/cancel`** (Admin, Sales)
- `409` if already cancelled · if was CONFIRMED, restores stock via reversing IN movements · `200` cancelled challan

### F.1 Bonus — Export Challan as PDF

**`GET /challans/:id/pdf`** (Admin, Sales, Accounts)
- Library: `pdfkit` (fast to set up, no headless browser needed)
- Logic: fetch challan + items (snapshot data) + customer → stream a PDF directly in the response
- Content: company header, challan number & date, customer details, item table (product, qty, unit price, subtotal), grand total, status badge, created-by/date
- Response: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="CH-2026-0001.pdf"`
- Frontend: "Download PDF" button on the challan detail page hitting this endpoint directly (`window.open` or `<a href>`, since it's a GET)

---

# PART G — GENERAL API EXPECTATIONS (apply to every endpoint above)

### Validation
Use `zod` on every request body/query. Return field-level errors:
```json
{ "error": "Validation failed", "details": [{ "field": "mobile", "message": "Mobile number is required" }] }
```

### HTTP status codes

| Code | When |
|---|---|
| 200 | successful GET/PUT/action |
| 201 | successful POST creating a resource |
| 400 | validation failure or business rule violation (e.g. insufficient stock) |
| 401 | missing/invalid/expired token |
| 403 | valid token, wrong role |
| 404 | resource doesn't exist |
| 409 | duplicate unique field, invalid state transition |
| 500 | unexpected server error (should be rare, logged) |

### Consistent error shape (everywhere)
```json
{ "error": "Human-readable message", "details": [ /* optional */ ] }
```

### Pagination shape (every list endpoint)
```json
{ "data": [ ... ], "total": 42, "page": 1, "totalPages": 5 }
```

### Search/filter
Via query params, not separate endpoints (`GET /customers?q=ravi&status=ACTIVE`). Case-insensitive partial match (Postgres `ILIKE` / Prisma `contains` + `mode: 'insensitive'`).

### Central error handler
One Express error middleware formats all thrown errors consistently — don't repeat try/catch formatting per controller.

### Every write endpoint must
- Sit behind `authenticate` + `authorize(...)`
- Validate input before touching the DB
- Take `createdBy` from `req.user.id`, never trust it from the request body

---

# PART H — DEPLOYMENT

1. **Neon:** create project → copy `DATABASE_URL` → `npx prisma migrate deploy`
2. **Render (backend):** New Web Service → connect repo → root dir `backend` → build `npm run build` → start `npm start` → env vars: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`
3. **Vercel (frontend):** import repo → root dir `frontend` → env var `VITE_API_URL=<render-backend-url>` → deploy
4. Test both live URLs end-to-end before submitting.

### H.1 Bonus — GitHub Actions CI

`.github/workflows/ci.yml`:
- Trigger: push/PR to `main`
- Steps: checkout → setup Node → `npm ci` (backend) → `npm run build` (backend) → `npm ci` (frontend) → `npm run build` (frontend) → optionally lint/test
- Optional deploy trigger step: `curl` Render's deploy hook URL after build passes (Vercel's GitHub integration usually auto-deploys without this).

This demonstrates CI understanding even though Render/Vercel already auto-deploy on push — the Action is your quality gate before that happens.

---

# PART I — README REQUIREMENTS

- Project overview + simple architecture diagram (text is fine)
- Tech stack
- Local setup (clone → env vars → install → migrate → run)
- How env vars are managed (`.env.example` committed, real `.env` gitignored)
- Deployment steps (condensed from Part H)
- Test credentials for all 4 roles
- API docs link (Postman)
- Known limitations / what you'd add with more time (be honest — this reads as maturity, not weakness)

---

# PART J — SUBMISSION CHECKLIST

- [ ] GitHub repo, clean commit history (per module, not one giant commit)
- [ ] Live frontend URL
- [ ] Live backend URL
- [ ] Test logins for Admin/Sales/Warehouse/Accounts
- [ ] Postman collection (exported JSON)
- [ ] README complete
- [ ] Architecture write-up (docs/architecture.md, 1 page)
- [ ] Known limitations section
- [ ] Bonus: S3 image upload working end-to-end
- [ ] Bonus: PDF export downloadable from challan detail page
- [ ] Bonus: GitHub Actions workflow passing (green check on repo)

---

# PART K — WHAT WILL MAKE YOU STAND OUT

1. Correct **transactional** stock reduction with no negative stock — the single most-tested piece of logic in the whole brief.
2. Product **snapshot** data on challans — shows understanding of historical data integrity.
3. Clean, consistent error responses and status codes across every API.
4. An honest "Known Limitations" section.
5. Real, working deployed URLs — click-tested right before submission.
6. All three bonus features (S3, PDF, CI) working — but only after the core is rock solid. A broken bonus feature hurts more than a missing one.
