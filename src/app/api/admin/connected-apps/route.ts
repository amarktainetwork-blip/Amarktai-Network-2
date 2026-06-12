/**
 * GET  /api/admin/connected-apps  — list all registered connected apps
 * POST /api/admin/connected-apps  — register a new connected app
 *
 * POST body (JSON):
 *   { name: string, slug: string, scopes: ConnectedAppScope[] }
 *
 * POST response (201):
 *   { app: ConnectedApp, signingSecret: string }
 *   — signingSecret is shown ONCE. Store it securely. It is never returned again.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  listConnectedApps,
  registerConnectedApp,
  CONNECTED_APP_SCOPES,
  type ConnectedAppScope,
} from '@/lib/connected-apps'

export async function GET(): Promise<NextResponse> {
  const apps = listConnectedApps()
  return NextResponse.json({ apps })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const { name, slug, scopes } = body as Record<string, unknown>

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required and must be a non-empty string' }, { status: 400 })
  }

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'slug is required and must be a string' }, { status: 400 })
  }

  if (!Array.isArray(scopes) || scopes.length === 0) {
    return NextResponse.json({ error: 'scopes must be a non-empty array' }, { status: 400 })
  }

  const invalidScopes = (scopes as string[]).filter(
    (s) => !CONNECTED_APP_SCOPES.includes(s as ConnectedAppScope),
  )
  if (invalidScopes.length > 0) {
    return NextResponse.json(
      { error: `Invalid scopes: ${invalidScopes.join(', ')}. Valid: ${CONNECTED_APP_SCOPES.join(', ')}` },
      { status: 400 },
    )
  }

  try {
    const result = registerConnectedApp({
      name: name.trim(),
      slug: slug.trim(),
      scopes: scopes as ConnectedAppScope[],
    })

    return NextResponse.json(
      {
        app: result.app,
        signingSecret: result.signingSecret,
        notice: 'Store this signing secret securely. It will not be shown again.',
      },
      { status: 201 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    // Duplicate slug or invalid slug → 409/400
    if (message.includes('already registered')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    if (message.includes('Invalid slug')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
