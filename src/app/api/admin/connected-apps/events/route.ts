/**
 * GET /api/admin/connected-apps/events — list connected app webhook event log
 */

import { NextResponse } from 'next/server'
import { listConnectedAppEvents } from '@/lib/connected-app-events'

export async function GET(): Promise<NextResponse> {
  const events = listConnectedAppEvents()
  return NextResponse.json({ events })
}
