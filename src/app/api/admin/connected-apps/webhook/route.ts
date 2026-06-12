/**
 * POST /api/admin/connected-apps/webhook
 *
 * Webhook ingest endpoint for registered connected apps — Phase 5.
 *
 * Accepts only requests from apps registered in the connected-app registry.
 * Verifies HMAC-SHA256 signature before processing.
 * Stores accepted events; records rejected events with safe metadata only.
 *
 * Required headers:
 *   x-amarktai-app-id        — the registered app's id
 *   x-amarktai-timestamp     — Unix timestamp in seconds (string)
 *   x-amarktai-signature     — sha256=<hex> HMAC of `${timestamp}.${rawBody}`
 *   x-amarktai-event-type    — event type string (e.g. "order.created")
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConnectedApp } from '@/lib/connected-apps'
import { verifyWebhookSignature } from '@/lib/webhook-verifier'
import { recordAcceptedEvent, recordRejectedEvent } from '@/lib/connected-app-events'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Read raw body before any parsing (required for HMAC verification)
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  const appId = req.headers.get('x-amarktai-app-id')
  const timestampHeader = req.headers.get('x-amarktai-timestamp')
  const signatureHeader = req.headers.get('x-amarktai-signature')
  const eventType = req.headers.get('x-amarktai-event-type')

  // 1. App id must be present
  if (!appId) {
    recordRejectedEvent({
      appId: null,
      eventType: eventType,
      rejectionReason: 'missing_app_id',
    })
    return NextResponse.json({ error: 'Missing x-amarktai-app-id header' }, { status: 400 })
  }

  // 2. App must be registered
  const app = getConnectedApp(appId)
  if (!app) {
    recordRejectedEvent({
      appId: appId,
      eventType: eventType,
      rejectionReason: 'unknown_app',
    })
    return NextResponse.json({ error: 'Unknown app' }, { status: 401 })
  }

  // 3. App must be active
  if (app.status !== 'active') {
    recordRejectedEvent({
      appId: appId,
      eventType: eventType,
      rejectionReason: 'app_suspended',
    })
    return NextResponse.json({ error: 'App is not active' }, { status: 403 })
  }

  // 4. App must have webhook:receive scope
  if (!app.scopes.includes('webhook:receive')) {
    recordRejectedEvent({
      appId: appId,
      eventType: eventType,
      rejectionReason: 'missing_scope_webhook_receive',
    })
    return NextResponse.json({ error: 'App does not have webhook:receive scope' }, { status: 403 })
  }

  // 5. Verify HMAC signature
  const verification = verifyWebhookSignature({
    rawBody,
    timestampHeader,
    signatureHeader,
    signingSecretRef: app.signingSecretRef,
  })

  if (!verification.ok) {
    recordRejectedEvent({
      appId: appId,
      eventType: eventType,
      rejectionReason: verification.reason,
    })
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 401 })
  }

  // 6. Parse payload
  let payload: unknown = rawBody
  try {
    payload = JSON.parse(rawBody)
  } catch {
    // Non-JSON body is allowed — store as raw string
  }

  // 7. Store accepted event
  const event = recordAcceptedEvent({
    appId: appId,
    eventType: eventType ?? 'unknown',
    payload,
  })

  return NextResponse.json({ received: true, eventId: event.id }, { status: 200 })
}
