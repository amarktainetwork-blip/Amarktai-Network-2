/**
 * @module webhook-verifier
 * @description HMAC-SHA256 webhook signature verification for AmarktAI Network — Phase 5.
 *
 * Verification rules:
 *   - Signature must be HMAC-SHA256 of `${timestamp}.${rawBody}` using the app's signing secret.
 *   - Timestamp must be present in the `x-amarktai-timestamp` header (Unix seconds, string).
 *   - Timestamp must be within WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS of server time (replay protection).
 *   - Signature must be provided in the `x-amarktai-signature` header as `sha256=<hex>`.
 *   - The signing secret is resolved from process.env using the app's signingSecretRef.
 *
 * Server-side only — do NOT import from client components.
 */

import crypto from 'crypto'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum age of a webhook timestamp before it is rejected (5 minutes). */
export const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300

// ── Types ─────────────────────────────────────────────────────────────────────

export type WebhookVerificationResult =
  | { ok: true }
  | { ok: false; reason: string }

// ── Secret resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the signing secret from the environment using the app's signingSecretRef.
 * Returns null if the env var is not set or is empty.
 */
export function resolveSigningSecret(signingSecretRef: string): string | null {
  const value = process.env[signingSecretRef]?.trim()
  return value && value.length > 0 ? value : null
}

// ── HMAC computation ──────────────────────────────────────────────────────────

/**
 * Compute the expected HMAC-SHA256 signature for a webhook payload.
 * The signed string is `${timestamp}.${rawBody}`.
 */
export function computeWebhookSignature(secret: string, timestamp: string, rawBody: string): string {
  const signedString = `${timestamp}.${rawBody}`
  return crypto.createHmac('sha256', secret).update(signedString, 'utf8').digest('hex')
}

// ── Verification ──────────────────────────────────────────────────────────────

export interface WebhookVerifyInput {
  /** Raw request body as a string (must not be parsed before verification). */
  rawBody: string
  /** Value of the `x-amarktai-timestamp` header. */
  timestampHeader: string | null | undefined
  /** Value of the `x-amarktai-signature` header (format: `sha256=<hex>`). */
  signatureHeader: string | null | undefined
  /** The app's signingSecretRef used to look up the secret from env. */
  signingSecretRef: string
  /** Override server time (Unix seconds) for testing. Defaults to Date.now()/1000. */
  nowSeconds?: number
}

/**
 * Verify an incoming webhook request.
 *
 * Returns `{ ok: true }` on success, or `{ ok: false, reason }` on failure.
 * Reasons are intentionally generic to avoid leaking implementation details
 * to external callers — detailed reasons are safe to log server-side.
 */
export function verifyWebhookSignature(input: WebhookVerifyInput): WebhookVerificationResult {
  const { rawBody, timestampHeader, signatureHeader, signingSecretRef, nowSeconds } = input

  // 1. Timestamp must be present
  if (!timestampHeader) {
    return { ok: false, reason: 'missing_timestamp' }
  }

  // 2. Signature must be present
  if (!signatureHeader) {
    return { ok: false, reason: 'missing_signature' }
  }

  // 3. Signature must have the expected prefix
  if (!signatureHeader.startsWith('sha256=')) {
    return { ok: false, reason: 'invalid_signature_format' }
  }

  // 4. Timestamp must be a valid integer
  const ts = parseInt(timestampHeader, 10)
  if (isNaN(ts) || ts <= 0) {
    return { ok: false, reason: 'invalid_timestamp' }
  }

  // 5. Timestamp must be within tolerance (replay protection)
  const now = nowSeconds ?? Math.floor(Date.now() / 1000)
  const age = Math.abs(now - ts)
  if (age > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'timestamp_expired' }
  }

  // 6. Resolve signing secret
  const secret = resolveSigningSecret(signingSecretRef)
  if (!secret) {
    return { ok: false, reason: 'signing_secret_not_configured' }
  }

  // 7. Compute expected signature
  const expected = computeWebhookSignature(secret, timestampHeader, rawBody)
  const provided = signatureHeader.slice('sha256='.length)

  // 8. Constant-time comparison to prevent timing attacks
  let valid = false
  try {
    valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'))
  } catch {
    // Buffer lengths differ — invalid hex or wrong length
    return { ok: false, reason: 'invalid_signature' }
  }

  if (!valid) {
    return { ok: false, reason: 'invalid_signature' }
  }

  return { ok: true }
}
