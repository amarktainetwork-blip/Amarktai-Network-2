/**
 * Authentication and authorization contracts — SINGLE SOURCE OF TRUTH.
 *
 * All token validation, app connection checks, capability allowlists,
 * and budget limit schemas are declared here.
 */
// ── Auth Token Format ─────────────────────────────────────────────────────────
export const BEARER_TOKEN_PATTERN = /^Bearer\s+(.+)$/;
export function parseBearerToken(header) {
    const match = header.match(BEARER_TOKEN_PATTERN);
    return match?.[1] ?? null;
}
// ── App Connection Status ─────────────────────────────────────────────────────
export const APP_CONNECTION_STATUSES = ['active', 'paused', 'suspended', 'unconfigured'];
//# sourceMappingURL=auth.js.map