/**
 * Authentication and authorization contracts — SINGLE SOURCE OF TRUTH.
 *
 * All token validation, app connection checks, capability allowlists,
 * and budget limit schemas are declared here.
 */
export declare const BEARER_TOKEN_PATTERN: RegExp;
export declare function parseBearerToken(header: string): string | null;
export interface AppAuthResult {
    ok: boolean;
    statusCode: number;
    error?: string;
    app?: {
        id: number;
        name: string;
        slug: string;
        category: string;
        appType: string;
        aiEnabled: boolean;
        connectedToBrain: boolean;
        status: string;
    };
    allowedCapabilities?: string[];
    dailyBudgetCents?: number;
    dailySpendCents?: number;
}
export declare const APP_CONNECTION_STATUSES: readonly ["active", "paused", "suspended", "unconfigured"];
export type AppConnectionStatus = (typeof APP_CONNECTION_STATUSES)[number];
//# sourceMappingURL=auth.d.ts.map