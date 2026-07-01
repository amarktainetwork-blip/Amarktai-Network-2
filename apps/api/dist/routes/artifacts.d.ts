/**
 * GET /api/v1/artifacts/:id/file — Secure local storage asset serving endpoint.
 *
 * Serves artifact files from the local VPS storage directory.
 * Validates that the artifact exists and is completed before serving.
 */
import type { FastifyInstance } from 'fastify';
export declare function artifactRoutes(app: FastifyInstance): Promise<void>;
//# sourceMappingURL=artifacts.d.ts.map