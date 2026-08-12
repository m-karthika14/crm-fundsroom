// customer.service.ts: the actual business logic for the Customer CRM
// module. Controllers call these functions and turn the result into
// an HTTP response -- no req/res objects are touched in here.

import { Prisma, CustomerStatus, CustomerType } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

interface ListCustomersParams {
  page: number;
  limit: number;
  q?: string;
  status?: CustomerStatus;
  type?: CustomerType;
}

export async function listCustomers(params: ListCustomersParams) {
  const { page, limit, q, status, type } = params;

  // Build up the "where" filter piece by piece -- only add a condition
  // if the caller actually asked for it.
  const where: Prisma.CustomerWhereInput = {};

  if (status) where.status = status;
  if (type) where.type = type;

  if (q) {
    // Case-insensitive partial match across the fields a user is most
    // likely to search by.
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q, mode: "insensitive" } },
      { businessName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { notes: { orderBy: { createdAt: "desc" } } },
  });

  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  return customer;
}

// Prisma throws this specific error (code P2002) when a @unique column
// is violated. We turn it into our API's standard 409 shape instead of
// letting a raw database error leak out.
function rethrowAsConflictIfDuplicateMobile(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new AppError(409, "A customer with this mobile number already exists");
  }
  throw err;
}

export async function createCustomer(data: Prisma.CustomerCreateInput) {
  try {
    return await prisma.customer.create({ data });
  } catch (err) {
    rethrowAsConflictIfDuplicateMobile(err);
  }
}

export async function updateCustomer(id: string, data: Prisma.CustomerUpdateInput) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Customer not found");
  }

  try {
    return await prisma.customer.update({ where: { id }, data });
  } catch (err) {
    rethrowAsConflictIfDuplicateMobile(err);
  }
}

export async function addNote(customerId: string, note: string, createdBy: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  return prisma.customerNote.create({
    data: { customerId, note, createdBy },
  });
}
