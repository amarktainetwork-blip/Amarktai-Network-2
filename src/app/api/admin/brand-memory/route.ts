/**
 * GET  /api/admin/brand-memory?appSlug=
 * POST /api/admin/brand-memory        — create or update brand memory
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { brandMemoryEngine } from '@/lib/brand-memory'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appSlug = req.nextUrl.searchParams.get('appSlug') ?? 'dashboard'
  try {
    const brands = await brandMemoryEngine.list(appSlug)
    return NextResponse.json({ brands })
  } catch (e) {
    return NextResponse.json({ brands: [], error: e instanceof Error ? e.message : 'Failed' })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const appSlug = (body.appSlug as string) ?? 'dashboard'
  const id = body.id as string | undefined

  try {
    let brand
    if (id) {
      brand = await brandMemoryEngine.update(appSlug, id, body as Parameters<typeof brandMemoryEngine.update>[2])
    } else {
      brand = await brandMemoryEngine.create(appSlug, body as Parameters<typeof brandMemoryEngine.create>[1])
    }
    return NextResponse.json({ brand })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
