import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getMemoryStatus, saveMemory } from '@/lib/memory'
import { validateConfig, classifyDbError, configErrorResponse } from '@/lib/config-validator'

/** GET /api/admin/memory — returns current memory layer status */
export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const cfg = validateConfig()
  if (!cfg.valid) {
    return NextResponse.json({
      ...configErrorResponse(cfg),
      available: false,
      totalEntries: 0,
      appSlugs: [],
      statusLabel: 'not_configured',
    }, { status: 503 })
  }
  try {
    const status = await getMemoryStatus()
    return NextResponse.json(status)
  } catch (err) {
    const { category, message } = classifyDbError(err)
    return NextResponse.json(
      { error: message, category, available: false, totalEntries: 0, appSlugs: [], statusLabel: 'not_configured' },
      { status: category === 'config_invalid' ? 503 : 500 },
    )
  }
}

/** POST /api/admin/memory — save a memory entry */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json() as {
      appSlug?: string
      memoryType?: string
      content?: string
      key?: string
      importance?: number
      ttlDays?: number
    }
    const { appSlug, memoryType, content } = body
    if (!appSlug || !memoryType || !content) {
      return NextResponse.json({ error: 'appSlug, memoryType, and content are required' }, { status: 400 })
    }
    const ok = await saveMemory({
      appSlug,
      memoryType: memoryType as Parameters<typeof saveMemory>[0]['memoryType'],
      content,
      key: body.key,
      importance: body.importance,
      ttlDays: body.ttlDays,
    })
    if (!ok) {
      return NextResponse.json({ error: 'Failed to save memory entry — check database connection' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    const { message } = classifyDbError(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
