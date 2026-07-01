/**
 * Global error interceptor plugin for Fastify.
 *
 * Catches all unhandled route errors and formats them into
 * consistent JSON error responses. Prevents internal stack traces
 * from leaking to external clients.
 */
import type { FastifyInstance } from 'fastify';
export declare function errorHandlerPlugin(app: FastifyInstance): Promise<void>;
//# sourceMappingURL=error-handler.d.ts.map