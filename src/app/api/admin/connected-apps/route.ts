/**
 * GET  /api/admin/connected-apps  — list all registered connected apps
 * GET  /api/admin/connected-apps/events — list webhook event log
 */

import { NextResponse } from 'next/server'
import { listConnectedApps } from '@/lib/connected-apps'

export async function GET(): Promise<NextResponse> {
  const apps = listConnectedApps()
  return NextResponse.json({ apps })
}
