/**
 * Prisma client singleton — shared across the monorepo.
 *
 * All database access goes through this single instance.
 * No other module may create its own PrismaClient.
 */
import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.__prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__prisma = prisma;
}
//# sourceMappingURL=client.js.map