/**
 * Provider definitions — SINGLE SOURCE OF TRUTH.
 *
 * All provider keys, routing metadata, and provider capability maps
 * are declared here. No other file may duplicate provider lists.
 */
import { z } from 'zod';
// ── Provider Keys ─────────────────────────────────────────────────────────────
export const PROVIDER_KEYS = ['genx', 'together', 'groq', 'mimo'];
// ── Provider Status ───────────────────────────────────────────────────────────
export const PROVIDER_HEALTH_STATUSES = [
    'unconfigured',
    'configured',
    'healthy',
    'degraded',
    'error',
    'disabled',
];
// ── Cost Tiers ────────────────────────────────────────────────────────────────
export const COST_TIERS = ['free', 'very_low', 'low', 'medium', 'high', 'premium'];
// ── Latency Tiers ─────────────────────────────────────────────────────────────
export const LATENCY_TIERS = ['ultra_low', 'low', 'medium', 'high'];
// ── Provider Definition Schema ────────────────────────────────────────────────
export const ProviderDefinitionSchema = z.object({
    key: z.enum(PROVIDER_KEYS),
    displayName: z.string(),
    enabled: z.boolean().default(false),
    baseUrl: z.string().default(''),
    defaultModel: z.string().default(''),
    fallbackModel: z.string().default(''),
    healthStatus: z.enum(PROVIDER_HEALTH_STATUSES).default('unconfigured'),
});
// ── Provider Capability Mapping ───────────────────────────────────────────────
export const ProviderCapabilityMapSchema = z.object({
    providerKey: z.enum(PROVIDER_KEYS),
    capabilityKey: z.string(),
    models: z.array(z.string()).default([]),
    proven: z.boolean().default(false),
});
// ── Validation helpers ────────────────────────────────────────────────────────
export function isValidProvider(key) {
    return PROVIDER_KEYS.includes(key);
}
//# sourceMappingURL=providers.js.map