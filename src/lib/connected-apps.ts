/**
 * @module connected-apps
 * @description Connected App registry for AmarktAI Network — Phase 5.
 *
 * Stores registered external apps that may deliver webhook events.
 * Each app has a signing secret reference (never the plain secret),
 * a set of declared scopes, and lifecycle timestamps.
 *
 * Server-side only — do NOT import from client components.
 */

import { appendRecord, findRecord, listRecords, updateRecord } from '@/lib/local-json-store'

// ── Storage path ─────────────────────────────────────────────────────────────

export const CONNECTED_APPS_FILE = 'connected-apps/apps.json'

// ── Types ────────────────────────────────────────────────────────────────────

export type ConnectedAppStatus = 'active' | 'suspended' | 'pending'

export type ConnectedAppScope =
  | 'webhook:receive'
  | 'events:read'
  | 'artifacts:read'
  | 'artifacts:write'

export interface ConnectedApp {
  id: string
  name: string
  slug: string
  status: ConnectedAppStatus
  scopes: ConnectedAppScope[]
  /** Reference key used to look up the signing secret from env/vault — never the plain secret. */
  signingSecretRef: string
  createdAt: string
  updatedAt: string
}

export interface RegisterConnectedAppInput {
  name: string
  slug: string
  scopes: ConnectedAppScope[]
  /** Reference key for the signing secret (e.g. env var name). */
  signingSecretRef: string
}

// ── Registry operations ───────────────────────────────────────────────────────

/**
 * Register a new connected app.
 * Returns the created app record.
 */
export function registerConnectedApp(input: RegisterConnectedAppInput): ConnectedApp {
  const now = new Date().toISOString()
  const record: Omit<ConnectedApp, 'id'> = {
    name: input.name,
    slug: input.slug,
    status: 'active',
    scopes: input.scopes,
    signingSecretRef: input.signingSecretRef,
    createdAt: now,
    updatedAt: now,
  }
  return appendRecord<Omit<ConnectedApp, 'id'>>(CONNECTED_APPS_FILE, record) as ConnectedApp
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
 */
export function suspendConnectedApp(id: string): ConnectedApp | null {
  return updateRecord<ConnectedApp>(CONNECTED_APPS_FILE, id, {
    status: 'suspended',
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Reactivate a suspended connected app.
 */
export function activateConnectedApp(id: string): ConnectedApp | null {
  return updateRecord<ConnectedApp>(CONNECTED_APPS_FILE, id, {
    status: 'active',
    updatedAt: new Date().toISOString(),
  })
}
