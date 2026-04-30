/**
 * @module service-vault
 * @description Unified key resolution for third-party service integrations.
 *
 * Resolution order for every service key:
 *   1. integrationConfig DB vault (encrypted, set via Admin → Settings)
 *   2. Environment variable fallback (for local dev / CI)
 *
 * Server-side only.
 */

import { prisma } from '@/lib/prisma'
import { decryptVaultKey } from '@/lib/crypto-vault'

const PLACEHOLDER_KEY_PATTERNS = [
  /^test$/i,
  /^demo$/i,
  /^fake$/i,
  /^dummy$/i,
  /^placeholder$/i,
  /^changeme$/i,
  /^your[-_ ]?(api[-_ ]?)?key$/i,
  /(^|[-_])test($|[-_])/i,
  /(^|[-_])demo($|[-_])/i,
  /placeholder/i,
  /example/i,
  /changeme/i,
]

export function isUsableServiceKey(raw: string | null | undefined): raw is string {
  if (!raw) return false
  const trimmed = raw.trim()
  if (!trimmed) return false
  const normalized = trimmed.toLowerCase().startsWith('bearer ')
    ? trimmed.slice('bearer '.length).trim()
    : trimmed
  if (!normalized || normalized.length < 8) return false
  return !PLACEHOLDER_KEY_PATTERNS.some((pattern) => pattern.test(normalized))
}

/**
 * Resolves an API key for a third-party service integration.
 *
 * @param integrationKey - The `key` column in the `integrationConfig` table.
 * @param envVar - The environment variable name used as fallback.
 * @returns The decrypted API key, or null if not configured.
 */
export async function getServiceKey(integrationKey: string, envVar: string): Promise<string | null> {
  // DB vault is authoritative (set via Admin → Settings → Integrations)
  try {
    const row = await prisma.integrationConfig.findUnique({
      where: { key: integrationKey },
      select: { apiKey: true },
    })
    if (row?.apiKey) {
      const decrypted = decryptVaultKey(row.apiKey)
      if (isUsableServiceKey(decrypted)) return decrypted.trim()
    }
  } catch {
    // DB unavailable — fall through to env
  }

  // Env-var fallback for local dev / CI
  const envValue = process.env[envVar]
  return isUsableServiceKey(envValue) ? envValue.trim() : null
}

/**
 * Synchronous environment-only key lookup for code paths that cannot touch the
 * DB. Prefer getServiceKey/getProviderKey for request handlers.
 */
export function getEnvServiceKey(envVar: string): string | null {
  const envValue = process.env[envVar]
  return isUsableServiceKey(envValue) ? envValue.trim() : null
}

/**
 * Resolves a plain (non-encrypted) configuration string for a service.
 * Used for URLs, hostnames, and other non-sensitive config values stored
 * in the `notes` JSON blob of the integrationConfig row.
 *
 * @param integrationKey - The `key` column in the `integrationConfig` table.
 * @param notesField - The field name within the `notes` JSON blob.
 * @param envVar - The environment variable name used as fallback.
 */
export async function getServiceConfigField(
  integrationKey: string,
  notesField: string,
  envVar: string,
): Promise<string | null> {
  try {
    const row = await prisma.integrationConfig.findUnique({
      where: { key: integrationKey },
      select: { notes: true },
    })
    if (row?.notes) {
      let notes: Record<string, unknown> = {}
      try { notes = JSON.parse(row.notes) } catch { /* ignore */ }
      const v = notes[notesField]
      if (typeof v === 'string' && v) return v
    }
  } catch {
    // DB unavailable — fall through to env
  }

  const envValue = process.env[envVar]
  return envValue || null
}
