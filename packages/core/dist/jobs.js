/**
 * Job lifecycle types and validation — SINGLE SOURCE OF TRUTH.
 *
 * All job status transitions, request schemas, and response contracts
 * are declared here. The API gateway, worker, and database all import
 * from this module.
 */
import { z } from 'zod';
import { CAPABILITY_KEYS } from './capabilities.js';
// ── Job Statuses ──────────────────────────────────────────────────────────────
export const JOB_STATUSES = [
    'queued',
    'processing',
    'completed',
    'failed',
    'cancelled',
];
// ── Job Creation Request (external app → API) ────────────────────────────────
export const CreateJobRequestSchema = z.object({
    capability: z.enum(CAPABILITY_KEYS),
    prompt: z.string().min(1).max(100_000),
    input: z.record(z.string(), z.unknown()).default({}),
    metadata: z.record(z.string(), z.unknown()).default({}),
    callbackUrl: z.string().url().optional(),
});
// ── COMPLIANCE GATE: Blocked fields ──────────────────────────────────────────
/**
 * Fields that external apps are NEVER allowed to pass.
 * The API gateway must reject any request containing these fields
 * with a 400 Bad Request immediately.
 */
export const BLOCKED_OVERRIDE_FIELDS = [
    'providerOverride',
    'modelOverride',
    'provider',
    'model',
    'providerKey',
    'modelId',
];
export function hasBlockedOverrides(input) {
    for (const field of BLOCKED_OVERRIDE_FIELDS) {
        if (field in input)
            return field;
    }
    return null;
}
//# sourceMappingURL=jobs.js.map