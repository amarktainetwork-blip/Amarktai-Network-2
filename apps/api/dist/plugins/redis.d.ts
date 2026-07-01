/**
 * Redis connection plugin for Fastify.
 *
 * Provides a shared ioredis client instance on `app.redis`.
 * Gracefully degrades to null when REDIS_URL is not set.
 */
import type { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
declare module 'fastify' {
    interface FastifyInstance {
        redis: Redis | null;
    }
}
declare function redisPlugin(app: FastifyInstance): Promise<void>;
export declare const redisPluginDecorated: typeof redisPlugin;
export {};
//# sourceMappingURL=redis.d.ts.map