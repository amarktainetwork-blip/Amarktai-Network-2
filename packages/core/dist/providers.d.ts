/**
 * Provider definitions — SINGLE SOURCE OF TRUTH.
 *
 * All provider keys, routing metadata, and provider capability maps
 * are declared here. No other file may duplicate provider lists.
 */
import { z } from 'zod';
export declare const PROVIDER_KEYS: readonly ["genx", "together", "groq", "mimo"];
export type ProviderKey = (typeof PROVIDER_KEYS)[number];
export declare const PROVIDER_HEALTH_STATUSES: readonly ["unconfigured", "configured", "healthy", "degraded", "error", "disabled"];
export type ProviderHealthStatus = (typeof PROVIDER_HEALTH_STATUSES)[number];
export declare const COST_TIERS: readonly ["free", "very_low", "low", "medium", "high", "premium"];
export type CostTier = (typeof COST_TIERS)[number];
export declare const LATENCY_TIERS: readonly ["ultra_low", "low", "medium", "high"];
export type LatencyTier = (typeof LATENCY_TIERS)[number];
export declare const ProviderDefinitionSchema: z.ZodObject<{
    key: z.ZodEnum<{
        genx: "genx";
        together: "together";
        groq: "groq";
        mimo: "mimo";
    }>;
    displayName: z.ZodString;
    enabled: z.ZodDefault<z.ZodBoolean>;
    baseUrl: z.ZodDefault<z.ZodString>;
    defaultModel: z.ZodDefault<z.ZodString>;
    fallbackModel: z.ZodDefault<z.ZodString>;
    healthStatus: z.ZodDefault<z.ZodEnum<{
        error: "error";
        unconfigured: "unconfigured";
        configured: "configured";
        healthy: "healthy";
        degraded: "degraded";
        disabled: "disabled";
    }>>;
}, z.core.$strip>;
export type ProviderDefinition = z.infer<typeof ProviderDefinitionSchema>;
export declare const ProviderCapabilityMapSchema: z.ZodObject<{
    providerKey: z.ZodEnum<{
        genx: "genx";
        together: "together";
        groq: "groq";
        mimo: "mimo";
    }>;
    capabilityKey: z.ZodString;
    models: z.ZodDefault<z.ZodArray<z.ZodString>>;
    proven: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type ProviderCapabilityMap = z.infer<typeof ProviderCapabilityMapSchema>;
export declare function isValidProvider(key: string): key is ProviderKey;
//# sourceMappingURL=providers.d.ts.map