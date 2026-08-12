// product.service.ts: the actual business logic for the Product &
// Inventory module. Controllers call these functions and turn the
// result into an HTTP response -- no req/res objects touched here.

import { Prisma, StockMovementType } from "@prisma/client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../../config/db";
import { s3Client, publicUrlFor } from "../../config/s3";
import { env } from "../../config/env";
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

// Distinct category/location values already in use, for autocomplete
// on the product create forms -- keeps free-text fields from drifting
// into inconsistent spellings ("Pipes" vs "pipe") across products.
export async function getFieldSuggestions() {
  const [categories, locations] = await Promise.all([
    prisma.product.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.product.findMany({
      distinct: ["location"],
      select: { location: true },
      where: { location: { not: null } },
      orderBy: { location: "asc" },
    }),
  ]);

  return {
    categories: categories.map((c) => c.category),
    locations: locations.map((l) => l.location as string),
  };
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
  },
  // Neon is remote and under load a request may queue for a pooled
  // connection -- give both more room than the defaults (see the
  // longer explanation in challan.service.ts).
  { timeout: 15000, maxWait: 10000 });
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

export async function generateImageUploadUrl(productId: string, fileName: string, fileType: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError(404, "Product not found");
  }

  // Strip anything unsafe for a URL/S3 key, and prefix with a
  // timestamp so re-uploading a file with the same name never
  // collides with (or silently overwrites) a previous upload.
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `products/${productId}/${Date.now()}-${safeFileName}`;

  const command = new PutObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  // The signed URL is only valid for 5 minutes -- plenty of time for
  // the frontend to immediately PUT the file, but not something that
  // should stay usable indefinitely.
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  return { uploadUrl, publicUrl: publicUrlFor(key) };
}
