// product.service.ts: the actual business logic for the Product &
// Inventory module. Controllers call these functions and turn the
// result into an HTTP response -- no req/res objects touched here.

import { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

interface ListProductsParams {
  page: number;
  limit: number;
  q?: string;
  lowStock: boolean;
}

export async function listProducts(params: ListProductsParams) {
  const { page, limit, q, lowStock } = params;

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  // "currentStock <= minStockAlert" compares two columns on the same
  // row, which Prisma's query builder can't express directly. Rather
  // than reaching for raw SQL, we filter in JS after fetching -- this
  // product catalog is small enough that it stays fast and keeps the
  // code simple and injection-safe.
  if (!lowStock) {
    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
  }

  const allMatching = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
  const lowStockOnly = allMatching.filter((p) => p.currentStock <= p.minStockAlert);
  const total = lowStockOnly.length;
  const data = lowStockOnly.slice((page - 1) * limit, (page - 1) * limit + limit);

  return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new AppError(404, "Product not found");
  }
  return product;
}

// Prisma throws this specific error (code P2002) when a @unique column
// is violated -- turn it into our API's standard 409 shape.
function rethrowAsConflictIfDuplicateSku(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new AppError(409, "A product with this SKU already exists");
  }
  throw err;
}

export async function createProduct(data: Prisma.ProductCreateInput) {
  try {
    return await prisma.product.create({ data });
  } catch (err) {
    rethrowAsConflictIfDuplicateSku(err);
  }
}

export async function updateProduct(id: string, data: Prisma.ProductUpdateInput) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Product not found");
  }

  try {
    return await prisma.product.update({ where: { id }, data });
  } catch (err) {
    rethrowAsConflictIfDuplicateSku(err);
  }
}

export async function createStockMovement(
  productId: string,
  quantityChanged: number,
  type: StockMovementType,
  reason: string,
  createdBy: string
) {
  // Everything below runs as one atomic transaction: either both the
  // stock update AND the movement record are written, or neither is --
  // there's no way to end up with a stock change that isn't logged.
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError(404, "Product not found");
    }

    if (type === "OUT" && quantityChanged > product.currentStock) {
      throw new AppError(
        400,
        `Insufficient stock: available ${product.currentStock}, requested ${quantityChanged}`
      );
    }

    const newStock =
      type === "IN" ? product.currentStock + quantityChanged : product.currentStock - quantityChanged;

    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: { productId, quantityChanged, type, reason, createdBy },
    });

    return { product: updatedProduct, movement };
  });
}

export async function getStockHistory(productId: string, page: number, limit: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError(404, "Product not found");
  }

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockMovement.count({ where: { productId } }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
}
