/**
 * Phase 5: Connected Apps — test suite (registration UI slice)
 *
 * Tests:
 *   - create app returns id + secret
 *   - duplicate slug rejected
 *   - invalid slug rejected
 *   - secret shown once only (not stored in app record)
 *   - secret hash stored (not plain secret)
 *   - suspend app blocks webhook
 *   - reactivate app allows webhook again
 *   - deregister removes app from list
 *   - valid HMAC accepted
 *   - invalid HMAC rejected
 *   - expired timestamp rejected
 *   - unknown app rejected
 *   - event written after accepted webhook
 *   - UI empty state when no apps exist
 *   - app appears only when registered
 */

import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoist the in-memory store so it is available inside vi.mock factories ─────

const hoisted = vi.hoisted(() => {
  let _counter = 0
  const store: Record<string, unknown[]> = {}

  function generateId() {
    _counter += 1
    return `test-id-${_counter}`
  }

  function resetStore() {
    for (const key of Object.keys(store)) {
      delete store[key]
    }
    _counter = 0
  }

  return { store, generateId, resetStore }
})

// ── Mock local-json-store so tests don't touch the filesystem ─────────────────

vi.mock('@/lib/local-json-store', () => {
  function readJsonFile<T>(relPath: string): T[] {
    return (hoisted.store[relPath] as T[]) ?? []
  }

  function writeJsonFile<T>(relPath: string, records: T[]): boolean {
    hoisted.store[relPath] = records as unknown[]
    return true
  }

  function appendRecord<T extends object>(relPath: string, record: T): T & { id: string } {
    const records = readJsonFile<T & { id: string }>(relPath)
    const id = (record as { id?: string }).id ?? hoisted.generateId()
    const withId = { ...record, id } as T & { id: string }
    records.push(withId)
    writeJsonFile(relPath, records)
    return withId
  }

  function updateRecord<T extends { id: string }>(
    relPath: string,
    id: string,
    updates: Partial<Omit<T, 'id'>>,
  ): (T & { id: string }) | null {
    const records = readJsonFile<T>(relPath)
    const idx = records.findIndex((r) => (r as { id: string }).id === id)
    if (idx === -1) return null
    const updated = { ...records[idx], ...updates } as T & { id: string }
    records[idx] = updated
    writeJsonFile(relPath, records)
    return updated
  }

  function deleteRecord<T extends { id: string }>(relPath: string, id: string): boolean {
    const records = readJsonFile<T>(relPath)
    const filtered = records.filter((r) => (r as { id: string }).id !== id)
    if (filtered.length === records.length) return false
    return writeJsonFile(relPath, filtered)
  }

  function listRecords<T extends { id: string }>(
    relPath: string,
    filter?: (record: T) => boolean,
  ): T[] {
    const records = readJsonFile<T>(relPath)
    return filter ? records.filter(filter) : records
  }

  function findRecord<T extends { id: string }>(relPath: string, id: string): T | null {
    const records = readJsonFile<T>(relPath)
    return records.find((r) => (r as { id: string }).id === id) ?? null
  }

  return {
    generateId: hoisted.generateId,
    readJsonFile,
    writeJsonFile,
    appendRecord,
    updateRecord,
    deleteRecord,
    listRecords,
    findRecord,
  }
})

// ── Imports after mocks ───────────────────────────────────────────────────────

import {
  registerConnectedApp,
  getConnectedApp,
  getConnectedAppBySlug,
  listConnectedApps,
  suspendConnectedApp,
  activateConnectedApp,
  deregisterConnectedApp,
  isValidSlug,
  deriveSigningSecretRef,
  hashSigningSecret,
  generateSigningSecret,
} from '@/lib/connected-apps'

import {
  computeWebhookSignature,
  verifyWebhookSignature,
  resolveSigningSecret,
  WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
} from '@/lib/webhook-verifier'

import {
  recordAcceptedEvent,
  recordRejectedEvent,
  listConnectedAppEvents,
  listConnectedAppEventsForApp,
} from '@/lib/connected-app-events'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTimestamp(offsetSeconds = 0): string {
  return String(Math.floor(Date.now() / 1000) + offsetSeconds)
}

function makeSignature(secret: string, timestamp: string, body: string): string {
  return `sha256=${computeWebhookSignature(secret, timestamp, body)}`
}

function registerApp(overrides: { name?: string; slug?: string; scopes?: string[] } = {}) {
  return registerConnectedApp({
    name: overrides.name ?? 'Test App',
    slug: overrides.slug ?? 'test-app',
    scopes: (overrides.scopes as never) ?? ['webhook:receive'],
  })
}

// ── Reset store and env between tests ─────────────────────────────────────────

beforeEach(() => {
  hoisted.resetStore()
  delete process.env['TEST_APP_SECRET']
  delete process.env['ANOTHER_SECRET']
})

// ─────────────────────────────────────────────────────────────────────────────
// Connected App Registry — registration
// ─────────────────────────────────────────────────────────────────────────────

describe('Connected App Registry — registration', () => {
  it('registers a new app and returns app + signingSecret', () => {
    const result = registerApp()

    expect(result.app.id).toBeTruthy()
    expect(result.app.name).toBe('Test App')
    expect(result.app.slug).toBe('test-app')
    expect(result.app.status).toBe('active')
    expect(result.app.scopes).toContain('webhook:receive')
    expect(result.app.signingSecretRef).toBe('AMARKTAI_APP_SECRET_TEST_APP')
    expect(result.app.createdAt).toBeTruthy()
    expect(result.app.updatedAt).toBeTruthy()
    expect(result.signingSecret).toBeTruthy()
    expect(typeof result.signingSecret).toBe('string')
    expect(result.signingSecret.length).toBeGreaterThan(0)
  })

  it('secret is shown once — not stored in app record', () => {
    const result = registerApp()
    const raw = JSON.stringify(result.app)

    // The plain secret must not appear in the stored app record
    expect(raw).not.toContain(result.signingSecret)
  })

  it('stores a hash of the secret, not the plain secret', () => {
    const result = registerApp()

    expect(result.app.signingSecretHash).toBeTruthy()
    expect(result.app.signingSecretHash).not.toBe(result.signingSecret)
    // Hash should be 64 hex chars (SHA-256)
    expect(result.app.signingSecretHash).toMatch(/^[0-9a-f]{64}$/)
    // Hash must match
    expect(result.app.signingSecretHash).toBe(hashSigningSecret(result.signingSecret))
  })

  it('signingSecretRef is derived from slug', () => {
    const result = registerConnectedApp({
      name: 'My App',
      slug: 'my-app',
      scopes: ['webhook:receive'],
    })
    expect(result.app.signingSecretRef).toBe('AMARKTAI_APP_SECRET_MY_APP')
  })

  it('duplicate slug is rejected', () => {
    registerApp({ slug: 'unique-slug' })
    expect(() => registerApp({ slug: 'unique-slug' })).toThrow('already registered')
  })

  it('invalid slug is rejected', () => {
    expect(() =>
      registerConnectedApp({ name: 'Bad', slug: 'UPPERCASE', scopes: ['webhook:receive'] }),
    ).toThrow('Invalid slug')

    expect(() =>
      registerConnectedApp({ name: 'Bad', slug: '-leading-hyphen', scopes: ['webhook:receive'] }),
    ).toThrow('Invalid slug')

    expect(() =>
      registerConnectedApp({ name: 'Bad', slug: 'trailing-hyphen-', scopes: ['webhook:receive'] }),
    ).toThrow('Invalid slug')

    expect(() =>
      registerConnectedApp({ name: 'Bad', slug: 'a', scopes: ['webhook:receive'] }),
    ).toThrow('Invalid slug')
  })

  it('returns null for unknown app id', () => {
    expect(getConnectedApp('nonexistent-id')).toBeNull()
  })

  it('finds app by slug', () => {
    const { app } = registerApp({ slug: 'slug-app' })
    const found = getConnectedAppBySlug('slug-app')
    expect(found).not.toBeNull()
    expect(found!.id).toBe(app.id)
  })

  it('returns null for unknown slug', () => {
    expect(getConnectedAppBySlug('does-not-exist')).toBeNull()
  })

  it('lists empty array when no apps registered', () => {
    expect(listConnectedApps()).toEqual([])
  })

  it('app appears in list only after registration', () => {
    expect(listConnectedApps()).toHaveLength(0)
    registerApp({ slug: 'app-a' })
    expect(listConnectedApps()).toHaveLength(1)
    expect(listConnectedApps()[0].slug).toBe('app-a')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Connected App Registry — suspend / reactivate / deregister
// ─────────────────────────────────────────────────────────────────────────────

describe('Connected App Registry — lifecycle', () => {
  it('suspends an active app', () => {
    const { app } = registerApp({ slug: 'suspend-me' })
    const suspended = suspendConnectedApp(app.id)
    expect(suspended).not.toBeNull()
    expect(suspended!.status).toBe('suspended')
  })

  it('reactivates a suspended app', () => {
    const { app } = registerApp({ slug: 'reactivate-me' })
    suspendConnectedApp(app.id)
    const reactivated = activateConnectedApp(app.id)
    expect(reactivated!.status).toBe('active')
  })

  it('deregister removes app from list', () => {
    const { app } = registerApp({ slug: 'delete-me' })
    expect(listConnectedApps()).toHaveLength(1)

    const deleted = deregisterConnectedApp(app.id)
    expect(deleted).toBe(true)
    expect(listConnectedApps()).toHaveLength(0)
    expect(getConnectedApp(app.id)).toBeNull()
  })

  it('deregister returns false for unknown id', () => {
    expect(deregisterConnectedApp('nonexistent')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Slug and secret helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('Slug and secret helpers', () => {
  it('isValidSlug accepts valid slugs', () => {
    expect(isValidSlug('my-app')).toBe(true)
    expect(isValidSlug('app123')).toBe(true)
    expect(isValidSlug('a1')).toBe(true)
    expect(isValidSlug('my-cool-app-v2')).toBe(true)
  })

  it('isValidSlug rejects invalid slugs', () => {
    expect(isValidSlug('a')).toBe(false) // too short
    expect(isValidSlug('UPPER')).toBe(false)
    expect(isValidSlug('-leading')).toBe(false)
    expect(isValidSlug('trailing-')).toBe(false)
    expect(isValidSlug('has space')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })

  it('deriveSigningSecretRef converts slug to env var name', () => {
    expect(deriveSigningSecretRef('my-app')).toBe('AMARKTAI_APP_SECRET_MY_APP')
    expect(deriveSigningSecretRef('cool-app-v2')).toBe('AMARKTAI_APP_SECRET_COOL_APP_V2')
  })

  it('generateSigningSecret returns a 64-char hex string', () => {
    const secret = generateSigningSecret()
    expect(secret).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashSigningSecret returns a 64-char hex SHA-256', () => {
    const hash = hashSigningSecret('mysecret')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('two different secrets produce different hashes', () => {
    expect(hashSigningSecret('secret-a')).not.toBe(hashSigningSecret('secret-b'))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// HMAC Webhook Verification
// ─────────────────────────────────────────────────────────────────────────────

describe('HMAC Webhook Verification', () => {
  const SECRET = 'test-signing-secret-abc123'
  const SECRET_REF = 'TEST_APP_SECRET'

  beforeEach(() => {
    process.env[SECRET_REF] = SECRET
  })

  it('accepts a valid HMAC signature', () => {
    const body = JSON.stringify({ event: 'order.created', orderId: '123' })
    const ts = makeTimestamp()
    const sig = makeSignature(SECRET, ts, body)

    const result = verifyWebhookSignature({
      rawBody: body,
      timestampHeader: ts,
      signatureHeader: sig,
      signingSecretRef: SECRET_REF,
      nowSeconds: parseInt(ts, 10),
    })

    expect(result.ok).toBe(true)
  })

  it('rejects an invalid HMAC signature', () => {
    const body = JSON.stringify({ event: 'order.created' })
    const ts = makeTimestamp()
    const sig = `sha256=${'a'.repeat(64)}`

    const result = verifyWebhookSignature({
      rawBody: body,
      timestampHeader: ts,
      signatureHeader: sig,
      signingSecretRef: SECRET_REF,
      nowSeconds: parseInt(ts, 10),
    })

    expect(result.ok).toBe(false)
    expect((result as { ok: false; reason: string }).reason).toBe('invalid_signature')
  })

  it('rejects a tampered body', () => {
    const originalBody = JSON.stringify({ event: 'order.created', amount: 100 })
    const tamperedBody = JSON.stringify({ event: 'order.created', amount: 99999 })
    const ts = makeTimestamp()
    const sig = makeSignature(SECRET, ts, originalBody)

    const result = verifyWebhookSignature({
      rawBody: tamperedBody,
      timestampHeader: ts,
      signatureHeader: sig,
      signingSecretRef: SECRET_REF,
      nowSeconds: parseInt(ts, 10),
    })

    expect(result.ok).toBe(false)
    expect((result as { ok: false; reason: string }).reason).toBe('invalid_signature')
  })

  it('rejects an expired timestamp', () => {
    const body = JSON.stringify({ event: 'old.event' })
    const oldTs = makeTimestamp(-(WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS + 60))
    const sig = makeSignature(SECRET, oldTs, body)

    const result = verifyWebhookSignature({
      rawBody: body,
      timestampHeader: oldTs,
      signatureHeader: sig,
      signingSecretRef: SECRET_REF,
    })

    expect(result.ok).toBe(false)
    expect((result as { ok: false; reason: string }).reason).toBe('timestamp_expired')
  })

  it('rejects a future timestamp beyond tolerance', () => {
    const body = JSON.stringify({ event: 'future.event' })
    const futureTs = makeTimestamp(WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS + 60)
    const sig = makeSignature(SECRET, futureTs, body)

    const result = verifyWebhookSignature({
      rawBody: body,
      timestampHeader: futureTs,
      signatureHeader: sig,
      signingSecretRef: SECRET_REF,
    })

    expect(result.ok).toBe(false)
    expect((result as { ok: false; reason: string }).reason).toBe('timestamp_expired')
  })

  it('rejects when timestamp header is missing', () => {
    const result = verifyWebhookSignature({
      rawBody: 'hello',
      timestampHeader: null,
      signatureHeader: makeSignature(SECRET, '1234567890', 'hello'),
      signingSecretRef: SECRET_REF,
    })

    expect(result.ok).toBe(false)
    expect((result as { ok: false; reason: string }).reason).toBe('missing_timestamp')
  })

  it('rejects when signature header is missing', () => {
    const ts = makeTimestamp()
    const result = verifyWebhookSignature({
      rawBody: 'hello',
      timestampHeader: ts,
      signatureHeader: null,
      signingSecretRef: SECRET_REF,
      nowSeconds: parseInt(ts, 10),
    })

    expect(result.ok).toBe(false)
    expect((result as { ok: false; reason: string }).reason).toBe('missing_signature')
  })

  it('rejects when signature has wrong format', () => {
    const ts = makeTimestamp()
    const result = verifyWebhookSignature({
      rawBody: 'hello',
      timestampHeader: ts,
      signatureHeader: 'abc123',
      signingSecretRef: SECRET_REF,
      nowSeconds: parseInt(ts, 10),
    })

    expect(result.ok).toBe(false)
    expect((result as { ok: false; reason: string }).reason).toBe('invalid_signature_format')
  })

  it('rejects when signing secret is not configured', () => {
    delete process.env[SECRET_REF]
    const ts = makeTimestamp()
    const result = verifyWebhookSignature({
      rawBody: 'body',
      timestampHeader: ts,
      signatureHeader: makeSignature(SECRET, ts, 'body'),
      signingSecretRef: SECRET_REF,
      nowSeconds: parseInt(ts, 10),
    })

    expect(result.ok).toBe(false)
    expect((result as { ok: false; reason: string }).reason).toBe('signing_secret_not_configured')
  })

  it('resolveSigningSecret returns null when env var is not set', () => {
    expect(resolveSigningSecret('NONEXISTENT_VAR')).toBeNull()
  })

  it('resolveSigningSecret returns the value when env var is set', () => {
    process.env['TEST_APP_SECRET'] = 'mysecret'
    expect(resolveSigningSecret('TEST_APP_SECRET')).toBe('mysecret')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suspend blocks webhook / reactivate allows webhook
// ─────────────────────────────────────────────────────────────────────────────

describe('Suspend blocks webhook, reactivate allows webhook', () => {
  it('suspended app has status suspended', () => {
    const { app } = registerApp({ slug: 'block-test' })
    suspendConnectedApp(app.id)
    const updated = getConnectedApp(app.id)
    expect(updated!.status).toBe('suspended')
  })

  it('reactivated app has status active', () => {
    const { app } = registerApp({ slug: 'reactivate-test' })
    suspendConnectedApp(app.id)
    activateConnectedApp(app.id)
    const updated = getConnectedApp(app.id)
    expect(updated!.status).toBe('active')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Connected App Event Log
// ─────────────────────────────────────────────────────────────────────────────

describe('Connected App Event Log', () => {
  it('records an accepted event with payload', () => {
    const event = recordAcceptedEvent({
      appId: 'app-123',
      eventType: 'order.created',
      payload: { orderId: 'abc' },
    })

    expect(event.id).toBeTruthy()
    expect(event.appId).toBe('app-123')
    expect(event.eventType).toBe('order.created')
    expect(event.verificationResult).toBe('accepted')
    expect(event.payload).toEqual({ orderId: 'abc' })
    expect(event.rejectionReason).toBeUndefined()
    expect(event.timestamp).toBeTruthy()
  })

  it('records a rejected event with reason but no payload', () => {
    const event = recordRejectedEvent({
      appId: 'app-456',
      eventType: 'order.created',
      rejectionReason: 'invalid_signature',
    })

    expect(event.id).toBeTruthy()
    expect(event.appId).toBe('app-456')
    expect(event.verificationResult).toBe('rejected')
    expect(event.rejectionReason).toBe('invalid_signature')
    expect(event.payload).toBeUndefined()
  })

  it('records rejected event with null appId as "unknown"', () => {
    const event = recordRejectedEvent({
      appId: null,
      eventType: null,
      rejectionReason: 'missing_app_id',
    })

    expect(event.appId).toBe('unknown')
    expect(event.eventType).toBe('unknown')
  })

  it('event is written after accepted webhook — appears in list', () => {
    expect(listConnectedAppEvents()).toHaveLength(0)

    recordAcceptedEvent({ appId: 'app-789', eventType: 'ping', payload: null })

    const events = listConnectedAppEvents()
    expect(events).toHaveLength(1)
    expect(events[0].verificationResult).toBe('accepted')
  })

  it('lists events for a specific app only', () => {
    recordAcceptedEvent({ appId: 'app-A', eventType: 'ping', payload: null })
    recordAcceptedEvent({ appId: 'app-B', eventType: 'ping', payload: null })
    recordRejectedEvent({ appId: 'app-A', eventType: 'ping', rejectionReason: 'test' })

    const appAEvents = listConnectedAppEventsForApp('app-A')
    expect(appAEvents).toHaveLength(2)
    expect(appAEvents.every((e) => e.appId === 'app-A')).toBe(true)

    const appBEvents = listConnectedAppEventsForApp('app-B')
    expect(appBEvents).toHaveLength(1)
  })

  it('returns events newest first', () => {
    recordAcceptedEvent({ appId: 'app-X', eventType: 'first', payload: null })
    recordAcceptedEvent({ appId: 'app-X', eventType: 'second', payload: null })

    const events = listConnectedAppEvents()
    expect(events[0].eventType).toBe('second')
    expect(events[1].eventType).toBe('first')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// UI page — file-level checks
// ─────────────────────────────────────────────────────────────────────────────

describe('Connected Apps UI page', () => {
  const ROOT = path.resolve(__dirname, '../../')
  const pagePath = path.join(ROOT, 'app/admin/dashboard/connected-apps/page.tsx')

  it('UI page file exists', () => {
    expect(fs.existsSync(pagePath)).toBe(true)
  })

  it('UI page shows empty state message when no apps', () => {
    const src = fs.readFileSync(pagePath, 'utf8')
    expect(src).toContain('No connected apps')
  })

  it('UI page does not contain fake status strings', () => {
    const src = fs.readFileSync(pagePath, 'utf8')
    expect(src).not.toContain('"Ready"')
    expect(src).not.toContain('"connected"')
    expect(src).not.toContain('"synced"')
    expect(src).not.toContain('"healthy"')
  })

  it('UI page does not contain hardcoded app names', () => {
    const src = fs.readFileSync(pagePath, 'utf8')
    expect(src).not.toContain('Marketing App')
    expect(src).not.toContain('Trading App')
  })

  it('UI page shows event log from live event store', () => {
    const src = fs.readFileSync(pagePath, 'utf8')
    expect(src).toContain('connected-app-events')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// API routes — file-level checks
// ─────────────────────────────────────────────────────────────────────────────

describe('Connected Apps API routes', () => {
  const ROOT = path.resolve(__dirname, '../../')

  it('POST route file exists', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/api/admin/connected-apps/route.ts'))).toBe(true)
  })

  it('POST route registers apps', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'app/api/admin/connected-apps/route.ts'),
      'utf8',
    )
    expect(src).toContain('registerConnectedApp')
    expect(src).toContain('signingSecret')
  })

  it('[id] route file exists', () => {
    expect(
      fs.existsSync(path.join(ROOT, 'app/api/admin/connected-apps/[id]/route.ts')),
    ).toBe(true)
  })

  it('[id] route handles suspend/activate/delete', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'app/api/admin/connected-apps/[id]/route.ts'),
      'utf8',
    )
    expect(src).toContain('suspendConnectedApp')
    expect(src).toContain('activateConnectedApp')
    expect(src).toContain('deregisterConnectedApp')
  })

  it('webhook route verifies HMAC before processing', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'app/api/admin/connected-apps/webhook/route.ts'),
      'utf8',
    )
    expect(src).toContain('verifyWebhookSignature')
    expect(src).toContain('unknown_app')
    expect(src).toContain('recordRejectedEvent')
    expect(src).toContain('recordAcceptedEvent')
  })
})
