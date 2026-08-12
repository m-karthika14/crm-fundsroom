// challan.service.ts: the business logic for Sales Challans -- the
// most scrutinized module in the plan. The core guarantee everything
// here is built around: stock only ever changes as part of an atomic
// database transaction, so it's impossible to end up in a state where
// a challan is CONFIRMED but stock wasn't deducted (or vice versa).

import { Prisma, ChallanStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

// Neon's connection lives over the public internet, so each query in a
// transaction costs a real network round trip. Prisma's default
// interactive-transaction timeout (5s) isn't enough once a transaction
// does several sequential lookups (customer, multiple products, the
// atomic counter, nested creates) -- so every transaction below gets a
// longer budget. maxWait is separate: it's how long a request will
// queue for a free pooled connection before even starting, which
// matters once several challans are being created at the same time.
const TRANSACTION_OPTIONS = { timeout: 15000, maxWait: 10000 };

interface ChallanItemInput {
  productId: string;
  quantity: number;
}

// Generates the next challan number for the given year, e.g. "CH-2026-0001".
//
// This single SQL statement is an atomic "insert or increment": if two
// requests race for the same year, Postgres locks that one counter row
// so each request still gets a unique, sequential number.
//
// Deliberately runs as its OWN standalone statement, not inside the
// bigger createChallan transaction below. If it ran inside that
// transaction, the counter row's lock would be held for the entire
// transaction (customer lookup, product lookups, nested create) --
// under concurrent requests, later ones would queue behind each
// other's full transaction time instead of just the tiny increment,
// and could time out. Running it standalone means the lock is only
// held for one quick round trip.
//
// Trade-off: if createChallan fails AFTER this call (e.g. an invalid
// customerId), the allocated number is never attached to a challan --
// a small gap in the sequence, but never a duplicate. Real invoice/
// challan numbering already tolerates gaps from voided documents, and
// uniqueness matters far more than perfect sequentiality here.
async function nextChallanNumber(year: number): Promise<string> {
  const rows = await prisma.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "ChallanCounter" ("year", "lastNumber")
    VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "lastNumber" = "ChallanCounter"."lastNumber" + 1
    RETURNING "lastNumber"
  `;
  const sequence = rows[0].lastNumber;
  return `CH-${year}-${String(sequence).padStart(4, "0")}`;
}

// Looks up each product and builds the snapshot fields (name/sku/price
// AT THIS MOMENT) that get frozen onto the ChallanItem. Throws 404 if
// any referenced product doesn't exist.
async function buildSnapshotItems(tx: Prisma.TransactionClient, items: ChallanItemInput[]) {
  const snapshotItems = [];
  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) {
      throw new AppError(404, `Product not found: ${item.productId}`);
    }
    snapshotItems.push({
      productId: product.id,
      productNameSnapshot: product.name,
      productSkuSnapshot: product.sku,
      unitPriceSnapshot: product.unitPrice,
      quantity: item.quantity,
    });
  }
  return snapshotItems;
}

const challanInclude = {
  items: true,
  customer: { select: { id: true, name: true, mobile: true, address: true, type: true } },
} satisfies Prisma.ChallanInclude;

export async function createChallan(customerId: string, items: ChallanItemInput[], createdBy: string) {
  const challanNumber = await nextChallanNumber(new Date().getFullYear());

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new AppError(404, "Customer not found");
    }

    const snapshotItems = await buildSnapshotItems(tx, items);
    const totalQuantity = snapshotItems.reduce((sum, i) => sum + i.quantity, 0);

    return tx.challan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        status: "DRAFT",
        createdBy,
        items: { create: snapshotItems },
      },
      include: challanInclude,
    });
  }, TRANSACTION_OPTIONS);
}

interface ListChallansParams {
  page: number;
  limit: number;
  status?: ChallanStatus;
  customerId?: string;
}

export async function listChallans(params: ListChallansParams) {
  const { page, limit, status, customerId } = params;

  const where: Prisma.ChallanWhereInput = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [data, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true, mobile: true } } },
    }),
    prisma.challan.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
}

export async function getChallanById(id: string) {
  const challan = await prisma.challan.findUnique({ where: { id }, include: challanInclude });
  if (!challan) {
    throw new AppError(404, "Challan not found");
  }
  return challan;
}

interface UpdateChallanInput {
  customerId?: string;
  items?: ChallanItemInput[];
}

export async function updateChallan(id: string, data: UpdateChallanInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.challan.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Challan not found");
    }
    if (existing.status !== "DRAFT") {
      throw new AppError(409, "Cannot edit a confirmed/cancelled challan");
    }

    if (data.customerId) {
      const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) {
        throw new AppError(404, "Customer not found");
      }
    }

    let totalQuantity = existing.totalQuantity;

    if (data.items) {
      // Full replace: every edit re-snapshots from CURRENT product
      // data, since a draft isn't "sold" yet -- there's nothing
      // historical to preserve until it's confirmed.
      await tx.challanItem.deleteMany({ where: { challanId: id } });

      const snapshotItems = await buildSnapshotItems(tx, data.items);
      await tx.challanItem.createMany({
        data: snapshotItems.map((item) => ({ ...item, challanId: id })),
      });
      totalQuantity = snapshotItems.reduce((sum, i) => sum + i.quantity, 0);
    }

    return tx.challan.update({
      where: { id },
      data: {
        customerId: data.customerId,
        totalQuantity,
      },
      include: challanInclude,
    });
  }, TRANSACTION_OPTIONS);
}

export async function confirmChallan(id: string, confirmedBy: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) {
      throw new AppError(404, "Challan not found");
    }
    if (challan.status !== "DRAFT") {
      throw new AppError(409, "Only a DRAFT challan can be confirmed");
    }

    // Re-check CURRENT stock for every item -- NOT the price/name
    // snapshot, since real stock may have moved since the draft was
    // created (other challans confirmed, restocks, etc).
    const failures: { productId: string; productName: string; available: number; requested: number }[] = [];

    for (const item of challan.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new AppError(404, `Product no longer exists: ${item.productNameSnapshot}`);
      }
      if (item.quantity > product.currentStock) {
        failures.push({
          productId: item.productId,
          productName: item.productNameSnapshot,
          available: product.currentStock,
          requested: item.quantity,
        });
      }
    }

    if (failures.length > 0) {
      // Throwing here rolls back the WHOLE transaction -- nothing gets
      // partially deducted. All-or-nothing, per the plan.
      throw new AppError(400, "Insufficient stock", failures);
    }

    for (const item of challan.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantityChanged: item.quantity,
          type: "OUT",
          reason: `Challan ${challan.challanNumber} confirmed`,
          createdBy: confirmedBy,
        },
      });
    }

    return tx.challan.update({
      where: { id },
      data: { status: "CONFIRMED" },
      include: challanInclude,
    });
  }, TRANSACTION_OPTIONS);
}

export async function cancelChallan(id: string, cancelledBy: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) {
      throw new AppError(404, "Challan not found");
    }
    if (challan.status === "CANCELLED") {
      throw new AppError(409, "Challan is already cancelled");
    }

    if (challan.status === "CONFIRMED") {
      // Not explicitly mandated by the plan, but the logically
      // consistent behavior: undo exactly what confirming did, via a
      // reversing IN movement for each item.
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            type: "IN",
            reason: `Challan ${challan.challanNumber} cancelled - stock restored`,
            createdBy: cancelledBy,
          },
        });
      }
    }

    return tx.challan.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: challanInclude,
    });
  }, TRANSACTION_OPTIONS);
}
