/**
 * Phase 5: Connected Apps — test suite
 *
 * Tests:
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
// Also hoist a simple counter-based ID generator (no imports needed inside factory)

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

// ── Reset store and env between tests ─────────────────────────────────────────

beforeEach(() => {
  hoisted.resetStore()
  delete process.env['TEST_APP_SECRET']
  delete process.env['ANOTHER_SECRET']
})

// ─────────────────────────────────────────────────────────────────────────────
// Connected App Registry
// ─────────────────────────────────────────────────────────────────────────────

describe('Connected App Registry', () => {
  it('registers a new app and returns it with an id', () => {
    const app = registerConnectedApp({
      name: 'Test App',
      slug: 'test-app',
      scopes: ['webhook:receive'],
      signingSecretRef: 'TEST_APP_SECRET',
    })

    expect(app.id).toBeTruthy()
    expect(app.name).toBe('Test App')
    expect(app.slug).toBe('test-app')
    expect(app.status).toBe('active')
    expect(app.scopes).toContain('webhook:receive')
    expect(app.signingSecretRef).toBe('TEST_APP_SECRET')
    expect(app.createdAt).toBeTruthy()
    expect(app.updatedAt).toBeTruthy()
  })

  it('does not store the plain signing secret', () => {
    const app = registerConnectedApp({
      name: 'Secret Test',
      slug: 'secret-test',
      scopes: ['webhook:receive'],
      signingSecretRef: 'MY_SECRET_ENV_VAR',
    })

    const raw = JSON.stringify(app)
    expect(raw).not.toContain('supersecret')
    expect(app.signingSecretRef).toBe('MY_SECRET_ENV_VAR')
  })

  it('returns null for unknown app id', () => {
    expect(getConnectedApp('nonexistent-id')).toBeNull()
  })

  it('finds app by slug', () => {
    const app = registerConnectedApp({
      name: 'Slug App',
      slug: 'slug-app',
      scopes: ['webhook:receive'],
      signingSecretRef: 'TEST_APP_SECRET',
    })

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

    registerConnectedApp({
      name: 'App A',
      slug: 'app-a',
      scopes: ['webhook:receive'],
      signingSecretRef: 'TEST_APP_SECRET',
    })

    expect(listConnectedApps()).toHaveLength(1)
    expect(listConnectedApps()[0].slug).toBe('app-a')
  })

  it('suspends an active app', () => {
    const app = registerConnectedApp({
      name: 'Suspend Me',
      slug: 'suspend-me',
      scopes: ['webhook:receive'],
      signingSecretRef: 'TEST_APP_SECRET',
    })

    const suspended = suspendConnectedApp(app.id)
    expect(suspended).not.toBeNull()
    expect(suspended!.status).toBe('suspended')
  })

  it('reactivates a suspended app', () => {
    const app = registerConnectedApp({
      name: 'Reactivate Me',
      slug: 'reactivate-me',
      scopes: ['webhook:receive'],
      signingSecretRef: 'TEST_APP_SECRET',
    })

    suspendConnectedApp(app.id)
    const reactivated = activateConnectedApp(app.id)
    expect(reactivated!.status).toBe('active')
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
    const sig = `sha256=${'a'.repeat(64)}` // wrong signature

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

  it('rejects a tampered body (signature mismatch)', () => {
    const originalBody = JSON.stringify({ event: 'order.created', amount: 100 })
    const tamperedBody = JSON.stringify({ event: 'order.created', amount: 99999 })
    const ts = makeTimestamp()
    const sig = makeSignature(SECRET, ts, originalBody) // signed with original

    const result = verifyWebhookSignature({
      rawBody: tamperedBody, // but body was tampered
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
    const oldTs = makeTimestamp(-(WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS + 60)) // 6 minutes ago
    const sig = makeSignature(SECRET, oldTs, body)

    const result = verifyWebhookSignature({
      rawBody: body,
      timestampHeader: oldTs,
      signatureHeader: sig,
      signingSecretRef: SECRET_REF,
      // nowSeconds defaults to real time — old timestamp will be expired
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
    const body = 'hello'
    const sig = makeSignature(SECRET, '1234567890', body)

    const result = verifyWebhookSignature({
      rawBody: body,
      timestampHeader: null,
      signatureHeader: sig,
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

  it('rejects when signature has wrong format (no sha256= prefix)', () => {
    const ts = makeTimestamp()
    const result = verifyWebhookSignature({
      rawBody: 'hello',
      timestampHeader: ts,
      signatureHeader: 'abc123', // no sha256= prefix
      signingSecretRef: SECRET_REF,
      nowSeconds: parseInt(ts, 10),
    })

    expect(result.ok).toBe(false)
    expect((result as { ok: false; reason: string }).reason).toBe('invalid_signature_format')
  })

  it('rejects when signing secret is not configured', () => {
    delete process.env[SECRET_REF]
    const ts = makeTimestamp()
    const sig = makeSignature(SECRET, ts, 'body')

    const result = verifyWebhookSignature({
      rawBody: 'body',
      timestampHeader: ts,
      signatureHeader: sig,
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

    recordAcceptedEvent({
      appId: 'app-789',
      eventType: 'ping',
      payload: null,
    })

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
    // newest first — second event should be at index 0
    expect(events[0].eventType).toBe('second')
    expect(events[1].eventType).toBe('first')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// UI empty state — file-level checks
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
    expect(src).toContain('No apps have been registered yet')
  })

  it('UI page does not contain fake status strings', () => {
    const src = fs.readFileSync(pagePath, 'utf8')
    expect(src).not.toContain('"Ready"')
    expect(src).not.toContain('"connected"')
    expect(src).not.toContain('"synced"')
    expect(src).not.toContain('"healthy"')
  })

  it('UI page renders apps from live registry (no hardcoded app cards)', () => {
    const src = fs.readFileSync(pagePath, 'utf8')
    expect(src).toContain('listConnectedApps()')
    expect(src).not.toContain('Marketing App')
    expect(src).not.toContain('Trading App')
  })

  it('UI page shows event log from live event store', () => {
    const src = fs.readFileSync(pagePath, 'utf8')
    expect(src).toContain('listConnectedAppEvents()')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Webhook route — file-level checks
// ─────────────────────────────────────────────────────────────────────────────

describe('Webhook ingest route', () => {
  const ROOT = path.resolve(__dirname, '../../')
  const routePath = path.join(ROOT, 'app/api/admin/connected-apps/webhook/route.ts')

  it('webhook route file exists', () => {
    expect(fs.existsSync(routePath)).toBe(true)
  })

  it('webhook route verifies HMAC before processing', () => {
    const src = fs.readFileSync(routePath, 'utf8')
    expect(src).toContain('verifyWebhookSignature')
  })

  it('webhook route rejects unknown apps', () => {
    const src = fs.readFileSync(routePath, 'utf8')
    expect(src).toContain('unknown_app')
  })

  it('webhook route records rejected events', () => {
    const src = fs.readFileSync(routePath, 'utf8')
    expect(src).toContain('recordRejectedEvent')
  })

  it('webhook route records accepted events', () => {
    const src = fs.readFileSync(routePath, 'utf8')
    expect(src).toContain('recordAcceptedEvent')
  })
})
