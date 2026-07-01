/**
 * Job ingestion and status routes.
 *
 * POST /api/v1/jobs — Ingest a new capability request from an external app.
 * GET  /api/v1/jobs/:id — Poll job status for external callers.
 *
 * Validation pulls strictly from @amarktai/core (single source of truth).
 */
import type { FastifyInstance } from 'fastify';
export declare function jobRoutes(app: FastifyInstance): Promise<void>;
//# sourceMappingURL=jobs.d.ts.map