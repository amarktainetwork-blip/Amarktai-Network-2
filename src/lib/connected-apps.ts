/**
 * @module connected-apps
 * @description Connected App registry for AmarktAI Network — Phase 5.
 *
 * Stores registered external apps that may deliver webhook events.
 * Each app has a signing secret reference (never the plain secret),
 * a set of declared scopes, and lifecycle timestamps.
 *
 * Secret handling:
 *   - On registration, a random 32-byte hex secret is generated.
 *   - The plain secret is returned ONCE to the caller and never stored.
 *   - A SHA-256 hash of the secret is stored as `signingSecretHash`.
 *   - The `signingSecretRef` is an env-var name the caller should set
 *     to the plain secret on their infrastructure.
 *   - Webhook verification reads the secret from process.env[signingSecretRef].
 *
 * Server-side only — do NOT import from client components.
 */

import crypto from 'crypto'
import { appendRecord, deleteRecord, findRecord, listRecords, updateRecord } from '@/lib/local-json-store'

// ── Storage path ─────────────────────────────────────────────────────────────

export const CONNECTED_APPS_FILE = 'connected-apps/apps.json'

// ── Types ────────────────────────────────────────────────────────────────────

export type ConnectedAppStatus = 'active' | 'suspended' | 'pending'

export type ConnectedAppScope =
  | 'webhook:receive'
  | 'events:read'
  | 'artifacts:read'
  | 'artifacts:write'

export const CONNECTED_APP_SCOPES: ConnectedAppScope[] = [
  'webhook:receive',
  'events:read',
  'artifacts:read',
  'artifacts:write',
]

export interface ConnectedApp {
  id: string
  name: string
  slug: string
  status: ConnectedAppStatus
  scopes: ConnectedAppScope[]
  /** Reference key used to look up the signing secret from env — never the plain secret. */
  signingSecretRef: string
  /** SHA-256 hash of the signing secret for integrity verification. Never the plain secret. */
  signingSecretHash: string
  createdAt: string
  updatedAt: string
}

export interface RegisterConnectedAppInput {
  name: string
  slug: string
  scopes: ConnectedAppScope[]
}

/** Returned once on registration — the plain secret is never stored or shown again. */
export interface RegisterConnectedAppResult {
  app: ConnectedApp
  /** The plain signing secret — show once, never store, never log. */
  signingSecret: string
}

// ── Secret helpers ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random 32-byte hex signing secret.
 */
export function generateSigningSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Compute SHA-256 hash of a signing secret for storage.
 */
export function hashSigningSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret, 'utf8').digest('hex')
}

/**
 * Derive the env-var name for a connected app's signing secret.
 * Format: AMARKTAI_APP_SECRET_<SLUG_UPPERCASED_UNDERSCORED>
 */
export function deriveSigningSecretRef(slug: string): string {
  const safe = slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')
  return `AMARKTAI_APP_SECRET_${safe}`
}

// ── Slug validation ───────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Validate a slug: lowercase alphanumeric with hyphens, no leading/trailing hyphens.
 */
export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 2 && slug.length <= 64
}

// ── Registry operations ───────────────────────────────────────────────────────

/**
 * Register a new connected app.
 *
 * Generates a signing secret, stores only the hash and ref.
 * Returns the app record AND the plain secret (shown once only).
 *
 * Throws if the slug is invalid or already taken.
 */
export function registerConnectedApp(input: RegisterConnectedAppInput): RegisterConnectedAppResult {
  if (!isValidSlug(input.slug)) {
    throw new Error(`Invalid slug: "${input.slug}". Must be lowercase alphanumeric with hyphens.`)
  }

  const existing = getConnectedAppBySlug(input.slug)
  if (existing) {
    throw new Error(`Slug "${input.slug}" is already registered.`)
  }

  const signingSecret = generateSigningSecret()
  const signingSecretRef = deriveSigningSecretRef(input.slug)
  const signingSecretHash = hashSigningSecret(signingSecret)

  const now = new Date().toISOString()
  const record: Omit<ConnectedApp, 'id'> = {
    name: input.name,
    slug: input.slug,
    status: 'active',
    scopes: input.scopes,
    signingSecretRef,
    signingSecretHash,
    createdAt: now,
    updatedAt: now,
  }

  const app = appendRecord<Omit<ConnectedApp, 'id'>>(CONNECTED_APPS_FILE, record) as ConnectedApp
  return { app, signingSecret }
}

/**
 * Find a registered app by its id.
 * Returns null if not found.
 */
export function getConnectedApp(id: string): ConnectedApp | null {
  return findRecord<ConnectedApp>(CONNECTED_APPS_FILE, id)
}

/**
 * Find a registered app by its slug.
 * Returns null if not found.
 */
export function getConnectedAppBySlug(slug: string): ConnectedApp | null {
  const all = listRecords<ConnectedApp>(CONNECTED_APPS_FILE)
  return all.find((a) => a.slug === slug) ?? null
}

/**
 * List all registered connected apps.
 */
export function listConnectedApps(): ConnectedApp[] {
  return listRecords<ConnectedApp>(CONNECTED_APPS_FILE)
}

/**
 * Suspend a connected app (prevents webhook acceptance).
 * Returns null if not found.
 */
export function suspendConnectedApp(id: string): ConnectedApp | null {
  return updateRecord<ConnectedApp>(CONNECTED_APPS_FILE, id, {
    status: 'suspended',
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Reactivate a suspended connected app.
 * Returns null if not found.
 */
export function activateConnectedApp(id: string): ConnectedApp | null {
  return updateRecord<ConnectedApp>(CONNECTED_APPS_FILE, id, {
    status: 'active',
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Deregister (delete) a connected app by id.
 *
 * Safe to call only when the app has no pending webhook processing.
 * Returns true if deleted, false if not found.
 */
export function deregisterConnectedApp(id: string): boolean {
  return deleteRecord<ConnectedApp>(CONNECTED_APPS_FILE, id)
}
