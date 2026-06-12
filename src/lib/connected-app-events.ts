/**
 * @module connected-app-events
 * @description Webhook event and audit log for AmarktAI Network — Phase 5.
 *
 * Records accepted and rejected webhook events for connected apps.
 * Rejected events only store safe metadata (no raw body on rejection).
 *
 * Server-side only — do NOT import from client components.
 */

import { appendRecord, listRecords } from '@/lib/local-json-store'

// ── Storage path ─────────────────────────────────────────────────────────────

export const CONNECTED_APP_EVENTS_FILE = 'connected-apps/events.json'

// ── Types ────────────────────────────────────────────────────────────────────

export type ConnectedAppEventVerificationResult = 'accepted' | 'rejected'

export interface ConnectedAppEvent {
  id: string
  appId: string
  eventType: string
  verificationResult: ConnectedAppEventVerificationResult
  /** Rejection reason — only present on rejected events. */
  rejectionReason?: string
  /** Stored payload — only present on accepted events. */
  payload?: unknown
  timestamp: string
}

export interface RecordAcceptedEventInput {
  appId: string
  eventType: string
  payload: unknown
}

export interface RecordRejectedEventInput {
  appId: string | null
  eventType: string | null
  rejectionReason: string
}

function newestFirst(events: ConnectedAppEvent[]): ConnectedAppEvent[] {
  return events
    .map((event, insertionIndex) => ({ event, insertionIndex }))
    .sort((a, b) => {
      const timestampDifference =
        new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime()
      return timestampDifference || b.insertionIndex - a.insertionIndex
    })
    .map(({ event }) => event)
}

// ── Event log operations ──────────────────────────────────────────────────────

/**
 * Record an accepted webhook event.
 * Stores the full payload for downstream processing.
 */
export function recordAcceptedEvent(input: RecordAcceptedEventInput): ConnectedAppEvent {
  const record: Omit<ConnectedAppEvent, 'id'> = {
    appId: input.appId,
    eventType: input.eventType,
    verificationResult: 'accepted',
    payload: input.payload,
    timestamp: new Date().toISOString(),
  }
  return appendRecord<Omit<ConnectedAppEvent, 'id'>>(
    CONNECTED_APP_EVENTS_FILE,
    record,
  ) as ConnectedAppEvent
}

/**
 * Record a rejected webhook event.
 * Only stores safe metadata — no raw body or secrets.
 */
export function recordRejectedEvent(input: RecordRejectedEventInput): ConnectedAppEvent {
  const record: Omit<ConnectedAppEvent, 'id'> = {
    appId: input.appId ?? 'unknown',
    eventType: input.eventType ?? 'unknown',
    verificationResult: 'rejected',
    rejectionReason: input.rejectionReason,
    timestamp: new Date().toISOString(),
  }
  return appendRecord<Omit<ConnectedAppEvent, 'id'>>(
    CONNECTED_APP_EVENTS_FILE,
    record,
  ) as ConnectedAppEvent
}

/**
 * List all connected app events, newest first.
 */
export function listConnectedAppEvents(): ConnectedAppEvent[] {
  const events = listRecords<ConnectedAppEvent>(CONNECTED_APP_EVENTS_FILE)
  return newestFirst(events)
}

/**
 * List events for a specific app, newest first.
 */
export function listConnectedAppEventsForApp(appId: string): ConnectedAppEvent[] {
  const events = listRecords<ConnectedAppEvent>(
    CONNECTED_APP_EVENTS_FILE,
    (e) => e.appId === appId,
  )
  return newestFirst(events)
}
