/**
 * Runtime configuration constants — SINGLE SOURCE OF TRUTH.
 *
 * All environment variable reads and configuration defaults
 * are centralized here. No other module reads process.env directly
 * for these values.
 */
export declare const DEFAULT_STORAGE_ROOT = "/var/www/amarktai/storage";
export declare const STORAGE_SUBDIRS: readonly ["artifacts", "uploads", "repos", "workspaces", "logs"];
export declare function getStorageRoot(): string;
export declare function getRedisUrl(): string;
export declare function getDatabaseUrl(): string;
export declare const API_PORT: number;
export declare const API_HOST: string;
export declare const RATE_LIMIT_MAX: number;
export declare const RATE_LIMIT_WINDOW_MS: number;
export declare const WORKER_CONCURRENCY: number;
//# sourceMappingURL=config.d.ts.map