// Prisma client wrapper
// Keep this simple: import PrismaClient and export single instance.

import { PrismaClient } from "@prisma/client";

// Single shared Prisma client instance for the app
export const prisma = new PrismaClient();
