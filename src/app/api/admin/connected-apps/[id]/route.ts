/**
 * PATCH  /api/admin/connected-apps/[id]  — suspend or reactivate a connected app
 * DELETE /api/admin/connected-apps/[id]  — deregister (delete) a connected app
 *
 * PATCH body (JSON):
 *   { action: 'suspend' | 'activate' }
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getConnectedApp,
  suspendConnectedApp,
  activateConnectedApp,
  deregisterConnectedApp,
} from '@/lib/connected-apps'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params

  const app = getConnectedApp(id)
  if (!app) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = (body as Record<string, unknown>) ?? {}

  if (action === 'suspend') {
    const updated = suspendConnectedApp(id)
    return NextResponse.json({ app: updated })
  }

  if (action === 'activate') {
    const updated = activateConnectedApp(id)
    return NextResponse.json({ app: updated })
  }

  return NextResponse.json(
    { error: 'action must be "suspend" or "activate"' },
    { status: 400 },
  )
}

export async function DELETE(_req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params

  const app = getConnectedApp(id)
  if (!app) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 })
  }

  const deleted = deregisterConnectedApp(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Failed to deregister app' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true, id })
}
