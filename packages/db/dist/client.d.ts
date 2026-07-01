/**
 * Prisma client singleton — shared across the monorepo.
 *
 * All database access goes through this single instance.
 * No other module may create its own PrismaClient.
 */
import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
//# sourceMappingURL=client.d.ts.map