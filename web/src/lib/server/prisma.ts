import "server-only";
import { PrismaClient } from "@prisma/client";

// Standard Next.js singleton -- without this, every hot-reload in dev would
// open a fresh connection pool against Neon and eventually exhaust it.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
